import plugin from '../../../lib/plugins/plugin.js'
import Render from '../components/Render.js'
import fs from 'fs'
import path from 'path'
import { pluginResources } from '../model/path.js'
import { readLocalData, readLocalDetail, saveLocalDetail } from './EncoreSync.js'

const MONSTER_ICON_DIR = path.join(pluginResources, 'data', 'encore', 'details', 'monster', 'icon')
const CHAR_ICON_DIR = path.join(pluginResources, 'data', 'encore', 'details', 'character', 'icon')

export class MonsterInfo extends plugin {
    constructor() {
        super({
            name: '鸣潮-残像信息查询(Encore)',
            event: 'message',
            priority: 1007,
            rule: [
                { reg: '^(?:～|~|鸣潮)(?:残像查询|残像搜索|查残像)\\s*(.+)?$', fnc: 'monsterQuery' },
                { reg: '^(?:～|~|鸣潮)残像列表$', fnc: 'monsterList' }
            ]
        })
    }

    getMonsterData() { return readLocalData('monster') }

    _fixUrl(url) {
        if (!url) return ''
        return url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/')
    }

    async fetchMonsterDetail(id) {
        let data = readLocalDetail('monster', id)
        if (data) return data
        const cacheKey = `Yunzai:waves:monsterDetail:${id}`
        try { let cached = await redis.get(cacheKey); if (cached) { try { data = JSON.parse(cached); saveLocalDetail('monster', id, data); return data } catch {} } } catch (e) {}
        try {
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/monster/${id}`, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            data = await res.json()
            saveLocalDetail('monster', id, data)
            try { await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 }) } catch (e) {}
            return data
        } catch (e) { console.error(`[MonsterInfo] 获取 ${id} 详情失败:`, e); return null }
    }

    /** 按列表序号查询（列表排序后第N个，1-based） */
    _queryByIndex(data, keyword) {
        const num = parseInt(keyword, 10)
        if (isNaN(num) || num < 1) return null
        // 排序规则与 monsterList 一致：按品质降序，同品质按名称排序
        const rarityRank = { '海啸级': 4, '怒涛级': 3, '巨浪级': 2, '轻波级': 1 }
        const sorted = [...data].filter(Boolean).sort((a, b) => {
            const ra = rarityRank[a.Rarity] || 0
            const rb = rarityRank[b.Rarity] || 0
            if (ra !== rb) return rb - ra
            return (a.Name || '').localeCompare(b.Name || '', 'zh')
        })
        if (num > sorted.length) return null
        return [sorted[num - 1]]
    }

    async monsterQuery(e) {
        const keyword = (e.msg.match(this.rule[0].reg)?.[1] || '').trim()
        if (!keyword) return e.reply('请输入残像名称或序号查询，如: ~残像查询 芙露德莉斯 或 ~残像查询 01')

        const data = this.getMonsterData()
        if (!data || !Array.isArray(data)) return e.reply('残像数据未下载，请先使用 ~下载encore资源')

        // 先尝试序号查询（纯数字，如 01、1、02、2）
        const isNumeric = /^\d{1,3}$/.test(keyword)
        let results = isNumeric ? this._queryByIndex(data, keyword) : null

        if (!results) {
            const kw = keyword.toLowerCase()
            const all = data.filter(m => m && ((m.Name || '').toLowerCase().includes(kw)
                || String(m.Id) === kw || (m.Rarity || '').toLowerCase().includes(kw)
                || (m.Element?.Name || '').toLowerCase().includes(kw)))
            if (all.length === 0) return e.reply(`未找到与 "${keyword}" 相关的残像`)
            const exact = all.filter(m => m.Name === keyword)
            const rest = all.filter(m => m.Name !== keyword).sort((a, b) => a.Name.length - b.Name.length)
            results = [...exact, ...rest]

            if (!results || results.length === 0) return e.reply(`未找到与 "${keyword}" 相关的残像`)
        }

        if (results.length === 1) {
            const detail = await this.fetchMonsterDetail(results[0].Id)
            if (!detail) return e.reply(`获取残像 ${results[0].Name} 详情失败`)
            const renderData = this.buildRenderData(results[0], detail)
            const img = await Render.render('Template/encore/monster/monster', renderData, { e, retType: 'base64' })
            return e.reply(img, false)
        }
        if (results.length > 5) {
            return e.reply(`找到 ${results.length} 个:\n${results.map(m => m.Name).join('\n')}\n\n请输入更精确的名称`)
        }

        const detail = await this.fetchMonsterDetail(results[0].Id)
        if (!detail) return e.reply(`获取残像 ${results[0].Name} 详情失败`)

        const renderData = this.buildRenderData(results[0], detail)
        const img = await Render.render('Template/encore/monster/monster', renderData, { e, retType: 'base64' })
        return e.reply(img, false)
    }
    elemIdToName(id) { const m = { 0: '物理', 1: '冷凝', 2: '热熔', 3: '导电', 4: '气动', 5: '衍射', 6: '湮灭' }; return m[id] || '' }
    elemIdToColor(id) {
        const m = { 0: '#c0c0c0', 1: '#60a5fa', 2: '#ef4444', 3: '#c084fc', 4: '#4ade80', 5: '#facc15', 6: '#f472b6' }
        return m[id] || '#888'
    }

    buildRenderData(mon, detail) {
        const rarityColors = { '海啸级': '#ffd700', '怒涛级': '#a080c0', '巨浪级': '#5898b8', '轻波级': '#6b8e6b' }
        const rarity = mon.Rarity || ''
        const rarityColor = rarityColors[rarity] || '#888'

        const elementIcon = mon.Element?.Icon
            ? this._fixUrl(mon.Element.Icon).replace(/\.png$/i, '.webp')
            : ''

        const cleanDesc = (raw) => {
            if (!raw) return ''
            let s = raw
            const spanMap = []
            const spanClose = '\x00ESC\x00'
            s = s.replace(/<br\s*\/?>/gi, '\x00BR\x00')
            s = s.replace(/<span\s([^>]*?)>/gi, (match, attrs) => {
                const idx = spanMap.length
                spanMap.push(attrs)
                return `\x00SP${idx}\x00`
            })
            s = s.replace(/<\/span>/gi, spanClose)
            s = s.replace(/<[^>]+>/g, '')
            s = s.replace(/\x00BR\x00/g, '<br>')
            s = s.replace(/\x00SP(\d+)\x00/g, (_, idx) => `<span ${spanMap[parseInt(idx)]}>`)
            s = s.replace(new RegExp(spanClose.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '</span>')
            return s
        }
        const discoveredDes = cleanDesc(detail.DiscoveredDes || '')
        const undiscoveredDes = cleanDesc(detail.UndiscoveredDes || '')

        let fullDesc = discoveredDes
        if (undiscoveredDes) {
            const brIdx = fullDesc.indexOf('<br>')
            const styled = `<span style="font-style:italic;color:#888">${undiscoveredDes}</span>`
            if (brIdx >= 0) {
                fullDesc = fullDesc.slice(0, brIdx) + '<br>' + styled + '<br>' + fullDesc.slice(brIdx + 4)
            } else {
                fullDesc = fullDesc + '<br>' + styled
            }
        }

        const p = detail.Properties || {}
        const baseStats = []
        const getMaxVal = (prop) => {
            if (!prop) return 0
            const gv = prop.GrowthValues
            if (gv && gv.length > 0) {
                const last = gv[gv.length - 1]
                return last.value || last.Value || prop.Value || 0
            }
            return prop.Value || 0
        }
        if (p.LifeMax) baseStats.push({ name: p.LifeMax.Name || '生命', value: getMaxVal(p.LifeMax) })
        if (p.Atk) baseStats.push({ name: p.Atk.Name || '攻击', value: getMaxVal(p.Atk) })
        if (p.Def) baseStats.push({ name: p.Def.Name || '防御', value: getMaxVal(p.Def) })
        if (p.HardnessMax) baseStats.push({ name: p.HardnessMax.Name || '共振度上限', value: getMaxVal(p.HardnessMax) })

        const resistKeyMap = {
            DamageResistancePhys: '物理', DamageResistanceElement1: '冷凝',
            DamageResistanceElement2: '热熔', DamageResistanceElement3: '导电',
            DamageResistanceElement4: '气动', DamageResistanceElement5: '衍射',
            DamageResistanceElement6: '湮灭'
        }
        const elemColor = (detail.ElementIdArray || []).length > 0
            ? this.elemIdToColor(detail.ElementIdArray[0])
            : '#888'
        const resists = []
        for (const [key, name] of Object.entries(resistKeyMap)) {
            if (p[key] && p[key].Value != null) {
                const v = p[key].Value
                const pct = Math.round(v / 100)
                const high = v >= 4000
                const mid = v >= 2000
                resists.push({
                    name, pct,
                    marker: high ? '↑↑' : mid ? '↑' : '',
                    high,
                    color: elemColor
                })
            }
        }

        const elements = (detail.ElementIdArray || []).map(id => {
            const name = this.elemIdToName(id)
            return name ? { name, color: this.elemIdToColor(id) } : null
        }).filter(Boolean)
        if (elements.length === 0 && mon.Element?.Name) {
            const name = mon.Element.Name
            const id = (detail.ElementIdArray || [])[0]
            elements.push({ name, color: this.elemIdToColor(id) || '#888' })
        }

        return {
            monIcon: this._getLocalUrl(mon.Icon || ''),
            monName: mon.Name || '',
            rarity,
            rarityColor,
            elementIcon: this._getLocalUrl(elementIcon),
            elements,
            elemColor,
            discoveredDes: fullDesc,
            baseStats,
            resists,
            saveId: `monster_${detail.Id || mon.Id}`
        }
    }

    async monsterList(e) {
        const data = this.getMonsterData()
        if (!data || !Array.isArray(data)) return e.reply('残像数据未下载，请先使用 ~下载encore资源')

        const rarityColors = { '海啸级': '#ffd700', '怒涛级': '#a080c0', '巨浪级': '#5898b8', '轻波级': '#6b8e6b' }
        const rarityOrder = { '海啸级': 4, '怒涛级': 3, '巨浪级': 2, '轻波级': 1 }
        const rarityNames = ['海啸级', '怒涛级', '巨浪级', '轻波级']

        const ordered = {}
        for (const r of rarityNames) ordered[r] = []
        for (const m of data) {
            if (!m) continue
            const r = m.Rarity || ''
            if (!ordered[r]) ordered[r] = []
            ordered[r].push({
                id: m.Id,
                name: m.Name || '',
                avatar: this._getLocalUrl(m.Icon || ''),
                elementIcon: this._getLocalUrl(m.Element?.Icon || '')
            })
        }

        const groups = []
        let globalIdx = 0
        for (const r of rarityNames) {
            const list = ordered[r]
            if (!list.length) continue
            list.sort((a, b) => a.name.localeCompare(b.name, 'zh'))
            for (const item of list) {
                globalIdx++
                item.index = String(globalIdx).padStart(2, '0')
            }
            groups.push({
                rarity: r,
                count: list.length,
                color: rarityColors[r] || '#888',
                list
            })
        }

        const renderData = { groups }
        const img = await Render.render('Template/encore/monster/list/monster_list', renderData, { e, retType: 'base64' })
        return e.reply(img, false)
    }

    // ─── 图标工具 ───

    /** 图标URL — 本地优先（残像目录 → 角色目录），.png 转 .webp */
    _getLocalUrl(httpUrl) {
        if (!httpUrl) return ''
        try {
            const u = new URL(httpUrl)
            const filename = u.pathname.split('/').pop() || ''
            const webpName = filename.replace(/\.png$/i, '.webp')
            const monsterPath = path.join(MONSTER_ICON_DIR, webpName)
            if (fs.existsSync(monsterPath)) return `file://${monsterPath}`
            const charPath = path.join(CHAR_ICON_DIR, webpName)
            if (fs.existsSync(charPath)) return `file://${charPath}`
            let url = httpUrl.replace(/\.png$/i, '.webp')
            url = url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/')
            return url
        } catch (e) {}
        return httpUrl
    }

    }