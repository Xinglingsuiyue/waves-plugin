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
                    reg: "^(?:～|~|鸣潮)(.*?)(总)?(?:排行|排名)$",
                    fnc: "characterRank"
                },
                {
                    reg: "^(?:～|~|鸣潮)(?:同步|数据)(?:排行|排名)(?:数据|同步)$",
                    fnc: "syncRankData",
                    permission: "master"
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
                const attributeMatch = charName.match(/(湮灭|衍射|气动)/);
                name = attributeMatch ? `漂泊者${attributeMatch[0]}` : '漂泊者湮灭';
            }
            
            if (!name) return e.reply(`找不到角色: ${charName}`);
            
            const filePath = isGlobal ? 
                this.getGlobalRankFilePath(name) : 
                this.getGroupRankFilePath(groupId, name);
            
            const rankResult = this.loadRankData(filePath, currentUserUIDs);
            const rankData = rankResult.topList;
            const currentUserEntry = rankResult.currentUserEntry;
            const currentUserInRank = rankData.some(entry => entry.isCurrentUser);
            
            let imageCard = await this.generateRankImage(
                e, name, rankData, isGlobal ? '总' : '群',
                currentUserUIDs, currentUserInRank, currentUserEntry
            );
            
            await e.reply(imageCard);
        } catch (err) {
            logger.error(`[角色声骸排名] 错误: ${err.stack}`);
            await e.reply('生成排名时出错，请稍后再试');
        }
        return true;
    }

    loadRankData(filePath, currentUserUIDs = []) {
        if (!fs.existsSync(filePath)) {
            return { topList: [], currentUserEntry: null };
        }
        
        try {
            const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const sortedData = rawData.sort((a, b) => b.score - a.score);
            
            const topList = sortedData.slice(0, 20).map((entry, index) => ({
                rank: index + 1,
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
            
            return { topList, currentUserEntry };
        } catch (err) {
            logger.error(`[角色声骸排名] 解析排名文件错误: ${err.stack}`);
            return { topList: [], currentUserEntry: null };
        }
    }

    async generateRankImage(e, charName, rankData, rankType, currentUserUIDs, currentUserInRank, currentUserEntry) {
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
                        equipPhantomList: phantomInfo.icon ? 
                            [{ phantomProp: { iconUrl: phantomInfo.icon } }] : []
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
                        equipPhantomList: phantomInfo.icon ? 
                            [{ phantomProp: { iconUrl: phantomInfo.icon } }] : []
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
                currentUserRow
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
}
