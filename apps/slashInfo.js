import plugin from '../../../lib/plugins/plugin.js'
import Render from '../components/Render.js'
import fs from 'fs'
import path from 'path'
import { pluginResources } from '../model/path.js'

const WHIWA_ICON_DIR = path.join(pluginResources, 'data', 'encore', 'details', 'whiwa', 'icon')

/** 冥歌海墟 (Whimpering Wastes) 查询 — 本地优先，无本地时 Redis/API 兜底 */
export class WhiWaInfo extends plugin {
    constructor() {
        super({
            name: '鸣潮-冥歌海墟查询',
            event: 'message',
            priority: 1009,
            rule: [
                {
                    reg: '^(?:～|~|鸣潮)?(?:当期|当前|本期)海墟(?:\\s*$|查询$)',
                    fnc: 'whiwaCurrent'
                },
                {
                    reg: '^(?:～|~|鸣潮)?上期海墟$',
                    fnc: 'whiwaPrev'
                },
                {
                    reg: '^(?:～|~|鸣潮)?下期海墟$',
                    fnc: 'whiwaNext'
                },
                {
                    reg: '^(?:～|~|鸣潮)?(\\d+)(?:期)?海墟$',
                    fnc: 'whiwaByPeriod'
                },
                {
                    reg: '^(?:～|~|鸣潮)?海墟列表$',
                    fnc: 'whiwaList'
                },
                {
                    reg: '^(?:～|~|鸣潮)?(?:冥歌)?海墟清除缓存$',
                    fnc: 'clearWhiWaCache'
                }
            ]
        })
    }

    /** 获取冥歌海墟列表（本地优先 → Redis → API 兜底） */
    async getWhiWaList() {
        // 本地文件优先
        try {
            const { readLocalData } = await import('./EncoreSync.js')
            let data = readLocalData('whiwa')
            if (data && Array.isArray(data) && data.length > 0) {
                console.log('[WhiWaInfo] 使用本地 whiwa 数据')
                return data
            }
        } catch {}
        const cacheKey = 'Yunzai:waves:whiwaList'
        try { let c = await redis.get(cacheKey); if (c) { console.log('[WhiWaInfo] 使用 Redis 缓存'); return JSON.parse(c) } } catch {}
        try {
            console.log('[WhiWaInfo] 请求 whiwa API')
            const res = await fetch('https://api-v2.encore.moe/api/zh-Hans/whiwa', {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            const data = await res.json()
            if (Array.isArray(data)) await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 })
            return data
        } catch (e) { console.error('[WhiWaInfo] API 请求失败:', e); return null }
    }

