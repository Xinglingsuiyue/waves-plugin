import plugin from '../../../lib/plugins/plugin.js'
import Render from '../components/Render.js'
import fs from 'fs'
import path from 'path'
import { pluginResources } from '../model/path.js'
import { readLocalData, readLocalDetail, saveLocalDetail } from './EncoreSync.js'

const ICON_DIR = path.join(pluginResources, 'data', 'encore', 'details', 'echo', 'icon')

/** 声骸信息查询 — 渲染图片卡片 */
export class EchoInfo extends plugin {
    constructor() {
        super({
            name: '鸣潮-声骸信息查询(Encore)',
            event: 'message',
            priority: 1007,
            rule: [
                { reg: '^(?:～|~|鸣潮)(?:声骸查询|声骸搜索|查声骸)\\s*(.+)?$', fnc: 'echoQuery' },
                { reg: '^(?:～|~|鸣潮)声骸列表$', fnc: 'echoList' },
                { reg: '^(?:～|~|鸣潮)(?:合鸣查询|合鸣搜索|查合鸣)\\s*(.+)?$', fnc: 'fetterQuery' },
                { reg: '^(?:～|~|鸣潮)下载声骸encore$', fnc: 'downloadEchoIcons' }
            ]
        })
    }

    getEchoData() { return readLocalData('echo') }

    async fetchEchoDetail(id) {
        let data = readLocalDetail('echo', id)
        if (data) return data
        const cacheKey = `Yunzai:waves:echoDetail:${id}`
        try {
            let cached = await redis.get(cacheKey)
            if (cached) { try { data = JSON.parse(cached); saveLocalDetail('echo', id, data); return data } catch {} }
        } catch (e) {}
        try {
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/echo/${id}`, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            data = await res.json()
            saveLocalDetail('echo', id, data)
            try { await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 }) } catch (e) {}
            return data
        } catch (e) { console.error(`[EchoInfo] 获取 ${id} 详情失败:`, e); return null }
    }

    async echoQuery(e) {
        const keyword = (e.msg.match(this.rule[0].reg)?.[1] || '').trim()
        if (!keyword) return e.reply('请输入声骸名称查询，如: ~声骸查询 幼猿')

        const data = this.getEchoData()
        if (!data || !Array.isArray(data)) return e.reply('声骸数据未下载，请先使用 ~下载encore资源')

        const kw = keyword.toLowerCase()
        const results = data.filter(e => e && ((e.Name || '').toLowerCase().includes(kw)
            || String(e.Id) === kw || (e.Element?.Name || '').toLowerCase().includes(kw)
            || (e.FetterGroups || []).some(f => (f.Name || '').toLowerCase().includes(kw))))

        if (!results || results.length === 0) return e.reply(`未找到与 "${keyword}" 相关的声骸`)
        const exact = results.find(r => (r.Name || '').toLowerCase() === kw)
        if (exact) {
            const detail = await this.fetchEchoDetail(exact.Id)
            if (!detail) return e.reply(`获取声骸 ${exact.Name} 详情失败`)
            const renderData = this.buildRenderData(exact, detail)
            const img = await Render.render('Template/encore/echo_info/echo_info', renderData, { e, retType: 'base64' })
            return e.reply(img, false)
        }
        if (results.length > 5) {
            return e.reply(`找到 ${results.length} 个:\n${results.map(e => e.Name).join('\n')}\n\n请输入更精确的名称`)
        }

        const detail = await this.fetchEchoDetail(results[0].Id)
        if (!detail) return e.reply(`获取声骸 ${results[0].Name} 详情失败`)
        const renderData = this.buildRenderData(results[0], detail)
        const img = await Render.render('Template/encore/echo_info/echo_info', renderData, { e, retType: 'base64' })
        return e.reply(img, false)
    }

    /** 本地图标URL — 本地优先 */
    getLocalIconUrl(url) {
        if (!url) return ''
        let fixed = url.replace(/\.png$/i, '.webp')
        fixed = fixed.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/')
        try {
            const filename = path.basename(new URL(fixed).pathname)
            const localPath = path.join(ICON_DIR, filename)
            if (fs.existsSync(localPath)) return `file://${localPath}`
        } catch (e) {}
        return fixed
    }

