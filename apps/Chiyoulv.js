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
            rule: [
                {
                    reg: /^(～|~|∽∽∽∽|#?鸣潮)(群|bot)((4|5|四|五)星)?(角色)?持有率(查询)?$/,
                    fnc: 'groupBotHoldingRate'
                },
                {
                    reg: /^(～|~|∽∽∽∽|#?鸣潮)((4|5|四|五)星)?(角色)?持有率(查询)?$/,
                    fnc: 'holdingRate'
                }
            ]
        })
        
        this.pluginResources = pluginResources;
        this.GROUP_RANK_DIR = path.join(this.pluginResources, 'data', 'CharacterRank', 'groups');
        this.GLOBAL_RANK_DIR = path.join(this.pluginResources, 'data', 'CharacterRank', 'global');
    }

    async groupBotHoldingRate(e) {
        const match = e.msg.match(/^(～|~|∽∽∽∽|#?鸣潮)(群|bot)((4|5|四|五)星)?(角色)?持有率(查询)?$/);
        const type = match[2];
        const starMatch = match[3];
        const pickStar = starMatch && /4|四/.test(starMatch) ? 4 : 5;

        let data = null;
        
        if (type === '群') {
            if (!e.isGroup) {
                return e.reply('群持有率查询只能在群聊中使用');
            }
            data = await this.getGroupHoldingRateData(e.group_id, pickStar);
        } else if (type === 'bot') {
            data = await this.getBotHoldingRateData(pickStar);
        }

        if (!data || !data.data || data.data.charList.length === 0) {
            return e.reply(`${type === '群' ? '群' : 'Bot'}${pickStar}星角色持有率数据为空，请先提交角色数据`);
        }

        // 过滤指定星级
        data.data.charList = data.data.charList.filter(item => item.star === pickStar);

        logger.debug(logger.blue('[waves-plugin]'), `${type}持有率查询渲染数据:\n`, data);
        const image = await Render.render('Template/Chiyoulv/Chiyoulv', data, {
            e,
            retType: 'base64',
        });

        return e.reply(image, false);
    }

    async holdingRate(e) {
        
        const match = e.msg.match(/(4|5|四|五)星/);
        const pickStar = match && /4|四/.test(match[1]) ? 4 : 5;

        let data = null;
        data = JSON.parse(await redis.get('Yunzai:waves:holdingRate') || 'null');

        if (!data) {
            try {
                logger.debug(logger.blue('[waves-plugin]'), `访问持有率查询接口: ${holdingRateApi}`);
                const res = await fetch(holdingRateApi).then(res => res.json());

                if (res.code === 200 && res.data) {
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

    async getGroupHoldingRateData(groupId, pickStar) {
        try {
            const groupDir = path.join(this.GROUP_RANK_DIR, `group_${groupId}`);
            if (!fs.existsSync(groupDir)) {
                return null;
            }

            const files = fs.readdirSync(groupDir).filter(file => file.endsWith('.json'));
            const allCharacters = [];

            for (const file of files) {
                const filePath = path.join(groupDir, file);
                const charData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                allCharacters.push(...charData);
            }

            if (allCharacters.length === 0) {
                return null;
            }

            return await this.calculateHoldingRateFromRankData(allCharacters, pickStar, `群 ${groupId}`);
        } catch (err) {
            logger.error(logger.blue('[waves-plugin]'), '获取群持有率数据失败:\n', err);
            return null;
        }
    }


    async getBotHoldingRateData(pickStar) {
        try {
            if (!fs.existsSync(this.GLOBAL_RANK_DIR)) {
                return null;
            }

            const files = fs.readdirSync(this.GLOBAL_RANK_DIR).filter(file => file.endsWith('.json'));
            const allCharacters = [];

            for (const file of files) {
                const filePath = path.join(this.GLOBAL_RANK_DIR, file);
                const charData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                allCharacters.push(...charData);
            }

            if (allCharacters.length === 0) {
                return null;
            }

            return await this.calculateHoldingRateFromRankData(allCharacters, pickStar, 'Bot全局');
        } catch (err) {
            logger.error(logger.blue('[waves-plugin]'), '获取Bot持有率数据失败:\n', err);
            return null;
        }
    }

    async calculateHoldingRateFromRankData(rankData, pickStar, dataSource) {
        
        const id2NamePath = path.join(pluginResources, 'Chiyoulv', 'id2Name.json');
        const id2Name = JSON.parse(fs.readFileSync(id2NamePath, 'utf-8'));

        
        const uniquePlayers = new Set(rankData.map(item => item.uid));
        const totalPlayers = uniquePlayers.size;

        
        const charStats = {};
        
        rankData.forEach(item => {
            const charName = item.charInfo.roleName;
            if (!charStats[charName]) {
                charStats[charName] = {
                    holdCount: 0,
                    chainStats: {} 
                };
            }
            
            charStats[charName].holdCount++;
            const chainCount = item.charInfo.chainCount || 0;
            charStats[charName].chainStats[chainCount] = (charStats[charName].chainStats[chainCount] || 0) + 1;
        });

        
        const renderData = {
            sampleSize: `${dataSource} - 总玩家数: ${totalPlayers}`,
            charList: []
        };

        
        for (const [charName, stats] of Object.entries(charStats)) {
            
            let charInfo = null;
            for (const [id, info] of Object.entries(id2Name)) {
                if (info.name === charName) {
                    charInfo = info;
                    break;
                }
            }

            if (!charInfo) continue;

            
            if (charInfo.star !== pickStar) continue;

            
            const holdRate = (stats.holdCount / totalPlayers * 100).toFixed(2);
            
            
            const chainHoldRate = {};
            let totalChainCount = 0;
            
            
            Object.values(stats.chainStats).forEach(count => {
                totalChainCount += count;
            });

            
            Object.entries(stats.chainStats).forEach(([chain, count]) => {
                
                chainHoldRate[chain] = parseFloat((count / totalChainCount * 100).toFixed(2));
            });

           
            let localData = {};
            const localPath = path.join(pluginResources, 'local_characters.yaml');
            if (fs.existsSync(localPath)) {
                localData = YAML.parse(fs.readFileSync(localPath, 'utf8')) || {};
            }
            
            const avatarUrl = localData[charName]?.image || 
                             `file://${path.join(pluginResources, 'Chiyoulv', 'default.png')}`;

            renderData.charList.push({
                charId: charInfo.id || charName,
                charName: charName,
                avatar: avatarUrl,
                star: charInfo.star,
                chainHoldRate: chainHoldRate,
                holdRate: parseFloat(holdRate),
                svgContent: this.genDonutSVG(chainHoldRate),
            });
        }

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


    genDonutSVG(chainHoldRate) {
        if (!chainHoldRate || Object.keys(chainHoldRate).length === 0) {
            return `
            <svg class="donut-chart" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="40" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
            </svg>
            `;
        }

        const processedData = {};
        Object.entries(chainHoldRate).forEach(([key, value]) => {
            processedData[key] = typeof value === 'string' ? parseFloat(value) : value;
        });

        const total = Object.values(processedData).reduce((sum, v) => sum + (isNaN(v) ? 0 : v), 0);
        
        if (total === 0) {
            return `
            <svg class="donut-chart" viewBox="0 0 180 180">
                <circle cx="90" cy="90" r="40" fill="#f0f0f0" stroke="#ccc" stroke-width="2"/>
            </svg>
            `;
        }

        const radius = 80, innerRadius = 40;
        const cx = 90, cy = 90;

        let startAngle = -Math.PI / 2;
        let paths = [];

        Object.entries(processedData).forEach(([chainLevel, percentage]) => {
            if (!percentage || percentage === 0) return;
            
            const perc = percentage / total;
            const endAngle = startAngle + perc * 2 * Math.PI;

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
            
            paths.push(`<path d="${pathData}" fill="var(--c${chainLevel}-color)" stroke="white" stroke-width="1"/>`);

            startAngle = endAngle;
        });

        return `
        <svg class="donut-chart" viewBox="0 0 180 180">
            ${paths.join('\n')}
        </svg>
        `;
    }

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
                svgContent: this.genDonutSVG(item.chain_hold_rate),
            });
        }

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

    getHeadImg() {
        const headImgDir = path.join(pluginResources, 'Chiyoulv', 'Banner');
        if (!fs.existsSync(headImgDir)) {
            return `file://${path.join(pluginResources, 'Chiyoulv', 'default.png')}`;
        }
        const headImgs = fs.readdirSync(headImgDir);
        if (headImgs.length === 0) {
            return `file://${path.join(pluginResources, 'Chiyoulv', 'default.png')}`;
        }
        const headImg = headImgs[Math.floor(Math.random() * headImgs.length)];
        return `file://${path.join(headImgDir, headImg)}`;
    }
}
