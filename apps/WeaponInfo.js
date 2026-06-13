import plugin from '../../../lib/plugins/plugin.js'
import Render from '../components/Render.js'
import fs from 'fs'
import path from 'path'
import { pluginResources } from '../model/path.js'
import { readLocalData, readLocalDetail, saveLocalDetail } from './EncoreSync.js'
import Wiki from '../components/Wiki.js'

const ICON_DIR = path.join(pluginResources, 'data', 'encore', 'details', 'weapon', 'icon')
// 武器类型图标和角色武器类型图标是同一套，也查角色图标目录
const CHAR_ICON_DIR = path.join(pluginResources, 'data', 'encore', 'details', 'character', 'icon')

/** 武器信息查询 — 渲染图片卡片 */
export class WeaponInfo extends plugin {
    constructor() {
        super({
            name: '鸣潮-武器信息查询(Encore)',
            event: 'message',
            priority: 1007,
            rule: [
                {
                    reg: '^(?:～|~|鸣潮)?(?:武器查询|武器搜索|查武器)\\s*(.+)?$',
                    fnc: 'weaponQuery'
                },
                {
                    reg: '^(?:～|~|鸣潮)?武器列表$',
                    fnc: 'weaponList'
                },
                {
                    reg: '^(?:～|~|鸣潮)?下载武器encore$',
                    fnc: 'downloadWeaponIcons'
                }
            ]
        })
    }

    getWeaponData() { return readLocalData('weapon') }

    async fetchWeaponDetail(id) {
        let data = readLocalDetail('weapon', id)
        if (data) return data
        const cacheKey = `Yunzai:waves:weaponDetail:${id}`
        let cached = await redis.get(cacheKey)
        if (cached) { try { data = JSON.parse(cached); saveLocalDetail('weapon', id, data); return data } catch {} }
        try {
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/weapon/${id}`, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            data = await res.json()
            saveLocalDetail('weapon', id, data)
            await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 })
            return data
        } catch (e) { console.error(`[WeaponInfo] 获取 ${id} 详情失败:`, e); return null }
    }

    async weaponQuery(e) {
        const keyword = (e.msg.match(this.rule[0].reg)?.[1] || '').trim()
        if (!keyword) return e.reply('请输入武器名称查询，如: ~武器查询 存帧')

        const data = this.getWeaponData()
        if (!data || !Array.isArray(data)) return e.reply('武器数据未下载，请先使用 ~下载encore资源')

        // 别名解析
        const wiki = new Wiki()
        const resolved = (await wiki.getAlias(keyword)) || keyword
        const kw = keyword.toLowerCase()
        const resolvedKw = resolved.toLowerCase()

        let results
        if (resolved !== keyword) {
            results = data.filter(w => w && (w.Name || '').toLowerCase().includes(resolvedKw))
            if (!results || results.length === 0) {
                results = data.filter(w => w && ((w.Name || '').toLowerCase().includes(kw)
                    || String(w.Id) === kw || (w.TypeName || '').toLowerCase().includes(kw)))
            }
        } else {
            results = data.filter(w => w && ((w.Name || '').toLowerCase().includes(kw)
                || String(w.Id) === kw || (w.TypeName || '').toLowerCase().includes(kw)))
        }

        if (!results || results.length === 0) return e.reply(`未找到与 "${keyword}" 相关的武器`)
        if (results.length > 5) {
            const names = results.map(w => `${w.Name}(${w.TypeName || ''})`).join('\n')
            return e.reply(`找到 ${results.length} 个武器:\n${names}\n\n请输入更精确的名称查询详情`)
        }

        const detail = await this.fetchWeaponDetail(results[0].Id)
        if (!detail) return e.reply(`获取武器 ${results[0].Name} 详情失败`)

        const renderData = this.buildRenderData(detail)
        const img = await Render.render('Template/encore/weapon/weapon', renderData, { e, retType: 'base64' })
        return e.reply(img, false)
    }

    /** 从HTTP URL提取文件名并检查本地 */
    getLocalUrl(httpUrl) {
        if (!httpUrl) return ''
        try {
            const filename = path.basename(new URL(httpUrl).pathname)
            const localPath = path.join(ICON_DIR, filename)
            if (fs.existsSync(localPath)) return `file://${localPath}`
            const charPath = path.join(CHAR_ICON_DIR, filename)
            if (fs.existsSync(charPath)) return `file://${charPath}`
        } catch (e) {}
        return httpUrl
    }

