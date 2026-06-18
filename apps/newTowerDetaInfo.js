import plugin from '../../../lib/plugins/plugin.js'
import Render from '../components/Render.js'
import fs from 'fs'
import path from 'path'
import { pluginResources } from '../model/path.js'

const DPMATRIX_ICON_DIR = path.join(pluginResources, 'data', 'encore', 'details', 'dpmatrix', 'icon')

/** 关卡名称颜色 — 与 newTowerDeta 模板保持一致 */
const LEVEL_NAME_COLOR = {
    '稳态协议': '#5fd9e8',
    '奇点扩张': '#ff5a73'
}
const LEVEL_ICON_OVERRIDE = {
    '奇点扩张': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA4CAYAAACohjseAAAABHNCSVQICAgIfAhkiAAABJdJREFUaIHtmj9vHUUUxX9nnkNnxSiIOt8AWXZHmhRJOqRINIDyGaggtgtHSRFjqPIhUlGgpEGxUJAQZaJIrkFKqBBywJZL7D0Uu/ve7r7nN7N/LLDxkVZP7+2dmXve7Nxz78zKH37MecZC8ekEW52mIx2Q5HM4dTf+ZVwQPOu4IHjWce4JLsRNcnWw86gsaa5cWK6Fb0WCuRu9yfP7H7crHJLmy9f/ZgZP/BcqM/ctcNWOTUlFgMUB8Amwd4L1e5jHmKVK85Q//bWkUenhPMOER3SMq8AqaRkEwD7iJj6RHMAeYgPzDMYkB32qop0paEFBC4gFlD/z9WsKlvQXgRvAiwQfXhK4BewDMzpsjBekwp8RYtSbYAfsW74JvGzRpkZySAxN8LADuRIlycMhHRqS4KHta3QjV+Jl0cdgJNsEmQLNgJsBHNi+Dfwmh6Xq3abOTfXWDFnyG/BHtr8DLkujXmVaB4JTOMgd0fOZd7OabGyTC8mXld9qgcJ1HTpgEl07oe8jeljMXBxiG7GO2EB8ndREuk3Px7UPwXLNvYpaluQm31NJvuq7JqMEjY+Mj5z5b2c2+aL70/J1ArtSyPJ1OfuSXCdXQmwgfzNtnwudFAQygV3L122/tX2MAXNU+tWb4Awk65ztB5amyZWQ1m0/SBizs062DTKtyAGPiAeJR7aRtBmxy0maHxJ9BdoQFAeIVuQkvcVZ8169nNJItq+kkrR8Q9ZWqttRghWduoP5vXnfIlSlQMq2CboHLOXk6jI2XU9mEJQB93D2DoS1Sd8OM+rJF+DPYnVmiTZrcIrcFMT23DUXQdH2qwTTP1L7HC5Va0pBR1hOJZmEITKZwciVsLyuWI6XiFPdsmgGlFZtI5V6KoYhaO5ikiNbQn8Pa/lqDww3g0ORHJActCP4ftTC3MXuTFL2ViK5uC8F4rmoigseW6yOvxeXTFbbMyGskXGfjJDXcnnyePIVICOQcR/CmsRofJmsOZ7FauFLtNaENlHUXMbsFJtJc7MZSZu2sX2lEPGTkTkAnydkMQArZOwAv6SeVraViSUynhWJbxJJ4F6kz/styH1PywK4S5DJScJKzFDSpuasSdlbp0kOUnJRlNsELgHCjIArmB9tX0N+U9W7vI6rIqzJ4wxlAvPQ1heaSion320jRh/Yfg4sAihIwKWJ7/Nrwj4ysSjpZ2A5wXatVgGkS8Gy7Z8oyHVB31Rtsdj9SsGarDxDSdQ5SU/s7uRgmFz0MnBQbBC9olEfeVZdU92Pady2nQHLkp4UffdK2ToQrI9X7FsuAU9tXyOwW7vf9nwwX3NPi5lz7PwvhiGT7XJNRqPrHKz0XXNNDF1NLKZKyAysFG0HIwenUy4l62QFJbleu9izECdojjHHznyU74s29z7rKA713pW1QxrJGrmp08HmeOW+aO5PdF+0TZB5nWg3EX1rC/wp84+wHwK/Vn5LOsJO9CX+Mt7kbYb8TDxapTfci0TRPcSt6oPgLE0VNE6B5tqf/5fx4rnoWIfG76XMR0tZnj4fTG2ZNtC5n8ELgmcdFwTPOs49wejLeP9hJPn8DxdW9sq2+tfhAAAAAElFTkSuQmCC',
    '稳态协议': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAA4CAYAAACohjseAAAABHNCSVQICAgIfAhkiAAAARtJREFUaIHtmksOwjAMBW3UA5TTcmokOIHZdIGgbV6oreYZzwYJ9eNpEtvQ6O1pkplp+UQsNTKQH4BivoSHcTIlyE4JspNecGof0qRVPk4ttH8zgoeKuJndV76eRURU9ci1986FrusxRUUWmRHxELSDoxRK+jVYguwga/BzfVH9gISTzFIK5o2EEpVk9h4mdM/0U7QE2SlBdrx60S3QkhLW6iGCJiKiqteoICJJP0VLkJ0SZKcE2aEVNDMxa/cR0Z1MVIfyQA+kHUGUEmSnBNnpyaJ7GTHqr8SveyKl4Z3oMuFO72uQ9FO0BNkZWrA3oawxYpKB+0wEr814bk11x6jVZjyRAaeo9+v+9CNYguyUIDvpBV02450EFPMLK30m+QCdSXMAAAAASUVORK5CYII='
}

