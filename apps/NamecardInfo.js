import plugin from '../../../lib/plugins/plugin.js'
import Render from '../components/Render.js'
import fs from 'fs'
import path from 'path'
import { pluginResources } from '../model/path.js'
import { readLocalData, readLocalDetail, saveLocalDetail } from './EncoreSync.js'
import Wiki from '../components/Wiki.js'

const ICON_DIR = path.join(pluginResources, 'data', 'encore', 'details', 'namecard', 'icon')

/** 羁旅印章(名片)查询 — 渲染图片卡片 */
export class NamecardInfo extends plugin {
    constructor() {
        super({
            name: '鸣潮-名片查询(Encore)',
            event: 'message',
            priority: 1007,
            rule: [
                {
                    reg: '^(?:～|~|鸣潮)(?:名片查询|名片搜索|查名片|羁旅印章)\\s*(.+)?$',
                    fnc: 'namecardQuery'
                },
                {
                    reg: '^(?:～|~|鸣潮)(?:名片|羁旅印章)列表$',
                    fnc: 'namecardList'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载名片encore$',
                    fnc: 'downloadNamecardIcons'
                }
            ]
        })
    }

    getNamecardData() { return readLocalData('namecard') }

    /** 获取名片详情 — 本地优先，否则从 API 拉取并缓存 */
    async fetchNamecardDetail(id) {
        let data = readLocalDetail('namecard', id)
        if (data) return data
        const cacheKey = `Yunzai:waves:namecardDetail:${id}`
        try {
            let cached = await redis.get(cacheKey)
            if (cached) {
                try { data = JSON.parse(cached); saveLocalDetail('namecard', id, data); return data } catch {}
            }
        } catch (e) {}
        try {
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/namecard/${id}`, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            data = await res.json()
            saveLocalDetail('namecard', id, data)
            try { await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 }) } catch (e) {}
            return data
        } catch (e) { console.error(`[NamecardInfo] 获取 ${id} 详情失败:`, e); return null }
    }

    /** 从 UE 路径提取文件名 */
    iconFilenameFromPath(uePath) {
        if (!uePath || typeof uePath !== 'string') return ''
        const lastSlash = uePath.lastIndexOf('/')
        const filename = lastSlash >= 0 ? uePath.slice(lastSlash + 1) : uePath
        const dotIdx = filename.lastIndexOf('.')
        return dotIdx > 0 ? filename.substring(0, dotIdx) : filename
    }

    /** 获取本地图标URL — 本地优先，否则返回在线URL */
    getLocalIconUrl(url) {
        if (!url) return ''
        try {
            const filename = path.basename(new URL(url).pathname)
            const localPath = path.join(ICON_DIR, filename)
            if (fs.existsSync(localPath)) return `file://${localPath}`
        } catch (e) {}
        return url
    }

    /** 将 UE 路径转为在线 URL（本地优先） */
    getCardUrl(uePath) {
        if (!uePath) return ''
        // 如果已经是完整URL，直接用本地映射
        if (uePath.startsWith('http')) return this.getLocalIconUrl(uePath)
        // UE 路径 → 文件名
        const filename = this.iconFilenameFromPath(uePath)
        if (!filename) return ''
        // 本地优先
        const localPath = path.join(ICON_DIR, `${filename}.webp`)
        if (fs.existsSync(localPath)) return `file://${localPath}`
        // 在线URL
        return `https://api.encore.moe/resource/Data${uePath.replace(/\.([^./]+)$/, '.webp')}`
    }

    /** 构建渲染数据 */
    buildRenderData(detail) {
        const stars = { 5: '★★★★★', 4: '★★★★', 3: '★★★', 2: '★★', 1: '★' }
        const q = detail.QualityId || 0

        // 名片大图 — 优先 LongCardPath，其次 CardPath
        const cardImg = detail.CardPath
            ? this.getLocalIconUrl(detail.CardPath)
            : ''
        const longCardImg = detail.LongCardPath
            ? this.getCardUrl(detail.LongCardPath)
            : ''

        return {
            id: detail.Id,
            // 名称 — API 返回 Title 字段
            name: detail.Title || detail.Name || '',
            qualityName: detail.QualityName || '',
            star: stars[q] || '',
            qualityId: q,
            // 类型 — "羁旅印章"
            typeName: detail.TypeDescription || '',
            // 卡片预览图
            cardImg: cardImg || this.getLocalIconUrl(detail.Icon || ''),
            // 长卡片图
            longCardImg: longCardImg || cardImg,
            // 名片描述
            desc: detail.AttributesDescription || '',
            // 背景故事
            bgDesc: (detail.BgDescription || '').replace(/^\?+$/, '') || '',
            // 获取方式
            tips: detail.Tips || '',
            // 获取方式详细列表
            accessDescriptions: (detail.AccessDescriptions || []).filter(d => d && d !== '???'),
            saveId: `namecard_${detail.Id}`
        }
    }

    /** 按列表序号查询（列表排序后第N个，1-based） */
    _queryByIndex(data, keyword) {
        const num = parseInt(keyword, 10)
        if (isNaN(num) || num < 1) return null
        // 复制列表并排序（与 namecardList 排序一致）
        const sorted = [...data].filter(Boolean).sort((a, b) => a.Id - b.Id)
        if (num > sorted.length) return null
        return [sorted[num - 1]]
    }

