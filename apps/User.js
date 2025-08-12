import plugin from '../../../lib/plugins/plugin.js'
import Waves from "../components/Code.js";
import Render from '../components/Render.js';

export class UserInfo extends plugin {
    constructor() {
        super({
            name: "鸣潮-用户信息",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(?:信息|卡片)(\\d{9})?$",
                    fnc: "user"
                }
            ]
        })
    }

    async user(e) {
        const waves = new Waves();
        const [, roleId] = e.msg.match(this.rule[0].reg);

        const accounts = await waves.getValidAccount(e, roleId);
        if (!accounts) return;

        let data = [];

        await Promise.all(accounts.map(async (acc) => {
            const { uid, serverId, token, did } = acc;

            const [baseData, roleData] = await Promise.all([
                waves.getBaseData(serverId, uid, token, did),
                waves.getRoleData(serverId, uid, token, did)
            ]);

            if (!baseData.status || !roleData.status) {
                data.push({ message: baseData.msg || roleData.msg });
            } else {
                roleData.data.roleList.sort((a, b) => {
                    return b.starLevel - a.starLevel
                })

                const imageCard = await Render.render('Template/userInfo/userInfo', {
                    isSelf: !!(!uid && await redis.get(`Yunzai:waves:users:${e.user_id}`)),
                    baseData: baseData.data,
                    roleData: roleData.data,
                }, { e, retType: 'base64' });

                data.push({ message: imageCard });
            }
        }));


        if (data.length === 1) {
            await e.reply(data[0].message);
            return true;
        }

        await e.reply(await Bot.makeForwardMsg([{ message: `用户 ${e.user_id}` }, ...data]));
        return true;
    }
}