    /** 从 UE 路径提取图标文件名 */
    iconFilenameFromPath(uePath) {
        if (!uePath || typeof uePath !== 'string') return ''
        // /Game/.../T_IconWeapon21050030_UI.T_IconWeapon21050030_UI → T_IconWeapon21050030_UI
        const lastSlash = uePath.lastIndexOf('/')
        const filename = lastSlash >= 0 ? uePath.slice(lastSlash + 1) : uePath
        const dotIdx = filename.lastIndexOf('.')
        return dotIdx > 0 ? filename.substring(0, dotIdx) : filename
    }

    /** 获取武器图标URL — 本地文件优先，否则用在线URL */
    getWeaponIconUrl(iconPath) {
        if (!iconPath) return ''
        const filename = this.iconFilenameFromPath(iconPath)
        if (!filename) return ''
        // 本地优先：先查武器目录
        const weaponPath = path.join(ICON_DIR, `${filename}.webp`)
        if (fs.existsSync(weaponPath)) return `file://${weaponPath}`
        // 武器类型图标和角色武器类型图标是同一套，也查角色目录
        const charPath = path.join(CHAR_ICON_DIR, `${filename}.webp`)
        if (fs.existsSync(charPath)) return `file://${charPath}`
        // 从UE路径构造在线URL
        const webPath = iconPath.replace(/\.([^./]+)$/, '.webp')
        return `https://api.encore.moe/resource/Data${webPath}`
    }

    _qualityColor(qualityId) {
        const m = { 5: '#ffd700', 4: '#a080c0', 3: '#5898b8', 2: '#6b8e6b', 1: '#888' }
        return m[qualityId] || '#888'
    }

    buildRenderData(detail) {
        const stars = { 5: '★★★★★', 4: '★★★★', 3: '★★★', 2: '★★', 1: '★' }
        const q = detail.QualityId || 0
        const props = detail.Properties || []

        // 武器图片 — 从Icon字段提取真实文件名，本地优先
        const wpIcon = this.getWeaponIconUrl(detail.Icon || '')

        // 主属性 — Properties[0] 对应 FirstPropId，直接取 GrowthValues 最大值
        const fp = detail.FirstPropId || {}
        let firstProp = {
            name: '',
            display: String(fp.Value || 0)
        }
        if (props.length >= 1 && props[0].GrowthValues && props[0].GrowthValues.length > 0) {
            const last = props[0].GrowthValues[props[0].GrowthValues.length - 1]
            const val = last.value || last.Value
            firstProp = {
                name: props[0].Name || '',
                display: typeof val === 'string' ? val : String(Math.round(val))
            }
        }

        // 副属性 — Properties[1] 对应 SecondPropId
        let secondProp = null
        if (detail.SecondPropId && detail.SecondPropId.Id && props.length >= 2
            && props[1].GrowthValues && props[1].GrowthValues.length > 0) {
            const last = props[1].GrowthValues[props[1].GrowthValues.length - 1]
            const val = last.value || last.Value
            secondProp = {
                name: props[1].Name || '',
                display: typeof val === 'string' ? val : String(Math.round(val))
            }
        }

        // 谐振技能描述 — 合并重复值（12/12/12/12/12→12），保留不同值（12%/15%/18%/21%/24%），数值金色
        const resonDesc = this.processResonDesc(detail.Desc || '')

        // 武器类型图标 — 本地优先
        const typeIconUrl = this.getWeaponIconUrl(detail.TypeIcon || '')

        return {
            wpName: detail.WeaponName || detail.Name || '',
            wpIcon,
            wpTypeIcon: typeIconUrl,
            wpQualityName: detail.QualityName || '',
            wpTypeName: detail.WeaponTypeName || '',
            star: stars[q] || '',
            qualityId: q,
            qualityColor: this._qualityColor(q),
            firstProp,
            secondProp,
            resonName: detail.ResonName || '',
            resonDesc,
            bgDesc: (detail.BgDescription || '').slice(0, 200),
            saveId: `weapon_${detail.ItemId || detail.Id}`
        }
    }