    /** 获取冥歌海墟详情 — 本地文件优先 → Redis → API，并回写本地 */
    async fetchWhiWaDetail(seasonId) {
        // 1. 本地详情文件优先
        try {
            const { readLocalDetail } = await import('./EncoreSync.js')
            let local = readLocalDetail('whiwa', seasonId)
            if (local) { console.log(`[WhiWaInfo] 使用本地详情 S${seasonId}`); return local }
        } catch {}

        // 2. Redis 缓存
        const cacheKey = `Yunzai:waves:whiwa:detail:${seasonId}`
        try { let c = await redis.get(cacheKey); if (c) { console.log(`[WhiWaInfo] 使用 Redis 详情 S${seasonId}`); return JSON.parse(c) } } catch {}

        // 3. API 兜底
        try {
            console.log(`[WhiWaInfo] 请求 whiwa 详情 API S${seasonId}`)
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/whiwa/${seasonId}`, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            const data = await res.json()
            try { await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 }) } catch {}
            try {
                const { saveLocalDetail } = await import('./EncoreSync.js')
                saveLocalDetail('whiwa', seasonId, data)
            } catch {}
            return data
        } catch (e) { console.error('[WhiWaInfo] 获取详情失败:', e); return null }
    }

    /** 根据日期找到当前赛季：now 在 start ~ finish 之间 */
    findCurrentSeason(list) {
        const now = new Date()
        for (const item of list) {
            if (!item.start || !item.finish) continue
            const begin = new Date(item.start + 'T04:00:00')
            const end = new Date(item.finish + 'T04:00:00')
            if (now >= begin && now <= end) return item.Season
        }
        return Math.max(...list.map(i => i.Season))
    }

    /** 当前期 */
    async whiwaCurrent(e) {
        const list = await this.getWhiWaList()
        if (!list || !Array.isArray(list)) return e.reply('获取冥歌海墟数据失败，请稍后重试')
        const season = this.findCurrentSeason(list)
        return this.showDetail(e, list, season)
    }

    /** 上期 */
    async whiwaPrev(e) {
        const list = await this.getWhiWaList()
        if (!list || !Array.isArray(list)) return e.reply('获取冥歌海墟数据失败，请稍后重试')
        const curSeason = this.findCurrentSeason(list)
        return this.showDetail(e, list, curSeason - 1)
    }

    /** 下期 */
    async whiwaNext(e) {
        const list = await this.getWhiWaList()
        if (!list || !Array.isArray(list)) return e.reply('获取冥歌海墟数据失败，请稍后重试')
        const curSeason = this.findCurrentSeason(list)
        return this.showDetail(e, list, curSeason + 1)
    }

    /** 指定期数 */
    async whiwaByPeriod(e) {
        const match = e.msg.match(/(\d+)/)
        if (!match) return e.reply('请指定期数，如: ~16期海墟')
        const list = await this.getWhiWaList()
        if (!list || !Array.isArray(list)) return e.reply('获取冥歌海墟数据失败，请稍后重试')
        const season = parseInt(match[1])
        return this.showDetail(e, list, season)
    }

    /** 列表 */
    async whiwaList(e) {
        const list = await this.getWhiWaList()
        if (!list || !Array.isArray(list)) return e.reply('获取冥歌海墟数据失败，请稍后重试')
        list.sort((a, b) => (b.Season || 0) - (a.Season || 0))
        const curSeason = this.findCurrentSeason(list)
        let msg = '冥歌海墟 赛季列表:\n'
        const recent = list.slice(0, 10)
        for (const item of recent) {
            const marker = item.Season === curSeason ? '  ◀ 当前' : ''
            msg += `S${item.Season}: ${item.Name || ''} | ${item.start} ~ ${item.finish}${marker}\n`
        }
        if (list.length > 10) msg += `...共 ${list.length} 个赛季`
        await e.reply(msg)
    }

    /** 显示详情 — 优先模板渲染，失败回退文本 */
    async showDetail(e, list, targetSeason) {
        const item = list.find(i => i.Season === targetSeason)
        if (!item) return e.reply(`未找到第${targetSeason}期冥歌海墟数据`)
        try {
            const renderData = await this.buildRenderData(item)
            const img = await Render.render('Template/encore/whiwa/whiwa', renderData, { e, retType: 'base64' })
            return e.reply(img, false)
        } catch (err) {
            console.error('[WhiWaInfo] 模板渲染失败，回退文本:', err)
            return this.showDetailText(e, list, item)
        }
    }

    /** 构建渲染数据（TowerInfo 风格） */
    async buildRenderData(item) {
        const begin = new Date(item.start + 'T04:00:00')
        const end = new Date(item.finish + 'T04:00:00')
        const now = new Date()
        let leftTime = '已结束'
        if (now < begin) {
            const diff = Math.ceil((begin - now) / (1000 * 60 * 60 * 24))
            leftTime = `还有约 ${diff} 天开启`
        } else if (now <= end) {
            const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
            if (diff > 0) {
                const hours = Math.floor((end - now) / (1000 * 60 * 60))
                const days = Math.floor(hours / 24)
                const remainHours = hours % 24
                leftTime = days ? `${days}天${remainHours}小时` : `${hours}小时`
            } else {
                leftTime = '即将结束'
            }
        }

        const urlFix = (url) => url ? url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/') : ''
        const localUrl = (url) => {
            if (!url) return ''
            try {
                const filename = path.basename(new URL(url).pathname)
                const localPath = path.join(WHIWA_ICON_DIR, filename)
                if (fs.existsSync(localPath)) return `file://${localPath}`
            } catch {}
            return url
        }

        const detail = await this.fetchWhiWaDetail(item.Season)
        const seasonName = detail ? (detail.name || item.Name || '') : (item.Name || '')

