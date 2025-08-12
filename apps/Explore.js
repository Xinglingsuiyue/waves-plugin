import plugin from '../../../lib/plugins/plugin.js'
import Waves from "../components/Code.js";
import Render from '../components/Render.js';

export class Explore extends plugin {
    constructor() {
        super({
            name: "鸣潮-探索数据",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(?:探索度|地图)(\\d{9})?$",
                    fnc: "explore"
                }
            ]
        })
    }

    async explore(e) {
        const waves = new Waves();

        const [, roleId] = e.msg.match(this.rule[0].reg);

        const accounts = await waves.getValidAccount(e, roleId);
        if (!accounts) return;

        let data = [];

        await Promise.all(accounts.map(async (acc) => {
            const { uid, serverId, token, did } = acc;

            let [baseData, exploreData] = await Promise.all([
                waves.getBaseData(serverId, uid, token, did),
                waves.getExploreData(serverId, uid, token, did)
            ]);

            if (!baseData.status || !exploreData.status) {
                data.push({ message: baseData.msg || exploreData.msg });
            } else {

                const imageCard = await Render.render('Template/exploreIndex/exploreIndex', {
                    isSelf: !!(!uid && await redis.get(`Yunzai:waves:users:${e.user_id}`)),
                    baseData: baseData.data,
                    exploreData: exploreData.data.exploreList,
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