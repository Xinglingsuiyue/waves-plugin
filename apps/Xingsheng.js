import plugin from '../../../lib/plugins/plugin.js';
import Waves from "../components/Code.js";
import Config from "../components/Config.js";
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
        if (e.at) e.user_id = e.at;

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

        let accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
        const waves = new Waves();
        
        if (!accountList?.length) {
            const publicCookie = await waves.pubCookie();
            if (publicCookie) {
                accountList = [publicCookie];
                await redis.set(`Yunzai:waves:bind:${e.user_id}`, publicCookie.roleId);
            } else {
                await e.reply('该用户尚未绑定账号');
                return true;
            }
        }

        const validAccounts = [];
        const deleteroleIds = [];
        
        for (const account of accountList) {
            const isValid = await waves.isAvailable(
                account.serverId, 
                account.roleId, 
                account.token,
                account.did
            );
            
            if (isValid) {
                validAccounts.push(account);
            } else {
                deleteroleIds.push(account.roleId);
            }
        }
        
        if (deleteroleIds.length) {
            const newAccountList = accountList.filter(acc => !deleteroleIds.includes(acc.roleId));
            await Config.setUserData(e.user_id, newAccountList);
        }
        
        if (!validAccounts.length) {
            await e.reply('无有效账号');
            return true;
        }
        
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
        
        if (validAccounts.length > 1) {
            const data = [];
            for (const account of validAccounts) {
                const periodsData = await waves.getResourcePeriods(
                    account.serverId, 
                    account.roleId, 
                    account.token,
                    account.did
                );
                
                if (!periodsData.status) {
                    data.push({ message: `账号 ${account.roleId}: ${periodsData.msg}` });
                    continue;
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
                        data.push({ message: `账号 ${account.roleId}: 未找到版本 ${periodIndexStr} 的数据` });
                        continue;
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
                        data.push({ message: `账号 ${account.roleId}: 未找到 ${periodIndexStr}月 的数据` });
                        continue;
                    } else {
                        finalPeriodIndex = periods.months[periods.months.length - 1].index;
                        periodTitle = periods.months[periods.months.length - 1].title;
                    }
                }

                const reportData = await waves.getResourceReport(
                    account.serverId, 
                    account.roleId, 
                    account.token,
                    account.did,
                    periodType,
                    finalPeriodIndex
                );
                
                if (!reportData.status) {
                    data.push({ message: `账号 ${account.roleId}: ${reportData.msg}` });
                    continue;
                }

                const periodTypeNames = { 'week': '周', 'month': '月', 'version': '版本' };
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

                const renderData = {
                    baseInfo: {
                        nickName: nickName,
                        roleId: account.roleId,
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
                        {color: '#FF6384'},
                        {color: '#36A2EB'},
                        {color: '#FFCE56'},
                        {color: '#4BC0C0'},
                        {color: '#9966FF'},
                        {color: '#FF9F40'}
                    ],
                    starDetails,
                    coinDetails,
                    copywriting: reportData.data.copyWriting || '',
                    currentTime: new Date().toLocaleString()
                };

                const imageCard = await Render.render('Template/xingsheng/xingsheng', renderData, { 
                    e, 
                    retType: 'base64' 
                });

                data.push({ message: imageCard });
            }
            
            if (data.length > 1) {
                await e.reply(await Bot.makeForwardMsg(data));
                return true;
            }
        }
        
        const account = validAccounts[0];
        const periodsData = await waves.getResourcePeriods(
            account.serverId, 
            account.roleId, 
            account.token,
            account.did
        );

        if (!periodsData.status) {
            await e.reply(periodsData.msg);
            return true;
        }

        const periods = periodsData.data;
        let finalPeriodIndex = '';
        let periodTitle = '';

        if (periodType === 'version') {
            const versionItem = periods.versions.find(v => 
                v.title.includes(periodIndexStr)
            );
            
            if (versionItem) {
                finalPeriodIndex = versionItem.index;
                periodTitle = versionItem.title;
            } else if (periodIndexStr) {
                await e.reply(`未找到版本 ${periodIndexStr} 的数据`);
                return true;
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
                await e.reply(`未找到 ${periodIndexStr}月 的数据`);
                return true;
            } else {
                finalPeriodIndex = periods.months[periods.months.length - 1].index;
                periodTitle = periods.months[periods.months.length - 1].title;
            }
        }

        const reportData = await waves.getResourceReport(
            account.serverId, 
            account.roleId, 
            account.token,
            account.did,
            periodType,
            finalPeriodIndex
        );
        
        if (!reportData.status) {
            await e.reply(reportData.msg);
            return true;
        }

        const periodTypeNames = { 'week': '周', 'month': '月', 'version': '版本' };
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

        const renderData = {
        	  qq: originalUserId,
            baseInfo: {
                nickName: nickName,
                roleId: account.roleId,
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
                {color: '#FF6384'},
                {color: '#36A2EB'},
                {color: '#FFCE56'},
                {color: '#4BC0C0'},
                {color: '#9966FF'},
                {color: '#FF9F40'}
            ],
            starDetails,
            coinDetails,
            copywriting: reportData.data.copyWriting || '',
            currentTime: new Date().toLocaleString()
        };

        const imageCard = await Render.render('Template/xingsheng/xingsheng', renderData, { 
            e, 
            retType: 'base64' 
        });

        await e.reply(imageCard);
        return true;
    }
}