/** 终焉矩阵 (Doubled Pawns Matrix) 查询 */
export class DpMatrixInfo extends plugin {
    constructor() {
        super({
            name: '鸣潮-终焉矩阵查询',
            event: 'message',
            priority: 1008,
            rule: [
                {
                    reg: '^(?:～|~|鸣潮)?(?:当期|当前|本期)?(?:终焉)?矩阵$',
                    fnc: 'dpmatrixCurrent'
                },
                {
                    reg: '^(?:～|~|鸣潮)?上期(?:终焉)?矩阵$',
                    fnc: 'dpmatrixPrev'
                },
                {
                    reg: '^(?:～|~|鸣潮)?下期(?:终焉)?矩阵$',
                    fnc: 'dpmatrixNext'
                },
                {
                    reg: '^(?:～|~|鸣潮)?(\\d+)(?:期)?(?:终焉)?矩阵$',
                    fnc: 'dpmatrixByPeriod'
                },
                {
                    reg: '^(?:～|~|鸣潮)?(?:终焉)?矩阵列表$',
                    fnc: 'dpmatrixList'
                },
                {
                    reg: '^(?:～|~|鸣潮)?终焉矩阵清除缓存$',
                    fnc: 'clearDpMatrixCache'
                }
            ]
        })
    }

    /** 本地图标优先 */
    _localUrl(url) {
        if (!url) return ''
        try {
            const filename = path.basename(new URL(url).pathname)
            const localPath = path.join(DPMATRIX_ICON_DIR, filename)
            if (fs.existsSync(localPath)) return `file://${localPath}`
        } catch {}
        return url
    }

    /** 获取终焉矩阵列表（本地优先 → Redis → API） */
    async getDpMatrixList() {
        try {
            const { readLocalData } = await import('./EncoreSync.js')
            let data = readLocalData('dpmatrix')
            if (data && Array.isArray(data) && data.length > 0) {
                console.log('[DpMatrixInfo] 使用本地 dpmatrix 数据')
                return data
            }
        } catch {}
        const cacheKey = 'Yunzai:waves:dpmatrixList'
        try { let c = await redis.get(cacheKey); if (c) { console.log('[DpMatrixInfo] 使用 Redis 缓存'); return JSON.parse(c) } } catch {}
        try {
            console.log('[DpMatrixInfo] 请求 dpmatrix API')
            const res = await fetch('https://api-v2.encore.moe/api/zh-Hans/dpmatrix', {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            const data = await res.json()
            if (Array.isArray(data)) await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 })
            return data
        } catch (e) { console.error('[DpMatrixInfo] API 请求失败:', e); return null }
    }

