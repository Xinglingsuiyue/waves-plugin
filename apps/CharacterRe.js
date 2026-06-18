import plugin from '../../../lib/plugins/plugin.js'
import WeightCalculator from '../utils/Calculate.js'
import { pluginResources } from '../model/path.js';
import Wiki from '../components/Wiki.js';
import Render from '../components/Render.js';
import Config from '../components/Config.js';
import Waves from "../components/Code.js";
import path from 'path';
import fs from 'fs';

// 漂泊者属性ID映射
const WAVERIDER_ATTRIBUTES = {
    '1604': '湮灭', '1605': '湮灭',
    '1501': '衍射', '1502': '衍射',
    '1309': '导电', '1310': '导电',
    '1406': '气动', '1408': '气动'
};

export class PhantomReplace extends plugin {
    constructor() {
        super({
            name: "鸣潮-声骸替换",
            event: "message",
            priority: 1005,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(.*?)(?:更换|替换|换)(.*)声骸$",
                    fnc: "phantomReplace"
                }
            ]
        })
    }

    async phantomReplace(e) {
        logger.mark(logger.blue('[WAVES 声骸替换]'), `触发命令: ${e.msg}`);

        const match = e.msg.match(this.rule[0].reg);
        if (!match) {
            return await e.reply('请输入正确的命令格式，如：～今汐换安可声骸');
        }

        const [, roleAName, roleBName] = match;

        if (!roleAName || !roleBName) {
            return await e.reply('请输入正确的命令格式，如：～今汐换安可声骸');
        }

        if (e.at) e.user_id = e.at;

        const waves = new Waves();
        const accounts = await waves.getValidAccount(e);
        if (!accounts) return;

        const wiki = new Wiki();
        const targetName = await wiki.getAlias(roleAName.trim());
        const sourceName = await wiki.getAlias(roleBName.trim());

        // 处理漂泊者名称
        let targetNameForFile = targetName.includes('漂泊者') ? '漂泊者' : targetName;
        let sourceNameForFile = sourceName.includes('漂泊者') ? '漂泊者' : sourceName;

        const data = [];
        const imgListSet = new Set();

        await Promise.all(accounts.map(async (acc) => {
            const { uid, serverId, token, did, isPublicCookie } = acc;

            const roleData = await waves.getRoleData(serverId, uid, token, did);

            if (!roleData.status) {
                data.push({ message: `UID ${uid}: ${roleData.msg}` });
                return;
            }

            // 查找角色B
            const sourceChar = roleData.data.roleList.find(role => role.roleName === sourceNameForFile);
            if (!sourceChar) {
                data.push({ message: `UID: ${uid} 还未拥有共鸣者 ${sourceName}` });
                return;
            }

            // 获取角色B的详细数据
            const sourceRoleDetail = await waves.getRoleDetail(serverId, uid, sourceChar.roleId, token, did);
            if (!sourceRoleDetail.status || !sourceRoleDetail.data.role) {
                data.push({ message: `UID: ${uid} :查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开` });
                return;
            }

            // 检查角色B是否有声骸数据
            const sourcePhantomList = sourceRoleDetail.data.phantomData?.equipPhantomList || [];
            if (sourcePhantomList.length === 0) {
                data.push({ message: `UID: ${uid} 还未拥有共鸣者 ${sourceName} ` });
                return;
            }

            let targetRoleDetail;
            let targetChar;

            // 查找角色A
            targetChar = roleData.data.roleList.find(role => role.roleName === targetNameForFile);

            if (targetChar) {
                // 角色A存在
                const targetRoleDetailResult = await waves.getRoleDetail(serverId, uid, targetChar.roleId, token, did);
                if (targetRoleDetailResult.status && targetRoleDetailResult.data.role) {
                    targetRoleDetail = targetRoleDetailResult.data;
                }
            }

            if (!targetRoleDetail) {
                const dataFilePath = path.join(pluginResources, 'CharacterMAX', `${targetNameForFile}.json`);
                if (!fs.existsSync(dataFilePath)) {
                    data.push({ message: `暂未收录【${targetName}】的数据，无法替换声骸` });
                    return;
                }

                try {
                    const rawData = fs.readFileSync(dataFilePath, 'utf-8');
                    let maxData = JSON.parse(rawData);
                    let roleDetailData = maxData.data || maxData;
                    if (typeof roleDetailData === 'string') roleDetailData = JSON.parse(roleDetailData);
                    targetRoleDetail = roleDetailData;
                } catch (error) {
                    data.push({ message: `读取【${targetName}】数据失败：${error.message}` });
                    return;
                }
            }

            const originalData = JSON.parse(JSON.stringify(targetRoleDetail));

            // 执行声骸替换
            const replacementLog = this.replacePhantoms(targetRoleDetail, sourceRoleDetail.data, targetName, sourceName);

            // 计算评分
            const calculated = new WeightCalculator(targetRoleDetail).calculate();
            targetRoleDetail = calculated;

            targetRoleDetail.phantomReplacements = {
                targetRole: targetName,
                sourceRole: sourceName,
                logs: replacementLog,
                originalScore: originalData.score || 0,
                newScore: calculated.score || 0
            };

            // 获取角色图片
            const rolePicDir = path.join(pluginResources, 'rolePic', targetNameForFile);
            let rolePicUrl = '';
            try {
                const webpFiles = fs.readdirSync(rolePicDir).filter(f => f.toLowerCase().endsWith('.webp'));
                if (webpFiles.length > 0) {
                    const randomFile = webpFiles[Math.floor(Math.random() * webpFiles.length)];
                    rolePicUrl = `file://${rolePicDir}/${randomFile}`;
                }
            } catch (err) {}

            if (!rolePicUrl && targetRoleDetail.role) {
                rolePicUrl = targetRoleDetail.role.rolePicUrl;
            }

            imgListSet.add(rolePicUrl);

            // 处理漂泊者显示名称
            let displayName = targetName;
            if (targetName === '漂泊者' && targetRoleDetail.role?.roleId) {
                const roleId = targetRoleDetail.role.roleId.toString();
                if (WAVERIDER_ATTRIBUTES[roleId]) {
                    displayName = `漂泊者${WAVERIDER_ATTRIBUTES[roleId]}`;
                    targetRoleDetail.role.name = displayName;
                }
            }

            // 渲染结果
            const roleDetail = { status: true, data: targetRoleDetail };
            const imageCard = await Render.render('Template/charProfile/charProfile', {
                data: { uid, rolePicUrl, roleDetail },
            }, { e, retType: 'base64' });

            data.push({ message: imageCard });
        }));

        if (data.length === 0) {
            return await e.reply('未绑定鸣潮特征码，请使用[~绑定uid]完成绑定，或使用[~登录]进行登录自动绑定');
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
                JSON.stringify({ type: 'phantomReplace', img: [...imgListSet] }),
                { EX: 3600 * 3 }
            );
        }

        return true;
    }

    /**
     * 替换声骸数据
     * @param {Object} targetData - 目标角色数据（角色A）
     * @param {Object} sourceData - 源角色数据（角色B）
     * @param {String} targetName - 目标角色名称
     * @param {String} sourceName - 源角色名称
     * @returns {Array} 替换日志
     */
    replacePhantoms(targetData, sourceData, targetName, sourceName) {
        const replacementLog = [];

        // 获取源角色的声骸列表
        const sourcePhantomList = sourceData.phantomData?.equipPhantomList || [];
        
        // 获取目标角色的声骸列表
        if (!targetData.phantomData) {
            targetData.phantomData = {
                cost: 0,
                equipPhantomList: []
            };
        }

        const targetPhantomList = targetData.phantomData.equipPhantomList || [];

        targetData.phantomData.equipPhantomList = [];

        for (let i = 0; i < sourcePhantomList.length; i++) {
            const sourcePhantom = sourcePhantomList[i];
            
            if (!sourcePhantom) continue;
            
            // 拷贝声骸数据
            const newPhantom = JSON.parse(JSON.stringify(sourcePhantom));
            
            newPhantom.isReplaced = true;
            newPhantom.sourceRole = sourceName;

            // 添加到目标角色的声骸列表
            targetData.phantomData.equipPhantomList.push(newPhantom);

            const mainStats = newPhantom.mainProps?.map(p => `${p.attributeName} ${p.attributeValue}`).join(' | ') || '无';
            replacementLog.push({
                index: i + 1,
                phantomName: newPhantom.phantomProp?.name || `声骸${i+1}`,
                cost: newPhantom.cost || 0,
                mainStats: mainStats,
                subStatsCount: newPhantom.subProps?.length || 0
            });
        }

        targetData.phantomData.cost = sourceData.phantomData?.cost || 0;

        return replacementLog;
    }
}
