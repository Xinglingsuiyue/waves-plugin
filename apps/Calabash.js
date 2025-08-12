import plugin from '../../../lib/plugins/plugin.js'
import Waves from "../components/Code.js";
import Render from '../components/Render.js';

export class Calabash extends plugin {
    constructor() {
        super({
            name: "鸣潮-数据坞",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(?:数据坞|声骸)(\\d{9})?$",
                    fnc: "calabash"
                }
            ]
        })
    }

    async calabash(e) {
        const waves = new Waves();

        const [, roleId] = e.msg.match(this.rule[0].reg);

        const accounts = await waves.getValidAccount(e, roleId);
        if (!accounts) return;
        
        let data = [];

        await Promise.all(accounts.map(async (acc) => {
            const { uid, serverId, token, did } = acc;

            const [baseData, calabashData] = await Promise.all([
                waves.getBaseData(serverId, uid, token, did),
                waves.getCalabashData(serverId, uid, token, did)
            ]);

            if (!baseData.status || !calabashData.status) {
                data.push({ message: baseData.msg || calabashData.msg });
            } else {
                if (!calabashData.data.phantomList) {
                    calabashData.data.phantomList = []
                };
                calabashData.data.phantomList.sort((a, b) => {
                    return b.star - a.star
                });

                const imageCard = await Render.render('Template/calaBash/calaBash', {
                    isSelf: !!(!roleId && await redis.get(`Yunzai:waves:users:${e.user_id}`)),
                    baseData: baseData.data,
                    calabashData: calabashData.data,
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