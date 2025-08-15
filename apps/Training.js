import plugin from '../../../lib/plugins/plugin.js'
import WeightCalculator from '../utils/Calculate.js'
import Waves from "../components/Code.js";
import Config from '../components/Config.js';
import Render from '../components/Render.js';
import RankUtil from '../utils/RankUtil.js';

// 漂泊者属性ID映射
const WAVERIDER_ATTRIBUTES = {
    '1604': '湮灭', '1605': '湮灭',
    '1501': '衍射', '1502': '衍射',
    '1406': '气动', '1408': '气动'
};

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
        
        // 处理@的情况
        if (e.at) e.user_id = e.at;
        
        // 获取账号列表
        const accounts = await waves.getValidAccount(e, roleId);
        if (!accounts) return;
        
        const groupId = e.isGroup ? e.group_id : 'private';
        let data = [];
        let deleteroleId = [];

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
                
                // 处理漂泊者角色名
                if (calculatedRole.roleName === '漂泊者') {
                    const attribute = WAVERIDER_ATTRIBUTES[calculatedRole.roleId];
                    if (attribute) {
                        calculatedRole.roleName = `漂泊者${attribute}`;
                    }
                }
                
                return calculatedRole;
            });
            
            // 更新排行榜数据 - 添加武器图标
            await Promise.all(roleList.map(async (role) => {
                const phantomScore = role?.phantomData?.statistic?.totalScore || 0;
                if (phantomScore > 0) {
                    // 处理漂泊者角色名
                    let roleName = role.roleName;
                    if (roleName === '漂泊者') {
                        const attribute = WAVERIDER_ATTRIBUTES[role.roleId];
                        if (attribute) {
                            roleName = `漂泊者${attribute}`;
                        }
                    }
                    
                    const charInfo = {
                        roleIcon: role.roleIconUrl,
                        weaponIcon: role.weaponData?.weapon?.iconUrl,
                        phantomIcon: role.phantomData?.equipPhantomList?.[0]?.phantomProp?.iconUrl,
                        roleName: roleName,
                        roleId: role.roleId, // 保留角色ID用于属性区分
                        level: role.level,
                        chainCount: role.chainCount,
                        weapon: {
                            name: role.weaponData?.weapon?.weaponName || "未知",
                            level: role.weaponData?.level || 0,
                            rank: role.weaponData?.rank || 0,
                            resonLevel: role.weaponData?.resonLevel || 0,
                            icon: role.weaponData?.weapon?.iconUrl || ""
                        },
                        phantom: {
                            rank: role.phantomData?.statistic?.rank || "N",
                            color: role.phantomData?.statistic?.color || "#a0a0a0"
                        }
                    };
                    
                    // 全局排名
                    await RankUtil.updateRankData(roleName, uid, phantomScore, 'global', charInfo);
                    
                    // 群排名（如果是群聊）
                    if (groupId !== 'private') {
                        await RankUtil.updateRankData(roleName, uid, phantomScore, groupId, charInfo);
                    }
                }
            }));

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
