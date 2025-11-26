import fs from 'node:fs';
import path from 'node:path';
import fetch from 'node-fetch';
import Render from '../components/Render.js';
import { pluginResources } from '../model/path.js';
import YAML from 'yaml';
import Wiki from '../components/Wiki.js';

const holdingRateApi = 'https://wh.loping151.site/api/waves/hold/rates';

export class HoldingRate extends plugin {
    constructor() {
        super({
            name: '鸣潮-持有率查询',
            event: 'message',
            priority: 1009,
            rule: [{
                reg: /^(～|~|∽∽|#?鸣潮)((4|5|四|五)星)?(角色)?持有率(查询)?$/,
                fnc: 'holdingRate'
            }]
        })
    }

    async holdingRate(e) {
        // 从消息中提取星级, 如果没有指定星级, 则默认查询五星角色.
        const match = e.msg.match(/(4|5|四|五)星/);
        const pickStar = match && /4|四/.test(match[1]) ? 4 : 5;

        let data = null;
        // 优先尝试读取缓存数据
        data = JSON.parse(await redis.get('Yunzai:waves:holdingRate') || 'null');

        // 如果缓存数据不存在, 或者缓存数据过期, 则请求接口
        if (!data) {
            try {
                logger.debug(logger.blue('[waves-plugin]'), `访问持有率查询接口: ${holdingRateApi}`);
                const res = await fetch(holdingRateApi).then(res => res.json());

                if (res.code === 200 && res.data) {
                    // 接口返回数据格式化
                    logger.debug(logger.blue('[waves-plugin]'), '持有率查询接口返回数据:\n', res.data);
                    data = await this.formatData(res.data); 

                    
                    logger.debug(logger.blue('[waves-plugin]'), '持有率查询接口返回数据缓存成功');
                    await redis.set('Yunzai:waves:holdingRate', JSON.stringify(data), { EX: 60 * 60 });
                }
                else { logger.debug(logger.blue('[waves-plugin]'), '持有率查询接口返回数据格式错误:\n', res); }
            }
            catch (err) {
                logger.error(logger.blue('[waves-plugin]'), '持有率查询失败:\n', err);
                return e.reply('角色持有率查询失败，请稍后再试.');
            }
        }

        
        if (!data) {
            return e.reply('角色持有率查询失败，请稍后再试.');
        }

        
        logger.debug(logger.blue('[waves-plugin]'), `持有率查询过滤星级: ${pickStar}`);
        data.data.charList = data.data.charList.filter(item => item.star === pickStar);

        
        logger.debug(logger.blue('[waves-plugin]'), '持有率查询渲染数据:\n', data);
        const image = await Render.render('Template/Chiyoulv/Chiyoulv', data, {
            e,
            retType: 'base64',
        });

        return e.reply(image, false);
    }

    /**
     * 格式化数据
     * @description 格式化接口返回的数据, 返回渲染所需的数据
     * @param {Object} data - 接口返回的数据对象
     * @returns {Object} - 渲染所需的数据对象
     */
    async formatData(data) {
        
        const id2NamePath = path.join(pluginResources, 'Chiyoulv', 'id2Name.json');
        const id2Name = JSON.parse(fs.readFileSync(id2NamePath, 'utf-8'));

        
        let localData = {};
        const localPath = path.join(pluginResources, 'local_characters.yaml');
        if (fs.existsSync(localPath)) {
            localData = YAML.parse(fs.readFileSync(localPath, 'utf8')) || {};
        }

        
        const renderData = {
            sampleSize: data.total_player_count || '没有数据, 都是我编的.',
            charList: []
        };

        
        for (const item of data.char_hold_rate) {
            const itm = id2Name[item.char_id];
            if (!itm) continue;
            
            const charName = itm.name;
            
            
            const avatarUrl = localData[charName]?.image || 
                             `file://${path.join(pluginResources, 'Chiyoulv', 'default.png')}`;

            renderData.charList.push({
                charId: item.char_id,
                charName: charName,
                avatar: avatarUrl,
                star: itm.star,
                chainHoldRate: item.chain_hold_rate,
                holdRate: item.hold_rate,
                svgContent: this.genDonutSVG(item.chain_hold_rate, item.hold_rate),
            });
        }

        // 过滤主角并排序
        renderData.charList = renderData.charList
            .filter(item => !item.charName.includes('漂泊者'))
            .sort((a, b) => {
                if (a.star !== b.star) return b.star - a.star;
                return b.holdRate - a.holdRate;
            });

        return {
            data: renderData,
            headImg: this.getHeadImg(),
            updateTime: this.getCNTime(),
        };
    }

    /**
     * 获取中国标准时间
     * @description 获取中国标准时间
     * @returns {string} 中国标准时间
     * @example '2023年10月01日 12:00'
     */
    getCNTime() {
        const formatter = new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Shanghai'
        });

        const parts = formatter.formatToParts(new Date());
        const [y, , m, , d, , h, , min] = parts.map(p => p.value);

        return `${y}年${m}月${d}日 ${h}:${min}`;
    }

    /**
     * 获取头图
     * @description 获取随机头图, 用于渲染图片.
     * @returns {string} 随机头图的路径
     * @example 'file:///path/to/image.png'
     */
    getHeadImg() {
        const headImgDir = path.join(pluginResources, 'Chiyoulv', 'Banner');
        const headImgs = fs.readdirSync(path.join(headImgDir));
        const headImg = headImgs[Math.floor(Math.random() * headImgs.length)];

        return `file://${path.join(headImgDir, headImg)}`;
    }

    /**
     * 生成环形图
     * @description 生成环形图的SVG代码
     * @param {Object} chainHoldRate - 各个链的持有率
     * @param {number} holdRate - 总持有率
     * @returns {string} SVG代码
     * @example '<svg>...</svg>'
     */
    genDonutSVG(chainHoldRate, holdRate) {
        const total = Object.values(chainHoldRate).reduce((sum, v) => sum + v, 0);
        const radius = 80, innerRadius = 40;
        const cx = 90, cy = 90;

        // 从12点钟方向开始
        let startAngle = -Math.PI / 2;
        let paths = [];

        Object.entries(chainHoldRate).forEach(([k, v], i) => {
            if (!v) return;
            const perc = v / total;

            // 顺时针绘制
            const endAngle = startAngle + perc * 2 * Math.PI;

            // 计算路径坐标
            const x1 = cx + innerRadius * Math.cos(startAngle);
            const y1 = cy + innerRadius * Math.sin(startAngle);
            const x2 = cx + radius * Math.cos(startAngle);
            const y2 = cy + radius * Math.sin(startAngle);
            const x3 = cx + radius * Math.cos(endAngle);
            const y3 = cy + radius * Math.sin(endAngle);
            const x4 = cx + innerRadius * Math.cos(endAngle);
            const y4 = cy + innerRadius * Math.sin(endAngle);

            const largeArc = perc > 0.5 ? 1 : 0;
            const pathData = `M ${x1} ${y1} L ${x2} ${y2} A ${radius} ${radius} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1} Z`;
            paths.push(`<path d="${pathData}" fill="var(--c${k}-color)" stroke="white" stroke-width="1"/>`);

            // 更新起始角度为当前结束角度
            startAngle = endAngle;
        });

        return `
        <svg class="donut-chart" viewBox="0 0 180 180">
            ${paths.join('\n')}
            <!-- <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20">
                ${holdRate}%
            </text> -->
        </svg>
        `;
    }
}
