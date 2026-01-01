import plugin from '../../../lib/plugins/plugin.js';
import Waves from "../components/Code.js";
import Config from "../components/Config.js";
import Render from '../components/Render.js';

export class Slash extends plugin {
    constructor() {
        super({
            name: "鸣潮-冥歌海墟",
            dsc: "鸣潮-冥歌海墟查询",
            event: "message",
            priority: 1009,
            rule: [{
                reg: '^(?:～|~|鸣潮)[\\s]*?(冥歌海墟|新深渊|(?:再生)?海域|冥歌|海墟|冥海|破船|禁忌海域|(?:再生海域-?)?海隙|(?:再生海域-?)?湍渊|(?:再生海域-?)?无尽)(\\d{9})?$',
                fnc: 'slash'
            }]
        });
    }

    async slash(e) {
        if (e.at) e.user_id = e.at;
        const waves = new Waves();

        let [, type, roleId] = e.msg.match(this.rule[0].reg);

        if (roleId) {
            let publicCookie = await waves.pubCookie();
            if (!publicCookie) {
                return await e.reply('当前没有可用的公共Cookie，无法查询指定UID');
            }
            
            const usability = await waves.isAvailable(publicCookie.serverId, roleId, publicCookie.token);
            if (!usability) {
                return await e.reply(`账号 ${roleId} 不可用或Token已失效`);
            }

            publicCookie.roleId = roleId;
            return await this.processData(e, waves, type, publicCookie, roleId, true);
        }

        let accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
        
        if (!accountList.length) {
            const bindUid = await redis.get(`Yunzai:waves:bind:${e.user_id}`);
            if (bindUid) {
                let publicCookie = await waves.pubCookie();
                if (!publicCookie) {
                    return await e.reply('当前没有可用的公共Cookie，请使用[~登录]进行登录');
                }
                
                const usability = await waves.isAvailable(publicCookie.serverId, bindUid, publicCookie.token);
                if (!usability) {
                    return await e.reply(`绑定的账号 ${bindUid} 不可用或Token已失效`);
                }

                publicCookie.roleId = bindUid;
                return await this.processData(e, waves, type, publicCookie, bindUid, true);
            } else {
                return await e.reply('当前没有登录任何账号，请使用[~登录]进行登录');
            }
        }

        let data = [];
        let deleteroleId = [];

        await Promise.all(accountList.map(async (account) => {
            const usability = await waves.isAvailable(account.serverId, account.roleId, account.token);

            if (!usability) {
                data.push({ message: `账号 ${account.roleId} 的Token已失效\n请重新登录Token` });
                deleteroleId.push(account.roleId);
                return;
            }

            try {
                const [baseData, slashData] = await Promise.all([
                    waves.getBaseData(account.serverId, account.roleId, account.token),
                    waves.getHaiXuData(account.serverId, account.roleId, account.token, account.did, account.userId)
                ]);

                if (!baseData?.status || !slashData?.status) {
                    const errorMsg = baseData?.msg || slashData?.msg || '获取数据失败';
                    data.push({ message: `账号 ${account.roleId} ${errorMsg}` });
                    return;
                }

                if (!slashData.data || !slashData.data.difficultyList || 
                    !Array.isArray(slashData.data.difficultyList) || 
                    slashData.data.difficultyList.length === 0) {
                    data.push({ message: `账号 ${account.roleId} 没有可用的海墟数据` });
                    return;
                }

                if (slashData.data.isUnlock === false) {
                    data.push({ message: `账号 ${account.roleId} 尚未解锁冥歌海墟` });
                    return;
                }

                const renderData = await this.formatData(slashData.data, baseData.data, type, e, false);
                if (!renderData) {
                    data.push({ message: `账号 ${account.roleId} 数据格式化失败` });
                    return;
                }

                const image = await Render.render('Template/slash/slash', renderData, {
                    e, 
                    retType: 'base64',
                    copyright: `数据来源: 库街区 · 生成时间: ${new Date().toLocaleString()}`
                });

                data.push({ message: image });
            } catch (err) {
                logger.error('[冥歌海墟查询异常]', err);
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
            await e.reply(await Bot.makeForwardMsg([{ message: `用户 ${e.user_id} 的冥歌海墟查询结果` }, ...data]));
        } else {
            await e.reply('没有获取到有效的冥歌海墟数据');
        }
        return true;
    }

    async processData(e, waves, type, cookie, uid, isOther) {
        const [baseData, slashData] = await Promise.all([
            waves.getBaseData(cookie.serverId, uid, cookie.token),
            isOther 
                ? waves.getHaiXuDataForOther(cookie.serverId, uid, cookie.token, cookie.did, cookie.userId)
                : waves.getHaiXuData(cookie.serverId, uid, cookie.token, cookie.did, cookie.userId)
        ]);

        if (!baseData.status || !slashData.status) {
            return await e.reply(baseData.msg || slashData.msg);
        }

        if (!slashData.data || !slashData.data.difficultyList || 
            !Array.isArray(slashData.data.difficultyList) || 
            slashData.data.difficultyList.length === 0) {
            return await e.reply(`账号 ${uid} 没有可用的海墟数据`);
        }

        if (slashData.data.isUnlock === false) {
            return await e.reply(`账号 ${uid} 尚未解锁冥歌海墟`);
        }

        const renderData = await this.formatData(slashData.data, baseData.data, type, e, isOther);
        if (!renderData) {
            return await e.reply(`账号 ${uid} 数据格式化失败`);
        }

        const image = await Render.render('Template/slash/slash', renderData, {
            e, 
            retType: 'base64',
            copyright: `数据来源: 库街区 · 生成时间: ${new Date().toLocaleString()}`
        });

        return await e.reply(image);
    }

    async formatData(slashData, baseData, type, e, isOther) {
        try {
            if (!slashData?.difficultyList || !baseData?.name || !baseData?.id) {
                logger.error('[数据格式错误]', { slashData, baseData });
                return null;
            }

            const userInfo = {
                name: baseData.name,
                uid: baseData.id,
                avatar: await this.getAvatarUrl(e)
            };

            const difficultyNames = {
                0: '禁忌海域',
                1: '再生海域-海隙',
                2: '再生海域-湍渊'
            };

            const list = slashData.difficultyList.map(diff => {
                if (!diff.challengeList) return [];
                
                diff.difficultyName = difficultyNames[diff.difficulty] || `难度${diff.difficulty}`;
                const perMaxScore = Math.floor(diff.maxScore / diff.challengeList.length);
                
                return diff.challengeList.map(challenge => ({
                    ...challenge,
                    maxScore: perMaxScore,
                    difficulty: diff.difficulty,
                    difficultyName: diff.difficultyName,
                    detailPageBG: diff.detailPageBG || '',
                    homePageBG: diff.homePageBG || '',
                    teamIcon: diff.teamIcon || ''
                }));
            }).flat();

            const challengeList = this.getPickList(type, list.flat());

            let leftTime = '未知';
            if (slashData.seasonEndTime) {
                const timeSeconds = slashData.seasonEndTime / 1000;
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

            const allScore = challengeList.reduce((acc, item) => acc + (item.score || 0), 0);
            const maxScore = challengeList.reduce((acc, item) => acc + (item.maxScore || 0), 0);

            return { 
                userInfo, 
                challengeList: challengeList || [], 
                leftTime, 
                allScore, 
                maxScore 
            };
        } catch (err) {
            logger.error('[格式化数据异常]', err);
            return null;
        }
    }

    getPickList(type, challengeList) {
        if (!challengeList?.length) return [];
        
        switch (type) {
            case '禁忌海域':
                return challengeList
                    .filter(item => item.difficulty === 0)
                    .sort((a, b) => (a.challengeId || 0) - (b.challengeId || 0));
            case '海隙':
            case '再生海域海隙':
            case '再生海域-海隙':
                return challengeList
                    .filter(item => item.difficulty === 1)
                    .sort((a, b) => (a.challengeId || 0) - (b.challengeId || 0));
            case '湍渊':
            case '无尽':
            case '再生海域湍渊':
            case '再生海域无尽':
            case '再生海域-湍渊':
            case '再生海域-无尽':
                return challengeList
                    .filter(item => item.difficulty === 2)
                    .sort((a, b) => (a.challengeId || 0) - (b.challengeId || 0));
            case '海域':
            case '再生海域':
                return challengeList
                    .filter(item => item.difficulty !== 0)
                    .sort((a, b) => (a.challengeId || 0) - (b.challengeId || 0));
            default:
                return challengeList
                    .sort((a, b) => (b.challengeId || 0) - (a.challengeId || 0))
                    .slice(0, 4);
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
