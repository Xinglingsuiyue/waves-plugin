import plugin from '../../../lib/plugins/plugin.js'
import Render from '../components/Render.js'
import fs from 'fs'
import path from 'path'
import { pluginResources } from '../model/path.js'
import { readLocalData, readLocalDetail, saveLocalDetail } from './EncoreSync.js'
import Wiki from '../components/Wiki.js'

const ICON_DIR = path.join(pluginResources, 'data', 'encore', 'details', 'title', 'icon')

/** 称号查询 — 渲染图片卡片 */
export class TitleInfo extends plugin {
    constructor() {
        super({
            name: '鸣潮-称号查询(Encore)',
            event: 'message',
            priority: 1007,
            rule: [
                {
                    reg: '^(?:～|~|鸣潮)(?:称号查询|称号搜索|查称号)\\s*(.+)?$',
                    fnc: 'titleQuery'
                },
                {
                    reg: '^(?:～|~|鸣潮)称号列表$',
                    fnc: 'titleList'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载称号encore$',
                    fnc: 'downloadTitleIcons'
                }
            ]
        })
    }

    getTitleData() { return readLocalData('title') }

    /** 获取称号详情 — 本地优先，否则从 API 拉取并缓存 */
    async fetchTitleDetail(id) {
        let data = readLocalDetail('title', id)
        if (data) return data
        const cacheKey = `Yunzai:waves:titleDetail:${id}`
        try {
            let cached = await redis.get(cacheKey)
            if (cached) {
                try { data = JSON.parse(cached); saveLocalDetail('title', id, data); return data } catch {}
            }
        } catch (e) {}
        try {
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/title/${id}`, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            data = await res.json()
            saveLocalDetail('title', id, data)
            try { await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 }) } catch (e) {}
            return data
        } catch (e) { console.error(`[TitleInfo] 获取 ${id} 详情失败:`, e); return null }
    }

    /** 修复图片URL：api.encore.moe → api-v2.encore.moe，.png → .webp */
    fixImageUrl(url) {
        if (!url) return ''
        // 替换域名
        let fixed = url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/')
        // 替换扩展名
        fixed = fixed.replace(/\.png(\?.*)?$/, '.webp$1')
        return fixed
    }

    /** 获取本地图标URL — 本地优先（.webp），否则返回修复后的在线URL */
    getLocalIconUrl(url) {
        if (!url) return ''
        const fixedUrl = this.fixImageUrl(url)
        try {
            const filename = path.basename(new URL(fixedUrl).pathname)
            const localPath = path.join(ICON_DIR, filename)
            if (fs.existsSync(localPath)) return `file://${localPath}`
        } catch (e) {}
        return fixedUrl
    }

    /** 构建渲染数据 */
    buildRenderData(detail) {
        const titleTypeMap = { 1: '角色称号', 2: '活动称号', 3: '赛季称号', 4: '成就称号', 5: '特殊称号' }
        return {
            id: detail.Id,
            name: detail.TitleName || '',
            // 称号类型
            titleType: detail.TitleType || 0,
            titleTypeName: titleTypeMap[detail.TitleType] || '',
            // 称号品质
            titleQuality: detail.TitleQuality || 0,
            // 称号图片
            image: this.getLocalIconUrl(detail.Image || ''),
            // 角色头像
            roleHeadIcon: this.getLocalIconUrl(detail.RoleHeadIcon || ''),
            femaleRoleHeadIcon: this.getLocalIconUrl(detail.FemaleRoleHeadIcon || ''),
            // 装饰图标
            decorateLeftIcon: this.getLocalIconUrl(detail.DecorateLeftIcon || ''),
            decorateRightIcon: this.getLocalIconUrl(detail.DecorateRightIcon || ''),
            // 称号背景
            titleBgIcon: this.getLocalIconUrl(detail.TitleBgIcon || ''),
            // 称号选中图标
            selectedIcon: this.getLocalIconUrl(detail.SelectedIcon || ''),
            // 信息图标
            iconInTitleInfo: this.getLocalIconUrl(detail.IconInTitleInfo || ''),
            // 描述
            description: detail.Description || '',
            // 荣誉描述
            honorDescription: detail.HonorDescription || '',
            // 获取方式 — 去掉进度格式（当前已激活（{0}/{1}）链）
            itemAccess: (detail.ItemAccess || '').replace(/\s*（当前已激活.+链）/, '').trim(),
            saveId: `title_${detail.Id}`
        }
    }

    /** 按列表序号查询（列表排序后第N个，1-based） */
    _queryByIndex(data, keyword) {
        const num = parseInt(keyword, 10)
        if (isNaN(num) || num < 1) return null
        const sorted = [...data].filter(Boolean).sort((a, b) => a.Id - b.Id)
        if (num > sorted.length) return null
        return [sorted[num - 1]]
    }