    /** 获取终焉矩阵详情（本地优先 → Redis → API） */
    async fetchDpMatrixDetail(seasonId) {
        try {
            const { readLocalDetail } = await import('./EncoreSync.js')
            let local = readLocalDetail('dpmatrix', seasonId)
            if (local) { console.log(`[DpMatrixInfo] 使用本地详情 #${seasonId}`); return local }
        } catch {}
        const cacheKey = `Yunzai:waves:dpmatrix:detail:${seasonId}`
        try { let c = await redis.get(cacheKey); if (c) { console.log(`[DpMatrixInfo] 使用 Redis 详情 #${seasonId}`); return JSON.parse(c) } } catch {}
        try {
            console.log(`[DpMatrixInfo] 请求 dpmatrix 详情 API #${seasonId}`)
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/dpmatrix/${seasonId}`, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            const data = await res.json()
            try { await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 }) } catch {}
            try {
                const { saveLocalDetail } = await import('./EncoreSync.js')
                saveLocalDetail('dpmatrix', seasonId, data)
            } catch {}
            return data
        } catch (e) { console.error('[DpMatrixInfo] 获取详情失败:', e); return null }
    }

    /** 根据日期找当前赛季 */
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

    async dpmatrixCurrent(e) {
        const list = await this.getDpMatrixList()
        if (!list || !Array.isArray(list)) return e.reply('获取终焉矩阵数据失败，请稍后重试')
        const season = this.findCurrentSeason(list)
        return this.showDetail(e, list, season)
    }
    async dpmatrixPrev(e) {
        const list = await this.getDpMatrixList()
        if (!list || !Array.isArray(list)) return e.reply('获取终焉矩阵数据失败，请稍后重试')
        const curSeason = this.findCurrentSeason(list)
        return this.showDetail(e, list, curSeason - 1)
    }
    async dpmatrixNext(e) {
        const list = await this.getDpMatrixList()
        if (!list || !Array.isArray(list)) return e.reply('获取终焉矩阵数据失败，请稍后重试')
        const curSeason = this.findCurrentSeason(list)
        return this.showDetail(e, list, curSeason + 1)
    }
    async dpmatrixByPeriod(e) {
        const match = e.msg.match(/(\d+)/)
        if (!match) return e.reply('请指定期数，如: ~4期矩阵')
        const list = await this.getDpMatrixList()
        if (!list || !Array.isArray(list)) return e.reply('获取终焉矩阵数据失败，请稍后重试')
        const season = parseInt(match[1])
        return this.showDetail(e, list, season)
    }
    async dpmatrixList(e) {
        const list = await this.getDpMatrixList()
        if (!list || !Array.isArray(list)) return e.reply('获取终焉矩阵数据失败，请稍后重试')
        list.sort((a, b) => (b.Season || 0) - (a.Season || 0))
        const curSeason = this.findCurrentSeason(list)
        let msg = '终焉矩阵 周期列表:\n'
        for (const item of list.slice(0, 10)) {
            const marker = item.Season === curSeason ? '  ◀ 当前' : ''
            msg += `第${item.Season}期: ${item.CycleName || item.Name || ''}${marker}\n`
        }
        if (list.length > 10) msg += `...共 ${list.length} 期`
        await e.reply(msg)
    }

    /** 显示详情 — 模板优先，失败回退文本 */
    async showDetail(e, list, targetSeason) {
        const item = list.find(i => i.Season === targetSeason)
        if (!item) return e.reply(`未找到第${targetSeason}期终焉矩阵数据`)
        try {
            const renderData = await this.buildRenderData(item)
            const img = await Render.render('Template/encore/dpmatrix/dpmatrix', renderData, { e, retType: 'base64' })
            return e.reply(img, false)
        } catch (err) {
            console.error('[DpMatrixInfo] 模板渲染失败，回退文本:', err)
            return this.showDetailText(e, item)
        }
    }

    /** 构建渲染数据 */
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
            } else { leftTime = '即将结束' }
        }

        const urlFix = (url) => url ? url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/') : ''

        const detail = await this.fetchDpMatrixDetail(item.Season)
        const seasonName = detail ? (detail.SeasonName || '') : ''
        const endVersion = detail ? (detail.EndVersion || '') : ''

        let levels = []
        if (detail && detail.Levels && Array.isArray(detail.Levels)) {
            for (const level of detail.Levels) {
                // Buffs
                let buffs = []
                if (level.NewTowerBuffs && Array.isArray(level.NewTowerBuffs)) {
                    for (const b of level.NewTowerBuffs) {
                        buffs.push({
                            name: b.Name || '',
                            desc: this._cleanDesc(b.Desc || ''),
                            icon: this._localUrl(urlFix(b.Icon || ''))
                        })
                    }
                }

                // Waves
                let waves = []
                let levelIcon = ''
                if (level.Waves && Array.isArray(level.Waves)) {
                    for (const w of level.Waves) {
                        // 只显示 IsShowInView 的波次
                        if (w.IsShowInView === false) continue
                        // 关卡图标：优先使用本地覆盖图标，其次根据 level.Id 构造 URL
                        if (!levelIcon) {
                            if (LEVEL_ICON_OVERRIDE[level.Name]) {
                                levelIcon = LEVEL_ICON_OVERRIDE[level.Name]
                            } else {
                                const baseIconUrl = 'https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/UiActivity/Image/Activity32/MowingTower/BossLevelItemTex/T_BossLevelItemTex'
                                levelIcon = this._localUrl(urlFix(`${baseIconUrl}${level.Id}.webp`))
                            }
                        }
                        let tags = []
                        if (w.Tags && Array.isArray(w.Tags)) {
                            for (const t of w.Tags) {
                                tags.push({
                                    name: t.Name || '',
                                    path: this._localUrl(urlFix(t.Path || '')),
                                    color: t.Color || ''
                                })
                            }
                        }
                        let recommendFeatures = []
                        if (w.RecommendTeamFeature && Array.isArray(w.RecommendTeamFeature)) {
                            for (const f of w.RecommendTeamFeature) {
                                recommendFeatures.push({
                                    name: this._cleanDesc(f.Name || ''),
                                    icon: this._localUrl(urlFix(f.Icon || ''))
                                })
                            }
                        }
                        // 技能 Buff（危机应对·乘胜追击 等）
                        let showBuffs = []
                        if (w.ShowBuffIds && Array.isArray(w.ShowBuffIds)) {
                            for (const sb of w.ShowBuffIds) {
                                showBuffs.push({
                                    title: sb.SkillTitle || '',
                                    desc: this._cleanDesc(sb.SkillDesc || ''),
                                    icon: this._localUrl(urlFix(sb.SkillIcon || ''))
                                })
                            }
                        }
                        waves.push({
                            wave: w.Wave || w.Round || 0,
                            name: w.Name || '',
                            monsterLevel: w.MonsterLevel || 0,
                            icon: this._localUrl(urlFix(w.Icon || '')),
                            elementId: w.ElementId || 0,
                            tags,
                            recommendFeatures,
                            showBuffs
                        })
                    }
                }

                // ScoreLevelRule
                let scoreLevels = []
                if (level.ScoreLevelRule && Array.isArray(level.ScoreLevelRule)) {
                    for (const rule of level.ScoreLevelRule) {
                        if (rule.Value === 0) continue
                        scoreLevels.push({
                            key: rule.Key,
                            value: rule.Value,
                            icon: this._localUrl(urlFix(rule.Icon || ''))
                        })
                    }
                }

                levels.push({
                    name: level.Name || '',
                    teamLimit: level.TeamLimit || 0,
                    levelIcon,
                    levelColor: LEVEL_NAME_COLOR[level.Name] || '#cdb56b',
                    buffs,
                    waves,
                    scoreLevels
                })
            }
        }

        return {
            season: item.Season || '',
            name: item.CycleName || item.Name || '',
            seasonName, endVersion,
            beginTime: item.start || '', endTime: item.finish || '', leftTime,
            levels,
            getElementName: this.getElementName.bind(this),
            Math
        }
    }

    _cleanDesc(raw) {
        if (!raw) return ''
        let s = raw
        // <br> 转换为换行，删除其他所有 HTML 标签
        s = s.replace(/<br\s*\/?>/gi, '\n')
        s = s.replace(/<[^>]+>/g, '')
        return s
    }

    getElementName(id) {
        const names = { 0: '物理', 1: '冷凝', 2: '热熔', 3: '导电', 4: '气动', 5: '衍射', 6: '湮灭' }
        return names[id] || `元素${id}`
    }

    async showDetailText(e, item) {
        const detail = await this.fetchDpMatrixDetail(item.Season)
        if (!detail) return e.reply(`获取第${item.Season}期终焉矩阵详情失败`)
        let msg = '终焉矩阵\n\n'
        msg += `周期: ${detail.CycleName || detail.Name}\n`
        if (detail.SeasonName) msg += `赛季: ${detail.SeasonName}\n`
        if (detail.EndVersion) msg += `截止版本: ${detail.EndVersion}\n`
        if (detail.Levels && Array.isArray(detail.Levels)) {
            msg += `\n关卡详情 (${detail.Levels.length}):\n`
            for (const level of detail.Levels) {
                msg += `\n▸ ${level.Name} (队伍上限: ${level.TeamLimit || '?'})\n`
                if (level.NewTowerBuffs && level.NewTowerBuffs.length > 0) {
                    msg += `  Buff: ${level.NewTowerBuffs.map(b => b.Name).join(', ')}\n`
                }
                if (level.Waves && Array.isArray(level.Waves)) {
                    for (const w of level.Waves) {
                        msg += `  第${w.Wave || w.Round}波: ${w.Name} Lv${w.MonsterLevel}\n`
                        if (w.Tags && w.Tags.length > 0) {
                            msg += `     抗性: ${w.Tags.map(t => t.Name).join(', ')}\n`
                        }
                    }
                }
            }
        }
        await e.reply(msg)
    }

    async clearDpMatrixCache(e) {
        try {
            await redis.del('Yunzai:waves:dpmatrixList')
            const keys = await redis.keys('Yunzai:waves:dpmatrix:detail:*')
            for (const key of keys) await redis.del(key)
            e.reply('终焉矩阵缓存已清除')
        } catch { e.reply('清除缓存失败') }
    }
}