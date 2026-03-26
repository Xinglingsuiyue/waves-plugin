import plugin from '../../../lib/plugins/plugin.js';
import Waves from "../components/Code.js";
import Config from "../components/Config.js";
import Render from '../components/Render.js';

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

        // 指定UID查询
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

        //登录账号
        if (accountList.length) {
            let data = [];
            let deleteroleId = [];

            await Promise.all(accountList.map(async (account) => {
                const usability = await waves.isAvailable(account.serverId, account.roleId, account.token, account.did);

                if (!usability) {
                    data.push({ message: `账号 ${account.roleId} 的Token已失效\n请重新登录Token` });
                    deleteroleId.push(account.roleId);
                    return;
                }

                try {
                    const [baseData, matrixData] = await Promise.all([
                        waves.getBaseData(account.serverId, account.roleId, account.token, account.did),
                        waves.getNewTowerDetail(account.serverId, account.roleId, account.token, account.did, account.userId)
                    ]);

                    if (!matrixData?.status) {
                        data.push({ message: `账号 ${account.roleId} ${this.normalizeErrorMsg(matrixData?.msg, false)}` });
                        return;
                    }

                    if (!matrixData.data || matrixData.data.isUnlock === false) {
                        data.push({ message: `账号 ${account.roleId} 尚未解锁终焉矩阵` });
                        return;
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
                        return;
                    }

                    const image = await Render.render('Template/newTowerDeta/newTowerDeta', renderData, {
                        e,
                        retType: 'base64',
                        copyright: `数据来源: 库街区 · 生成时间: ${new Date().toLocaleString()}`
                    });

                    data.push({ message: image });
                } catch (err) {
                    logger.error('[终焉矩阵查询异常]', err);
                    data.push({
                        message: `账号 ${account.roleId} 查询异常: ${err.message || '未知错误'}`
                    });
                }
            }));

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

            const rankMap = {
                0: '暂无',
                1: 'C',
                2: 'B',
                3: 'A',
                4: 'S',
                5: 'SS',
                6: 'SSS',
                7: 'Ω'
            };

            const modeDetails = (matrixData.modeDetails || []).map(mode => {
                const teams = (mode.teams || []).map(team => ({
                    ...team,
                    buffs: team.buffs || [],
                    roleIcons: team.roleIcons || []
                }));

                return {
                    ...mode,
                    modeName: modeNameMap[mode.modeId] || `模式${mode.modeId}`,
                    rankText: rankMap[mode.rank] || `${mode.rank}`,
                    teams
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
