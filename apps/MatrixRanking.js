import plugin from '../../../lib/plugins/plugin.js';
import Config from '../components/Config.js';
import Render from '../components/Render.js';
import MatrixRankUtil from '../utils/MatrixRankUtil.js';
import path from 'path';

export class MatrixRanking extends plugin {
    constructor() {
        super({
            name: "鸣潮-矩阵排名",
            dsc: "鸣潮-终焉矩阵排名查询",
            event: "message",
            priority: 1008,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)矩阵(群)?排名([1-5])?$",
                    fnc: "matrixGroupRank"
                },
                {
                    reg: "^(?:～|~|鸣潮)矩阵总排名([1-5])?$",
                    fnc: "matrixGlobalRank"
                },
                {
                    reg: "^(?:～|~|鸣潮)矩阵(bot|BOT)排名([1-5])?$",
                    fnc: "matrixBotRank"
                }
            ]
        });

        this.pluginResources = path.join(process.cwd(), 'plugins', 'waves-plugin', 'resources');
    }

    // ~矩阵排名 / ~矩阵群排名
    async matrixGroupRank(e) {
        const match = e.msg.match(this.rule[0].reg);
        const page = match[2] ? parseInt(match[2]) : 1;
        const groupId = e.isGroup ? e.group_id : 'private';

        if (!e.isGroup) {
            return await e.reply('群排名仅在群聊中可用，请使用[~矩阵总排名]或[~矩阵bot排名]');
        }

        return await this.showRank(e, 'group', groupId, page, '群');
    }

    // ~矩阵总排名
    async matrixGlobalRank(e) {
        const match = e.msg.match(this.rule[1].reg);
        const page = match[1] ? parseInt(match[1]) : 1;
        const groupId = e.isGroup ? e.group_id : 'private';

        return await this.showRank(e, 'global', groupId, page, '总');
    }

    // ~矩阵bot排名 / ~矩阵BOT排名
    async matrixBotRank(e) {
        const match = e.msg.match(this.rule[2].reg);
        const page = match[2] ? parseInt(match[2]) : 1;
        const groupId = e.isGroup ? e.group_id : 'private';

        return await this.showRank(e, 'bot', groupId, page, 'BOT');
    }

    async showRank(e, scope, groupId, page, rankTypeName) {
        try {
            // 获取当前用户的UID列表
            let currentUserUIDs = [];
            if (e.user_id) {
                const accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
                if (accountList && accountList.length > 0) {
                    currentUserUIDs = accountList.map(account => account.roleId);
                }
            }

            const filePath = MatrixRankUtil.getRankFilePath(scope, groupId);
            const rankResult = MatrixRankUtil.loadRankData(filePath, currentUserUIDs, page);
            const rankData = rankResult.topList;
            const currentUserEntry = rankResult.currentUserEntry;
            const currentUserInRank = rankData.some(entry => entry.isCurrentUser);

            if (rankResult.totalCount === 0) {
                return await e.reply(`暂无矩阵${rankTypeName}排名数据，请先使用[~矩阵]查询以录入数据`);
            }

            if (rankData.length === 0) {
                return await e.reply(`矩阵${rankTypeName}排名最多只有 ${rankResult.totalPages} 页（共 ${rankResult.totalCount} 人），请输入 1-${rankResult.totalPages} 之间的页码`);
            }

            const imageCard = await this.generateRankImage(
                e, rankData, rankTypeName,
                currentUserUIDs, currentUserInRank, currentUserEntry,
                page, rankResult.totalPages, rankResult.totalCount
            );

            await e.reply(imageCard);
        } catch (err) {
            logger.error(`[矩阵排名] 错误: ${err.stack}`);
            await e.reply('生成矩阵排名时出错，请稍后再试');
        }
        return true;
    }

    async generateRankImage(e, rankData, rankType, currentUserUIDs, currentUserInRank, currentUserEntry, currentPage = 1, totalPages = 0, totalCount = 0) {
        try {
            const roleList = rankData.map(entry => {
                const playerInfo = entry.playerInfo || {};
                return {
                    rank: entry.rank,
                    score: entry.score,
                    uid: entry.uid,
                    name: playerInfo.name || '未知玩家',
                    avatar: playerInfo.avatar || '',
                    modeScores: playerInfo.modeScores || [],
                    teamIcons: playerInfo.teamIcons || [],
                    topTeams: playerInfo.topTeams || [],
                    isCurrentUser: entry.isCurrentUser
                };
            });

            let showCurrentUserRow = false;
            let currentUserRow = null;

            if (!currentUserInRank && currentUserEntry) {
                showCurrentUserRow = true;
                const playerInfo = currentUserEntry.playerInfo || {};
                currentUserRow = {
                    rank: currentUserEntry.rank,
                    score: currentUserEntry.score,
                    uid: currentUserEntry.uid,
                    name: playerInfo.name || '未知玩家',
                    avatar: playerInfo.avatar || '',
                    modeScores: playerInfo.modeScores || [],
                    teamIcons: playerInfo.teamIcons || [],
                    topTeams: playerInfo.topTeams || [],
                    isCurrentUser: true
                };
            }

            return await Render.render('Template/matrixRank/matrixRank', {
                roleList,
                updateTime: new Date().toLocaleString('zh-CN'),
                rankType,
                pluginResources: this.pluginResources,
                showCurrentUserRow,
                currentUserRow,
                currentPage,
                totalPages,
                totalCount
            }, { e, retType: 'base64', copyright: `数据来源: 库街区 · 生成时间: ${new Date().toLocaleString()}` });
        } catch (err) {
            logger.error(`[矩阵排名] 生成排名图片错误: ${err.stack}`);
            return '生成矩阵排名图片失败';
        }
    }
}
