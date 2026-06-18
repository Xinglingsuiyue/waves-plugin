import plugin from '../../../lib/plugins/plugin.js'
import Render from '../components/Render.js'
import fs from 'fs'
import path from 'path'
import { pluginResources } from '../model/path.js'
import { readLocalData, readLocalDetail, saveLocalDetail } from './EncoreSync.js'

const FOTG_ICON_DIR = path.join(pluginResources, 'data', 'encore', 'details', 'fotg', 'icon')

/** 千道门扉的异想 (Fantasies of the Thousand Gateways) 查询 */
export class FotgInfo extends plugin {
    constructor() {
        super({
            name: '鸣潮-千道门扉异想查询',
            event: 'message',
            priority: 1008,
            rule: [
                {
                    reg: '^(?:～|~|鸣潮)?(?:当期|当前|本期)?(?:千道(?:门扉)?(?:的)?异想|千道门扉)(?:\\s*$|查询$)',
                    fnc: 'fotgCurrent'
                },
                {
                    reg: '^(?:～|~|鸣潮)?上期(?:千道(?:门扉)?(?:的)?异想|千道门扉)$',
                    fnc: 'fotgPrev'
                },
                {
                    reg: '^(?:～|~|鸣潮)?下期(?:千道(?:门扉)?(?:的)?异想|千道门扉)$',
                    fnc: 'fotgNext'
                },
                {
                    reg: '^(?:～|~|鸣潮)?(\\d+)(?:期)?(?:千道(?:门扉)?(?:的)?异想|千道门扉)$',
                    fnc: 'fotgByPeriod'
                },
                {
                    reg: '^(?:～|~|鸣潮)?(?:千道(?:门扉)?(?:的)?异想|千道门扉)列表$',
                    fnc: 'fotgList'
                },
                {
                    reg: '^(?:～|~|鸣潮)?千道(?:门扉)?异想清除缓存$',
                    fnc: 'clearFotgCache'
                }
            ]
        })
    }

    /** 获取千道异想列表（本地优先 → Redis → API 兜底） */
    async getFotgList() {
        let data = readLocalData('fotg')
        if (data && Array.isArray(data) && data.length > 0) {
            console.log('[FotgInfo] 使用本地 fotg 数据')
            return data
        }
        const cacheKey = 'Yunzai:waves:fotgList'
        try { let c = await redis.get(cacheKey); if (c) { console.log('[FotgInfo] 使用 Redis 缓存'); return JSON.parse(c) } } catch {}
        try {
            console.log('[FotgInfo] 请求 fotg API')
            const res = await fetch('https://api-v2.encore.moe/api/zh-Hans/fotg', {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            data = await res.json()
            if (Array.isArray(data)) await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 })
            return data
        } catch (e) { console.error('[FotgInfo] API 请求失败:', e); return null }
    }

    /** 获取 buff pool 数据 — 本地优先 → Redis → API */
    async getBuffPool() {
        let buffs = readLocalData('fotg_buffpool')
        if (buffs && Array.isArray(buffs) && buffs.length > 0) return buffs
        const buffCacheKey = 'Yunzai:waves:fotg:buffpool'
        try { let c = await redis.get(buffCacheKey); if (c) buffs = JSON.parse(c) } catch {}
        if (!buffs || !Array.isArray(buffs)) {
            try {
                const res = await fetch('https://api-v2.encore.moe/api/zh-Hans/fotg/buffpool', {
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
                })
                if (res.ok) { buffs = await res.json(); await redis.set(buffCacheKey, JSON.stringify(buffs), { EX: 86400 }) }
            } catch {}
        }
        return buffs
    }

