import plugin from '../../../lib/plugins/plugin.js'
import Config from '../components/Config.js';
import Wiki from '../components/Wiki.js';
import Render from '../components/Render.js';
import fs from 'fs';
import path from 'path';

export class CharacterRanking extends plugin {
    constructor() {
        super({
            name: "鸣潮-角色声骸排名",
            event: "message",
            priority: 1010,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(?!(?:开启|关闭))(.*?)(总)?(?:排行|排名|排名榜|排行榜)([1-5])?$",
                    fnc: "characterRank"
                },
                {
                    reg: "^(?:～|~|鸣潮)(?:同步|数据)(?:排行|排名)(?:数据|同步)$",
                    fnc: "syncRankData",
                    permission: "master"
                },
                {
                    reg: "^(?:～|~|鸣潮)(?:开启|关闭)总排名$",
                    fnc: "toggleGlobalRanking",
                    permission: "master"
                },
                {
                    reg: "^(?:～|~|鸣潮)(?:开启|关闭)群排名$",
                    fnc: "toggleGroupRanking"
                },
                {
                    reg: "^(?:～|~|鸣潮)(?:排名|排行|排行榜|排名榜)(?:状态|开关)$",
                    fnc: "checkRankStatus"
                }
            ]
        });

        this.pluginResources = path.join(process.cwd(), 'plugins', 'waves-plugin', 'resources');
        this.RANK_DATA_PATH = path.join(this.pluginResources, 'data', 'CharacterRank');
        this.GLOBAL_RANK_DIR = path.join(this.RANK_DATA_PATH, 'global');
        this.GROUP_RANK_DIR = path.join(this.RANK_DATA_PATH, 'groups');
        
        this.ensureDirectoryExists(this.GLOBAL_RANK_DIR);
        this.ensureDirectoryExists(this.GROUP_RANK_DIR);
    }
    
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }
    
    getGroupRankFilePath(groupId, charName) {
        const groupDir = path.join(this.GROUP_RANK_DIR, `group_${groupId}`);
        this.ensureDirectoryExists(groupDir);
        return path.join(groupDir, `${charName}.json`);
    }

    getGlobalRankFilePath(charName) {
        return path.join(this.GLOBAL_RANK_DIR, `${charName}.json`);
    }
    
    async syncRankData(e) {
        await e.reply('开始同步群数据到全局排名...');
        const result = await this.syncAllGroupDataToGlobal();
        
        if (result.success) {
            await e.reply(`数据同步完成！处理了 ${result.totalFiles} 个群文件，同步了 ${result.totalCharacters} 个角色`);
        } else {
            await e.reply('数据同步失败，请查看日志了解详情');
        }
        
        return true;
    }
    
    async characterRank(e) {
        const matchResult = e.msg.match(this.rule[0].reg);
        if (!matchResult) return true;
        
        const charName = matchResult[1].trim();
        const isGlobal = matchResult[2] === "总";
        const page = matchResult[3] ? parseInt(matchResult[3]) : 1;
        const groupId = e.isGroup ? e.group_id : 'private';
        
        if (!charName) return e.reply('请输入角色名称，例如：~安可排名');
        
        try {
            let currentUserUIDs = [];
            if (e.user_id) {
                const accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
                if (accountList && accountList.length > 0) {
                    currentUserUIDs = accountList.map(account => account.roleId);
                }
            }

            const wiki = new Wiki();
            let name = await wiki.getAlias(charName);
            
            if (name.includes('漂泊者')) {
                const attributeMatch = charName.match(/(湮灭|衍射|导电|气动|热熔|冷凝)/);
                name = attributeMatch ? `漂泊者${attributeMatch[0]}` : '漂泊者湮灭';
            }
            
            if (!name) return e.reply(`找不到角色: ${charName}`);
            
            const filePath = isGlobal ? 
                this.getGlobalRankFilePath(name) : 
                this.getGroupRankFilePath(groupId, name);
            
            const rankResult = this.loadRankData(filePath, currentUserUIDs, page);
            const rankData = rankResult.topList;
            const currentUserEntry = rankResult.currentUserEntry;
            const currentUserInRank = rankData.some(entry => entry.isCurrentUser);
            
            if (rankResult.totalCount > 0 && rankData.length === 0) {
                return e.reply(`「${name}」${isGlobal ? '总' : '群'}排名最多只有 ${rankResult.totalPages} 页（共 ${rankResult.totalCount} 人），请输入 1-${rankResult.totalPages} 之间的页码`);
            }
            
            let imageCard = await this.generateRankImage(
                e, name, rankData, isGlobal ? '总' : '群',
                currentUserUIDs, currentUserInRank, currentUserEntry,
                page, rankResult.totalPages, rankResult.totalCount
            );
            
            await e.reply(imageCard);
        } catch (err) {
            logger.error(`[角色声骸排名] 错误: ${err.stack}`);
            await e.reply('生成排名时出错，请稍后再试');
        }
        return true;
    }

    loadRankData(filePath, currentUserUIDs = [], page = 1) {
        if (!fs.existsSync(filePath)) {
            return { topList: [], currentUserEntry: null, totalCount: 0, totalPages: 0 };
        }
        
        try {
            const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const sortedData = rawData.sort((a, b) => b.score - a.score);
            const totalCount = sortedData.length;
            const pageSize = 20;
            const maxPages = 5;
            const totalPages = Math.min(Math.ceil(totalCount / pageSize), maxPages);
            
            const startIndex = (page - 1) * pageSize;
            const topList = sortedData.slice(startIndex, startIndex + pageSize).map((entry, index) => ({
                rank: startIndex + index + 1,
                score: entry.score.toFixed(2),
                uid: entry.uid,
                charInfo: entry.charInfo,
                isCurrentUser: currentUserUIDs.includes(entry.uid)
            }));
            
            let currentUserEntry = null;
            for (let i = 0; i < sortedData.length; i++) {
                const entry = sortedData[i];
                if (currentUserUIDs.includes(entry.uid)) {
                    const rankDisplay = i < 100 ? i + 1 : "100+";
                    currentUserEntry = { ...entry, rank: rankDisplay, score: entry.score.toFixed(2), isCurrentUser: true };
                    break;
                }
            }
            
            return { topList, currentUserEntry, totalCount, totalPages };
        } catch (err) {
            logger.error(`[角色声骸排名] 解析排名文件错误: ${err.stack}`);
            return { topList: [], currentUserEntry: null, totalCount: 0, totalPages: 0 };
        }
    }

    async generateRankImage(e, charName, rankData, rankType, currentUserUIDs, currentUserInRank, currentUserEntry, currentPage = 1, totalPages = 0, totalCount = 0) {
        try {
            const roleList = rankData.map(entry => {
                const charInfo = entry.charInfo || {};
                const weaponInfo = charInfo.weapon || {};
                const phantomInfo = charInfo.phantom || {};
                
                return {
                    rank: entry.rank,
                    level: charInfo.level || 0,
                    chainCount: charInfo.chainCount || 0,
                    roleName: charInfo.roleName || '未知角色',
                    roleIconUrl: charInfo.roleIcon || "",
                    weaponData: {
                        level: weaponInfo.level || 0,
                        resonLevel: weaponInfo.resonLevel || 0,
                        weapon: {
                            weaponName: weaponInfo.name || "未知武器",
                            iconUrl: weaponInfo.icon || ""
                        }
                    },
                    phantomData: {
                        statistic: {
                            totalScore: parseFloat(entry.score) || 0,
                            rank: phantomInfo.rank || 'N',
                            color: phantomInfo.color || "#a0a0a0"
                        },
                        equipPhantomList: (phantomInfo.icon || charInfo.phantomIcon) ?
                            [{ phantomProp: { iconUrl: phantomInfo.icon || charInfo.phantomIcon } }] : []
                    },
                    uid: entry.uid,
                    isCurrentUser: entry.isCurrentUser
                };
            });

            let showCurrentUserRow = false;
            let currentUserRow = null;
            
            if (!currentUserInRank && currentUserEntry) {
                showCurrentUserRow = true;
                const charInfo = currentUserEntry.charInfo || {};
                const weaponInfo = charInfo.weapon || {};
                const phantomInfo = charInfo.phantom || {};
                
                currentUserRow = {
                    rank: currentUserEntry.rank,
                    level: charInfo.level || 0,
                    chainCount: charInfo.chainCount || 0,
                    roleName: charInfo.roleName || '未知角色',
                    roleIconUrl: charInfo.roleIcon || "",
                    weaponData: {
                        level: weaponInfo.level || 0,
                        resonLevel: weaponInfo.resonLevel || 0,
                        weapon: {
                            weaponName: weaponInfo.name || "未知武器",
                            iconUrl: weaponInfo.icon || ""
                        }
                    },
                    phantomData: {
                        statistic: {
                            totalScore: parseFloat(currentUserEntry.score) || 0,
                            rank: phantomInfo.rank || 'N',
                            color: phantomInfo.color || "#a0a0a0"
                        },
                        equipPhantomList: (phantomInfo.icon || charInfo.phantomIcon) ?
                            [{ phantomProp: { iconUrl: phantomInfo.icon || charInfo.phantomIcon } }] : []
                    },
                    uid: currentUserEntry.uid,
                    isCurrentUser: true
                };
            }
            
            return await Render.render('Template/ranking/charRankFull', {
                charName,
                roleList,
                updateTime: new Date().toLocaleString('zh-CN'),
                rankType,
                pluginResources: this.pluginResources,
                showCurrentUserRow,
                currentUserRow,
                currentPage,
                totalPages,
                totalCount
            }, { e, retType: 'base64' });
        } catch (err) {
            logger.error(`[角色声骸排名] 生成排名图片错误: ${err.stack}`);
            return '生成排名图片失败';
        }
    }
    
    async syncAllGroupDataToGlobal() {
        try {
            if (!fs.existsSync(this.GROUP_RANK_DIR)) {
                return { success: true, totalFiles: 0, totalCharacters: 0 };
            }
            
            const groupDirs = fs.readdirSync(this.GROUP_RANK_DIR);
            let totalSynced = 0;
            let totalCharacters = 0;
            
            const allGroupData = new Map();
            
            for (const groupDir of groupDirs) {
                if (!groupDir.startsWith('group_')) continue;
                
                const groupPath = path.join(this.GROUP_RANK_DIR, groupDir);
                if (!fs.statSync(groupPath).isDirectory()) continue;
                
                const charFiles = fs.readdirSync(groupPath);
                
                for (const charFile of charFiles) {
                    if (!charFile.endsWith('.json')) continue;
                    
                    const charName = path.basename(charFile, '.json');
                    const groupFilePath = path.join(groupPath, charFile);
                    
                    try {
                        const groupData = JSON.parse(fs.readFileSync(groupFilePath, 'utf8'));
                        
                        if (!allGroupData.has(charName)) {
                            allGroupData.set(charName, new Map());
                        }
                        
                        const charMap = allGroupData.get(charName);
                        groupData.forEach(entry => {
                            if (!entry.timestamp) entry.timestamp = Date.now();
                            const existing = charMap.get(entry.uid);
                            if (!existing || entry.score > existing.score) {
                                charMap.set(entry.uid, entry);
                            }
                        });
                        
                        totalSynced++;
                    } catch (err) {
                        logger.error(`[角色声骸排名] 读取群文件错误 ${groupFilePath}: ${err.stack}`);
                    }
                }
            }
            
            for (const [charName, groupCharMap] of allGroupData) {
                const globalFilePath = this.getGlobalRankFilePath(charName);
                let globalData = [];
                
                if (fs.existsSync(globalFilePath)) {
                    try {
                        globalData = JSON.parse(fs.readFileSync(globalFilePath, 'utf8'));
                    } catch (err) {
                        globalData = [];
                    }
                }
                
                const mergedData = this.mergeRankData(globalData, Array.from(groupCharMap.values()));
                
                try {
                    fs.writeFileSync(globalFilePath, JSON.stringify(mergedData, null, 2), 'utf8');
                    totalCharacters++;
                } catch (err) {
                    logger.error(`[角色声骸排名] 保存全局文件错误 ${globalFilePath}: ${err.stack}`);
                }
            }
            
            return { success: true, totalFiles: totalSynced, totalCharacters: totalCharacters };
        } catch (err) {
            logger.error(`[角色声骸排名] 同步数据错误: ${err.stack}`);
            return { success: false, totalFiles: 0, totalCharacters: 0 };
        }
    }
    
    mergeRankData(globalData, groupData) {
        const uidMap = new Map();
        
        globalData.forEach(entry => uidMap.set(entry.uid, entry));
        groupData.forEach(entry => {
            if (!entry.timestamp) entry.timestamp = Date.now();
            const existing = uidMap.get(entry.uid);
            if (!existing || entry.score > existing.score) {
                uidMap.set(entry.uid, entry);
            }
        });
        
        return Array.from(uidMap.values()).sort((a, b) => b.score - a.score);
    }

    async toggleGlobalRanking(e) {
        const isEnable = e.msg.includes('开启');
        const config = Config.getConfig();
        config.ranking_reject_public_cookie_global = isEnable;
        await Config.setConfig(config);
        return e.reply(`已${isEnable ? '开启' : '关闭'}总排名严格模式（${isEnable ? '仅~登录用户录入' : '允许未~登录用户录入'}）`, true);
    }

    async toggleGroupRanking(e) {
        if (!e.isGroup) {
            if (!e.isMaster) {
                return e.reply('只有主人才能在私聊中操作排名开关', true);
            }
            const isEnable = e.msg.includes('开启');
            const config = Config.getConfig();
            config.ranking_reject_public_cookie_group = isEnable;
            await Config.setConfig(config);
            return e.reply(`已${isEnable ? '开启' : '关闭'}所有群排名严格模式（${isEnable ? '仅~登录用户录入' : '允许未~登录用户录入'}）`, true);
        }

        const member = e.group.pickMember(e.user_id);
        if (!member.is_owner && !member.is_admin && !e.isMaster) {
            return e.reply('只有群主、管理员或主人才能操作群排名开关', true);
        }

        const isEnable = e.msg.includes('开启');
        const key = `Yunzai:waves:ranking_reject_public:${e.group_id}`;
        await redis.set(key, isEnable ? '1' : '0');
        return e.reply(`已${isEnable ? '开启' : '关闭'}本群排名严格模式（${isEnable ? '仅~登录用户录入' : '允许未~登录用户录入'}）`, true);
    }

    static async isGlobalRankingEnabled() {
        return true;
    }

    static async isGroupRankingEnabled(groupId) {
        return true;
    }

    static async isAllowPublicCookie(id, type) {
        if (type === 'global') {
            const config = Config.getConfig();
            return config.ranking_reject_public_cookie_global === false;
        } else {
            const key = `Yunzai:waves:ranking_reject_public:${id}`;
            const value = await redis.get(key);
            return value === '0';
        }
    }

    async checkRankStatus(e) {
        const config = Config.getConfig();
        
        const globalStrict = config.ranking_reject_public_cookie_global !== false;
        const globalStatus = globalStrict ? '严格模式（仅~登录）' : '宽松模式（允许未~登录）';
        
        let msg = `【排名状态】\n`;
        msg += `━━━━━━━━━━━━━━\n`;
        msg += `总排名：${globalStatus}\n`;
        
        // 群排名状态
        if (e.isGroup) {
            const groupId = e.group_id;
            const key = `Yunzai:waves:ranking_reject_public:${groupId}`;
            const value = await redis.get(key);
            const groupStrict = value !== '0';
            const groupStatus = groupStrict ? '严格模式（仅~登录）' : '宽松模式（允许未~登录）';
            msg += `本群排名：${groupStatus}\n`;
        } else {
            msg += `本群排名：未在群聊中\n`;
        }
        
        msg += `━━━━━━━━━━━━━━\n`;
        msg += `严格模式：仅录入~登录用户数据\n`;
        msg += `宽松模式：允许录入未~登录用户数据`;
        
        return e.reply(msg, true);
    }
}
