import plugin from '../../../lib/plugins/plugin.js';
import Waves from "../components/Code.js";
import Config from "../components/Config.js";
import Render from '../components/Render.js';
import MatrixRankUtil from '../utils/MatrixRankUtil.js';
import { CharacterRanking } from './Paiming.js';

export class NewTowerDeta extends plugin {
    constructor() {
        super({
            name: "鸣潮-终焉矩阵",
            dsc: "鸣潮-终焉矩阵查询",
            event: "message",
            priority: 1009,
            rule: [{
                reg: '^(?:～|~|鸣潮)[\\s]*?(矩阵|终焉矩阵)(\\d{9})?$',
                fnc: 'newTowerDeta'
            }]
        });
    }

    async newTowerDeta(e) {
        if (e.at) e.user_id = e.at;
        const waves = new Waves();
        let [, , roleId] = e.msg.match(this.rule[0].reg);

        if (roleId) {
            const publicCookie = await waves.pubCookie();
            if (!publicCookie) {
                return await e.reply('当前没有可用的公共Cookie，无法查询指定UID');
            }

            const usability = await waves.isAvailable(publicCookie.serverId, roleId, publicCookie.token, publicCookie.did);
            if (!usability) {
                return await e.reply(`账号 ${roleId} 不可用或Token已失效`);
            }

            publicCookie.roleId = roleId;
            return await this.processData(e, waves, publicCookie, roleId, true);
        }

        let accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
        const bindUid = await redis.get(`Yunzai:waves:bind:${e.user_id}`);

        if (accountList.length) {
            let data = [];
            let deleteroleId = [];

            // 顺序处理每个账号，避免并发请求导致状态冲突
            for (let account of accountList) {
                const usability = await waves.isAvailable(account.serverId, account.roleId, account.token, account.did);

                if (!usability) {
                    data.push({ message: `账号 ${account.roleId} 的Token已失效\n请重新登录Token` });
                    deleteroleId.push(account.roleId);
                    continue;
                }

                try {
                    const [baseData, matrixData] = await Promise.all([
                        waves.getBaseData(account.serverId, account.roleId, account.token, account.did),
                        waves.getNewTowerDetail(account.serverId, account.roleId, account.token, account.did, account.userId)
                    ]);

                    if (!matrixData?.status) {
                        data.push({ message: `账号 ${account.roleId} ${this.normalizeErrorMsg(matrixData?.msg, false)}` });
                        continue;
                    }

                    if (!matrixData.data || matrixData.data.isUnlock === false) {
                        data.push({ message: `账号 ${account.roleId} 尚未解锁终焉矩阵` });
                        continue;
                    }

                    const renderData = await this.formatData(
                        matrixData.data,
                        baseData?.status ? baseData.data : null,
                        e,
                        false,
                        account.roleId
                    );

                    if (!renderData) {
                        data.push({ message: `账号 ${account.roleId} 数据格式化失败` });
                        continue;
                    }

                    const image = await Render.render('Template/newTowerDeta/newTowerDeta', renderData, {
                        e,
                        retType: 'base64',
                        copyright: `数据来源: 库街区 · 生成时间: ${new Date().toLocaleString()}`
                    });

                    // 录入矩阵排名数据
                    await this.recordMatrixRank(e, renderData, false);

                    data.push({ message: image });
                } catch (err) {
                    logger.error('[终焉矩阵查询异常]', err);
                    data.push({
                        message: `账号 ${account.roleId} 查询异常: ${err.message || '未知错误'}`
                    });
                }
            }

            if (deleteroleId.length) {
                let newAccountList = accountList.filter(account => !deleteroleId.includes(account.roleId));
                Config.setUserData(e.user_id, newAccountList);
            }

            if (data.length === 1) {
                await e.reply(data[0].message);
            } else if (data.length > 1) {
                await e.reply(await Bot.makeForwardMsg([{ message: `用户 ${e.user_id} 的终焉矩阵查询结果` }, ...data]));
            } else {
                await e.reply('没有获取到有效的终焉矩阵数据');
            }

            return true;
        }

        if (bindUid) {
            const publicCookie = await waves.pubCookie();
            if (!publicCookie) {
                return await e.reply('当前未登录账号，且没有可用的公共Cookie，请使用[~登录]进行登录');
            }

            const usability = await waves.isAvailable(publicCookie.serverId, bindUid, publicCookie.token, publicCookie.did);
            if (!usability) {
                return await e.reply(`绑定的账号 ${bindUid} 不可用或Token已失效`);
            }

            publicCookie.roleId = bindUid;
            return await this.processData(e, waves, publicCookie, bindUid, true);
        }

        return await e.reply('当前未登录且未绑定UID，请使用[~登录]进行登录或先绑定UID');
    }

