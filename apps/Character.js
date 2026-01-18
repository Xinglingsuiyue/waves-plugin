import plugin from '../../../lib/plugins/plugin.js'
import WeightCalculator from '../utils/Calculate.js'
import { pluginResources } from '../model/path.js';
import Waves from "../components/Code.js";
import Config from '../components/Config.js';
import Wiki from '../components/Wiki.js';
import Render from '../components/Render.js';
import LocalData from '../components/LocalData.js';
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
                // 1. 全量刷新
                {
                    reg: "^(?:～|~|鸣潮)(刷新|更新|upd)(全部|所有)?面板$",
                    fnc: "refreshAllPanel"
                },
                // 2. 单角色刷新
                {
                    reg: "^(?:～|~|鸣潮)(刷新|更新|upd)(.+)面板$",
                    fnc: "refreshSinglePanel"
                },
                // 3. 查看面板 (混合模式：本地优先 -> 自动联网)
                {
                    reg: "^(?:～|~|鸣潮)(?!刷新|更新|upd)(.+)面板(\\d{9})?$",
                    fnc: "character"
                }
            ]
        })
    }

    /**
     * 获取绑定的账号列表 (终极版：YAML配置 + 简易绑定文件 + Redis)
     */
    async getBoundAccounts(userId, targetUid = null) {
        let accounts = [];

        // 1. 尝试从 Config.getUserData 读取 (对应 ~登录 的情况)
        const userData = Config.getUserData(userId);
        if (userData && Object.keys(userData).length > 0) {
            if (Array.isArray(userData)) {
                accounts = userData.map(item => ({
                    uid: String(item.uid || item.gameUid || item.roleId || item.curUid),
                    ...item
                }));
            } else {
                if (userData.uid) accounts.push({ uid: String(userData.uid), ...userData });
                else accounts = Object.keys(userData).map(key => ({ uid: String(userData[key]?.uid || key), ...userData[key] }));
            }
        }

        // 2. 尝试从 Config.getBindUid 读取 (对应 ~绑定 的情况)
        if (Config.getBindUid) {
            const simpleBindUid = Config.getBindUid(userId);
            if (simpleBindUid) {
                if (!accounts.some(acc => acc.uid === String(simpleBindUid))) {
                    accounts.push({ uid: String(simpleBindUid), is_bind_only: true });
                }
            }
        }

        // 3. 尝试从 Redis 读取 (兜底)
        try {
            const redisUid = await redis.get(`Yunzai:waves:uid:${userId}`);
            if (redisUid && !accounts.some(acc => acc.uid === String(redisUid))) {
                accounts.push({ uid: String(redisUid), is_bind_only: true });
            }
        } catch {}

        // 4. 过滤无效账号
        accounts = accounts.filter(acc => acc.uid && acc.uid !== 'undefined' && acc.uid !== 'null' && acc.uid !== '');

        if (accounts.length === 0) {
            return { status: false, msg: '请先绑定鸣潮账号' };
        }

        // 5. 筛选目标 UID
        if (targetUid) {
            const target = accounts.find(acc => acc.uid === String(targetUid));
            if (!target) {
                return { status: false, msg: `未在当前账号下找到绑定的UID: ${targetUid}` };
            }
            return { status: true, data: [target] };
        }

        return { status: true, data: accounts };
    }

    // ==================== 1. 查看面板 (本地优先 + 自动兜底) ====================
    async character(e) {
        const match = e.msg.match(this.rule[2].reg);
        if (!match) return;
        const [, message, roleId] = match;
        
        if (e.at) e.user_id = e.at;
        if (!message) return await e.reply('请输入正确的命令格式，如：[~安可面板]');

        const wiki = new Wiki();
        let name = await wiki.getAlias(message);
        if (name.includes('漂泊者')) name = '漂泊者';

        // --- 1. 尝试从本地读取 ---
        const localCheck = await this.getBoundAccounts(e.user_id, roleId);
        
        if (localCheck.status) {
            const localAccounts = localCheck.data;
            const validLocalData = [];
            
            for (const acc of localAccounts) {
                const uid = acc.uid;
                const localRole = LocalData.getRoleByName(uid, name);
                
                if (localRole && localRole.role) {
                    if (Config.getConfig()?.enable_log) {
                        logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`命中本地缓存: UID ${uid} - ${name}`));
                    }
                    validLocalData.push({ uid, roleData: localRole });
                }
            }

            // 本地有数据，直接渲染并结束 (不联网)
            if (validLocalData.length > 0) {
                return await this.renderData(e, validLocalData, name);
            }
        }

        // --- 2. 本地无数据，尝试联网获取 ---
        if (Config.getConfig()?.enable_log) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`本地无数据，尝试联网获取: ${name}`));
        }

        const waves = new Waves();
        // 此处调用原插件方法获取 Token (会联网校验)
        const accounts = await waves.getValidAccount(e, roleId);
        if (!accounts) return;

        const apiData = [];

        await Promise.all(accounts.map(async (acc) => {
            const { uid, serverId, token, did } = acc;
            
            const roleData = await waves.getRoleData(serverId, uid, token, did);
            if (!roleData.status) {
                apiData.push({ error: `UID ${uid}: ${roleData.msg}` });
                return;
            }

            const char = roleData.data.roleList.find(role => role.roleName === name);
            if (!char) {
                apiData.push({ error: `UID: ${uid} 还未拥有共鸣者 ${name}` });
                return;
            }

            const detailRes = await waves.getRoleDetail(serverId, uid, char.roleId, token, did);
            if (!detailRes.status) {
                apiData.push({ error: `UID ${uid}: ${detailRes.msg}` });
                return;
            }

            if (!detailRes.data.role) {
                apiData.push({ error: `UID: ${uid} 未展示此角色` });
                return;
            }

            // 写入本地缓存
            LocalData.saveRawData(uid, [detailRes.data]);
            
            apiData.push({ uid, roleData: detailRes.data });
        }));

        return await this.renderData(e, apiData, name);
    }

    // ==================== 2. 全量刷新 ====================
    async refreshAllPanel(e) {
        const waves = new Waves();
        if (e.at) e.user_id = e.at;
        
        const accounts = await waves.getValidAccount(e);
        if (!accounts) return;

        const results = [];
        await e.reply(`开始刷新 ${accounts.length} 个账号的面板数据...`);

        for (const acc of accounts) {
            const { uid, serverId, token, did } = acc;
            const cooldown = await Config.checkRefreshCooldown(uid, 'full');
            if (cooldown.inCooldown) {
                results.push({ uid, success: false, message: `冷却中 ${cooldown.remainingTime}s` });
                continue;
            }

            try {
                const roleData = await waves.getRoleData(serverId, uid, token, did);
                if (!roleData.status) {
                    results.push({ uid, success: false, message: roleData.msg });
                    continue;
                }

                const roleList = roleData.data.roleList || [];
                const roleDetailList = [];
                const concurrency = Config.getRefreshConfig().RefreshCardConcurrency;

                for (let i = 0; i < roleList.length; i += concurrency) {
                    const batch = roleList.slice(i, i + concurrency);
                    const batchResults = await Promise.all(
                        batch.map(role => waves.getRoleDetail(serverId, uid, role.roleId, token, did))
                    );
                    batchResults.forEach(res => {
                        if (res.status && res.data.role) roleDetailList.push(res.data);
                    });
                    if (i + concurrency < roleList.length) await new Promise(r => setTimeout(r, 800));
                }

                if (roleDetailList.length > 0) {
                    LocalData.saveRawData(uid, roleDetailList);
                    await Config.setRefreshCooldown(uid, 'full');
                    results.push({ uid, success: true, message: `成功更新 ${roleDetailList.length} 个角色` });
                } else {
                    results.push({ uid, success: false, message: `未获取到角色数据` });
                }
            } catch (err) {
                results.push({ uid, success: false, message: `异常: ${err.message}` });
            }
        }

        let msg = `面板刷新结果：`;
        for (const res of results) msg += `\nUID ${res.uid}: ${res.success?'✅':'❌'} ${res.message}`;
        await e.reply(msg);
    }

    // ==================== 3. 单角色刷新 (防抖+加锁+预检查版) ====================
    async refreshSinglePanel(e) {
        const match = e.msg.match(this.rule[1].reg);
        if (!match) return;
        const charName = match[2];

        // 本地预检查 (快速拦截)
        const preCheck = await this.getBoundAccounts(e.user_id);
        const lockedUids = [];
        let localAccounts = preCheck.status ? preCheck.data : [];

        // 如果本地检查到账号，尝试加锁
        if (localAccounts.length > 0) {
            for (const acc of localAccounts) {
                const uid = acc.uid;
                const lockKey = `Yunzai:waves:locking:${uid}`;
                if (await redis.get(lockKey)) {
                    if (localAccounts.length === 1) return await e.reply(`UID ${uid} 正在刷新中`);
                    continue;
                }
                const cooldown = await Config.checkRefreshCooldown(uid, 'single');
                if (cooldown.inCooldown) {
                    if (localAccounts.length === 1) return await e.reply(`UID ${uid} 冷却中 ${cooldown.remainingTime}s`);
                    continue;
                }
                await redis.set(lockKey, '1', { EX: 15 });
                lockedUids.push(uid);
            }
            if (lockedUids.length === 0 && localAccounts.length > 0) return;
        }

        try {
            const waves = new Waves();
            if (e.at) e.user_id = e.at;

            // 联网校验账号
            const accounts = await waves.getValidAccount(e);
            if (!accounts) return;

            const wiki = new Wiki();
            let name = await wiki.getAlias(charName);
            if (name.includes('漂泊者')) name = '漂泊者';

            const refreshConfig = Config.getRefreshConfig();
            const results = [];
            let hasSuccess = false;

            for (const acc of accounts) {
                const { uid, serverId, token, did } = acc;
                // 如果启用了锁机制，只处理锁住的UID
                if (lockedUids.length > 0 && !lockedUids.includes(String(uid))) continue;

                try {
                    const roleData = await waves.getRoleData(serverId, uid, token, did);
                    if (!roleData.status) {
                        results.push({ uid, success: false, message: roleData.msg });
                        continue;
                    }
                    const char = roleData.data.roleList.find(r => r.roleName === name);
                    if (!char) {
                        results.push({ uid, success: false, message: `未拥有 ${name}` });
                        continue;
                    }
                    const detail = await waves.getRoleDetail(serverId, uid, char.roleId, token, did);
                    if (!detail.status || !detail.data.role) {
                        results.push({ uid, success: false, message: `获取失败或未展示` });
                        continue;
                    }

                    LocalData.saveRawData(uid, [detail.data]);
                    await Config.setRefreshCooldown(uid, 'single');
                    results.push({ uid, success: true, message: `成功` });
                    hasSuccess = true;
                } catch (err) {
                    logger.error(`[WAVES PLUGIN] 刷新异常: ${err.message}`);
                    results.push({ uid, success: false, message: `异常: ${err.message}` });
                }
            }

            const shouldSendCard = refreshConfig.RefreshSingleCharBehavior === 1 || refreshConfig.RefreshSingleCharBehavior === true;
            if (shouldSendCard && hasSuccess) {
                e.msg = `~${name}面板`;
                await this.character(e);
            } else {
                let msg = `${name} 刷新结果：`;
                for (const res of results) msg += `\nUID ${res.uid}: ${res.success?'✅':'❌'} ${res.message}`;
                if (results.length > 0) await e.reply(msg);
            }
        } catch (error) {
            logger.error(`刷新错误: ${error.stack}`);
        } finally {
            for (const uid of lockedUids) await redis.del(`Yunzai:waves:locking:${uid}`);
        }
    }

    /**
     * 辅助方法：统一渲染逻辑
     */
    async renderData(e, dataList, name) {
        const msgList = [];
        const imgListSet = new Set();
        let hasError = false;

        for (const item of dataList) {
            if (item.error) {
                msgList.push({ message: item.error });
                hasError = true;
                continue;
            }

            const { uid, roleData } = item;
            let roleDetail = { status: true, data: roleData };
            const char = roleData.role;

            const rolePicDir = path.join(pluginResources, 'rolePic', name);
            let webpFiles = [];
            try { webpFiles = fs.readdirSync(rolePicDir).filter(f => f.toLowerCase().endsWith('.webp')); } catch {}
            const rolePicUrl = webpFiles.length > 0
                ? `file://${rolePicDir}/${webpFiles[Math.floor(Math.random() * webpFiles.length)]}`
                : (char.rolePicUrl || '');
            imgListSet.add(rolePicUrl);

            const calculated = new WeightCalculator(roleDetail.data).calculate();
            roleDetail.data = calculated;

            const phantomScore = calculated?.phantomData?.statistic?.totalScore || 0;
            if (phantomScore > 0) {
                const groupId = e.isGroup ? e.group_id : 'private';
                const leaderboardName = (name === '漂泊者' && char.roleId in WAVERIDER_ATTRIBUTES)
                    ? `漂泊者${WAVERIDER_ATTRIBUTES[char.roleId]}` : name;
                
                const charInfo = {
                    roleIcon: char.roleIconUrl,
                    weaponIcon: calculated.weaponData?.weapon?.iconUrl,
                    phantomIcon: calculated.phantomData?.equipPhantomList?.[0]?.phantomProp?.iconUrl,
                    roleName: leaderboardName,
                    level: calculated.level,
                    chainCount: calculated.chainList ? calculated.chainList.filter(c => c.unlocked).length : 0,
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
                
                LocalData.saveCharListData(uid, char.roleId, phantomScore);
                await Promise.all([
                    RankUtil.updateRankData(leaderboardName, uid, phantomScore, groupId, charInfo),
                    RankUtil.updateRankData(leaderboardName, uid, phantomScore, 'global', charInfo)
                ]);
            }

            const imageCard = await Render.render('Template/charProfile/charProfile', {
                data: { uid, rolePicUrl, roleDetail },
            }, { e, retType: 'base64' });
            msgList.push({ message: imageCard });
        }

        if (msgList.length === 0) return await e.reply('无法获取数据');

        const msgRes = await e.reply(msgList.length === 1 ? msgList[0].message : await Bot.makeForwardMsg([{ message: `用户 ${e.user_id}` }, ...msgList]));
        
        if (msgRes && !hasError) {
             const message_id = Array.isArray(msgRes.message_id) ? msgRes.message_id : [msgRes.message_id];
             for (const id of message_id) {
                 if(id) await redis.set(`Yunzai:waves:originpic:${id}`, JSON.stringify({ type: 'profile', img: [...imgListSet] }), { EX: 3600 * 3 });
             }
        }
        return true;
    }
}