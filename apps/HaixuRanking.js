import plugin from '../../../lib/plugins/plugin.js';
import Config from '../components/Config.js';
import Render from '../components/Render.js';
import HaixuRankUtil from '../utils/HaixuRankUtil.js';
import path from 'path';

export class HaixuRanking extends plugin {
    constructor() {
        super({
            name: "鸣潮-海墟排名",
            dsc: "鸣潮-冥歌海墟排名查询",
            event: "message",
            priority: 1008,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(上期)?海墟(群)?(?:排行|排行榜|排名)([1-5])?$",
                    fnc: "haixuGroupRank"
                },
                {
                    reg: "^(?:～|~|鸣潮)(上期)?海墟总(?:排行|排行榜|排名)([1-5])?$",
                    fnc: "haixuGlobalRank"
                },
                {
                    reg: "^(?:～|~|鸣潮)(上期)?海墟(bot|BOT)(?:排行|排行榜|排名)([1-5])?$",
                    fnc: "haixuBotRank"
                },
                {
                    reg: "^(?:～|~|鸣潮)(?:开启|关闭)海墟总(?:排行|排行榜|排名)$",
                    fnc: "toggleHaixuGlobalRanking",
                    permission: "master"
                },
                {
                    reg: "^(?:～|~|鸣潮)(?:开启|关闭)海墟群(?:排行|排行榜|排名)$",
                    fnc: "toggleHaixuGroupRanking"
                },
                {
                    reg: "^(?:～|~|鸣潮)海墟(?:排行|排行榜|排名)(?:状态|开关)$",
                    fnc: "checkHaixuRankStatus"
                }
            ]
        });

        this.pluginResources = path.join(process.cwd(), 'plugins', 'waves-plugin', 'resources');
    }

    async haixuGroupRank(e) {
        const match = e.msg.match(this.rule[0].reg);
        const seasonOffset = match[1] ? 1 : 0;
        const page = match[3] ? parseInt(match[3]) : 1;
        const groupId = e.isGroup ? e.group_id : 'private';

        if (!e.isGroup) {
            return await e.reply('群排名仅在群聊中可用，请使用[~海墟总排名]或[~海墟bot排名]');
        }

        return await this.showRank(e, 'group', groupId, page, '群', seasonOffset);
    }

    async haixuGlobalRank(e) {
        const match = e.msg.match(this.rule[1].reg);
        const seasonOffset = match[1] ? 1 : 0;
        const page = match[2] ? parseInt(match[2]) : 1;
        const groupId = e.isGroup ? e.group_id : 'private';

        return await this.showRank(e, 'global', groupId, page, '总', seasonOffset);
    }

    async haixuBotRank(e) {
        const match = e.msg.match(this.rule[2].reg);
        const seasonOffset = match[1] ? 1 : 0;
        const page = match[3] ? parseInt(match[3]) : 1;
        const groupId = e.isGroup ? e.group_id : 'private';

        return await this.showRank(e, 'bot', groupId, page, 'BOT', seasonOffset);
    }

    async showRank(e, scope, groupId, page, rankTypeName, seasonOffset = 0) {
        try {
            let currentUserUIDs = [];
            if (e.user_id) {
                const accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
                if (accountList && accountList.length > 0) {
                    currentUserUIDs = accountList.map(account => account.roleId);
                }
            }

            const filePath = HaixuRankUtil.getRankFilePath(scope, groupId);
            const rankResult = HaixuRankUtil.loadRankData(filePath, currentUserUIDs, page, seasonOffset);
            const rankData = rankResult.topList;
            const currentUserEntries = rankResult.currentUserEntries || [];
            const currentUserInRankUids = new Set(
                rankData.filter(entry => entry.isCurrentUser).map(entry => String(entry.uid))
            );

            const seasonLabel = seasonOffset > 0 ? '上期' : '';
            const seasonDateLabel = rankResult.seasonInfo?.seasonLabel || '';

            if (rankResult.totalCount === 0) {
                return await e.reply(`暂无${seasonLabel}海墟${rankTypeName}排名数据，请先使用[~海墟]查询以录入数据`);
            }

            if (rankData.length === 0) {
                return await e.reply(`${seasonLabel}海墟${rankTypeName}排名最多只有 ${rankResult.totalPages} 页（共 ${rankResult.totalCount} 人），请输入 1-${rankResult.totalPages} 之间的页码`);
            }

            const displayRankType = seasonOffset > 0 ? `上期${rankTypeName}` : rankTypeName;

            const imageCard = await this.generateRankImage(
                e, rankData, displayRankType,
                currentUserUIDs, currentUserInRankUids, currentUserEntries,
                page, rankResult.totalPages, rankResult.totalCount, seasonDateLabel
            );

            await e.reply(imageCard);
        } catch (err) {
            logger.error(`[海墟排名] 错误: ${err.stack}`);
            await e.reply('生成海墟排名时出错，请稍后再试');
        }
        return true;
    }

    async generateRankImage(e, rankData, rankType, currentUserUIDs, currentUserInRankUids, currentUserEntries, currentPage = 1, totalPages = 0, totalCount = 0, seasonDateLabel = '') {
        try {
            const RANK_ICON_MAP = {
                'B':   'Template/slash/imgs/B.png',
                'A':   'Template/slash/imgs/A.png',
                'S':   'Template/slash/imgs/S.png',
                'SS':  'Template/slash/imgs/SS.png',
                'SSS': 'Template/slash/imgs/SSS.png',
            };

            const RANK_TIER_MAP = {
                'B':   'rating-b',
                'A':   'rating-a',
                'S':   'rating-s',
                'SS':  'rating-ss',
                'SSS': 'rating-sss',
            };

            const getScoreRatingIcon = (playerInfo) => {
                const rank = (playerInfo && playerInfo.rank) ? String(playerInfo.rank).toUpperCase() : '';
                return RANK_ICON_MAP[rank] || '';
            };

            const getScoreRatingTier = (playerInfo) => {
                const rank = (playerInfo && playerInfo.rank) ? String(playerInfo.rank).toUpperCase() : '';
                return RANK_TIER_MAP[rank] || '';
            };

            const roleList = rankData.map(entry => {
                const playerInfo = entry.playerInfo || {};
                return {
                    rank: entry.rank,
                    score: entry.score,
                    uid: entry.uid,
                    name: playerInfo.name || '未知玩家',
                    avatar: playerInfo.avatar || '',
                    levelName: playerInfo.levelName || '无尽湍渊',
                    teamIcons: playerInfo.teamIcons || [],
                    topTeams: playerInfo.topTeams || [],
                    haixuRank: playerInfo.rank || '',
                    ratingIcon: getScoreRatingIcon(playerInfo),
                    ratingTier: getScoreRatingTier(playerInfo),
                    isCurrentUser: entry.isCurrentUser
                };
            });

            const currentUserRows = [];
            for (const entry of currentUserEntries) {
                if (currentUserInRankUids.has(String(entry.uid))) continue;
                const playerInfo = entry.playerInfo || {};
                currentUserRows.push({
                    rank: entry.rank,
                    score: entry.score,
                    uid: entry.uid,
                    name: playerInfo.name || '未知玩家',
                    avatar: playerInfo.avatar || '',
                    levelName: playerInfo.levelName || '无尽湍渊',
                    teamIcons: playerInfo.teamIcons || [],
                    topTeams: playerInfo.topTeams || [],
                    haixuRank: playerInfo.rank || '',
                    ratingIcon: getScoreRatingIcon(playerInfo),
                    ratingTier: getScoreRatingTier(playerInfo),
                    isCurrentUser: true
                });
            }

            return await Render.render('Template/haixuRank/haixuRank', {
                roleList,
                updateTime: new Date().toLocaleString('zh-CN'),
                rankType,
                pluginResources: this.pluginResources,
                showCurrentUserRow: currentUserRows.length > 0,
                currentUserRows,
                currentPage,
                totalPages,
                totalCount
            }, { e, retType: 'base64', copyright: `数据来源: 库街区 · 生成时间: ${new Date().toLocaleString()}` });
        } catch (err) {
            logger.error(`[海墟排名] 生成排名图片错误: ${err.stack}`);
            return '生成海墟排名图片失败';
        }
    }

    async toggleHaixuGlobalRanking(e) {
        const isEnable = e.msg.includes('开启');
        const config = Config.getConfig();
        config.haixu_reject_public_cookie_global = isEnable;
        await Config.setConfig(config);
        return e.reply(`已${isEnable ? '开启' : '关闭'}海墟总排名严格模式（${isEnable ? '仅~登录用户录入' : '允许未~登录用户录入'}）`, true);
    }

    async toggleHaixuGroupRanking(e) {
        if (!e.isGroup) {
            if (!e.isMaster) {
                return e.reply('只有主人才能在私聊中操作海墟排名开关', true);
            }
            const isEnable = e.msg.includes('开启');
            const config = Config.getConfig();
            config.haixu_reject_public_cookie_group = isEnable;
            await Config.setConfig(config);
            return e.reply(`已${isEnable ? '开启' : '关闭'}所有群海墟排名严格模式（${isEnable ? '仅~登录用户录入' : '允许未~登录用户录入'}）`, true);
        }

        const member = e.group.pickMember(e.user_id);
        if (!member.is_owner && !member.is_admin && !e.isMaster) {
            return e.reply('只有群主、管理员或主人才能操作海墟排名开关', true);
        }

        const isEnable = e.msg.includes('开启');
        const key = `Yunzai:waves:haixu_reject_public:${e.group_id}`;
        await redis.set(key, isEnable ? '1' : '0');
        return e.reply(`已${isEnable ? '开启' : '关闭'}本群海墟排名严格模式（${isEnable ? '仅~登录用户录入' : '允许未~登录用户录入'}）`, true);
    }

    async checkHaixuRankStatus(e) {
        const config = Config.getConfig();

        const globalStrict = config.haixu_reject_public_cookie_global !== false;
        const globalStatus = globalStrict ? '严格模式（仅~登录）' : '宽松模式（允许未~登录）';

        let msg = `【海墟排名状态】\n`;
        msg += `━━━━━━━━━━━━━━\n`;
        msg += `海墟总排名：${globalStatus}\n`;

        if (e.isGroup) {
            const groupId = e.group_id;
            const allowPublic = await HaixuRanking.isHaixuAllowPublicCookie(groupId, 'group');
            const groupStrict = !allowPublic;
            const groupStatus = groupStrict ? '严格模式（仅~登录）' : '宽松模式（允许未~登录）';
            msg += `本群海墟排名：${groupStatus}\n`;
        } else {
            msg += `本群海墟排名：未在群聊中\n`;
        }

        msg += `━━━━━━━━━━━━━━\n`;
        msg += `严格模式：仅录入~登录用户数据\n`;
        msg += `宽松模式：允许录入未~登录用户数据`;

        return e.reply(msg, true);
    }

    static async isHaixuGlobalRankingEnabled() {
        return true;
    }

    static async isHaixuGroupRankingEnabled(groupId) {
        return true;
    }

    static async isHaixuAllowPublicCookie(id, type) {
        if (type === 'global') {
            const config = Config.getConfig();
            return config.haixu_reject_public_cookie_global === false;
        } else {
            const key = `Yunzai:waves:haixu_reject_public:${id}`;
            const value = await redis.get(key);
            if (value !== null) {
                return value === '0';
            }
            const config = Config.getConfig();
            return config.haixu_reject_public_cookie_group === false;
        }
    }
}