import plugin from '../../../lib/plugins/plugin.js'
import WeightCalculator from '../utils/Calculate.js'
import Waves from "../components/Code.js";
import Render from '../components/Render.js';

export class Training extends plugin {
    constructor() {
        super({
            name: "鸣潮-练度统计",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(?:练度|练度统计)(\\d{9})?$",
                    fnc: "training"
                }
            ]
        })
    }

    async training(e) {
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
                return;
            }

            const Promises = roleData.data.roleList.map(role =>
                waves.getRoleDetail(serverId, uid, role.roleId, token, did).then(data =>
                    data.status && data.data.role ? { ...role, ...data.data } : null
                )
            );

            const roleList = (await Promise.all(Promises)).filter(Boolean).map(role => {
                const calculatedRole = new WeightCalculator(role).calculate();
                calculatedRole.chainCount = calculatedRole.chainList.filter(chain => chain.unlocked).length;
                return calculatedRole;
            });

            roleList.forEach(role => {
                const { phantomData } = role;
                phantomData.statistic = {
                    color: "#a0a0a0",
                    rank: "N",
                    totalScore: "N/A",
                    ...phantomData.statistic
                };
            });
            
            roleList.sort((a, b) => {
                const aScore = parseFloat(a.phantomData.statistic.totalScore) || 0;
                const bScore = parseFloat(b.phantomData.statistic.totalScore) || 0;
            
                return b.starLevel - a.starLevel || bScore - aScore;
            });

            const imageCard = await Render.render('Template/training/training', {
                baseData: baseData.data,
                roleList,
            }, { e, retType: 'base64' });

            data.push({ message: imageCard });
        }));

        if (data.length === 1) {
            await e.reply(data[0].message);
            return true;
        }

        await e.reply(await Bot.makeForwardMsg([{ message: `用户 ${e.user_id}` }, ...data]));
        return true;
    }
}