    /** 处理谐振技能描述：合并重复的 / 分隔值，数值保留金色渲染 */
    processResonDesc(desc) {
        if (!desc) return ''
        return desc.replace(/<span[^>]*>([^<]+)<\/span>/g, (match, content) => {
            const parts = content.split('/')
            if (parts.length > 1 && parts.every(p => p === parts[0])) {
                return `<span style="color:#ffd12f;">${parts[0]}</span>`
            }
            return match
        })
    }

    async downloadWeaponIcons(e) {
        if (!e.isMaster) return e.reply('仅主人可使用此命令')
        const data = this.getWeaponData()
        if (!data || !Array.isArray(data)) return e.reply('武器数据未下载，请先使用 ~下载encore资源')

        const est = Math.ceil(data.length * 0.8) // 每个约需0.8秒
        const estStr = est > 60 ? `预计 ${Math.ceil(est / 60)} 分钟` : `预计 ${est} 秒`
        await e.reply(`开始下载武器图标（${estStr}），共 ${data.length} 个…`)

        if (!fs.existsSync(ICON_DIR)) fs.mkdirSync(ICON_DIR, { recursive: true })

        let ok = 0, skip = 0, fail = 0
        const total = data.length

        for (let i = 0; i < total; i++) {
            const w = data[i]
            const itemId = w.Id

            const detail = await this.fetchWeaponDetail(itemId)
            if (!detail || !detail.Icon) { fail++; continue }

            const baseFilename = this.iconFilenameFromPath(detail.Icon)
            if (!baseFilename) { fail++; continue }

            const urls = new Set()
            const addUrl = (uePath) => {
                if (!uePath) return
                const fn = this.iconFilenameFromPath(uePath)
                if (!fn) return
                const lp = path.join(ICON_DIR, `${fn}.webp`)
                if (fs.existsSync(lp)) return
                const wp = uePath.replace(/\.([^./]+)$/, '.webp')
                urls.add(`https://api.encore.moe/resource/Data${wp}`)
            }
            addUrl(detail.Icon)
            addUrl(detail.TypeIcon)

            if (urls.size === 0) { skip++; continue }

            let downloaded = 0
            for (const iconUrl of urls) {
                try {
                    const res = await fetch(iconUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
                    })
                    if (!res.ok) { console.error(`[WeaponIcon] ${itemId} HTTP ${res.status}: ${iconUrl}`); continue }
                    const buf = Buffer.from(await res.arrayBuffer())
                    const urlFn = path.basename(new URL(iconUrl).pathname)
                    fs.writeFileSync(path.join(ICON_DIR, urlFn), buf)
                    downloaded++
                } catch (err) { console.error(`[WeaponIcon] ${itemId} download error:`, err.message) }
            }
            if (downloaded > 0) ok++
            else fail++
        }

        await e.reply(`武器图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }

    async weaponList(e) {
        const data = this.getWeaponData()
        if (!data || !Array.isArray(data)) return e.reply('武器数据未下载，请先使用 ~下载encore资源')

        const qualityColors = { 5: '#ffd700', 4: '#a080c0', 3: '#5898b8', 2: '#6b8e6b', 1: '#888' }

        const list = []
        for (const w of data) {
            if (!w) continue
            const q = w.QualityId || 0
            list.push({
                id: w.Id,
                name: w.Name || '',
                avatar: this.getLocalUrl(w.Icon || ''),
                typeIcon: this.getWeaponIconUrl(w.TypeIcon || ''),
                typeName: w.TypeName || '',
                qualityColor: qualityColors[q] || '#888',
                quality: q
            })
        }

        // 按品质降序 → 同品质同类型武器在一起 → 按名称排序
        list.sort((a, b) => b.quality - a.quality || a.typeName.localeCompare(b.typeName, 'zh') || a.name.localeCompare(b.name, 'zh'))

        const renderData = { list }
        const img = await Render.render('Template/encore/weapon/list/weapon_list', renderData, { e, retType: 'base64' })
        return e.reply(img, false)
    }
}