        // 解锁信物
        let buffItems = []
        if (detail && detail.buffItems && Array.isArray(detail.buffItems)) {
            for (const bi of detail.buffItems) {
                const it = bi.item || {}
                buffItems.push({
                    name: it.name || '',
                    icon: localUrl(urlFix(it.icon || ''))
                })
            }
        }

        // 关卡组数据 → TowerInfo 风格 Area/Floor，每个 stage 独立为 上半/下半
        let Area = {}
        if (detail && detail.stageGroups && Array.isArray(detail.stageGroups)) {
            let areaIdx = 0
            for (const group of detail.stageGroups) {
                areaIdx++
                let Floor = {}
                if (group.levels && Array.isArray(group.levels)) {
                    let floorIdx = 0
                    for (const level of group.levels) {
                        floorIdx++
                        const levelDesc = level.desc ? this._cleanDesc(level.desc) : ''

                        // 评分图标 + 分数（B图标 1500 A图标 2000 ...）
                        let scoreStages = []
                        if (level.scoreStage && Array.isArray(level.scoreStage) && level.targetScore && Array.isArray(level.targetScore)) {
                            const scoreIconBase = 'https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/UiActivity/Image/ActivityMowingTower/T_Score'
                            const len = Math.min(level.scoreStage.length, level.targetScore.length)
                            for (let si = 0; si < len; si++) {
                                scoreStages.push({
                                    label: level.scoreStage[si],
                                    score: level.targetScore[si],
                                    icon: localUrl(urlFix(`${scoreIconBase}${level.scoreStage[si]}.webp`))
                                })
                            }
                        }

                        let Stages = []
                        if (level.stages && Array.isArray(level.stages)) {
                            const stageLabels = ['上半', '下半']
                            for (let si = 0; si < level.stages.length; si++) {
                                const stage = level.stages[si]
                                const dungeonDesc = stage.dungeonDesc ? this._cleanDesc(stage.dungeonDesc) : ''

                                let Monsters = {}, Buffs = {}, monIdx = 0, bufIdx = 0

                                // 收集怪物
                                if (stage.monsters && Array.isArray(stage.monsters)) {
                                    for (const m of stage.monsters) {
                                        const elem = m.elements && m.elements.length > 0 ? m.elements[0] : (m.element || {})
                                        let lv = 0, hp = 0, atk = 0, def = 0
                                        if (m.whiteGreenProps && Array.isArray(m.whiteGreenProps)) {
                                            for (const p of m.whiteGreenProps) {
                                                if (p.key === 'Lv') lv = p.value || 0
                                                else if (p.key === 'LifeMax') hp = p.value || 0
                                                else if (p.key === 'Atk') atk = p.value || 0
                                                else if (p.key === 'Def') def = p.value || 0
                                            }
                                        }
                                        const elementIds = m.elements ? m.elements.map(e => e.id) : (elem.id != null ? [elem.id] : [0])
                                        Monsters[monIdx++] = {
                                            Name: m.name || '未知',
                                            Level: lv,
                                            Icon: localUrl(urlFix(m.icon || '')),
                                            ElementIds: elementIds,
                                            Life: hp,
                                            Atk: atk,
                                            Def: def
                                        }
                                    }
                                }
                                // 收集 Buff（抗性）
                                if (stage.buffs && Array.isArray(stage.buffs)) {
                                    for (const b of stage.buffs) {
                                        Buffs[bufIdx++] = {
                                            Desc: (b.desc || b.name || '').toString(),
                                            Icon: urlFix(b.path || ''),
                                            Color: b.color || ''
                                        }
                                    }
                                }
                                Stages.push({
                                    label: stageLabels[si] || `第${si + 1}波`,
                                    dungeonDesc,
                                    Monsters,
                                    Buffs,
                                    hasMonsters: Object.keys(Monsters).length > 0,
                                    hasBuffs: Object.keys(Buffs).length > 0
                                })
                            }
                        }
                        Floor[floorIdx] = {
                            Name: level.title || '',
                            desc: levelDesc,
                            scoreStages,
                            stageLayout: group.name && group.name.includes('海隙') ? 'row' : 'col',
                            Stages
                        }
                    }
                }
                Area[areaIdx] = {
                    Name: group.name || '',
                    layoutClass: group.name && group.name.includes('海隙') ? 'area-haixi' : 'area-tuanyuan',
                    floorLayout: group.name && group.name.includes('海隙') ? 'row' : 'col',
                    Floor
                }
            }
        }