    /** 构建渲染数据 — 完整展示所有字段 */
    buildRenderData(echo, detail) {
        const stars = { 5: '★★★★★', 4: '★★★★', 3: '★★★', 2: '★★', 1: '★', 0: '' }
        const q = detail.QualityId || 0

        // 图标
        const iconUrl = this.getLocalIconUrl(detail.IconMiddle || detail.Icon || echo.IconMiddle || echo.Icon || '')
        const elementIcon = this.getLocalIconUrl(detail.ElementIcon || detail.Element?.Icon || echo.Element?.Icon || '')
        const elementName = detail.Element?.Name || echo.Element?.Name || ''

        // 图鉴 — 完整展示
        const hb = detail.Handbook || {}
        const handbook = []
        if (hb.Name || echo.Name) handbook.push({ label: '图鉴名', value: hb.Name || echo.Name || '' })
        if (hb.TypeDescrtption) handbook.push({ label: '分类', value: hb.TypeDescrtption })
        if (hb.Intensity) handbook.push({ label: '强度', value: hb.Intensity })
        if (hb.Place) handbook.push({ label: '地区', value: hb.Place })
        if (hb.Title1 && hb.Descrtption1) {
            handbook.push({ label: hb.Title1, value: hb.Descrtption1.replace(/<[^>]+>/g, '') })
        }
        if (hb.Title2 && hb.Descrtption2) {
            handbook.push({ label: hb.Title2, value: hb.Descrtption2.replace(/<[^>]+>/g, '') })
        }

        // 技能 — 完整展示
        const sk = detail.Skill || {}
        let skill = null
        if (sk.SkillCD || sk.DescriptionEx || sk.SimplyDescription || sk.BattleViewIcon) {
            const skillIcon = this.getLocalIconUrl(sk.BattleViewIcon || '')
            // 满级参数
            let params = []
            if (sk.LevelDescStrArray && sk.LevelDescStrArray.length > 0) {
                const last = sk.LevelDescStrArray[sk.LevelDescStrArray.length - 1]
                if (last && last.ArrayString) params = last.ArrayString
            }
            // 伤害列表
            let damageList = []
            if (sk.DamageList && sk.DamageList.length > 0) {
                damageList = sk.DamageList.map(d => ({
                    entryNumber: d.EntryNumber || 0,
                    type: d.Type || '',
                    dmgType: d.DmgType || '',
                    propertyName: d.PropertyName || '',
                    rateLv: (d.RateLv || []).length > 0 ? d.RateLv[d.RateLv.length - 1] : '',
                    energy: d.Energy && d.Energy.length > 0 ? d.Energy[d.Energy.length - 1] : 0,
                    toughness: d.ToughLv && d.ToughLv.length > 0 ? d.ToughLv[d.ToughLv.length - 1] : 0
                }))
            }
            skill = {
                icon: skillIcon,
                cd: sk.SkillCD || '',
                desc: (sk.SimplyDescription || sk.DescriptionEx || '').replace(/<[^>]+>/g, ''),
                descFull: (sk.DescriptionEx || '').replace(/<[^>]+>/g, ''),
                params: params,
                damageList: damageList,
                hasDamageList: damageList.length > 0
            }
        }

        // 合鸣效果 — 使用 FetterDetails
        // 从列表数据构建合鸣图标映射
        const fetterIconMap = {}
        for (const g of (echo.FetterGroups || [])) {
            if (g.Name && g.Icon) fetterIconMap[g.Name] = this.getLocalIconUrl(g.Icon)
        }
        let fetterGroups = []
        if (detail.FetterDetails && Object.keys(detail.FetterDetails).length > 0) {
            for (const [name, fd] of Object.entries(detail.FetterDetails)) {
                const descriptions = (fd.EffectDescriptions || []).map((desc, i) => ({
                    key: (fd.EffectKeys || [])[i] || 0,
                    desc: (desc || '').replace(/<[^>]+>/g, '')
                }))
                const defineDescriptions = (fd.DefineDescriptions || []).map(d =>
                    (d || '').replace(/<[^>]+>/g, '')).filter(d => d && d !== '???')
                fetterGroups.push({
                    name: name,
                    icon: fetterIconMap[name] || '',
                    descriptions: descriptions,
                    defineDescriptions: defineDescriptions,
                    hasDefine: defineDescriptions.length > 0
                })
            }
        } else if (detail.FetterGroupDetails && detail.FetterGroupDetails.length > 0) {
            fetterGroups = detail.FetterGroupDetails.map(g => ({
                name: g.Group?.FetterGroupName || '',
                icon: fetterIconMap[g.Group?.FetterGroupName] || '',
                descriptions: [{
                    key: 0,
                    desc: (g.Fetter?.EffectDescription || g.Fetter?.SimplyEffectDesc || '').replace(/<[^>]+>/g, '')
                }],
                defineDescriptions: [],
                hasDefine: false
            }))
        } else if (echo.FetterGroups) {
            fetterGroups = echo.FetterGroups.map(g => {
                const descriptions = (g.Fetters || []).map(f => ({
                    key: f.Key || 0,
                    desc: (f.EffectDescription || '').replace(/<[^>]+>/g, '')
                }))
                return { name: g.Name || '', icon: this.getLocalIconUrl(g.Icon || ''), descriptions, defineDescriptions: [], hasDefine: false }
            })
        }

        // meta 标签
        const meta = []
        if (elementName) meta.push({ txt: elementName, cls: 'element' })
        if (detail.Rarity !== undefined) meta.push({ txt: `稀有度: ${detail.Rarity}`, cls: '' })

        // 主属性
        const mainProp = detail.MainProp || null

        return {
            iconUrl,
            elementIcon,
            elementName,
            name: echo.Name || '',
            qualityId: q,
            qualityName: detail.QualityName || '',
            star: stars[q] || '',
            rarity: detail.Rarity !== undefined ? detail.Rarity : '',
            meta,
            handbook,
            skill,
            fetterGroups,
            mainProp,
            saveId: `echo_${detail.ItemId || echo.Id}`
        }
    }