    /** 获取千道异想详情 — 本地文件优先 → Redis → API，并回写本地 */
    async fetchFotgDetail(id) {
        // 1. 本地详情文件优先
        let local = readLocalDetail('fotg', id)
        if (local) { console.log(`[FotgInfo] 使用本地详情 #${id}`); return local }

        // 2. Redis 缓存
        const cacheKey = `Yunzai:waves:fotg:detail:${id}`
        try { let c = await redis.get(cacheKey); if (c) { console.log(`[FotgInfo] 使用 Redis 详情 #${id}`); return JSON.parse(c) } } catch {}

        // 3. API 兜底
        try {
            console.log(`[FotgInfo] 请求 fotg 详情 API #${id}`)
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/fotg/${id}`, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            const data = await res.json()
            try { await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 }) } catch {}
            try { saveLocalDetail('fotg', id, data) } catch {}
            return data
        } catch (e) { console.error('[FotgInfo] 获取详情失败:', e); return null }
    }

    /** 根据日期找到当前期：now 在 start ~ finish 之间 */
    findCurrentId(list) {
        const now = new Date()
        for (const item of list) {
            if (!item.start || !item.finish) continue
            const begin = new Date(item.start + 'T04:00:00')
            const end = new Date(item.finish + 'T04:00:00')
            if (now >= begin && now <= end) return item.Id
        }
        // 没有正好在区间内的，取最新的（Id 最大）
        return Math.max(...list.map(i => i.Id))
    }

    /** 当前期 */
    async fotgCurrent(e) {
        const list = await this.getFotgList()
        if (!list || !Array.isArray(list)) return e.reply('获取千道门扉异想数据失败，请稍后重试')
        const id = this.findCurrentId(list)
        return this.showDetail(e, list, id)
    }

    /** 上期 */
    async fotgPrev(e) {
        const list = await this.getFotgList()
        if (!list || !Array.isArray(list)) return e.reply('获取千道门扉异想数据失败，请稍后重试')
        const curId = this.findCurrentId(list)
        return this.showDetail(e, list, curId - 1)
    }

    /** 下期 */
    async fotgNext(e) {
        const list = await this.getFotgList()
        if (!list || !Array.isArray(list)) return e.reply('获取千道门扉异想数据失败，请稍后重试')
        const curId = this.findCurrentId(list)
        return this.showDetail(e, list, curId + 1)
    }

    /** 指定期数 */
    async fotgByPeriod(e) {
        const match = e.msg.match(/(\d+)/)
        if (!match) return e.reply('请指定期数，如: ~3402期千道门扉')
        const list = await this.getFotgList()
        if (!list || !Array.isArray(list)) return e.reply('获取千道门扉异想数据失败，请稍后重试')
        const id = parseInt(match[1])
        return this.showDetail(e, list, id)
    }

    /** 列表 */
    async fotgList(e) {
        const list = await this.getFotgList()
        if (!list || !Array.isArray(list)) return e.reply('获取千道门扉异想数据失败，请稍后重试')
        list.sort((a, b) => (b.Id || 0) - (a.Id || 0))
        const curId = this.findCurrentId(list)
        let msg = '千道门扉的异想 周期列表:\n'
        const recent = list.slice(0, 10)
        for (const item of recent) {
            const marker = item.Id === curId ? '  ◀ 当前' : ''
            msg += `第${item.Id}期: ${item.start} ~ ${item.finish}${marker}\n`
        }
        if (list.length > 10) msg += `...共 ${list.length} 期`
        await e.reply(msg)
    }

    /** 显示详情 — 优先模板渲染，失败回退文本 */
    async showDetail(e, list, targetId) {
        const item = list.find(i => i.Id === targetId)
        if (!item) return e.reply(`未找到第${targetId}期千道门扉异想数据`)
        try {
            const renderData = await this.buildRenderData(item)
            const img = await Render.render('Template/encore/fotg/fotg', renderData, { e, retType: 'base64' })
            return e.reply(img, false)
        } catch (err) {
            console.error('[FotgInfo] 模板渲染失败，回退文本:', err)
            return this.showDetailText(e, item)
        }
    }

    /** 构建渲染数据 */
    async buildRenderData(item) {
        const begin = new Date(item.start + 'T04:00:00')
        const end = new Date(item.finish + 'T04:00:00')
        const now = new Date()
        let statusClass = 'past', statusText = '已结束', timeHint = ''
        if (now < begin) {
            const diff = Math.ceil((begin - now) / (1000 * 60 * 60 * 24))
            statusClass = 'upcoming'; statusText = '即将开启'; timeHint = `还有约 ${diff} 天`
        } else if (now > end) {
            statusClass = 'past'; statusText = '已结束'; timeHint = ''
        } else {
            const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
            statusClass = 'current'; statusText = '当前周期'; timeHint = `剩余约 ${diff} 天`
        }

        const urlFix = (url) => url ? url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/') : ''
        const localUrl = (url) => {
            if (!url) return ''
            try {
                const filename = path.basename(new URL(url).pathname)
                const localPath = path.join(FOTG_ICON_DIR, filename)
                if (fs.existsSync(localPath)) return `file://${localPath}`
            } catch {}
            return url
        }

