import plugin from '../../../lib/plugins/plugin.js'
import WeightCalculator from '../utils/Calculate.js'
import { pluginResources } from '../model/path.js';
import Waves from "../components/Code.js";
import Config from '../components/Config.js';
import Wiki from '../components/Wiki.js';
import Render from '../components/Render.js';
import path from 'path';
import fs from 'fs';
import RankUtil from '../utils/RankUtil.js';

// 漂泊者属性ID映射
const WAVERIDER_ATTRIBUTES = {
    '1604': '湮灭', '1605': '湮灭',
    '1501': '衍射', '1502': '衍射',
    '1406': '气动', '1408': '气动'
};

export class Character extends plugin {
    constructor() {
        super({
            name: "鸣潮-角色面板",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(.*)面板(\\d{9})?$",
                    fnc: "character"
                }
            ]
        })
    }

    async character(e) {
        const waves = new Waves();
        const [, message, roleId] = e.msg.match(this.rule[0].reg);
        
        // 处理@的情况
        if (e.at) e.user_id = e.at;
        
        // 获取账号列表
        const accounts = await waves.getValidAccount(e, roleId);
        if (!accounts) return;
        
        if (!message) return await e.reply('请输入正确的命令格式，如：[~安可面板]');

        const wiki = new Wiki();
        let name = await wiki.getAlias(message);
        
        // 修复1: 恢复文档1的漂泊者处理逻辑
        if (name.includes('漂泊者')) {
            name = '漂泊者';
        }

        const data = [];
        const imgListSet = new Set();

        await Promise.all(accounts.map(async (acc) => {
            const { uid, serverId, token, did } = acc;

            const roleData = await waves.getRoleData(serverId, uid, token, did);

            if (!roleData.status) {
                data.push({ message: `UID ${uid}: ${roleData.msg}` });
                return;
            }

            const rolePicDir = path.join(pluginResources, 'rolePic', name);

            const char = roleData.data.roleList.find(role => role.roleName === name);
            if (!char) {
                // 修复2: 显示实际查询的角色名
                data.push({ message: `UID: ${uid} 还未拥有共鸣者 ${name}` });
                return;
            }

            const roleDetail = await waves.getRoleDetail(serverId, uid, char.roleId, token, did);
            if (!roleDetail.status) {
                data.push({ message: `UID ${uid}: ${roleDetail.msg}` });
                return;
            }

            if (!roleDetail.data.role) {
                // 修复3: 优化展示角色列表的显示
                const showroleList = roleData.data.showRoleIdList.map(roleId => {
                    const role = roleData.data.roleList.find(r => r.roleId === roleId || r.mapRoleId === roleId);
                    // 特殊处理漂泊者显示
                    if (role && role.roleName === '漂泊者') {
                        const attribute = WAVERIDER_ATTRIBUTES[role.roleId] || '';
                        return `漂泊者${attribute}`;
                    }
                    return role ? role.roleName : null;
                }).filter(Boolean);

                data.push({
                    message: `UID: ${uid} 未在库街区展示此角色，请在库街区展示角色\n\n当前展示角色有：\n${showroleList.join('、')}\n\n使用[~登录]登录该账号后即可查看所有角色`
                });
                return;
            }

            let webpFiles = [];
            try {
                webpFiles = fs.readdirSync(rolePicDir).filter(file => file.toLowerCase().endsWith('.webp'));
            } catch {}

            const rolePicUrl = webpFiles.length > 0
                ? `file://${rolePicDir}/${webpFiles[Math.floor(Math.random() * webpFiles.length)]}`
                : roleDetail.data.role.rolePicUrl;

            imgListSet.add(rolePicUrl);

            // 计算角色数据和声骸评分
            const calculated = new WeightCalculator(roleDetail.data).calculate();
            roleDetail.data = calculated;

            const phantomScore = calculated?.phantomData?.statistic?.totalScore || 0;
            if (phantomScore > 0) {
                const groupId = e.isGroup ? e.group_id : 'private';
                
                // 修复4: 保留文档2的排行榜优化
                // 生成带属性后缀的漂泊者名称
                const leaderboardName = (name === '漂泊者' && char.roleId in WAVERIDER_ATTRIBUTES)
                    ? `漂泊者${WAVERIDER_ATTRIBUTES[char.roleId]}`
                    : name;

                const charInfo = {
                    roleIcon: char.roleIconUrl,
                    weaponIcon: calculated.weaponData?.weapon?.iconUrl,
                    phantomIcon: calculated.phantomData?.equipPhantomList?.[0]?.phantomProp?.iconUrl,
                    roleName: leaderboardName, // 排行榜使用带属性名称
                    level: calculated.level,
                    chainCount: calculated.chainList 
                        ? calculated.chainList.filter(chain => chain.unlocked).length 
                        : 0,
                    weapon: {
                        name: calculated.weaponData?.weapon?.weaponName || "未知",
                        level: calculated.weaponData?.level || 0,
                        rank: calculated.weaponData?.rank || 0,
                        resonLevel: calculated.weaponData?.resonLevel || 0,
                        icon: calculated.weaponData?.weapon?.iconUrl || ""
                    },
                    phantom: {
                        rank: calculated.phantomData?.statistic?.rank || "N",
                        color: calculated.phantomData?.statistic?.color || "#a0a0a0"
                    }
                };
                
                await Promise.all([
                    RankUtil.updateRankData(leaderboardName, uid, phantomScore, groupId, charInfo),
                    RankUtil.updateRankData(leaderboardName, uid, phantomScore, 'global', charInfo)
                ]);
            }

            const imageCard = await Render.render('Template/charProfile/charProfile', {
                data: { uid, rolePicUrl, roleDetail },
            }, { e, retType: 'base64' });

            data.push({ message: imageCard });
        }));

        if (data.length === 0) {
            return await e.reply('无法获取角色数据，请确保角色已展示在库街区');
        }

        const msgData = data.length === 1
            ? data[0].message
            : await Bot.makeForwardMsg([{ message: `用户 ${e.user_id}` }, ...data]);

        const msgRes = await e.reply(msgData);
        const message_id = Array.isArray(msgRes?.message_id)
            ? msgRes.message_id
            : [msgRes?.message_id].filter(Boolean);

        for (const id of message_id) {
            await redis.set(
                `Yunzai:waves:originpic:${id}`,
                JSON.stringify({ type: 'profile', img: [...imgListSet] }),
                { EX: 3600 * 3 }
            );
        }

        return true;
    }
}