    async namecardQuery(e) {
        const keyword = (e.msg.match(this.rule[0].reg)?.[1] || '').trim()
        if (!keyword) return e.reply('请输入名片名称或序号查询，如: ~名片查询 漂泊之印 或 ~名片查询 01')

        const data = this.getNamecardData()
        if (!data || !Array.isArray(data)) return e.reply('名片数据未下载，请先使用 ~下载encore资源')

        // 先尝试序号查询（纯数字，如 01、1、02、2）
        const isNumeric = /^\d{1,3}$/.test(keyword)
        let results = isNumeric ? this._queryByIndex(data, keyword) : null

        // 非数字或序号超出范围 → 正常名称查询
        if (!results) {
            // 别名解析
            const wiki = new Wiki()
            const resolved = (await wiki.getAlias(keyword)) || keyword
            const kw = keyword.toLowerCase()
            const resolvedKw = resolved.toLowerCase()

            if (resolved !== keyword) {
                results = data.filter(n => n && ((n.Name || n.Title || '').toLowerCase().includes(resolvedKw)))
                if (results.length === 0) {
                    results = data.filter(n => n && ((n.Name || n.Title || '').toLowerCase().includes(kw)
                        || String(n.Id) === kw))
                }
            } else {
                results = data.filter(n => n && ((n.Name || n.Title || '').toLowerCase().includes(kw)
                    || String(n.Id) === kw))
            }
        }

        if (!results || results.length === 0) return e.reply(`未找到与 "${keyword}" 相关的名片`)
        if (results.length > 5) {
            const names = results.map(n => n.Name || n.Title || '').join('\n')
            return e.reply(`找到 ${results.length} 个名片:\n${names}\n\n请输入更精确的名称查询详情`)
        }

        const detail = await this.fetchNamecardDetail(results[0].Id)
        if (!detail) {
            // 降级：使用列表数据渲染
            const item = results[0]
            const fallback = {
                id: item.Id,
                name: item.Name || item.Title || '',
                cardImg: item.CardPath || item.Icon || '',
                longCardImg: item.CardPath || '',
                desc: '',
                bgDesc: '',
                tips: '',
                typeName: '',
                star: '',
                qualityId: 0,
                accessDescriptions: [],
                saveId: `namecard_${item.Id}`
            }
            const img = await Render.render('Template/encore/namecard/namecard', { namecard: fallback }, { e, retType: 'base64' })
            return e.reply(img, false)
        }

        const renderData = this.buildRenderData(detail)
        const img = await Render.render('Template/encore/namecard/namecard', { namecard: renderData }, { e, retType: 'base64' })
        return e.reply(img, false)
    }

    async namecardList(e) {
        const data = this.getNamecardData()
        if (!data || !Array.isArray(data)) return e.reply('名片数据未下载，请先使用 ~下载encore资源')

        const list = []
        for (const n of data) {
            if (!n) continue
            list.push({
                id: n.Id,
                name: n.Name || n.Title || '',
                avatar: this.getLocalIconUrl(n.Icon || ''),
                cardBg: this.getLocalIconUrl(n.CardPath || '')
            })
        }

        // 按 ID 排序
        list.sort((a, b) => a.id - b.id)

        // 分配序号（01, 02, 03...）
        for (let i = 0; i < list.length; i++) {
            list[i].index = String(i + 1).padStart(2, '0')
        }

        const renderData = { list }
        const img = await Render.render('Template/encore/namecard/list/namecard_list', renderData, { e, retType: 'base64' })
        return e.reply(img, false)
    }

    /** 下载单个图标文件 */
    async downloadIcon(url, saveDir) {
        if (!url) return false
        try {
            const filename = path.basename(new URL(url).pathname)
            const localPath = path.join(saveDir, filename)
            if (fs.existsSync(localPath)) return true
            const res = await fetch(url)
            if (!res.ok) return false
            const buf = Buffer.from(await res.arrayBuffer())
            fs.writeFileSync(localPath, buf)
            return true
        } catch (e) { return false }
    }

    async downloadNamecardIcons(e) {
        if (!e.isMaster) return e.reply('仅主人可使用此命令')
        const data = this.getNamecardData()
        if (!data || !Array.isArray(data)) return e.reply('名片数据未下载，请先使用 ~下载encore资源')

        if (!fs.existsSync(ICON_DIR)) fs.mkdirSync(ICON_DIR, { recursive: true })

        await e.reply(`开始下载名片图标，共 ${data.length} 个…`)
        let ok = 0, skip = 0, fail = 0
        const total = data.length

        for (let i = 0; i < total; i++) {
            const n = data[i]
            if (!n) continue

            const detail = await this.fetchNamecardDetail(n.Id)
            if (!detail) { fail++; continue }

            const urls = new Set()
            const addUrl = (url) => {
                if (url && typeof url === 'string' && url.startsWith('http')) urls.add(url)
            }
            addUrl(detail.CardPath)
            addUrl(detail.Icon)
            addUrl(detail.IconMiddle)
            addUrl(detail.IconSmall)

            // LongCardPath — UE 路径转 URL
            if (detail.LongCardPath) {
                const filename = this.iconFilenameFromPath(detail.LongCardPath)
                if (filename) {
                    urls.add(`https://api.encore.moe/resource/Data${detail.LongCardPath.replace(/\.([^./]+)$/, '.webp')}`)
                }
            }

            if (urls.size === 0) { skip++; continue }

            let downloaded = 0
            for (const iconUrl of urls) {
                if (await this.downloadIcon(iconUrl, ICON_DIR)) downloaded++
            }
            if (downloaded > 0) ok++
            else fail++
        }

        await e.reply(`名片图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }
}