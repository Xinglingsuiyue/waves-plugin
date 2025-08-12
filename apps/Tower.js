import plugin from '../../../lib/plugins/plugin.js'
import Waves from "../components/Code.js";
import Render from '../components/Render.js';

export class TowerInfo extends plugin {
    constructor() {
        super({
            name: "鸣潮-逆境深塔",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(?:逆境)?(?:深(?:塔|渊)|(稳定|实验|超载|深境)(?:区)?)",
                    fnc: "tower"
                }
            ]
        })
    }

    async tower(e) {
        const waves = new Waves();

        let [, key] = e.msg.match(this.rule[0].reg)

        const accounts = await waves.getValidAccount(e, '', true);
        if (!accounts) return;

        let data = [];

        await Promise.all(accounts.map(async (acc) => {
            const { uid, serverId, token, did } = acc;

            const [baseData, towerData] = await Promise.all([
                waves.getBaseData(serverId, uid, token, did),
                waves.getTowerData(serverId, uid, token, did)
            ]);

            if (!baseData.status || !towerData.status) {
                data.push({ message: baseData.msg || towerData.msg });
            } else {
                const Mapping = { '稳定': 1, '实验': 2, '深境': 3, '超载': 4 };
                if (!key) key = '深境';
                if (!towerData.data.difficultyList.some(item => item.difficulty === Mapping[key] && item.towerAreaList.length > 0)) {
                    data.push({ message: `账号 ${uid} 没有${key}区数据` });
                    return;
                }
                towerData.data = { ...towerData.data, difficulty: Mapping[key] || 3, diffiname: `${key}区` };
                const imageCard = await Render.render('Template/towerData/tower', {
                    isSelf: !!(!uid && await redis.get(`Yunzai:waves:users:${e.user_id}`)),
                    baseData: baseData.data,
                    towerData: towerData.data,
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