import plugin from '../../../lib/plugins/plugin.js';
import Wiki from '../components/Wiki.js';
import Render from '../components/Render.js';
import { pluginResources } from '../model/path.js';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import axios from 'axios';
import qs from 'qs';
import Config from '../components/Config.js';

const RERUN_DATA_PATH = path.join(pluginResources, 'Wiki', 'Fuke.yaml');
const AVATAR_CACHE_PATH = path.join(pluginResources, 'data', 'avatarCache.json');
const RESIDENT_5STAR = new Set(['鉴心', '卡卡罗', '安可', '维里奈', '凌阳']);

function safeJSONParse(jsonString) {
    const processed = jsonString.replace(/"entryId":(\d+)/g, '"entryId":"$1"');
    return JSON.parse(processed);
}

export class Fuke extends plugin {
    constructor() {
        super({
            name: "鸣潮-角色复刻查询",
            event: "message",
            priority: 1009,
            rule: [
                { reg: "^(～|~|鸣潮)(.*)复刻$", fnc: "queryRerun" },
                { reg: "^(～|~|鸣潮)复刻(排行|排名|统计)$", fnc: "rerunRanking" }
            ]
        });
    }

    loadRerunData() {
        try {
            if (fs.existsSync(RERUN_DATA_PATH)) {
                return YAML.parse(fs.readFileSync(RERUN_DATA_PATH, 'utf-8')) || {};
            }
        } catch (e) {
            logger.error('[复刻] 加载数据失败:', e);
        }
        return {};
    }

    saveRerunData(data) {
        try {
            const yamlStr = YAML.stringify(data, {
                indent: 2,
                lineWidth: 0,
                noRefs: true
            });
            fs.writeFileSync(RERUN_DATA_PATH, yamlStr);
            return true;
        } catch (e) {
            logger.error('[复刻] 保存数据失败:', e);
            return false;
        }
    }

    loadAvatarCache() {
        try {
            if (fs.existsSync(AVATAR_CACHE_PATH)) {
                return JSON.parse(fs.readFileSync(AVATAR_CACHE_PATH, 'utf-8')) || {};
            }
        } catch (e) {}
        return {};
    }

    saveAvatarCache(cache) {
        try {
            fs.writeFileSync(AVATAR_CACHE_PATH, JSON.stringify(cache, null, 2));
        } catch (e) {}
    }

    async fetchWikiPage(catalogueId) {
        const url = Config.getConfig().reverse_proxy_url + '/wiki/core/catalogue/item/getPage';
        const data = qs.stringify({ catalogueId, limit: 1000 });

        try {
            const response = await axios.post(url, data, {
                headers: { "wiki_type": "9" },
                responseType: 'text',
                transformResponse: []
            });

            const result = safeJSONParse(response.data);
            if (result.code === 200) {
                return { status: true, data: result.data };
            }
            return { status: false, msg: result.msg };
        } catch (e) {
            logger.error('[复刻] 获取Wiki失败:', e.message);
            return { status: false, msg: e.message };
        }
    }

    async fetchWikiHomePage() {
        const url = Config.getConfig().reverse_proxy_url + '/wiki/core/homepage/getPage';

        try {
            const response = await axios.post(url, '', {
                headers: { "wiki_type": "9" },
                responseType: 'text',
                transformResponse: []
            });

            const result = safeJSONParse(response.data);
            if (result.code === 200) {
                return { status: true, data: result.data };
            }
            return { status: false, msg: result.msg };
        } catch (e) {
            logger.error('[复刻] 获取首页失败:', e.message);
            return { status: false, msg: e.message };
        }
    }

    async getCurrentVersion() {
        const url = Config.getConfig().reverse_proxy_url + '/wiki/core/catalogue/config/getTree';

        try {
            const response = await axios.post(url, '', {
                headers: { "wiki_type": "9" },
                responseType: 'text',
                transformResponse: []
            });

            const result = safeJSONParse(response.data);
            if (result.code !== 200) return null;

            const children = result.data?.children || [];
            const activityCollection = children.find(c => c.id === 1293);
            if (!activityCollection?.children?.length) return null;

            const latestName = activityCollection.children[0].name || '';
            const match = latestName.match(/([\d.]+)版本/);
            const version = match ? match[1] : latestName;

            logger.info(`[复刻] 当前版本: ${version} (来源: ${latestName})`);
            return version;
        } catch (e) {
            logger.error('[复刻] 获取版本号失败:', e.message);
            return null;
        }
    }

    async getCharacterMap() {
        const res = await this.fetchWikiPage('1105');
        if (!res.status) return new Map();

        const map = new Map();
        for (const r of res.data.results.records) {
            map.set(r.name, String(r.entryId));
        }
        logger.info(`[复刻] 角色列表加载: ${map.size}个角色`);
        return map;
    }

    async getAvatarMap() {
        const cache = this.loadAvatarCache();
        if (Object.keys(cache).length > 0) {
            logger.info(`[复刻] 头像缓存命中: ${Object.keys(cache).length}个`);
            return cache;
        }

        const res = await this.fetchWikiPage('1363');
        if (!res.status) {
            logger.error('[复刻] 获取头像列表失败');
            return cache;
        }

        for (const r of res.data.results.records) {
            const name = r.name;
            const contentUrl = r.content?.contentUrl || '';
            if (name && contentUrl) {
                cache[name] = contentUrl;
            }
        }

        this.saveAvatarCache(cache);
        logger.info(`[复刻] 头像获取完成: ${Object.keys(cache).length}个`);
        return cache;
    }

