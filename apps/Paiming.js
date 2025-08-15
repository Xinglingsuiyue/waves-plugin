import plugin from '../../../lib/plugins/plugin.js'
import WeightCalculator from '../utils/Calculate.js'
import Waves from "../components/Code.js";
import Config from '../components/Config.js';
import Wiki from '../components/Wiki.js';
import Render from '../components/Render.js';
import fs from 'fs';
import path from 'path';

// 漂泊者属性ID映射
const WAVERIDER_ATTRIBUTES = {
    '1604': '湮灭', '1605': '湮灭',
    '1501': '衍射', '1502': '衍射',
    '1406': '气动', '1408': '气动'
};

export class CharacterRanking extends plugin {
    constructor() {
        super({
            name: "鸣潮-角色声骸排名",
            event: "message",
            priority: 1010,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(.*?)(?:总|全服)?(?:排行|排名)$",
                    fnc: "characterRank"
                }
            ]
        });

        this.pluginResources = path.join(process.cwd(), 'plugins', 'waves-plugin', 'resources');
        this.RANK_DATA_PATH = path.join(this.pluginResources, 'data', 'CharacterRank');
        this.GLOBAL_RANK_DIR = path.join(this.RANK_DATA_PATH, 'global');
        this.GROUP_RANK_DIR = path.join(this.RANK_DATA_PATH, 'groups');
        
        this.ensureDirectoryExists(this.RANK_DATA_PATH);
        this.ensureDirectoryExists(this.GLOBAL_RANK_DIR);
        this.ensureDirectoryExists(this.GROUP_RANK_DIR);
        
        this.defaultConfig = {
            allowPublicGlobalRank: false,
            allowPublicGroupRank: true
        };
        
        this.config = this.loadConfig();
    }
    
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            logger.mark(`[角色声骸排名] 创建目录: ${dirPath}`);
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
    
    loadConfig() {
        try {
            const configPath = path.join(this.pluginResources, 'config', 'characterRanking.json');
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        } catch (err) {
            logger.error(`[角色声骸排名] 加载配置错误: ${err.stack}`);
        }
        return { ...this.defaultConfig };
    }
    
    saveConfig() {
        try {
            const configDir = path.join(this.pluginResources, 'config');
            this.ensureDirectoryExists(configDir);
            
            const configPath = path.join(configDir, 'characterRanking.json');
            fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
            logger.mark(`[角色声骸排名] 配置已保存`);
        } catch (err) {
            logger.error(`[角色声骸排名] 保存配置错误: ${err.stack}`);
        }
    }
    
    async characterRank(e) {
        const matchResult = e.msg.match(this.rule[0].reg);
        if (!matchResult) return true;
        
        const charName = matchResult[1].trim();
        const isGlobal = matchResult[2] === "总";
        const groupId = e.isGroup ? e.group_id : 'private';
        
        if (!charName) return e.reply('请输入角色名称，例如：~安可排名');
        
        try {
            // 获取当前用户绑定的所有UID
            let currentUserUIDs = [];
            if (e.user_id) {
                const accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
                if (accountList && accountList.length > 0) {
                    currentUserUIDs = accountList.map(account => account.roleId);
                }
            }

            // 获取角色标准名称
            const wiki = new Wiki();
            let name = await wiki.getAlias(charName);
            
            // 处理漂泊者角色
            if (name.includes('漂泊者')) {
                // 尝试获取具体属性
                const attributeMatch = charName.match(/(湮灭|衍射|气动)/);
                if (attributeMatch) {
                    name = `漂泊者${attributeMatch[0]}`;
                } else {
                    // 默认处理为湮灭
                    name = '漂泊者湮灭';
                }
            }
            
            if (!name) return e.reply(`找不到角色: ${charName}`);
            
            const rankResult = isGlobal
                ? this.loadRankData(this.getGlobalRankFilePath(name), currentUserUIDs)
                : this.loadRankData(this.getGroupRankFilePath(groupId, name), currentUserUIDs);
            
            const rankData = rankResult.topList;
            const currentUserEntry = rankResult.currentUserEntry;
            
            // 检查当前用户是否在前20名中
            const currentUserInRank = rankData.some(entry => entry.isCurrentUser);
            
            // 生成排名图片
            let imageCard = '';
            try {
                imageCard = await this.generateRankImage(
                    e, 
                    name, 
                    rankData, 
                    isGlobal ? '总' : '群',
                    currentUserUIDs,
                    currentUserInRank,
                    currentUserEntry
                );
            } catch (err) {
                logger.error(`[角色声骸排名] 生成排名图片错误: ${err.stack}`);
                imageCard = '生成排名图片失败，请检查模板文件';
            }
            
            await e.reply(imageCard);
        } catch (err) {
            logger.error(`[角色声骸排名] 错误: ${err.stack}`);
            await e.reply('生成排名时出错，请稍后再试');
        }
        return true;
    }

    loadRankData(filePath, currentUserUIDs = []) {
        if (!fs.existsSync(filePath)) {
            logger.mark(`[角色声骸排名] 排名文件不存在: ${filePath}`);
            return { topList: [], currentUserEntry: null };
        }
        
        try {
            const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const sortedData = rawData.sort((a, b) => b.score - a.score);
            
            // 获取前20名
            const topList = sortedData.slice(0, 20).map((entry, index) => {
                const isCurrentUser = currentUserUIDs.includes(entry.uid);
                return {
                    rank: index + 1,
                    score: entry.score.toFixed(2),
                    uid: entry.uid,
                    charInfo: entry.charInfo,
                    isCurrentUser
                };
            });
            
            // 获取当前用户的完整排名信息（包括100名之后）
            let currentUserEntry = null;
            for (let i = 0; i < sortedData.length; i++) {
                const entry = sortedData[i];
                if (currentUserUIDs.includes(entry.uid)) {
                    // 处理排名显示：100名内显示具体排名，100名外显示"100+"
                    const rankDisplay = i < 100 ? i + 1 : "100+";
                    
                    currentUserEntry = {
                        ...entry,
                        rank: rankDisplay,
                        score: entry.score.toFixed(2),
                        isCurrentUser: true
                    };
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
            // 转换数据结构以适配模板
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
                            [{ phantomProp: { iconUrl: phantomInfo.icon } }] : 
                            []
                    },
                    uid: entry.uid,
                    isCurrentUser: entry.isCurrentUser
                };
            });

            // 处理第21行数据（当前用户未进前20）
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
                            [{ phantomProp: { iconUrl: phantomInfo.icon } }] : 
                            []
                    },
                    uid: currentUserEntry.uid,
                    isCurrentUser: true
                };
            }
            
            return await Render.render('Template/ranking/charRankFull', {
                charName,
                roleList,
                updateTime: new Date().toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                rankType,
                pluginResources: this.pluginResources,
                showCurrentUserRow,
                currentUserRow
            }, { e, retType: 'base64' });
        } catch (err) {
            logger.error(`[角色声骸排名] 生成排名图片错误: ${err.stack}`);
            return '生成排名图片失败，请检查模板文件';
        }
    }
}