    async echoList(e) {
        const data = this.getEchoData()
        if (!data || !Array.isArray(data)) return e.reply('声骸数据未下载，请先使用 ~下载encore资源')

        // 域名修正
        const fixUrl = (url) => {
            if (!url) return ''
            return url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/')
        }

        // 先建立全局 FetterGroup ID → {name, icon} 映射（从列表数据汇总）
        const idToGroup = {}
        for (const echo of data) {
            if (!echo) continue
            for (const g of (echo.FetterGroups || [])) {
                if (g.Id && g.Name && !idToGroup[g.Id]) {
                    idToGroup[g.Id] = { name: g.Name, icon: g.Icon || '' }
                }
            }
        }

        // 按合鸣分组 — 使用详情FetterGroup作为权威来源
        const groupMap = {}
        for (const echo of data) {
            if (!echo) continue
            let detail = readLocalDetail('echo', echo.Id)
            const iconUrl = (detail && detail.Icon) ? detail.Icon : (echo.Icon || echo.IconMiddle || '')

            // 确定该声骸属于哪些合鸣：优先用详情的FetterGroup ID数组，否则回退列表数据
            let groupIds = []
            if (detail && detail.FetterGroup && Array.isArray(detail.FetterGroup)) {
                groupIds = detail.FetterGroup
            } else {
                groupIds = (echo.FetterGroups || []).map(g => g.Id).filter(Boolean)
            }

            for (const gid of groupIds) {
                const grp = idToGroup[gid]
                if (!grp) continue
                if (!groupMap[grp.name]) {
                    groupMap[grp.name] = {
                        name: grp.name,
                        icon: grp.icon,
                        echos: []
                    }
                }
                groupMap[grp.name].echos.push({
                    id: echo.Id,
                    name: echo.Name || '',
                    icon: fixUrl(iconUrl),
                    elementIcon: fixUrl(echo.Element?.Icon || ''),
                    rarity: echo.Rarity || 0
                })
            }
        }

        // 按合鸣ID排序
        const sortedGroups = Object.values(groupMap).sort((a, b) => {
            // 用第一个echo的FetterGroup ID排序
            const aId = (data.find(e => e?.FetterGroups?.some(g => g.Name === a.name))?.FetterGroups || [])[0]?.Id || 99
            const bId = (data.find(e => e?.FetterGroups?.some(g => g.Name === b.name))?.FetterGroups || [])[0]?.Id || 99
            return aId - bId
        })

        for (const group of sortedGroups) {
            // API垃圾数据黑名单（列表API中部分声骸被错误归属到这些套装）
            const BLACKLIST = {
                '凝夜白霜': ['呜咔咔'],
                '彻空冥雷': ['巨布偶'],
                '熔山裂谷': ['巨布偶'],
                '浮星祛暗': ['寂寞小姐', '呜咔咔'],
                '隐世回光': ['异相·飞廉之猩'],
                '轻云出月': ['寂寞小姐'],
                '不绝余音': ['寂寞小姐'],
                '凌冽决断之心': ['布兰特', '椿', '菲比', '今汐', '卡卡罗', '卡提希娅', '坎特蕾拉', '珂莱塔', '洛可可', '守岸人', '异相·磐石守卫', '赞妮', '长离', '阿嗞嗞', '异相·寒霜陆龟'],
                '高天共奏之曲': ['朔雷之鳞', '异相·寒霜陆龟', '阿嗞嗞', '角'],
                '无惧浪涛之勇': ['无妄者', '角'],
                '此间永驻之光': ['奏谕乐师'],
                '幽夜隐匿之帷': ['咕咕河豚', '阿嗞嗞', '奏谕乐师']
            }
            const bl = BLACKLIST[group.name] || []

            // 去重 + 黑名单过滤
            const seen = new Set()
            group.echos = group.echos.filter(e => {
                if (bl.includes(e.name)) return false
                if (seen.has(e.name)) return false
                seen.add(e.name)
                return true
            })
            // 按Rarity降序再按名排序
            group.echos.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name, 'zh'))
            group.count = group.echos.length
            // 合鸣图标URL修正
            group.icon = fixUrl(group.icon)
        }

        const renderData = { groups: sortedGroups }
        const img = await Render.render('Template/encore/echo_info/list/echo_list', renderData, { e, retType: 'base64' })
        return e.reply(img, false)
    }

    async fetterQuery(e) {
        const keyword = (e.msg.match(this.rule[2].reg)?.[1] || '').trim()
        if (!keyword) return e.reply('请输入合鸣名称查询，如: ~合鸣查询 不绝余音')
        const data = this.getEchoData()
        if (!data || !Array.isArray(data)) return e.reply('声骸数据未下载，请先使用 ~下载encore资源')

        let targetId = null
        for (const echo of data) {
            if (!echo?.FetterGroups) continue
            for (const g of echo.FetterGroups) {
                if ((g.Name || '').toLowerCase().includes(keyword.toLowerCase())) {
                    targetId = echo.Id; break
                }
            }
            if (targetId) break
        }
        if (!targetId) return e.reply(`未找到与 "${keyword}" 相关的合鸣`)

        const detail = await this.fetchEchoDetail(targetId)
        if (!detail) return e.reply(`获取合鸣详情失败`)

        // 构建合鸣图标映射
        const fetterIconMap = {}
        for (const echo of data) {
            for (const g of (echo.FetterGroups || [])) {
                if (g.Name && g.Icon && !fetterIconMap[g.Name]) {
                    fetterIconMap[g.Name] = this.getLocalIconUrl(g.Icon)
                }
            }
        }

        const fixUrl = (url) => {
            if (!url) return ''
            return url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/')
        }

        let renderData = { name: keyword, icon: fetterIconMap[keyword] || '', descriptions: [], defineDescriptions: [], hasDefine: false, echoes: [] }

        // 使用 FetterDetails
        if (detail.FetterDetails && Object.keys(detail.FetterDetails).length > 0) {
            for (const [name, fd] of Object.entries(detail.FetterDetails)) {
                if (!name.includes(keyword) && !keyword.includes(name)) continue
                renderData.name = name
                renderData.icon = fetterIconMap[name] || ''
                renderData.descriptions = (fd.EffectDescriptions || []).map((desc, i) => ({
                    key: (fd.EffectKeys || [])[i] || 0,
                    desc: (desc || '').replace(/<[^>]+>/g, '')
                }))
                const defines = (fd.DefineDescriptions || []).map(d => (d || '').replace(/<[^>]+>/g, '')).filter(d => d && d !== '???')
                renderData.defineDescriptions = defines
                renderData.hasDefine = defines.length > 0
                break
            }
        } else if (detail.FetterGroupDetails) {
            for (const g of detail.FetterGroupDetails) {
                const gn = g.Group?.FetterGroupName || ''
                if (!gn.includes(keyword) && !keyword.includes(gn)) continue
                renderData.name = gn
                renderData.icon = fetterIconMap[gn] || ''
                renderData.descriptions = [{
                    key: 0,
                    desc: (g.Fetter?.EffectDescription || g.Fetter?.SimplyEffectDesc || '').replace(/<[^>]+>/g, '')
                }]
                break
            }
        }

        // 所属声骸
        const BLACKLIST = {
            '凝夜白霜': ['呜咔咔'],
            '彻空冥雷': ['巨布偶'],
            '熔山裂谷': ['巨布偶'],
            '浮星祛暗': ['寂寞小姐', '呜咔咔'],
            '隐世回光': ['异相·飞廉之猩'],
            '轻云出月': ['寂寞小姐'],
            '不绝余音': ['寂寞小姐'],
            '凌冽决断之心': ['布兰特', '椿', '菲比', '今汐', '卡卡罗', '卡提希娅', '坎特蕾拉', '珂莱塔', '洛可可', '守岸人', '异相·磐石守卫', '赞妮', '长离', '阿嗞嗞', '异相·寒霜陆龟'],
            '高天共奏之曲': ['朔雷之鳞', '异相·寒霜陆龟', '阿嗞嗞', '角'],
            '无惧浪涛之勇': ['无妄者', '角'],
            '此间永驻之光': ['奏谕乐师'],
            '幽夜隐匿之帷': ['咕咕河豚', '阿嗞嗞', '奏谕乐师']
        }
        // 找到匹配的合鸣名来查黑名单
        const bl = BLACKLIST[renderData.name] || []

        const rel = data.filter(e => e?.FetterGroups?.some(g => (g.Name || '').toLowerCase().includes(keyword.toLowerCase())))
        const seen = new Set()
        renderData.echoes = rel
            .filter(e => !bl.includes(e.Name || ''))
            .filter(e => {
                if (seen.has(e.Name)) return false
                seen.add(e.Name)
                return true
            })
            .map(e => ({
                name: e.Name || '',
                icon: fixUrl(readLocalDetail('echo', e.Id)?.Icon || e.Icon || e.IconMiddle || ''),
                elementIcon: fixUrl(e.Element?.Icon || '')
            }))

        const img = await Render.render('Template/encore/echo_info/fetter/echo_fetter', renderData, { e, retType: 'base64' })
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

    async downloadEchoIcons(e) {
        if (!e.isMaster) return e.reply('仅主人可使用此命令')
        const data = this.getEchoData()
        if (!data || !Array.isArray(data)) return e.reply('声骸数据未下载，请先使用 ~下载encore资源')

        if (!fs.existsSync(ICON_DIR)) fs.mkdirSync(ICON_DIR, { recursive: true })

        await e.reply(`开始下载声骸图标，共 ${data.length} 个…`)
        let ok = 0, skip = 0, fail = 0
        const total = data.length

        for (let i = 0; i < total; i++) {
            const echo = data[i]
            if (!echo) continue

            const detail = await this.fetchEchoDetail(echo.Id)
            if (!detail) { fail++; continue }

            const urls = new Set()
            const addUrl = (url) => {
                if (url && typeof url === 'string' && url.startsWith('http')) {
                    urls.add(url.replace(/\.png$/i, '.webp').replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/'))
                }
            }
            addUrl(detail.Icon)
            addUrl(detail.IconMiddle)
            addUrl(detail.IconSmall)
            addUrl(detail.ElementIcon)
            addUrl(detail.Element?.Icon)
            addUrl(detail.Skill?.BattleViewIcon)

            if (urls.size === 0) { skip++; continue }

            let downloaded = 0
            for (const iconUrl of urls) {
                if (await this.downloadIcon(iconUrl, ICON_DIR)) downloaded++
            }
            if (downloaded > 0) ok++
            else fail++
        }

        await e.reply(`声骸图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }
}