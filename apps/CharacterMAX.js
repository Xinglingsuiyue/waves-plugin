import plugin from '../../../lib/plugins/plugin.js'
import WeightCalculator from '../utils/Calculate.js'
import { pluginResources } from '../model/path.js';
import Wiki from '../components/Wiki.js';
import Render from '../components/Render.js';
import path from 'path';
import fs from 'fs';

// 漂泊者属性ID映射
const WAVERIDER_ATTRIBUTES = {
    '1604': '湮灭', '1605': '湮灭',
    '1501': '衍射', '1502': '衍射',
    '1406': '气动', '1408': '气动'
};

export class CharacterMAX extends plugin {
    constructor() {
        super({
            name: "鸣潮-角色极限面板查询",
            event: "message",
            priority: 1008,
            rule: [
                {
                    reg: "^(?:～|~)(.*)极限面板$",
                    fnc: "characterMax"
                }
            ]
        })
    }

    async characterMax(e) {
        const [, message] = e.msg.match(this.rule[0].reg);

        if (!message) {
            return await e.reply('请输入正确的命令格式，如：[~安可极限面板]');
        }

        const wiki = new Wiki();
        let name = await wiki.getAlias(message);

        // 处理漂泊者的特殊情况
        let dataFileName = name;
        if (name.includes('漂泊者')) {
            name = '漂泊者';
            dataFileName = '漂泊者';
        }

        // 构建极限面板数据文件路径
        const maxDataDir = path.join(pluginResources, 'CharacterMAX');
        const dataFilePath = path.join(maxDataDir, `${dataFileName}.json`);

        // 检查数据文件是否存在
        if (!fs.existsSync(dataFilePath)) {
            return await e.reply(`暂未收录【${name}】的极限面板数据，请联系管理员添加。`);
        }

        try {
            // 读取极限面板数据
            const rawData = fs.readFileSync(dataFilePath, 'utf-8');
            const maxData = JSON.parse(rawData);

            // 确保数据结构完整
            let roleDetailData;
            if (!maxData.data) {
                roleDetailData = maxData;
            } else if (typeof maxData.data === 'string') {
                roleDetailData = JSON.parse(maxData.data);
            } else {
                roleDetailData = maxData.data;
            }

            const roleDetail = {
                status: true,
                data: roleDetailData
            };

            // 计算角色数据和声骸评分
            const calculated = new WeightCalculator(roleDetail.data).calculate();
            roleDetail.data = calculated;

            if (!roleDetail.data.weightVersion) {
                roleDetail.data.weightVersion = '1.0';
            }

            // 获取角色图片
            const rolePicDir = path.join(pluginResources, 'rolePic', name);
            let webpFiles = [];
            try {
                webpFiles = fs.readdirSync(rolePicDir).filter(file => file.toLowerCase().endsWith('.webp'));
            } catch (err) {
            }

            const rolePicUrl = webpFiles.length > 0
                ? `file://${rolePicDir}/${webpFiles[Math.floor(Math.random() * webpFiles.length)]}`
                : (roleDetail.data.role?.rolePicUrl || '');

            // 处理角色名称显示
            let displayName = name;
            if (name === '漂泊者' && roleDetail.data.role?.roleId) {
                const roleId = roleDetail.data.role.roleId.toString();
                if (WAVERIDER_ATTRIBUTES[roleId]) {
                    displayName = `漂泊者${WAVERIDER_ATTRIBUTES[roleId]}`;
                }
            }

            const renderData = {
                uid: '000000000', 
                rolePicUrl: rolePicUrl,
                roleDetail: roleDetail,
            };

            const imageCard = await Render.render('Template/charProfile/charProfile', {
                data: renderData,
            }, { e, retType: 'base64' });

            if (!imageCard) {
                return await e.reply('生成极限面板图片失败，请检查模板配置。');
            }

            // 发送结果
            const msgRes = await e.reply(imageCard);

            if (msgRes?.message_id) {
                const message_id = Array.isArray(msgRes.message_id)
                    ? msgRes.message_id
                    : [msgRes.message_id].filter(Boolean);

                for (const id of message_id) {
                    await redis.set(
                        `Yunzai:waves:originpic:${id}`,
                        JSON.stringify({ 
                            type: 'maxProfile', 
                            img: [rolePicUrl],
                            character: name
                        }),
                        { EX: 3600 * 3 }
                    );
                }
            }

            return true;

        } catch (error) {
            console.error('加载极限面板数据时出错:', error);
            return await e.reply(`加载【${name}】的极限面板数据时发生错误：${error.message}`);
        }
    }
}