    async processData(e, waves, cookie, uid, isOther) {
        const [baseData, matrixData] = await Promise.all([
            waves.getBaseData(cookie.serverId, uid, cookie.token, cookie.did),
            isOther
                ? waves.getNewTowerIndex(cookie.serverId, uid, cookie.token, cookie.did, cookie.userId)
                : waves.getNewTowerDetail(cookie.serverId, uid, cookie.token, cookie.did, cookie.userId)
        ]);

        if (!matrixData.status) {
            return await e.reply(this.normalizeErrorMsg(matrixData.msg, isOther));
        }

        if (!matrixData.data || matrixData.data.isUnlock === false) {
            return await e.reply(`账号 ${uid} 尚未解锁终焉矩阵`);
        }

        const renderData = await this.formatData(
            matrixData.data,
            baseData?.status ? baseData.data : null,
            e,
            isOther,
            uid
        );

        if (!renderData) {
            return await e.reply(`账号 ${uid} 数据格式化失败`);
        }

        const image = await Render.render('Template/newTowerDeta/newTowerDeta', renderData, {
            e,
            retType: 'base64',
            copyright: `数据来源: 库街区 · 生成时间: ${new Date().toLocaleString()}`
        });

        // 录入矩阵排名数据（isOther=true时使用公共Cookie查询）
        await this.recordMatrixRank(e, renderData, isOther);

        return await e.reply(image);
    }

    normalizeErrorMsg(msg, isOther = false) {
        if (!msg) return '获取数据失败';

        if (
            msg.includes('对外展示开关') ||
            msg.includes('返回空数据') ||
            msg.includes('查询信息失败')
        ) {
            return isOther ? '该玩家未公开终焉矩阵数据或暂无可查询数据' : '未查询到终焉矩阵数据，请确认账号已解锁并已在库街区同步';
        }

        return msg;
    }

    async formatData(matrixData, baseData, e, isOther, roleId = '') {
        try {
            if (!matrixData) {
                logger.error('[终焉矩阵数据格式错误]', { matrixData, baseData });
                return null;
            }

            const userInfo = {
                name: baseData?.name || '鸣潮玩家',
                uid: baseData?.id || roleId || '',
                avatar: await this.getAvatarUrl(e)
            };

            let leftTime = '未知';
            const endTime = matrixData.endTime || matrixData.seasonEndTime;
            if (endTime) {
                const timeSeconds = endTime / 1000;
                const days = Math.floor(timeSeconds / (3600 * 24));
                const hours = Math.floor((timeSeconds % (3600 * 24)) / 3600);
                const minutes = Math.floor((timeSeconds % 3600) / 60);

                if (days > 0) {
                    leftTime = `${days}天${hours}小时${minutes}分钟`;
                } else if (hours > 0) {
                    leftTime = `${hours}小时${minutes}分钟`;
                } else {
                    leftTime = `${minutes}分钟`;
                }
            }

            const modeNameMap = {
                0: '稳态协议',
                1: '奇点扩张'
            };

            const modeDetails = (matrixData.modeDetails || []).map(mode => {
                const teams = (mode.teams || []).map(team => ({
                    ...team,
                    buffs: team.buffs || [],
                    roleIcons: team.roleIcons || []
                }));

                let bossProgress = '';
                let progressPercent = 0;
                let roundNum = 0;

                if (!isOther && teams.length > 0) {
                    const lastTeam = teams[teams.length - 1];
                    const bossDenominator = mode.modeId === 0 ? 4 : 5;
                    const bossNumerator = lastTeam.passBoss || 0;
                    bossProgress = `${bossNumerator}/${bossDenominator}`;
                    progressPercent = Math.min((bossNumerator / bossDenominator) * 100, 100);
                    roundNum = lastTeam.round || mode.round || 0;
                }

                let areaIcon = 'Template/newTowerDeta/imgs/area/0.png';
                const score = mode.score || 0;
                if (mode.modeId === 0) {
                    if (score >= 10000) areaIcon = 'Template/newTowerDeta/imgs/area/S.png';
                    else if (score >= 7200) areaIcon = 'Template/newTowerDeta/imgs/area/A.png';
                    else if (score >= 4800) areaIcon = 'Template/newTowerDeta/imgs/area/B.png';
                } else if (mode.modeId === 1) {
                    if (score >= 58000) areaIcon = 'Template/newTowerDeta/imgs/area/MAXC.png';
                    else if (score >= 45000) areaIcon = 'Template/newTowerDeta/imgs/area/MAXY.png';
                    else if (score >= 37000) areaIcon = 'Template/newTowerDeta/imgs/area/SSS.png';
                    else if (score >= 29000) areaIcon = 'Template/newTowerDeta/imgs/area/SS.png';
                    else if (score >= 21000) areaIcon = 'Template/newTowerDeta/imgs/area/S.png';
                    else if (score >= 16000) areaIcon = 'Template/newTowerDeta/imgs/area/A.png';
                    else if (score >= 12000) areaIcon = 'Template/newTowerDeta/imgs/area/B.png';
                }

                return {
                    ...mode,
                    modeName: modeNameMap[mode.modeId] || `模式${mode.modeId}`,
                    areaIcon,
                    teams,
                    bossProgress,
                    progressPercent,
                    roundNum
                };
            }).sort((a, b) => (a.modeId || 0) - (b.modeId || 0));

            const totalScore = modeDetails.reduce((sum, item) => sum + (item.score || 0), 0);

            return {
                userInfo,
                leftTime,
                reward: matrixData.reward || 0,
                totalReward: matrixData.totalReward || 0,
                totalScore,
                modeDetails,
                isOther
            };
        } catch (err) {
            logger.error('[终焉矩阵格式化数据异常]', err);
            return null;
        }
    }