    async titleQuery(e) {
        const keyword = (e.msg.match(this.rule[0].reg)?.[1] || '').trim()
        if (!keyword) return e.reply('请输入称号名称或序号查询，如: ~称号查询 调律者 或 ~称号查询 01')

        const data = this.getTitleData()
        if (!data || !Array.isArray(data)) return e.reply('称号数据未下载，请先使用 ~下载encore资源')

        // 先尝试序号查询（纯数字，如 01、1、02、2）
        const isNumeric = /^\d{1,3}$/.test(keyword)
        let results = isNumeric ? this._queryByIndex(data, keyword) : null

        // 非数字或序号超出范围 → 正常名称查询
        if (!results) {
            const wiki = new Wiki()
            const resolved = (await wiki.getAlias(keyword)) || keyword
            const kw = keyword.toLowerCase()
            const resolvedKw = resolved.toLowerCase()

            if (resolved !== keyword) {
                results = data.filter(t => t && ((t.TitleName || '').toLowerCase().includes(resolvedKw)))
                if (results.length === 0) {
                    results = data.filter(t => t && ((t.TitleName || '').toLowerCase().includes(kw)
                        || String(t.Id) === kw))
                }
            } else {
                results = data.filter(t => t && ((t.TitleName || '').toLowerCase().includes(kw)
                    || String(t.Id) === kw))
            }
        }

        if (!results || results.length === 0) return e.reply(`未找到与 "${keyword}" 相关的称号`)
        if (results.length > 5) {
            const names = results.map(t => t.TitleName || '').join('\n')
            return e.reply(`找到 ${results.length} 个称号:\n${names}\n\n请输入更精确的名称查询详情`)
        }

        const detail = await this.fetchTitleDetail(results[0].Id)
        if (!detail) {
            // 降级：使用列表数据渲染
            const item = results[0]
            const fallback = {
                id: item.Id,
                name: item.TitleName || '',
                image: this.fixImageUrl(item.Image || ''),
                titleType: 0,
                titleTypeName: '',
                titleQuality: 0,
                roleHeadIcon: '',
                femaleRoleHeadIcon: '',
                decorateLeftIcon: '',
                decorateRightIcon: '',
                titleBgIcon: '',
                selectedIcon: '',
                iconInTitleInfo: '',
                description: '',
                honorDescription: '',
                itemAccess: '',
                saveId: `title_${item.Id}`
            }
            const img = await Render.render('Template/encore/title/title', { title: fallback }, { e, retType: 'base64' })
            return e.reply(img, false)
        }

        const renderData = this.buildRenderData(detail)
        const img = await Render.render('Template/encore/title/title', { title: renderData }, { e, retType: 'base64' })
        return e.reply(img, false)
    }

    async titleList(e) {
        const data = this.getTitleData()
        if (!data || !Array.isArray(data)) return e.reply('称号数据未下载，请先使用 ~下载encore资源')

        const list = []
        for (const t of data) {
            if (!t) continue
            list.push({
                id: t.Id,
                name: t.TitleName || '',
                avatar: this.getLocalIconUrl(t.Image || '')
            })
        }

        // 按 ID 排序
        list.sort((a, b) => a.id - b.id)

        // 分配序号（01, 02, 03...）
        for (let i = 0; i < list.length; i++) {
            list[i].index = String(i + 1).padStart(2, '0')
        }

        const renderData = { list }
        const img = await Render.render('Template/encore/title/list/title_list', renderData, { e, retType: 'base64' })
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

    async downloadTitleIcons(e) {
        if (!e.isMaster) return e.reply('仅主人可使用此命令')
        const data = this.getTitleData()
        if (!data || !Array.isArray(data)) return e.reply('称号数据未下载，请先使用 ~下载encore资源')

        if (!fs.existsSync(ICON_DIR)) fs.mkdirSync(ICON_DIR, { recursive: true })

        await e.reply(`开始下载称号图标，共 ${data.length} 个…`)
        let ok = 0, skip = 0, fail = 0
        const total = data.length

        for (let i = 0; i < total; i++) {
            const t = data[i]
            if (!t) continue

            const detail = await this.fetchTitleDetail(t.Id)
            if (!detail) { fail++; continue }

            const urls = new Set()
            const addUrl = (url) => {
                if (url && typeof url === 'string' && url.startsWith('http')) urls.add(this.fixImageUrl(url))
            }
            addUrl(detail.Image)
            addUrl(detail.TitleBgIcon)
            addUrl(detail.DecorateLeftIcon)
            addUrl(detail.DecorateRightIcon)

            if (urls.size === 0) { skip++; continue }

            let downloaded = 0
            for (const iconUrl of urls) {
                if (await this.downloadIcon(iconUrl, ICON_DIR)) downloaded++
            }
            if (downloaded > 0) ok++
            else fail++
        }

        await e.reply(`称号图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }
}