        const detail = await this.fetchFotgDetail(item.Id)
        const viewBg = detail ? localUrl(urlFix(detail.ViewBackground || '')) : ''
        const cycleName = detail ? (detail.CycleName || '') : ''
        const buffDesc = detail ? this._cleanDesc(detail.BuffDesc || '') : ''
        const baseScore = detail ? (detail.BaseScore || 0) : 0
        const maxScore = detail ? (detail.MaxScore || 0) : 0

        let recommendedRoles = []
        if (detail && detail.RecommendedRole) {
            for (const key of Object.keys(detail.RecommendedRole)) {
                const r = detail.RecommendedRole[key]
                recommendedRoles.push({
                    name: r.Name || '',
                    avatar: localUrl(urlFix(r.RoleHeadIcon || '')),
                    elementIcon: r.Element && r.Element.Icon ? localUrl(urlFix(r.Element.Icon.replace(/IconElement\//, 'IconElementRound/').replace(/2\.webp$/, '1_UI.webp'))) : ''
                })
            }
        }

        return {
            periodId: item.Id || '', cycleName, viewBg,
            statusClass, statusText, startDate: item.start || '', finishDate: item.finish || '', timeHint,
            buffDesc, baseScore, maxScore, recommendedRoles
        }
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

    async showDetailText(e, item) {
        const begin = new Date(item.start + 'T04:00:00'); const end = new Date(item.finish + 'T04:00:00'); const now = new Date()
        let statusStr = '', timeStr = ''
        if (now < begin) { const d = Math.ceil((begin - now) / (1000 * 60 * 60 * 24)); statusStr = ' 即将开启'; timeStr = `还有约 ${d} 天` }
        else if (now > end) { statusStr = ' 已结束'; timeStr = `${item.start} ~ ${item.finish}` }
        else { const d = Math.ceil((end - now) / (1000 * 60 * 60 * 24)); statusStr = ' 当前周期'; timeStr = `${item.start} ~ ${item.finish} (剩余约 ${d} 天)` }
        let msg = `千道门扉的异想\n\n第${item.Id}期\n状态: ${statusStr}\n时间: ${timeStr}\n`
        try {
            const buffs = await this.getBuffPool()
            if (buffs && Array.isArray(buffs) && buffs.length > 0) {
                msg += `\n 可用 Buff 池 (共 ${buffs.length} 个):\n`
                const show = buffs.slice(0, 8)
                for (const b of show) msg += `    ${b.BuffName}: ${b.BuffDescSimple}\n`
                if (buffs.length > 8) msg += `  ...共 ${buffs.length} 个`
            }
        } catch {}
        await e.reply(msg)
    }

    async clearFotgCache(e) {
        try {
            await redis.del('Yunzai:waves:fotgList')
            await redis.del('Yunzai:waves:fotg:buffpool')
            e.reply('千道门扉异想缓存已清除')
        } catch { e.reply('清除缓存失败') }
    }
}