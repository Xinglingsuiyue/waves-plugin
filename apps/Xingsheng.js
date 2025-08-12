import plugin from '../../../lib/plugins/plugin.js';
import Waves from "../components/Code.js";
import Render from '../components/Render.js';

export class ResourceReport extends plugin {
    constructor() {
        super({
            name: "鸣潮-资源简报",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)\\s*(\\d+\\.\\d+版本)?\\s*(\\d{1,2}月)?\\s*(资源?简报|星声)\\s*$",
                    fnc: "resourceReport"
                }
            ]
        });
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

    async resourceReport(e) {
        const originalUserId = e.user_id;

        const match = e.msg.match(this.rule[0].reg);
        let periodType = 'version';
        let periodIndexStr = '';

        if (match[1]) {
            periodType = 'version';
            periodIndexStr = match[1].replace('版本', '');
        } else if (match[2]) {
            periodType = 'month';
            periodIndexStr = match[2].replace('月', '');
        }

        const waves = new Waves();
        const accounts = await waves.getValidAccount(e, '' , true);
        if (!accounts) return true;

        let avatarUrl = await this.getAvatarUrl(e);
        let nickName = `用户${e.user_id}`;
        try {
            if (e.isGroup) {
                const memberInfo = await e.group.getMemberMap();
                const member = memberInfo.get(e.user_id);
                nickName = member?.card || member?.nickname || nickName;
            } else {
                const friendInfo = await Bot.getFriendInfo(e.user_id);
                nickName = friendInfo?.nickname || nickName;
            }
        } catch (err) {
            logger.error('获取用户信息失败：', err);
        }

        const periodTypeNames = { 'week': '周', 'month': '月', 'version': '版本' };

        const processAccount = async (acc) => {
            const { uid, serverId, token, did } = acc;
            try {
                const periodsData = await waves.getResourcePeriods(
                    serverId,
                    uid,
                    token,
                    did
                );

                if (!periodsData.status) {
                    return { uid, message: `账号 ${uid} 获取周期数据失败：${periodsData.msg}` };
                }

                const periods = periodsData.data;
                let finalPeriodIndex = '';
                let periodTitle = '';

                if (periodType === 'version') {
                    const versionItem = periods.versions.find(v =>
                        v.title.replace('版本', '').includes(periodIndexStr)
                    );

                    if (versionItem) {
                        finalPeriodIndex = versionItem.index;
                        periodTitle = versionItem.title;
                    } else if (periodIndexStr) {
                        return { uid, message: `账号 ${uid}: 未找到版本 ${periodIndexStr} 的数据` };
                    } else {
                        finalPeriodIndex = periods.versions[0].index;
                        periodTitle = periods.versions[0].title;
                    }
                } else if (periodType === 'month') {
                    const monthItem = periods.months.find(m =>
                        m.title.includes(`${periodIndexStr}月`)
                    );

                    if (monthItem) {
                        finalPeriodIndex = monthItem.index;
                        periodTitle = monthItem.title;
                    } else if (periodIndexStr) {
                        return { uid, message: `账号 ${uid}: 未找到 ${periodIndexStr}月 的数据` };
                    } else {
                        finalPeriodIndex = periods.months[periods.months.length - 1].index;
                        periodTitle = periods.months[periods.months.length - 1].title;
                    }
                }

                const reportData = await waves.getResourceReport(
                    serverId,
                    uid,
                    token,
                    did,
                    periodType,
                    finalPeriodIndex
                );

                if (!reportData.status) {
                    return { uid, message: `账号 ${uid} 获取报告失败：${reportData.msg}` };
                }

                const starDetails = reportData.data.starList.map(item => ({
                    type: item.type,
                    value: item.num,
                    percentage: reportData.data.totalStar > 0 ?
                        Math.round((item.num / reportData.data.totalStar) * 100) : 0
                })).filter(item => item.value > 0);

                const coinDetails = reportData.data.coinList.map(item => ({
                    type: item.type,
                    value: item.num,
                    percentage: reportData.data.totalCoin > 0 ?
                        Math.round((item.num / reportData.data.totalCoin) * 100) : 0
                })).filter(item => item.value > 0);

                const imageCard = await Render.render('Template/xingsheng/xingsheng', {
                    qq: originalUserId,
                    baseInfo: {
                        nickName: nickName,
                        roleId: uid,
                        avatar: avatarUrl
                    },
                    periodType: periodType,
                    periodTitle: periodTitle,
                    periodNames: periodTypeNames,
                    reportData: {
                        totalStar: reportData.data.totalStar,
                        totalCoin: reportData.data.totalCoin,
                        starList: reportData.data.starList,
                        coinList: reportData.data.coinList
                    },
                    colors: [
                        { color: '#FF6384' },
                        { color: '#36A2EB' },
                        { color: '#FFCE56' },
                        { color: '#4BC0C0' },
                        { color: '#9966FF' },
                        { color: '#FF9F40' }
                    ],
                    starDetails,
                    coinDetails,
                    copywriting: reportData.data.copyWriting || '',
                    currentTime: new Date().toLocaleString()
                }, { e, retType: 'base64' });

                return { uid, message: imageCard };
            } catch (error) {
                logger.error(`处理账号 ${uid} 时出错:`, error);
                return { uid, message: `账号 ${uid} 处理过程中出现错误` };
            }
        };


        const results = await Promise.all(accounts.map(processAccount));


        const data = results.sort((a, b) =>
            accounts.findIndex(acc => acc.uid === a.uid) - accounts.findIndex(acc => acc.uid === b.uid)
        ).map(item => ({ message: item.message }));


        if (data.length === 0) {
            await e.reply('所有账号数据获取失败');
        } else if (data.length === 1) {
            await e.reply(data[0].message);
        } else {
            const forwardMsg = await Bot.makeForwardMsg([
                { user_id: Bot.uin, nickname: '资源简报', message: `用户 ${nickName} 的资源简报汇总` },
                ...data
            ]);
            await e.reply(forwardMsg);
        }

        return true;
    }
}