    async recordMatrixRank(e, renderData, isOther) {
        try {
            if (!renderData || !renderData.userInfo || !renderData.userInfo.uid) return;

            const groupId = e.isGroup ? e.group_id : 'private';
            const uid = renderData.userInfo.uid;

            // 仅录入奇点扩张(modeId === 1)的分数和阵容
            const singularityMode = (renderData.modeDetails || []).find(mode => mode.modeId === 1);
            if (!singularityMode) {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow('矩阵排名录入: 未找到奇点扩张模式数据，跳过录入'));
                return;
            }

            const rankScore = singularityMode.score || 0;

            // 提取奇点扩张模式的队伍，按分数降序取前两队
            const allTeams = (singularityMode.teams || []).slice().sort((a, b) => (b.score || 0) - (a.score || 0));
            const topTeams = allTeams.slice(0, 2).map(team => ({
                score: team.score || 0,
                roleIcons: team.roleIcons || [],
                buffIcons: (team.buffs || []).map(buff => buff.buffIcon).filter(Boolean)
            }));

            // 汇总所有队伍的角色图标（兼容旧字段 teamIcons）
            const teamIcons = [];
            for (const team of topTeams) {
                teamIcons.push(...team.roleIcons);
            }

            const playerInfo = {
                name: renderData.userInfo.name || '鸣潮玩家',
                uid: uid,
                avatar: renderData.userInfo.avatar || '',
                modeScores: [{
                    modeName: '奇点扩张',
                    score: rankScore
                }],
                teamIcons: [...new Set(teamIcons)].slice(0, 8),
                topTeams
            };

            // 判断是否为公共Cookie查询
            // isOther=true 表示使用公共Cookie查询他人数据
            const isPublicCookie = isOther;

            const promises = [];

            // 群排名：仅群聊时录入
            if (e.isGroup) {
                const groupEnabled = await CharacterRanking.isGroupRankingEnabled(groupId);
                const allowPublic = await CharacterRanking.isAllowPublicCookie(groupId, 'group');
                if (groupEnabled && (allowPublic || !isPublicCookie)) {
                    promises.push(MatrixRankUtil.updateRankData('group', playerInfo, rankScore, groupId));
                }
            }

            // 总排名
            const globalEnabled = await CharacterRanking.isGlobalRankingEnabled();
            const allowPublicGlobal = await CharacterRanking.isAllowPublicCookie('global', 'global');
            if (globalEnabled && (allowPublicGlobal || !isPublicCookie)) {
                promises.push(MatrixRankUtil.updateRankData('global', playerInfo, rankScore, groupId));
            }

            // bot排名：总是录入（包括公共Cookie查询的数据）
            promises.push(MatrixRankUtil.updateRankData('bot', playerInfo, rankScore, groupId));

            if (promises.length > 0) {
                await Promise.all(promises);
            }
        } catch (err) {
            logger.error('[矩阵排名录入异常]', err);
        }
    }

    async getAvatarUrl(e) {
        try {
            if (e.isGroup) {
                return await e.group.pickMember(e.user_id).getAvatarUrl();
            }
            return await e.friend.getAvatarUrl();
        } catch {
            return '';
        }
    }
}