        const sanitize = (obj) => {
            if (!obj || typeof obj !== 'object') return
            for (const key in obj) {
                if (key === 'Desc' && obj[key] === undefined) obj[key] = ''
                else if (typeof obj[key] === 'object') sanitize(obj[key])
            }
        }
        sanitize(Area)

        return {
            season: item.Season || '',
            seasonName,
            beginTime: item.start || '',
            endTime: item.finish || '',
            leftTime,
            buffItems,
            Area,
            getElementName: this.getElementName.bind(this),
            Math
        }
    }

    getElementName(id) {
        const names = { 0: '物理', 1: '冷凝', 2: '热熔', 3: '导电', 4: '气动', 5: '衍射', 6: '湮灭' }
        return names[id] || `元素${id}`
    }

    _cleanDesc(raw) {
        if (!raw) return ''
        let s = raw
        const spanMap = []; const spanClose = '\x00ESC\x00'
        s = s.replace(/<br\s*\/?>/gi, '\x00BR\x00')
        s = s.replace(/<span\s([^>]*?)>/gi, (match, attrs) => { spanMap.push(attrs); return `\x00SP${spanMap.length - 1}\x00` })
        s = s.replace(/<\/span>/gi, spanClose)
        s = s.replace(/<[^>]+>/g, '')
        s = s.replace(/\x00BR\x00/g, '<br>')
        s = s.replace(/\x00SP(\d+)\x00/g, (_, idx) => `<span ${spanMap[parseInt(idx)]}>`)
        s = s.replace(new RegExp(spanClose.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '</span>')
        return s
    }

    async showDetailText(e, list, item) {
        const begin = new Date(item.start + 'T04:00:00'); const end = new Date(item.finish + 'T04:00:00'); const now = new Date()
        let statusStr = '', timeStr = ''
        if (now < begin) { const d = Math.ceil((begin - now) / (1000 * 60 * 60 * 24)); statusStr = ' 即将开启'; timeStr = `还有约 ${d} 天` }
        else if (now > end) { statusStr = ' 已结束'; timeStr = `${item.start} ~ ${item.finish}` }
        else { const d = Math.ceil((end - now) / (1000 * 60 * 60 * 24)); statusStr = ' 当前赛季'; timeStr = `${item.start} ~ ${item.finish} (剩余约 ${d} 天)` }
        let msg = `冥歌海墟\n\nS${item.Season} ${item.Name || ''}\n状态: ${statusStr}\n时间: ${timeStr}\n`
        try {
            const detail = await this.fetchWhiWaDetail(item.Season)
            if (detail && detail.stageGroups && Array.isArray(detail.stageGroups)) {
                msg += `\n关卡组 (${detail.stageGroups.length}):\n`
                for (const group of detail.stageGroups) {
                    msg += `\n▸ ${group.name}\n`
                    if (group.levels && Array.isArray(group.levels)) {
                        for (const level of group.levels) {
                            const target = level.targetScore ? level.targetScore.join('/') : ''
                            msg += `  · ${level.title}`
                            if (target) msg += ` [目标: ${target}]`
                            msg += `\n`
                            if (level.stages && Array.isArray(level.stages)) {
                                for (const stage of level.stages) {
                                    if (stage.monsters && stage.monsters.length > 0) {
                                        msg += `    ${stage.monsters.map(m => m.name).join(', ')}\n`
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch {}
        await e.reply(msg)
    }

    async clearWhiWaCache(e) {
        try {
            await redis.del('Yunzai:waves:whiwaList')
            const keys = await redis.keys('Yunzai:waves:whiwa:detail:*')
            for (const key of keys) await redis.del(key)
            e.reply('冥歌海墟缓存已清除')
        } catch { e.reply('清除缓存失败') }
    }
}