    async getCurrentPool() {
        const res = await this.fetchWikiHomePage();
        if (!res.status) return null;

        const sideModules = res.data.contentJson?.sideModules || [];
        const roleModule = sideModules[0];
        if (!roleModule?.content?.tabs) return null;

        const pool = {
            name: '',
            startTime: null,
            endTime: null,
            daysLeft: 0,
            upEntryIds: [],
            upCharacters: new Map()
        };

        for (const tab of roleModule.content.tabs) {
            if (tab.imgs?.length > 0) {
                const eid = String(tab.imgs[0].linkConfig?.entryId);
                const name = tab.imgs[0].name || '';
                if (eid) {
                    pool.upEntryIds.push(eid);
                    pool.upCharacters.set(eid, {
                        name,
                        startDate: tab.countDown?.dateRange?.[0] || '',
                        endDate: tab.countDown?.dateRange?.[1] || ''
                    });
                }
            }
            if (tab.countDown?.dateRange?.[1] && !pool.endTime) {
                pool.name = tab.name || '未知';
                pool.startTime = tab.countDown.dateRange[0];
                pool.endTime = tab.countDown.dateRange[1];
                const diff = new Date(pool.endTime) - new Date();
                pool.daysLeft = diff > 0 ? Math.floor(diff / 86400000) : 0;
            }
        }

        logger.info(`[复刻] 当期卡池: ${pool.name}, ${pool.daysLeft}天后关闭`);
        return pool;
    }

    syncRerunData(rerunData, charMap, pool, currentVersion) {
        if (!pool) return [];

        const updatedChars = [];

        for (const [entryId, charInfo] of pool.upCharacters) {
            let charName = null;
            for (const [name, eid] of charMap) {
                if (eid === entryId) {
                    charName = name;
                    break;
                }
            }

            if (!charName) continue;

            if (!rerunData[charName]) {
                rerunData[charName] = {
                    rarity: 5,
                    history: []
                };
            }

            const charData = rerunData[charName];
            const newEndDate = charInfo.endDate ? charInfo.endDate.split(' ')[0] : '';
            const isDuplicate = charData.history.some(h => h.endDate === newEndDate);

            if (!isDuplicate) {
                charData.history.push({
                    startDate: charInfo.startDate ? charInfo.startDate.split(' ')[0] : '',
                    endDate: newEndDate,
                    version: currentVersion || '未知'
                });
                updatedChars.push(charName);
                logger.info(`[复刻] 添加新记录: ${charName} ${newEndDate} 版本${currentVersion}`);
            }
        }

        return updatedChars;
    }

    async queryRerun(e) {
        const name = e.msg.match(this.rule[0].reg)[2];
        if (!name) return e.reply('格式：~今汐复刻');

        const wiki = new Wiki();
        const realName = await wiki.getAlias(name);
        const data = this.loadRerunData()[realName];
        if (!data) return e.reply(`未找到「${realName}」的复刻记录`);

        const avatarCache = await this.getAvatarMap();
        const last = data.history[data.history.length - 1];

        const image = await Render.render('Template/Fuke/Fuke', {
            data: {
                name: realName,
                url: avatarCache[realName] || '',
                rerunCount: data.history.length,
                history: data.history,
                lastRerun: last
            }
        }, { e, retType: 'base64' });

        await e.reply(image);
    }

    async rerunRanking(e) {
        const rerunData = this.loadRerunData();
        const [charMap, pool, avatarCache, currentVersion] = await Promise.all([
            this.getCharacterMap(),
            this.getCurrentPool(),
            this.getAvatarMap(),
            this.getCurrentVersion()
        ]);

        const updatedChars = this.syncRerunData(rerunData, charMap, pool, currentVersion);
        if (updatedChars.length > 0) {
            this.saveRerunData(rerunData);
            logger.info(`[复刻] 已自动更新 ${updatedChars.length} 个角色: ${updatedChars.join(',')}`);
        }

        const upIds = pool ? pool.upEntryIds : [];
        const list = [];

        for (const [name, data] of Object.entries(rerunData)) {
            if (RESIDENT_5STAR.has(name)) continue;
            if (data.rarity === 4) continue;

            const entryId = charMap.get(name);
            if (!entryId) continue;

            const isUp = upIds.includes(entryId);
            const last = data.history[data.history.length - 1];
            const days = isUp ? 0 : Math.floor((Date.now() - new Date(last.endDate)) / 86400000);

            list.push({
                name,
                url: avatarCache[name] || '',
                rerunCount: data.history.length,
                daysSinceLastRerun: days,
                isInPool: isUp
            });
        }

        const normal = list.filter(c => !c.isInPool).sort((a, b) => b.daysSinceLastRerun - a.daysSinceLastRerun);
        const up = list.filter(c => c.isInPool);

        logger.info(`[复刻] 排行: 非UP=${normal.length}, 当期UP=${up.map(c => c.name).join(',')}`);

        const image = await Render.render('Template/Fuke/FukeA', {
            data: {
                ranking: normal,
                currentUp: up,
                currentPool: pool,
                updateTime: new Date().toLocaleDateString('zh-CN')
            }
        }, { e, retType: 'base64' });

        await e.reply(image);
    }
}
