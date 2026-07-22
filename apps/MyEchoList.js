import plugin from '../../../lib/plugins/plugin.js'
import WeightCalculator from '../utils/Calculate.js'
import Waves from "../components/Code.js";
import Render from '../components/Render.js';

const PAGE_SIZE = 30;
const CACHE_TTL = 1800;

async function batchAsync(items, batchSize, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(fn));
        results.push(...batchResults);
    }
    return results;
}

export class MyEchoList extends plugin {
    constructor() {
        super({
            name: "鸣潮-声骸仓库", 
            event: "message",
            priority: 1008,
            rule: [
                {
                   reg:"^(?:～|~|鸣潮)(?:声骸仓库|我的声骸|声骸背包|声骸列表)(\\d*)$",
                   fnc:"myEchoList" }
        ] });
    }

    async myEchoList(e) {
        try {
            return await this._myEchoList(e);
        } catch (err) {
            logger.error(`[声骸仓库] 执行异常: ${err.message}\n${err.stack}`);
            await e.reply(`声骸仓库查询失败: ${err.message}`, true);
            return true;
        }
    }

    async _myEchoList(e) {
        const match = e.msg.match(this.rule[0].reg);
        const pageStr = match[1] || '';
        const targetPage = pageStr ? parseInt(pageStr, 10) : 1;
        const roleId = pageStr && pageStr.length === 9 ? pageStr : null;

        const cacheKey = `Yunzai:waves:echoCache:${e.user_id}`;

        const waves = new Waves();
        const accounts = await waves.getValidAccount(e, roleId);
        if (!accounts) return;

        const acc = accounts[0];
        const { uid, serverId, token, did } = acc;

        let cached = null;
        try {
            const raw = await redis.get(cacheKey);
            if (raw) cached = JSON.parse(raw);
        } catch (err) {  }

        let allPhantoms, baseData, isSelf;

        if (cached && cached.uid === uid) {
            allPhantoms = cached.allPhantoms;
            baseData = cached.baseData;
            isSelf = cached.isSelf;
        } else {
            const baseResult = await waves.getBaseData(serverId, uid, token, did);
            if (!baseResult.status) { await e.reply(`获取基础信息失败: ${baseResult.msg}`, true); return true; }
            baseData = baseResult.data;

            const roleData = await waves.getRoleData(serverId, uid, token, did);
            if (!roleData.status) { await e.reply(`获取角色列表失败: ${roleData.msg}`, true); return true; }

            const roleList = roleData.data.roleList || [];
            if (!roleList.length) { await e.reply('该账号暂无角色数据', true); return true; }

            const roleDetails = await batchAsync(roleList, 3, async (r) => {
                try { const d = await waves.getRoleDetail(serverId, uid, r.roleId, token, did); return { roleId:r.roleId, roleName:r.roleName, status:d.status, data:d.data, msg:d.msg }; }
                catch (err) { return { roleId:r.roleId, roleName:r.roleName, status:false, data:null, msg:'获取角色详细信息失败，疑似网络问题，请检查控制台日志' }; }
            });

            allPhantoms = [];
            let firstDetailError = '';

            roleDetails.forEach((detail) => {
                if (!detail.status) {
                    if (!firstDetailError) firstDetailError = detail.msg;
                    logger.warn(`[声骸仓库] ${detail.roleName}(${detail.roleId}) 详情失败: ${detail.msg}`);
                    return;
                }
                if (!detail.data?.role) { logger.warn(`[声骸仓库] ${detail.roleName}(${detail.roleId}) 未展示角色`); return; }

                const rawData = JSON.parse(JSON.stringify(detail.data));
                const calculated = new WeightCalculator(rawData).calculate();

                const list = calculated?.phantomData?.equipPhantomList || [];
                list.filter(Boolean).forEach((phantom) => {
                    const prop = phantom.phantomProp || {};
                    const mainProps = (phantom.mainProps || []).map(sp => ({
                        attributeName: sp.attributeName || '',
                        attributeValue: sp.attributeValue || '',
                    }));
                    const subProps = (phantom.subProps || []).map(sp => ({
                        attributeName: sp.attributeName || '',
                        attributeValue: sp.attributeValue || '',
                        color: sp.color || '#a0a0a0',
                    }));
                    const score = phantom.realScore || 0;
                    const rank = phantom.rank || 'D';
                    const color = phantom.color || '#a0a0a0';
                    const roleIcon = detail.data?.role?.roleIconUrl || '';

                    allPhantoms.push({
                        name: prop.name || '未知声骸',
                        level: phantom.level || 0,
                        cost: phantom.cost || 0,
                        iconUrl: prop.iconUrl || '',
                        fetterIcon: phantom.fetterDetail?.iconUrl || '',
                        roleIcon,
                        mainProps, subProps,
                        equippedRole: detail.roleName || '未知角色',
                        score,
                        scoreLabel: rank,
                        scoreColor: color,
                        scoreDisplay: score === 0 ? '暂无评分' : `${score.toFixed(2)}-${rank}`,
                    });
                });
            });

            if (!allPhantoms.length) {
                const errMsg = firstDetailError || '该账号下没有装备任何声骸';
                await e.reply(errMsg, true);
                return true;
            }

            allPhantoms.sort((a, b) => b.score - a.score);

            isSelf = !!(!roleId && await redis.get(`Yunzai:waves:users:${e.user_id}`));

            await redis.set(cacheKey, JSON.stringify({ uid, allPhantoms, baseData, isSelf }), { EX: CACHE_TTL });
        }

        const totalPages = Math.min(5, Math.ceil(allPhantoms.length / PAGE_SIZE));
        const page = Math.max(1, Math.min(targetPage, totalPages));
        const pageData = allPhantoms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

        const img = await Render.render('Template/myEchoList/myEchoList', {
                    isSelf,
                    baseData,
                    playerUid: uid,
                    phantoms: pageData,
            saveId: `myEchoList_${uid}`,
        }, { e, retType:'base64', scale: 2 });

        await e.reply(img);
        return true;
    }
}