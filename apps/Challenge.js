import plugin from '../../../lib/plugins/plugin.js'
import Waves from "../components/Code.js";
import Render from '../components/Render.js';

export class Challenge extends plugin {
    constructor() {
        super({
            name: "鸣潮-挑战数据",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(?:挑战|挑战数据|全息|全息战略)(\\d{9})?$",
                    fnc: "challenge"
                }
            ]
        })
    }

    async challenge(e) {
        const waves = new Waves();
        const [, roleId] = e.msg.match(this.rule[0].reg);

        const accounts = await waves.getValidAccount(e, roleId);
        if (!accounts) return;

        let data = [];
        await Promise.all(accounts.map(async (acc) => {
            const { uid, serverId, token, did } = acc;

            const [baseData, challengeData] = await Promise.all([
                waves.getBaseData(serverId, uid, token, did),
                waves.getChallengeData(serverId, uid, token, did)
            ]);

            if (!baseData.status || !challengeData.status) {
                data.push({ message: baseData.msg || challengeData.msg });
            } else {
                const result = [];

                Object.keys(challengeData.data.challengeInfo).forEach(key => {
                    const challenges = challengeData.data.challengeInfo[key];

                    for (let i = challenges.length - 1; i >= 0; i--) {
                        if (challenges[i].roles) {
                            result.push(challenges[i]);
                            break;
                        }
                    }
                });

                for (let i = 0; i < result.length; i++) {
                    const { passTime } = result[i];
                    const hours = Math.floor(passTime / 3600);
                    const minutes = Math.floor((passTime % 3600) / 60);
                    const seconds = passTime % 60;
                    result[i].passTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                };

                const imageCard = await Render.render('Template/challengeDetails/challengeDetails', {
                    isSelf: !!(!roleId && await redis.get(`Yunzai:waves:users:${e.user_id}`)),
                    baseData: baseData.data,
                    challengeData: result,
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
