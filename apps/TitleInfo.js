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
        let fixed = url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/')
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
            titleType: detail.TitleType || 0,
            titleTypeName: titleTypeMap[detail.TitleType] || '',
            titleQuality: detail.TitleQuality || 0,
            image: this.getLocalIconUrl(detail.Image || ''),
            roleHeadIcon: this.getLocalIconUrl(detail.RoleHeadIcon || ''),
            femaleRoleHeadIcon: this.getLocalIconUrl(detail.FemaleRoleHeadIcon || ''),
            decorateLeftIcon: this.getLocalIconUrl(detail.DecorateLeftIcon || ''),
            decorateRightIcon: this.getLocalIconUrl(detail.DecorateRightIcon || ''),
            titleBgIcon: this.getLocalIconUrl(detail.TitleBgIcon || ''),
            selectedIcon: this.getLocalIconUrl(detail.SelectedIcon || ''),
            iconInTitleInfo: this.getLocalIconUrl(detail.IconInTitleInfo || ''),
            description: detail.Description || '',
            honorDescription: detail.HonorDescription || '',
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

        const isNumeric = /^\d{1,3}$/.test(keyword)
        let results = isNumeric ? this._queryByIndex(data, keyword) : null

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
        list.sort((a, b) => a.id - b.id)
        for (let i = 0; i < list.length; i++) {
            list[i].index = String(i + 1).padStart(2, '0')
        }

        const renderData = { list }
        const img = await Render.render('Template/encore/title/list/title_list', renderData, { e, retType: 'base64' })
        return e.reply(img, false)
    }
}