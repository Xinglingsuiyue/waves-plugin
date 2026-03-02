import plugin from '../../../lib/plugins/plugin.js'
import Render from '../components/Render.js';
import fs from 'fs';

export class TowerInfo extends plugin {
    constructor() {
        super({
            name: "鸣潮-逆境深塔信息查询",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)?(当期|上期|下期|\\d{1,3}期)深塔$",
                    fnc: "towerInfo"
                },
                {
                    reg: "^(?:～|~|鸣潮)?清除深塔缓存$",
                    fnc: "clearCache"
                }
            ]
        })
    }

    async towerInfo(e) {
        const match = e.msg.match(this.rule[0].reg);
        if (!match) return;

        let phaseType = match[1] || "当期";

        try {
            const schedule = await this.fetchTowerSchedule();
            if (!schedule) {
                return e.reply("获取深塔时间表失败，请稍后重试");
            }

            let targetPhase = this.calculateTargetPhase(phaseType, schedule);
            if (targetPhase < 1) {
                return e.reply("期数不能小于1");
            }

            const towerData = await this.fetchTowerData(targetPhase);
            if (!towerData) {
                return e.reply(`没有找到第${targetPhase}期深塔信息，请重新查询`);
            }

            if (schedule[targetPhase]) {
                towerData.Begin = schedule[targetPhase].begin;
                towerData.End = schedule[targetPhase].end;
            }

            this.processMonsterIcons(towerData);

            const now = new Date();
            let leftTime = '已结束';
            if (towerData.Begin && towerData.End) {
                const endDate = new Date(towerData.End + "T04:00:00");
                const timeSeconds = (endDate.getTime() - now.getTime()) / 1000;
                if (timeSeconds > 0) {
                    const days = Math.floor(timeSeconds / (3600 * 24));
                    const hours = Math.floor((timeSeconds % (3600 * 24)) / 3600);
                    const minutes = Math.floor((timeSeconds % 3600) / 60);
                    leftTime = days ? `${days}天${hours}小时${minutes}分钟` : hours ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
                }
            }

            const renderData = {
                phase: targetPhase,
                towerData: towerData,
                leftTime: leftTime,
                saveId: targetPhase,
                getElementName: this.getElementName.bind(this),
                Math: Math
            };

            const imageCard = await Render.render('Template/towerInfo/tower', renderData, { e, retType: 'base64' });
            return e.reply(imageCard, false);

        } catch (error) {
            console.error("深塔信息查询错误:", error);
            return e.reply("查询深塔信息时出现错误，请稍后重试");
        }
    }

    async clearCache(e) {
        try {
            await redis.del('Yunzai:waves:towerSchedule');
            const keys = await redis.keys('Yunzai:waves:towerData:*');
            if (keys && keys.length > 0) {
                for (const key of keys) {
                    await redis.del(key);
                }
            }
            e.reply('深塔缓存已清除，下次查询将重新获取数据');
        } catch (err) {
            console.error('[TowerInfo] 清除缓存失败', err);
            e.reply('清除缓存时出现错误，请查看控制台日志');
        }
    }

    processMonsterIcons(towerData) {
        if (!towerData?.Area) return;
        Object.values(towerData.Area).forEach(area => {
            if (!area?.Floor) return;
            Object.values(area.Floor).forEach(floor => {
                if (!floor?.Monsters) return;
                Object.values(floor.Monsters).forEach(monster => {
                    if (monster?.Icon) monster.IconUrl = monster.Icon;
                });
            });
        });
    }

    async fetchTowerSchedule() {
        const cacheKey = 'Yunzai:waves:towerSchedule';
        let cached = await redis.get(cacheKey);
        if (cached) {
            try {
                console.log('[TowerInfo] 使用缓存的时间表');
                return JSON.parse(cached);
            } catch (e) {
                console.error('[TowerInfo] 缓存解析失败，重新请求', e);
            }
        }

        try {
            console.log('[TowerInfo] 请求时间表 API');
            const res = await fetch('https://api.encore.moe/zh-Hans/toa', {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Origin': 'https://encore.moe',
                    'Referer': 'https://encore.moe/'
                }
            });
            if (!res.ok) {
                console.error(`[TowerInfo] 时间表请求失败 HTTP ${res.status}`);
                return null;
            }
            const data = await res.json();
            console.log('[TowerInfo] 时间表原始数据:', JSON.stringify(data).slice(0, 300) + '...');

            if (!data.seasons) {
                console.error('[TowerInfo] 时间表数据缺少 seasons 字段');
                return null;
            }

            const schedule = { currentId: null };
            data.seasons.forEach(s => {
                if (s.id != null && s.start && s.finish) {
                    schedule[s.id] = { begin: s.start, end: s.finish };
                    if (s.current) schedule.currentId = s.id;
                }
            });
            if (schedule.currentId === null) {
                const ids = Object.keys(schedule).map(Number).filter(id => !isNaN(id));
                schedule.currentId = ids.length ? Math.max(...ids) : 1;
                console.warn(`[TowerInfo] 未找到当前期数，使用最大期数 ${schedule.currentId}`);
            }
            console.log(`[TowerInfo] 时间表解析成功，当前期数: ${schedule.currentId}`);
            await redis.set(cacheKey, JSON.stringify(schedule), { EX: 864000 });
            return schedule;
        } catch (e) {
            console.error('[TowerInfo] 获取时间表异常', e);
            return null;
        }
    }

    calculateTargetPhase(type, schedule) {
        const cur = schedule.currentId;
        if (!cur) return 1;
        if (type === '当期') return cur;
        if (type === '上期') return cur - 1;
        if (type === '下期') return cur + 1;
        const m = type.match(/(\d+)期/);
        return m ? parseInt(m[1]) : cur;
    }

    async fetchTowerData(phase) {
        const cacheKey = `Yunzai:waves:towerData:${phase}`;
        let cached = await redis.get(cacheKey);
        if (cached) {
            try {
                console.log(`[TowerInfo] 使用缓存的第${phase}期数据`);
                return JSON.parse(cached);
            } catch (e) {
                console.error(`[TowerInfo] 缓存解析失败，重新请求第${phase}期`, e);
            }
        }

        try {
            console.log(`[TowerInfo] 请求第${phase}期数据 API`);
            const res = await fetch(`https://api.encore.moe/zh-Hans/toa/${phase}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Origin': 'https://encore.moe',
                    'Referer': 'https://encore.moe/'
                }
            });
            if (!res.ok) {
                console.error(`[TowerInfo] 第${phase}期数据请求失败 HTTP ${res.status}`);
                return null;
            }
            const data = await res.json();
            console.log(`[TowerInfo] 第${phase}期原始数据:`, JSON.stringify(data).slice(0, 500) + '...');

            try {
                fs.writeFileSync(`./tower_${phase}_raw.json`, JSON.stringify(data, null, 2));
                console.log(`[TowerInfo] 原始数据已写入 tower_${phase}_raw.json`);
            } catch (err) {
                console.warn('[TowerInfo] 无法写入调试文件', err);
            }

            const phaseData = data[phase];
            if (!phaseData) {
                console.error(`[TowerInfo] 第${phase}期数据为空`);
                return null;
            }

            const result = { Area: {} };
            // 遍历三个塔
            for (let areaNum = 1; areaNum <= 3; areaNum++) {
                const areaKey = areaNum.toString();
                const areaData = phaseData[areaKey];
                if (!areaData) {
                    console.log(`[TowerInfo] 区域 ${areaKey} 无数据`);
                    continue;
                }

                const areaObj = { Floor: {} };

                // 遍历该塔的楼层
                for (const floorKey in areaData) {
                    const floorContainer = areaData[floorKey];
                    if (!floorContainer || typeof floorContainer !== 'object') {
                        console.warn(`[TowerInfo] 楼层 ${floorKey} 数据格式异常`, floorContainer);
                        continue;
                    }

                    const innerKeys = Object.keys(floorContainer);
                    if (innerKeys.length === 0) {
                        console.warn(`[TowerInfo] 楼层 ${floorKey} 无内部键`);
                        continue;
                    }
                    const floorWrapper = floorContainer[innerKeys[0]];
                    if (!Array.isArray(floorWrapper) || floorWrapper.length === 0) {
                        console.warn(`[TowerInfo] 楼层 ${floorKey} 内部数据不是数组或为空`, floorWrapper);
                        continue;
                    }

                    const floorInfo = floorWrapper[0];
                    if (!floorInfo) {
                        console.warn(`[TowerInfo] 楼层 ${floorKey} 内部数组第一个元素为空`);
                        continue;
                    }

                    console.log(`[TowerInfo] 成功解析楼层 ${floorKey}，怪物数量: ${floorInfo.monsters?.length || 0}，buff数量: ${floorInfo.buffs?.length || 0}`);

                    const floorObj = {
                        Monsters: {},
                        Buffs: {}
                    };

                    // 处理怪物
                    if (floorInfo.monsters?.length) {
                        floorInfo.monsters.forEach((monster, idx) => {
                            if (!monster) return;
                            let lv = 0, hp = 0, atk = 0, def = 0;
                            monster.whiteGreenProps?.forEach(p => {
                                if (!p) return;
                                if (p.key === 'Lv') lv = p.value ?? 0;
                                else if (p.key === 'LifeMax') hp = p.value ?? 0;
                                else if (p.key === 'Atk') atk = p.value ?? 0;
                                else if (p.key === 'Def') def = p.value ?? 0;
                            });
                            
                            // 提取所有元素ID
                            const elementIds = monster.elements?.map(e => e.id) || [0];
                            
                            floorObj.Monsters[idx] = {
                                Name: monster.name || '未知',
                                Level: lv,
                                Icon: monster.icon || '',
                                ElementIds: elementIds,
                                Life: hp,
                                Atk: atk,
                                Def: def
                            };
                        });
                    }

                    // 处理 Buff
                    if (floorInfo.buffs?.length) {
                        floorInfo.buffs.forEach((buff, idx) => {
                            if (!buff) {
                                floorObj.Buffs[idx] = { Desc: '' };
                                return;
                            }
                            const desc = (buff.desc || buff.name || '').toString();
                            floorObj.Buffs[idx] = { Desc: desc };
                        });
                    }

                    floorObj.hasMonsters = floorObj.Monsters && typeof floorObj.Monsters === 'object' && Object.keys(floorObj.Monsters).length > 0;
                    floorObj.hasBuffs = floorObj.Buffs && typeof floorObj.Buffs === 'object' && Object.keys(floorObj.Buffs).length > 0;

                    areaObj.Floor[floorKey] = floorObj;
                }

                if (Object.keys(areaObj.Floor).length > 0) {
                    result.Area[areaKey] = areaObj;
                } else {
                    console.log(`[TowerInfo] 区域 ${areaKey} 无有效楼层数据`);
                }
            }

            const sanitize = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                for (const key in obj) {
                    if (key === 'Desc' && obj[key] === undefined) obj[key] = '';
                    else if (typeof obj[key] === 'object') sanitize(obj[key]);
                }
            };
            sanitize(result);

            const areaCount = Object.keys(result.Area).length;
            const floorCount = Object.values(result.Area).reduce((acc, area) => acc + Object.keys(area.Floor).length, 0);
            console.log(`[TowerInfo] 解析完成，区域数: ${areaCount}，总楼层数: ${floorCount}`);

            if (floorCount === 0) {
                console.error('[TowerInfo] 解析后无任何楼层数据');
                return null;
            }

            await redis.set(cacheKey, JSON.stringify(result), { EX: 3600 });
            return result;
        } catch (e) {
            console.error(`[TowerInfo] 获取第${phase}期数据异常`, e);
            return null;
        }
    }

    getElementName(id) {
        const names = { 0: '物理', 1: '冷凝', 2: '热熔', 3: '导电', 4: '气动', 5: '衍射', 6: '湮灭' };
        return names[id] || `元素${id}`;
    }
}