import plugin from '../../../lib/plugins/plugin.js';
import { pluginRoot, _path, pluginResources } from '../model/path.js';
import Config from "../components/Config.js";
import Waves from "../components/Code.js";
import Wiki from "../components/Wiki.js";
import Render from '../components/Render.js';
import fs from 'fs';
import { createHash } from 'crypto';

const resident = ["鉴心", "卡卡罗", "安可", "维里奈", "凌阳"];

export class Gacha extends plugin {
    constructor() {
        super({
            name: "鸣潮-抽卡统计",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(?:常驻)?(?:角色|武器|武器常驻|自选|新手)?抽卡(?:统计|分析|记录)([\\s\\S]*)$",
                    fnc: "gachaCount"
                },
                {
                    reg: "^(～|~|鸣潮)导入抽卡记录$",
                    fnc: "importGacha"
                },
                {
                    reg: "^(～|~|鸣潮)导出抽卡记录$",
                    fnc: "exportGacha"
                },
                {
                    reg: "^(～|~|鸣潮)更新角色数据$",
                    fnc: "updateCharacterData"
                },
                {
                    reg: "^(～|~|鸣潮)抽卡帮助$",
                    fnc: "gachaHelp"
                }
            ]
        });

        this.checkLocalData();
    }

    async checkLocalData() {
        const { auto_update_data, data_update_interval } = Config.getLocalDataConfig();
        if (!auto_update_data) return;

        const lastUpdateFile = `${pluginResources}/data/last_update.txt`;
        let lastUpdate = 0;
        
        if (fs.existsSync(lastUpdateFile)) {
            lastUpdate = parseInt(fs.readFileSync(lastUpdateFile, 'utf-8')) || 0;
        }
        
        const now = Date.now();
        if (now - lastUpdate > data_update_interval * 1000) {
            logger.mark('自动更新角色数据...');
            try {
                await this.updateCharacterData();
                logger.mark('角色数据自动更新完成');
            } catch (error) {
                logger.error('自动更新角色数据失败:', error);
            }
        }
    }

    async updateCharacterData(e = null) {
        const { enable_wiki_fallback } = Config.getLocalDataConfig();
        if (!enable_wiki_fallback) {
            if (e) await e.reply('从Wiki获取数据功能已禁用，请在配置中启用');
            return false;
        }

        if (e) await e.reply('正在从Wiki更新角色数据...');

        try {
            const wiki = new Wiki();
            const characters = Config.getLocalCharacters();
            let updatedCount = 0;

            // 更新常驻角色
            for (const name of resident) {
                const result = await wiki.getRecord(name);
                if (result.status) {
                    characters[name] = {
                        name,
                        avatar: result.record.content.contentUrl,
                        isResident: true,
                        lastUpdate: Date.now()
                    };
                    updatedCount++;
                }
            }

            if (updatedCount > 0) {
                Config.updateLocalCharacters(characters);
                if (e) await e.reply(`角色数据更新完成，共更新${updatedCount}条记录`);
                return true;
            } else {
                if (e) await e.reply('没有可更新的角色数据');
                return false;
            }
        } catch (error) {
            logger.error('更新角色数据失败:', error);
            if (e) await e.reply('更新角色数据失败: ' + error.message);
            return false;
        }
    }

    async getCharacterAvatar(name) {
        const characters = Config.getLocalCharacters();
        
        // 检查本地是否有数据且数据不是太旧（30天内）
        if (characters[name]?.avatar) {
            const lastUpdate = characters[name]?.lastUpdate || 0;
            if (Date.now() - lastUpdate < 30 * 24 * 60 * 60 * 1000) {
                return characters[name].avatar;
            }
        }

        // 从Wiki获取
        const { enable_wiki_fallback } = Config.getLocalDataConfig();
        if (enable_wiki_fallback) {
            try {
                const wiki = new Wiki();
                const result = await wiki.getRecord(name);
                if (result.status) {
                    const avatar = result.record.content.contentUrl;
                    
                    // 更新本地数据
                    const updatedCharacter = {
                        name,
                        avatar,
                        lastUpdate: Date.now()
                    };
                    Config.updateLocalCharacters({ [name]: updatedCharacter });
                    
                    return avatar;
                }
            } catch (error) {
                logger.error(`获取角色${name}头像失败:`, error);
            }
        }

        return ''; // 返回空字符串表示获取失败
    }

    async dataFormat(array) {
        const no5Star = ((idx => (idx === -1 ? array.length : idx))(array.findIndex(item => item.qualityLevel === 5)));
        const no4Star = ((idx => (idx === -1 ? array.length : idx))(array.findIndex(item => item.qualityLevel === 4)));
        const fiveStar = array.filter(item => item.qualityLevel === 5).length;
        const fourStar = array.filter(item => item.qualityLevel === 4).length;
        const std5Star = array.filter(item => item.qualityLevel === 5 && resident.includes(item.name)).length;
        const fourStarWpn = array.filter(item => item.qualityLevel === 4 && item.resourceType === "武器").length;
        const max4Star = Object.entries(array.filter(item => item.qualityLevel === 4).reduce((acc, item) => (acc[item.name] = (acc[item.name] || 0) + 1, acc), {})).reduce((max, curr) => curr[1] > max[1] ? curr : max, ['无', 0])[0];
        const avg5Star = (fiveStar !== 0) ? Math.round((array.length - no5Star) / fiveStar) : 0;
        const avg4Star = (fourStar !== 0) ? Math.round((array.length - no4Star) / fourStar) : 0;
        const avgUP = (fiveStar - std5Star !== 0) ? Math.round((array.length - no5Star) / (fiveStar - std5Star)) : 0;
        const minPit = ((fiveStar, std5Star) => (fiveStar === std5Star ? 0.0 : ((fiveStar - std5Star * 2) / (fiveStar - std5Star) * 100).toFixed(1)))((resident.includes(array.filter(item => item.qualityLevel === 5)[0]?.name) ? 1 : 0) + fiveStar, std5Star);
        const upCost = (avgUP * 160 / 10000).toFixed(2);
        const worstLuck = Math.max(...(array.map((item, index) => item.qualityLevel === 5 ? index : -1).filter(index => index !== -1).reduce((gaps, curr, i, arr) => (i > 0 ? [...gaps, curr - arr[i - 1]] : gaps), [])), array.length - (array.map((item, index) => item.qualityLevel === 5 ? index : -1).filter(index => index !== -1).slice(-1)[0] + 1)) || 0;
        const bestLuck = Math.min(...(array.map((item, index) => item.qualityLevel === 5 ? index : -1).filter(index => index !== -1).reduce((gaps, curr, i, arr) => (i > 0 ? [...gaps, curr - arr[i - 1]] : gaps), [])), array.length - (array.map((item, index) => item.qualityLevel === 5 ? index : -1).filter(index => index !== -1).slice(-1)[0] + 1)) || 0;

        const pool = await Promise.all(array.filter(item => item.qualityLevel === 5).map(async (item) => ({
            name: item.name,
            times: (array.slice(array.indexOf(item) + 1).findIndex(x => x.qualityLevel === 5) + 1) || (array.length - array.indexOf(item)),
            isUp: !resident.includes(item.name),
            avatar: await this.getCharacterAvatar(item.name)
        })));

        return {
            info: {
                total: array.length,
                time: array.length > 0 ? [array[0].time, array[array.length - 1].time] : [null, null],
                no5Star: no5Star,
                no4Star: no4Star,
                fiveStar: fiveStar,
                fourStar: fourStar,
                std5Star: std5Star,
                fourStarWpn: fourStarWpn,
                max4Star: max4Star,
                avg5Star: avg5Star,
                avg4Star: avg4Star,
                avgUP: avgUP,
                minPit: minPit,
                upCost: upCost,
                worstLuck: worstLuck,
                bestLuck: bestLuck,
            },
            pool: pool
        };
    }

    async convertData(dataArray, toWWGF) {
        // 卡池类型映射
        const mappings = {
            forward: {
                gacha: {
                    "角色精准调谐": "0001",
                    "武器精准调谐": "0002",
                    "角色调谐（常驻池）": "0003",
                    "武器调谐（常驻池）": "0004",
                    "新手调谐": "0005",
                    "6": "0006",
                    "7": "0007"
                },
                type: {
                    "0001": "角色活动唤取",
                    "0002": "武器活动唤取",
                    "0003": "角色常驻唤取",
                    "0004": "武器常驻唤取",
                    "0005": "新手唤取",
                    "0006": "新手自选唤取",
                    "0007": "新手自选唤取（感恩定向唤取）"
                }
            },
            reverse: {
                "0001": "角色精准调谐",
                "0002": "武器精准调谐",
                "0003": "角色调谐（常驻池）",
                "0004": "武器调谐（常驻池）",
                "0005": "新手调谐",
                "0006": "新手自选唤取",
                "0007": "新手自选唤取（感恩定向唤取）"
            }
        };

        // 生成唯一ID的函数
        const generateId = (ts, poolId, drawNum) => 
            `${String(ts).padStart(10, '0')}${String(poolId).padStart(4, '0')}000${String(drawNum).padStart(2, '0')}`;
        
        if (toWWGF) {
            const timestampCount = {};
            
            return dataArray.map(item => {
                const ts = Math.floor(new Date(item.time).getTime() / 1000);
                const poolId = mappings.forward.gacha[item.cardPoolType];
                
                // 处理同一秒内的多次抽取
                timestampCount[ts] = timestampCount[ts] || 
                    Math.min(dataArray.filter(record => 
                        Math.floor(new Date(record.time).getTime() / 1000) === ts
                    ).length, 10);
                
                const drawNum = timestampCount[ts]--;
                const uniqueId = generateId(ts, poolId, drawNum);
                
                return {
                    gacha_id: poolId,
                    gacha_type: mappings.forward.type[poolId],
                    item_id: String(item.resourceId),
                    count: String(item.count),
                    time: item.time,
                    name: item.name,
                    item_type: item.resourceType,
                    rank_type: String(item.qualityLevel),
                    id: uniqueId  // 确保唯一性
                };
            });
        } else {
            return dataArray.map(item => ({
                cardPoolType: mappings.reverse[item.gacha_id],
                resourceId: Number(item.item_id),
                qualityLevel: Number(item.rank_type),
                resourceType: item.item_type,
                name: item.name,
                count: Number(item.count),
                time: item.time
            }));
        }
    }

    async gachaCount(e) {
        let [, message] = e.msg.match(this.rule[0].reg);

        const poolMapping = {
            "角色": 1,
            "武器": 2,
            "常驻角色": 3,
            "常驻武器": 4,
            "新手": 5,
            "自选": 6
        };

        const poolType = Object.entries(poolMapping).reduce((type, [key, value]) => e.msg.includes(key) ? value : type, 0);

        const boundId = await redis.get(`Yunzai:waves:gachaHistory:${e.user_id}`);
        const filePath = `${_path}/data/wavesGacha/${boundId}_Export.json`;

        if (boundId && fs.existsSync(filePath) && !message) {
            let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            await e.reply(`正在获取UID为 ${data.info.uid} 于 ${new Date(data.info.export_timestamp).toLocaleString()} 的抽卡记录，请稍候...`);

            let renderData = { playerId: data.info.uid };

            const getPoolData = async (gachaId) =>
                this.dataFormat(await this.convertData(data.list.filter(item => item.gacha_id == gachaId), false));

            if (poolType === 0) {
                renderData = {
                    ...renderData,
                    upCharPool: await getPoolData(1),
                    upWpnPool: await getPoolData(2),
                    stdCharPool: await getPoolData(3),
                    stdWpnPool: await getPoolData(4)
                };
            } else if (poolType > 0) {
                const key = poolType === 5 ? 'otherPool' : poolType === 6 ? 'upCharPool' : poolType === 1 ? 'upCharPool' : poolType === 2 ? 'upWpnPool' : poolType === 3 ? 'stdCharPool' : 'stdWpnPool';
                renderData = { ...renderData, [key]: await getPoolData(poolType) };
            }

            let imageCard = await Render.render('Template/gacha/gacha', {
                data: renderData,
            }, { e, retType: 'base64' });

            await e.reply(imageCard);
            return true;
        }

        if (!message) {
            await e.reply(`请在命令后面携带请求体或链接\n例：~抽卡统计https://aki-gm-resource...\n各平台抽卡记录获取详细步骤请发送[~抽卡帮助]`);
            return true;
        }

        let jsonData = {};
        const isJson = message.startsWith("{");
        const isUrl = message.match(/https?:\/\/[^\s/$.?#].[^\s]*/g);

        if (isJson) {
            try {
                jsonData = JSON.parse(message);
                if (!jsonData.playerId || !jsonData.recordId) {
                    throw new Error("缺少playerId或recordId");
                }
            } catch (error) {
                await e.reply(error.message || "无法转换成JSON格式，请复制完整请求体");
                return true;
            }
        } else if (isUrl) {
            message = isUrl[0].replace(/#/, "");
            try {
                const params = new URL(message).searchParams;
                jsonData.playerId = params.get("player_id");
                jsonData.recordId = params.get("record_id");
                jsonData.serverId = params.get("svr_id");
                if (!jsonData.playerId || !jsonData.recordId) {
                    throw new Error("缺少player_id或record_id");
                }
            } catch {
                await e.reply("无法解析链接，请复制完整链接");
                return true;
            }
        } else {
            await e.reply("未能解析成功，请在命令后面携带请求体或链接，各平台抽卡记录获取详细步骤请发送[~抽卡帮助]");
            return true;
        }

        await e.reply(`正在分析UID为 ${jsonData.playerId} 的抽卡记录，请稍候...`);

        const data = {
            playerId: jsonData.playerId,
            serverId: jsonData.serverId || "76402e5b20be2c39f095a152090afddc",
            languageCode: jsonData.languageCode || "zh-Hans",
            recordId: jsonData.recordId
        };

        const waves = new Waves();
        const getCardPool = async (poolId, poolType) =>
            await waves.getGaCha({ ...data, cardPoolId: poolId, cardPoolType: poolType });

        const pools = await Promise.all([
            getCardPool("1", "1"),
            getCardPool("2", "2"),
            getCardPool("3", "3"),
            getCardPool("4", "4"),
            getCardPool("5", "5"),
            getCardPool("6", "6"),
            getCardPool("7", "7"),
        ]);

        const failedPool = pools.find(pool => !pool.status);
        if (failedPool) {
            await e.reply("获取抽卡记录失败：" + failedPool.msg);
            return true;
        }

        const poolDataMapping = {
            0: {
                upCharPool: await this.dataFormat(pools[0].data),
                upWpnPool: await this.dataFormat(pools[1].data),
                stdCharPool: await this.dataFormat(pools[2].data),
                stdWpnPool: await this.dataFormat(pools[3].data)
            },
            1: { upCharPool: await this.dataFormat(pools[0].data) },
            2: { upWpnPool: await this.dataFormat(pools[1].data) },
            3: { stdCharPool: await this.dataFormat(pools[2].data) },
            4: { stdWpnPool: await this.dataFormat(pools[3].data) },
            5: { otherPool: await this.dataFormat(pools[4].data) },
            6: { upCharPool: await this.dataFormat(pools[5].data) },
        };

        const selectedPools = poolDataMapping[poolType] || {};
        const renderData = {
            playerId: jsonData.playerId,
            ...selectedPools
        };

        let imageCard = await Render.render('Template/gacha/gacha', {
            data: renderData,
        }, { e, retType: 'base64' });

        await e.reply(imageCard);

        await redis.set(`Yunzai:waves:gachaHistory:${e.user_id}`, jsonData.playerId);

        const json = {
            info: {
                lang: "zh-cn",
                region_time_zone: 8,
                export_timestamp: Date.now(),
                export_app: "Waves-Plugin",
                export_app_version: JSON.parse(fs.readFileSync(`${pluginRoot}/package.json`, 'utf-8')).version,
                wwgf_version: "v0.1b",
                uid: jsonData.playerId
            },
            list: await this.convertData([
                ...pools[0].data,
                ...pools[1].data,
                ...pools[2].data,
                ...pools[3].data,
                ...pools[4].data,
                ...pools[5].data,
                ...pools[6].data
            ], true)
        }

        // 检查并合并旧记录
        const oldFilePath = `${_path}/data/wavesGacha/${jsonData.playerId}_Export.json`;
        if (fs.existsSync(oldFilePath)) {
            try {
                const oldFileContent = fs.readFileSync(oldFilePath, 'utf-8');
                const oldData = JSON.parse(oldFileContent);
                const oldList = oldData.list;
                const oldExportTimestamp = oldData.info.export_timestamp;

                // 计算6个月前的时间戳
                const sixMonthsAgoDate = new Date();
                sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 6);
                const isOldFileRecent = oldExportTimestamp >= sixMonthsAgoDate.getTime();

                // 按卡池分组旧记录
                const filteredList = Object.values(
                    oldList.reduce((acc, item) => {
                        (acc[item.gacha_id] = acc[item.gacha_id] || []).push(item);
                        return acc;
                    }, {})
                )
                // 过滤保留有重叠或6个月内的记录
                .filter(group => {
                    const hasOverlap = group.some(oldItem => 
                        json.list.some(newItem => newItem.id === oldItem.id)
                    );
                    return hasOverlap || isOldFileRecent;
                })
                .flat();

                // 合并新旧记录并去重
                json.list = [...json.list, ...filteredList].filter(
                    (item, index, self) => index === self.findIndex(t => t.id === item.id)
                );

                // 按卡池和ID排序
                json.list.sort((a, b) => a.gacha_id - b.gacha_id || b.id - a.id);
            } catch (err) {
                logger.error('合并旧记录失败:', err);
            }
        }

        // 写入更新后的记录
        fs.writeFileSync(oldFilePath, JSON.stringify(json, null, 2));
        logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`已更新抽卡记录`), logger.green(`${jsonData.playerId}_Export.json`));

        return true;
    }

    async importGacha(e) {
        if (!Config.getConfig().allow_import) return await e.reply("当前不允许导入抽卡记录，请使用[~抽卡记录]进行更新");

        if (e.isGroup) return e.reply("请私聊导出抽卡记录")

        this.setContext('readFile');
        await this.reply('请发送Json文件');
    }

    async readFile() {
        this.finish('readFile');

        if (!this.e.file) {
            return await this.e.reply("未获取到Json文件，请再次使用[~导入抽卡记录]导入抽卡记录");
        }

        const path = `${_path}/data/wavesGacha/cache_${this.e.file.name}`;
        const { url, fid } = this.e.file;
        const groupUrl = this.e.group?.getFileUrl ? await this.e.group.getFileUrl(fid) : null;
        const friendUrl = this.e.friend?.getFileUrl ? await this.e.friend.getFileUrl(fid) : null;

        const fileUrl = url || groupUrl || friendUrl;

        if (!fileUrl) {
            return await this.reply("未获取到文件URL，请检查文件是否有效", true);
        }

        try {
            await Bot.download(fileUrl, path);
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`文件下载错误`), logger.red(error.stack));
            await this.reply(`导入抽卡记录失败：${error.message || '未知错误'}`, true);
            return true;
        }

        const json = JSON.parse(fs.readFileSync(path, 'utf-8'));

        if (!json || !json.info || !json.list) {
            await this.e.reply("导入抽卡记录失败：文件内容格式错误，请检查文件是否为WWGF标准格式");
            return true;
        }

        const { uid } = json.info;

        if (!uid) {
            await this.e.reply("未能获取到抽卡记录的UID，请检查文件是否为WWGF标准格式");
            return true;
        }

        const exportPath = `${_path}/data/wavesGacha/${uid}_Export.json`;

        if (fs.existsSync(exportPath)) {
            const oldFileContent = fs.readFileSync(exportPath, 'utf-8');
            const oldData = JSON.parse(oldFileContent);
            const oldList = oldData.list;
            const oldExportTimestamp = oldData.info.export_timestamp;

            const sixMonthsAgoDate = new Date();
            sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 6);
            const isOldFileRecent = oldExportTimestamp >= sixMonthsAgoDate.getTime();

            const filteredList = Object.values(oldList.reduce((acc, item) => {
                (acc[item.gacha_id] = acc[item.gacha_id] || []).push(item);
                return acc;
            }, {})).filter(group => {
                const hasOverlap = group.some(oldItem => json.list.some(newItem => newItem.id === oldItem.id));
                return hasOverlap || isOldFileRecent;
            }).flat();

            json.list = [...json.list, ...filteredList].filter((item, index, self) =>
                index === self.findIndex(t => t.id === item.id)
            );

            json.list.sort((a, b) => a.gacha_id - b.gacha_id || b.id - a.id);
        }

        fs.writeFileSync(exportPath, JSON.stringify(json, null, 2));
        await redis.set(`Yunzai:waves:gachaHistory:${this.e.user_id}`, uid);
        await this.e.reply(`导入抽卡记录成功，UID: ${uid}`);

        try {
            fs.unlinkSync(path);
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`删除临时文件失败`), logger.red(error.stack));
        }

        return true;
    }

    async exportGacha(e) {
        if (e.isGroup) return e.reply("请私聊导出抽卡记录")

        const boundId = await redis.get(`Yunzai:waves:gachaHistory:${e.user_id}`);
        if (!boundId) return await e.reply("您还没有绑定抽卡记录，请先使用[~抽卡统计]获取抽卡记录");

        const filePath = `${_path}/data/wavesGacha/${boundId}_Export.json`;
        if (!fs.existsSync(filePath)) return await e.reply("未找到您的抽卡记录文件");

        await e.reply({
            type: "file",
            file: filePath,
            name: `${boundId}_抽卡记录_${new Date().toISOString().split('T')[0]}.json`
        });

        return true;
    }

    async gachaHelp(e) {
        const helpMessage = [
            "【鸣潮抽卡记录获取帮助】",
            "1. 官方PC端/安卓端:",
            "   - 登录游戏后，在抽卡记录页面复制URL",
            "   - 格式: https://...?player_id=123&record_id=456",
            "   - 使用命令: ~抽卡统计[URL]",
            "",
            "2. 官方iOS端:",
            "   - 需要抓包获取请求体",
            "   - 格式: {\"playerId\":\"123\",\"recordId\":\"456\"}",
            "   - 使用命令: ~抽卡统计[请求体]",
            "",
            "3. 导入/导出功能:",
            "   - 导入: ~导入抽卡记录 (发送JSON文件)",
            "   - 导出: ~导出抽卡记录",
            "",
            "4. 数据更新:",
            "   - 更新角色数据: ~更新角色数据",
            "",
            "注意: 部分功能可能需要管理员权限"
        ].join("\n");

        await e.reply(helpMessage);
        return true;
    }
    }
