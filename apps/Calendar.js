import plugin from '../../../lib/plugins/plugin.js';
import { pluginResources } from '../model/path.js'
import Wiki from '../components/Wiki.js';
import Render from '../components/Render.js';

export class Calendar extends plugin {
    constructor() {
        super({
            name: "鸣潮-日历",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(～|~|鸣潮)(日历|日历列表|当前卡池)$",
                    fnc: "calendar"
                }
            ]
        });
    }

    async calendar(e) {
        const wiki = new Wiki();
        const pageData = await wiki.getHomePage();
        const currentDate = new Date();

        if (!pageData.status) {
            return e.reply(data.msg);
        }

        const role = {
            imgs: pageData.data.contentJson.sideModules[0].content.tabs.flatMap(tab => tab.imgs).map(item => item.img),
            description: pageData.data.contentJson?.sideModules?.[0]?.content?.tabs?.[0]?.description || '',
            unstart: new Date(pageData.data.contentJson?.sideModules?.[0]?.content?.tabs?.[0]?.countDown?.dateRange?.[0]) > currentDate,
            time: this.format(Math.max(Math.round((new Date(pageData.data.contentJson?.sideModules?.[0]?.content?.tabs?.[0]?.countDown?.dateRange?.[1]) - currentDate) / 1000), 0)),
            progress: Math.round(((currentDate - new Date(pageData.data.contentJson?.sideModules?.[0]?.content?.tabs?.[0]?.countDown?.dateRange?.[0])) /
                (new Date(pageData.data.contentJson?.sideModules?.[0]?.content?.tabs?.[0]?.countDown?.dateRange?.[1]) - new Date(pageData.data.contentJson?.sideModules?.[0]?.content?.tabs?.[0]?.countDown?.dateRange?.[0]))) * 100)
        };

        const weapon = {
            imgs: pageData.data.contentJson.sideModules[1].content.tabs.flatMap(tab => tab.imgs).map(item => item.img),
            description: pageData.data.contentJson?.sideModules?.[1]?.content?.tabs?.[0]?.description || '',
            unstart: new Date(pageData.data.contentJson?.sideModules?.[1]?.content?.tabs?.[0]?.countDown?.dateRange?.[0]) > currentDate,
            time: this.format(Math.max(Math.round((new Date(pageData.data.contentJson?.sideModules?.[1]?.content?.tabs?.[0]?.countDown?.dateRange?.[1]) - currentDate) / 1000), 0)),
            progress: Math.round(((currentDate - new Date(pageData.data.contentJson?.sideModules?.[1]?.content?.tabs?.[0]?.countDown?.dateRange?.[0])) /
                (new Date(pageData.data.contentJson?.sideModules?.[1]?.content?.tabs?.[0]?.countDown?.dateRange?.[1]) - new Date(pageData.data.contentJson?.sideModules?.[1]?.content?.tabs?.[0]?.countDown?.dateRange?.[0]))) * 100)
        }

        const activity = (pageData.data.contentJson?.sideModules?.[2]?.content || []).map(item => {
            const dateRange = item.countDown?.dateRange || ["", ""];
            const [startDateStr, endDateStr] = dateRange.map(dateStr => dateStr ? new Date(dateStr) : null);
            const startDate = startDateStr || null;
            const endDate = endDateStr || null;

            const startTime = startDate ? `${startDate.toLocaleDateString('zh-CN').slice(5).replace('/', '.')} ${startDate.toTimeString().slice(0, 5)}` : '';
            const endTime = endDate ? `${endDate.toLocaleDateString('zh-CN').slice(5).replace('/', '.')} ${endDate.toTimeString().slice(0, 5)}` : '';

            const activeStatus = item.countDown
                ? (startDate && currentDate >= endDate ? '已结束' :
                    (startDate && currentDate >= startDate ? '进行中' : '未开始'))
                : '';

            const remain = activeStatus === '进行中' && endDate
                ? this.format(Math.round((endDate - currentDate) / 1000))
                : '';

            const progress = startDate && endDate && currentDate >= startDate
                ? Math.round(((currentDate - startDate) / (endDate - startDate)) * 100)
                : 0;

            return {
                contentUrl: item.contentUrl || '',
                title: item.title || '',
                time: startTime && endTime ? `${startTime} - ${endTime}` : '',
                active: activeStatus,
                remain: remain,
                progress: progress,
            };
        });

        const towerCurrentCycle = this.calculateCurrentCycle(
            '2026-03-02T04:00:00+08:00',
            28,
            'deep',
            currentDate
        );

        const slashCurrentCycle = this.calculateCurrentCycle(
            '2026-02-16T04:00:00+08:00',
            28,
            'slash',
            currentDate
        );

        activity.unshift({
            contentUrl: pluginResources + '/Template/calendar/imgs/tower.png',
            title: '深境再临',
            time: `${towerCurrentCycle.startTime} - ${towerCurrentCycle.endTime}`,
            active: towerCurrentCycle.active,
            remain: towerCurrentCycle.remain,
            progress: towerCurrentCycle.progress,
        });

        activity.unshift({
            contentUrl: pluginResources + '/Template/calendar/imgs/slash.png',
            title: '冥歌海墟',
            time: `${slashCurrentCycle.startTime} - ${slashCurrentCycle.endTime}`,
            active: slashCurrentCycle.active,
            remain: slashCurrentCycle.remain,
            progress: slashCurrentCycle.progress,
        });

        const imageCard = await Render.render('Template/calendar/calendar', {
            data: { activity, role, weapon },
        }, { e, retType: 'base64' });

        await e.reply(imageCard);
        return true;
    }

    calculateCurrentCycle(firstStartTime, cycleDays, type, currentDate) {
        const firstStart = new Date(firstStartTime).getTime();
        const cycleDuration = cycleDays * 24 * 60 * 60 * 1000;
        
        const timeDiff = currentDate.getTime() - firstStart;
        const cycleNum = Math.floor(timeDiff / cycleDuration);
        
        // 当前周期的开始和结束时间
        let currentCycleStart = new Date(firstStart + cycleNum * cycleDuration);
        let currentCycleEnd = new Date(firstStart + (cycleNum + 1) * cycleDuration);
        
        if (currentDate.getTime() < currentCycleStart.getTime()) {
            currentCycleStart = new Date(firstStart + (cycleNum - 1) * cycleDuration);
            currentCycleEnd = new Date(firstStart + cycleNum * cycleDuration);
        }
        
        const startTime = `${currentCycleStart.toLocaleDateString('zh-CN').slice(5).replace('/', '.')} ${currentCycleStart.toTimeString().slice(0, 5)}`;
        const endTime = `${currentCycleEnd.toLocaleDateString('zh-CN').slice(5).replace('/', '.')} ${currentCycleEnd.toTimeString().slice(0, 5)}`;
        
        // 计算状态
        let active = '';
        if (currentDate >= currentCycleEnd) {
            active = '已结束';
        } else if (currentDate >= currentCycleStart) {
            active = '进行中';
        } else {
            active = '未开始';
        }
        
        // 计算剩余时间
        let remain = '';
        if (currentDate >= currentCycleStart && currentDate < currentCycleEnd) {
            remain = this.format(Math.round((currentCycleEnd.getTime() - currentDate.getTime()) / 1000));
        }
        
        // 计算进度
        let progress = 0;
        if (currentDate >= currentCycleStart && currentDate < currentCycleEnd) {
            progress = Math.round(((currentDate.getTime() - currentCycleStart.getTime()) / 
                (currentCycleEnd.getTime() - currentCycleStart.getTime())) * 100);
        } else if (currentDate >= currentCycleEnd) {
            progress = 100;
        }
        
        return {
            startTime,
            endTime,
            active,
            remain,
            progress
        };
    }

    format(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        return `${days ? `${days}天` : ''}${days || hours ? `${hours}小时` : ''}${days || hours || minutes ? `${minutes}分钟` : ''}`.trim();
    }
}
