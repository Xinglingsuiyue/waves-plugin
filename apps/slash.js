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
                reg: '^(～|~|∽∽∽∽∽∽∽∽|#?鸣潮)(冥歌海墟|新深渊|(?:再生)?海域|海墟|冥海|破船|禁忌海域|(?:再生海域-?)?海隙|(?:再生海域-?)?湍渊|(?:再生海域-?)?无尽)(\\d{9})?$',
                fnc: 'slash'
            }]
        });
    }

    async slash(e) {
        if (e.at) e.user_id = e.at;
        let accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
        const waves = new Waves();

        let [, , type, roleId] = e.msg.match(this.rule[0].reg);

        // 处理无账号但有指定UID或绑定UID的情况
        if (!accountList?.length) {
            if (roleId || await redis.get(`Yunzai:waves:bind:${e.user_id}`)) {
                let publicCookie = await waves.pubCookie();
                if (!publicCookie) {
                    return await e.reply('当前没有可用的公共Cookie，请使用[~登录]进行登录');
                } else {
                    if (roleId) {
                        publicCookie.roleId = roleId;
                        await redis.set(`Yunzai:waves:bind:${e.user_id}`, publicCookie.roleId);
                    } else if (await redis.get(`Yunzai:waves:bind:${e.user_id}`)) {
                        publicCookie.roleId = await redis.get(`Yunzai:waves:bind:${e.user_id}`);
                    }
                    // 确保有did属性
                    if (!publicCookie.did) publicCookie.did = '';
                    accountList = [publicCookie];
                }
            } else {
                return await e.reply('当前没有登录任何账号，请使用[~登录]进行登录');
            }
        }

        let data = [];
        let deleteRoleIds = [];

        await Promise.all(accountList.map(async (account) => {
            const currentRoleId = roleId || account.roleId;
            
            // 检查token可用性（添加did参数）
            const usable = await waves.isAvailable(account.serverId, roleId ? roleId : account.roleId, account.token, account.did ? account.did : '');
            if (!usable) {
                deleteRoleIds.push(currentRoleId);
                data.push({ message: `账号 ${currentRoleId} 的Token已失效\n请重新使用 [~登录] 进行登录` });
                return;
            }

            // 如果指定了roleId，更新绑定
            if (roleId) {
                await redis.set(`Yunzai:waves:bind:${e.user_id}`, currentRoleId);
            }

            try {
                // 获取基础数据和海虚数据（添加did参数）
                const [baseData, slashData] = await Promise.all([
                    waves.getBaseData(account.serverId, currentRoleId, account.token, account.did || ''),
                    waves.getHaiXuData(account.serverId, currentRoleId, account.token, account.did || '')
                ]);

                // 检查数据有效性
                if (!baseData?.status || !slashData?.status) {
                    const errorMsg = baseData?.msg || slashData?.msg || '获取数据失败';
                    data.push({ message: `账号 ${currentRoleId} ${errorMsg}` });
                    return;
                }

                // 检查海墟数据是否为空
                if (!slashData.data || !slashData.data.difficultyList) {
                    data.push({ message: `账号 ${currentRoleId} 没有可用的海墟数据` });
                    return;
                }

                // 格式化数据
                const renderData = await this.formatData(slashData.data, baseData.data, type, e, !!roleId);
                if (!renderData) {
                    data.push({ message: `账号 ${currentRoleId} 数据格式化失败` });
                    return;
                }

                // 渲染图像
                const image = await Render.render('Template/slash/slash', renderData, {
                    e, 
                    retType: 'base64',
                    copyright: `数据来源: 库街区 · 生成时间: ${new Date().toLocaleString()}`
                });

                data.push({ message: image });
            } catch (err) {
                logger.error('[冥歌海墟查询异常]', err);
                data.push({ 
                    message: `账号 ${currentRoleId} 查询异常: ${err.message || '未知错误'}`
                });
            }
        }));

        // 清理失效账号
        if (deleteRoleIds.length) {
            let newAccountList = accountList.filter(acc => !deleteRoleIds.includes(acc.roleId));
            Config.setUserData(e.user_id, newAccountList);
        }

        // 返回结果
        if (data.length === 1) {
            await e.reply(data[0].message);
        } else if (data.length > 1) {
            await e.reply(await Bot.makeForwardMsg([{ message: `用户 ${e.user_id} 的冥歌海墟查询结果` }, ...data]));
        } else {
            await e.reply('没有获取到有效的冥歌海墟数据');
        }
        return true;
    }

    async formatData(slashData, baseData, type, e, isOther) {
        try {
            // 验证必要数据
            if (!slashData?.difficultyList || !baseData?.name || !baseData?.id) {
                logger.error('[数据格式错误]', { slashData, baseData });
                return null;
            }

            const userInfo = {
                name: baseData.name,
                uid: baseData.id,
                avatar: isOther 
                    ? 'https://prod-alicdn-community.kurobbs.com/newHead/offical/mingchao.png'
                    : await this.getAvatarUrl(e)
            };

            // 添加难度名称映射
            const difficultyNames = {
                0: '禁忌海域',
                1: '再生海域-海隙',
                2: '再生海域-湍渊'
            };

            // 处理挑战列表数据
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

            // 计算剩余时间（精确到分钟）
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

            // 计算总分
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
            return 'https://prod-alicdn-community.kurobbs.com/newHead/offical/mingchao.png';
        }
    }
}
