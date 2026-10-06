import plugin from "../../../lib/plugins/plugin.js"
import Config from "../components/Config.js"
import Uid from "../components/Uid.js"

export class Setting extends plugin {
    constructor() {
        super({
            name: "鸣潮-用户设置",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(～|~|鸣潮)(开启|关闭)自动签到$",
                    fnc: "setAutoSign"
                },
                {
                    reg: "^(～|~|鸣潮)(开启|关闭)自动任务$",
                    fnc: "setAutoTask"
                },
                {
                    reg: "^(～|~|鸣潮)(开启|关闭)(波片|体力)?推送$",
                    fnc: "setAutoPush"
                },
                {
                    reg: "^(～|~|鸣潮)(开启|关闭)(公告|新闻|活动)推送$",
                    fnc: "setAutoNews"
                },
                {
                    reg: "^(?:～|~|鸣潮)(?:波片|体力)阈值(.*)$",
                    fnc: "setThreshold"
                },
                {
                    reg: "^(?:～|~|鸣潮)(开启|关闭)[Uu][Ii][Dd]$",
                    fnc: "setUidDisplay"
                }
            ]
        })
    }

    async setAutoSign(e) {
        const accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
        if (!accountList.length) return e.reply("你还没有登录任何账号呢，请使用[~登录]进行登录");

        const config = await Config.getUserConfig();
        const newUser = {
            botId: e.self_id || '',
            groupId: e.group_id || '',
            userId: e.user_id || '',
        };

        const index = config.waves_auto_signin_list.findIndex(user =>
            user.userId === newUser.userId
        );

        if (e.msg.includes('开启')) {
            if (index === -1) {
                config.waves_auto_signin_list.push(newUser);
                Config.setUserConfig(config);
                return e.reply("已开启自动签到", true);
            }
            return e.reply("你已经开启了自动签到，无需再次开启", true);
        }

        if (index !== -1) {
            config.waves_auto_signin_list.splice(index, 1);
            Config.setUserConfig(config);
            return e.reply("已关闭自动签到", true);
        }
        return e.reply("你已经关闭了自动签到，无需再次关闭", true);
    }

    async setAutoTask(e) {
        const accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
        if (!accountList.length) return e.reply("你还没有登录任何账号呢，请使用[~登录]进行登录");

        const config = await Config.getUserConfig();
        const newUser = {
            botId: e.self_id || '',
            groupId: e.group_id || '',
            userId: e.user_id || '',
        };

        const index = config.waves_auto_task_list.findIndex(user =>
            user.botId === newUser.botId &&
            user.groupId === newUser.groupId &&
            user.userId === newUser.userId
        );

        if (e.msg.includes('开启')) {
            if (index === -1) {
                config.waves_auto_task_list.push(newUser);
                Config.setUserConfig(config);
                return e.reply("已开启自动任务", true);
            }
            return e.reply("你已经开启了自动任务，无需再次开启", true);
        }

        if (index !== -1) {
            config.waves_auto_task_list.splice(index, 1);
            Config.setUserConfig(config);
            return e.reply("已关闭自动任务", true);
        }
        return e.reply("你已经关闭了自动任务，无需再次关闭", true);
    }

    async setAutoPush(e) {
        const accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
        if (!accountList.length) return e.reply("你还没有登录任何账号呢，请使用[~登录]进行登录");

        const config = await Config.getUserConfig();
        const newUser = {
            botId: e.self_id || '',
            groupId: e.group_id || '',
            userId: e.user_id || '',
        };

        const index = config.waves_auto_push_list.findIndex(user =>
            user.botId === newUser.botId &&
            user.groupId === newUser.groupId &&
            user.userId === newUser.userId
        );

        if (e.msg.includes('开启')) {
            if (index === -1) {
                config.waves_auto_push_list.push(newUser);
                Config.setUserConfig(config);
                return e.reply("已开启结晶波片推送，可以使用[~体力阈值]来自定义提醒阈值", true);
            }
            return e.reply("你已经开启了结晶波片推送，，无需再次开启", true);
        }

        if (index !== -1) {
            config.waves_auto_push_list.splice(index, 1);
            Config.setUserConfig(config);
            return e.reply("已关闭结晶波片推送", true);
        }
        return e.reply("你已经关闭了结晶波片推送，无需再次关闭", true);
    }

    async setAutoNews(e) {
        const newUser = {
            botId: e.self_id || '',
            groupId: e.isGroup ? e.group_id || '' : '',
            userId: e.isGroup ? '' : e.user_id || '',
        };

        if (e.isGroup) {
            const member = e.group.pickMember(e.user_id);
            if (!member.is_owner && !member.is_admin && !e.isMaster) {
                return e.reply("只有管理员和群主才能开启活动推送", true);
            }
        }

        const config = await Config.getUserConfig();
        const index = config.waves_auto_news_list.findIndex(user =>
            user.botId === newUser.botId &&
            user.groupId === newUser.groupId &&
            user.userId === newUser.userId
        );

        if (e.msg.includes('开启')) {
            if (index === -1) {
                config.waves_auto_news_list.push(newUser);
                Config.setUserConfig(config);
                return e.reply("已开启活动推送", true);
            }
            return e.reply("你已经开启了活动推送，无需再次开启", true);
        }

        if (index !== -1) {
            config.waves_auto_news_list.splice(index, 1);
            Config.setUserConfig(config);
            return e.reply("已关闭活动推送", true);
        }
        return e.reply("你已经关闭了活动推送，无需再次关闭", true);
    }

    async setThreshold(e) {
        const [, threshold] = e.msg.match(this.rule[4].reg);
        if (!threshold) {
            const threshold = await redis.get(`Yunzai:waves:sanity_threshold:${e.user_id}`)
            await e.reply(`当前波片阈值为 ${threshold || 240}，使用[~体力阈值]可自定义设定波片推送阈值，如：[~体力阈值230]`, true);
            return true
        }
        if (!/^\d+$/.test(threshold)) {
            await e.reply("波片阈值必须是数字，如：[~体力阈值230]", true);
            return true
        }
        if (threshold > 240 || threshold < 0) {
            await e.reply("波片阈值必须在0-240之间，请重新输入，如：[~体力阈值230]", true);
            return true
        }
        await redis.set(`Yunzai:waves:sanity_threshold:${e.user_id}`, threshold)
        await e.reply(`波片阈值已设置为 ${threshold}，使用[~开启体力推送]后，达到该设定值后会向您推送提醒哦`, true);
        return true
    }

    async setUidDisplay(e) {
        const [, action] = e.msg.match(this.rule[5].reg);
        const hidden = action === '关闭';
        await Uid.setHidden(e.user_id, hidden);

        if (hidden) {
            return e.reply("已关闭UID显示", true);
        }
        return e.reply("已开启UID显示", true);
    }
}