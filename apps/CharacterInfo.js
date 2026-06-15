import plugin from '../../../lib/plugins/plugin.js'
import Render from '../components/Render.js'
import fs from 'fs'
import path from 'path'
import { pluginResources } from '../model/path.js'
import { readLocalData, readLocalDetail, saveLocalDetail } from './EncoreSync.js'
import Wiki from '../components/Wiki.js'

const CHAR_ICON_DIR = path.join(pluginResources, 'data', 'encore', 'details', 'character', 'icon')

/** 角色信息查询 — 渲染图片卡片 */
export class CharacterInfo extends plugin {
    constructor() {
        super({
            name: '鸣潮-角色信息查询(Encore)',
            event: 'message',
            priority: 1007,
            rule: [
                {
                    reg: '^(?:～|~|鸣潮)?(?:角色查询|角色搜索|查角色)\\s*(.+)?$',
                    fnc: 'characterQuery'
                },
                {
                    reg: '^(?:～|~|鸣潮)?角色列表$',
                    fnc: 'characterList'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载角色encore$',
                    fnc: 'downloadCharIcons'
                },
                {
                    reg: '^(?:～|~|鸣潮)?(.+)en查询$',
                    fnc: 'encoreQuery'
                }
            ]
        })
    }

    getCharacterData() { return readLocalData('character') }

    async fetchCharacterDetail(id) {
        let data = readLocalDetail('character', id)
        if (data) return data
        const cacheKey = `Yunzai:waves:charDetail:${id}`
        let cached = await redis.get(cacheKey)
        if (cached) {
            try { data = JSON.parse(cached); saveLocalDetail('character', id, data); return data } catch {}
        }
        try {
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/character/${id}`, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            data = await res.json()
            saveLocalDetail('character', id, data)
            await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 })
            return data
        } catch (e) { console.error(`[CharacterInfo] 获取 ${id} 详情失败:`, e); return null }
    }

    async characterQuery(e) {
        const keyword = (e.msg.match(this.rule[0].reg)?.[1] || '').trim()
        if (!keyword) return e.reply('请输入角色名称查询，如: ~角色查询 今汐')

        const data = this.getCharacterData()
        if (!data || !Array.isArray(data)) return e.reply('角色数据未下载，请先使用 ~下载encore资源')

        // 别名解析 — 使用 Wiki.getAlias()（与面板功能共用同一套别名系统）
        const wiki = new Wiki()
        const resolved = (await wiki.getAlias(keyword)) || keyword
        const kw = keyword.toLowerCase()
        const resolvedKw = resolved.toLowerCase()

        // 搜索 — 别名命中用官方名精确匹配，否则回退模糊匹配
        let results = []
        if (resolved !== keyword) {
            // 别名命中 → 用解析后的官方名匹配
            results = data.filter(c => c && (c.Name || '').toLowerCase().includes(resolvedKw))
            if (results.length === 0) {
                // 精确匹配失败 → 回退模糊匹配
                results = data.filter(c => c && ((c.Name || '').toLowerCase().includes(kw)
                    || String(c.Id) === kw || (c.Element?.Name || '').toLowerCase().includes(kw)
                    || (c.WeaponType?.Name || '').toLowerCase().includes(kw)))
            }
        } else {
            // 无别名 → 原模糊匹配
            results = data.filter(c => c && ((c.Name || '').toLowerCase().includes(kw) || String(c.Id) === kw
                || (c.Element?.Name || '').toLowerCase().includes(kw) || (c.WeaponType?.Name || '').toLowerCase().includes(kw)))
        }

        if (!results || results.length === 0) return e.reply(`未找到与 "${keyword}" 相关的角色`)
        if (results.length > 5) {
            const names = results.map(c => `${c.Name}(${c.Element?.Name || ''}·${c.WeaponType?.Name || ''})`).join('\n')
            return e.reply(`找到 ${results.length} 个角色:\n${names}\n\n请输入更精确的名称查询详情`)
        }

        const detail = await this.fetchCharacterDetail(results[0].Id)
        if (!detail) return e.reply(`获取角色 ${results[0].Name} 详情失败`)

        const renderData = this.buildRenderData(detail)
        const img = await Render.render('Template/encore/character/character', renderData, { e, retType: 'base64' })
        return e.reply(img, false)
    }

    /** 统一encore查询 — ~xxxen查询，先查角色再查武器 */
    async encoreQuery(e) {
        const keyword = (e.msg.match(this.rule[3].reg)?.[1] || '').trim()
        if (!keyword) return e.reply('请输入名称查询，如: ~今汐en查询 或 ~存帧en查询')

        const wiki = new Wiki()
        const resolved = (await wiki.getAlias(keyword)) || keyword
        const kw = resolved.toLowerCase()

        // 1. 先查角色
        const charData = readLocalData('character')
        if (charData && Array.isArray(charData)) {
            const chars = charData.filter(c => c && (c.Name || '').toLowerCase().includes(kw))
            if (chars.length === 1) {
                const detail = await this.fetchCharacterDetail(chars[0].Id)
                if (detail) {
                    const renderData = this.buildRenderData(detail)
                    const img = await Render.render('Template/encore/character/character', renderData, { e, retType: 'base64' })
                    return e.reply(img, false)
                }
            }
        }

        // 2. 再查武器
        const weaponData = readLocalData('weapon')
        if (weaponData && Array.isArray(weaponData)) {
            const weapons = weaponData.filter(w => w && (w.Name || '').toLowerCase().includes(kw))
            if (weapons.length === 1) {
                const detail = await this._fetchWeaponDetail(weapons[0].Id)
                if (detail) {
                    const renderData = this._buildWeaponData(detail)
                    const img = await Render.render('Template/encore/weapon/weapon', renderData, { e, retType: 'base64' })
                    return e.reply(img, false)
                }
            }
        }

        // 3. 查名片
        const namecardData = readLocalData('namecard')
        if (namecardData && Array.isArray(namecardData)) {
            const cards = namecardData.filter(n => n && (n.Name || '').toLowerCase().includes(kw))
            if (cards.length === 1) {
                const detail = await this._fetchNamecardDetail(cards[0].Id)
                if (detail) {
                    const renderData = this._buildNamecardData(detail)
                    const img = await Render.render('Template/encore/namecard/namecard', { namecard: renderData }, { e, retType: 'base64' })
                    return e.reply(img, false)
                }
            }
        }

        // 4. 查称号
        const titleData = readLocalData('title')
        if (titleData && Array.isArray(titleData)) {
            const titles = titleData.filter(t => t && (t.TitleName || '').toLowerCase().includes(kw))
            if (titles.length === 1) {
                const detail = await this._fetchTitleDetail(titles[0].Id)
                if (detail) {
                    const renderData = this._buildTitleData(detail)
                    const img = await Render.render('Template/encore/title/title', { title: renderData }, { e, retType: 'base64' })
                    return e.reply(img, false)
                }
            }
        }

        return e.reply(`未找到与 "${keyword}" 相关的角色、武器、名片或称号`)
    }

    /** 获取武器详情（复用encore API） */
    async _fetchWeaponDetail(id) {
        let data = readLocalDetail('weapon', id)
        if (data) return data
        const cacheKey = `Yunzai:waves:weaponDetail:${id}`
        try {
            let cached = await redis.get(cacheKey)
            if (cached) { data = JSON.parse(cached); if (data) return data }
        } catch (e) {}
        try {
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/weapon/${id}`)
            if (!res.ok) return null
            data = await res.json()
            saveLocalDetail('weapon', id, data)
            await redis.set(cacheKey, JSON.stringify(data), { EX: 86400 })
            return data
        } catch (e) { return null }
    }

    /** 构建武器渲染数据（精简版，复用 WeaponInfo.getWeaponIconUrl 逻辑） */
    _buildWeaponData(detail) {
        const stars = { 5: '★★★★★', 4: '★★★★', 3: '★★★', 2: '★★', 1: '★' }
        const q = detail.QualityId || 0
        const props = detail.Properties || []

        // 武器图标
        const wpIcon = this._getIconUrl(detail.Icon || '')
        // 武器类型图标
        const wpTypeIcon = this._getIconUrl(detail.TypeIcon || '')

        // 主属性
        let firstProp = { name: '', display: String(detail.FirstPropId?.Value || 0) }
        if (props.length >= 1 && props[0].GrowthValues?.length > 0) {
            const last = props[0].GrowthValues[props[0].GrowthValues.length - 1]
            firstProp = { name: props[0].Name || '', display: String(last.value || last.Value) }
        }

        // 副属性
        let secondProp = null
        if (props.length >= 2 && props[1].GrowthValues?.length > 0) {
            const last = props[1].GrowthValues[props[1].GrowthValues.length - 1]
            const val = last.value || last.Value
            secondProp = { name: props[1].Name || '', display: String(val) }
        }

        // 谐振技能
        let resonDesc = detail.Desc || ''
        resonDesc = resonDesc.replace(/<span[^>]*>([^<]+)<\/span>/g, (m, content) => {
            const parts = content.split('/')
            return parts.length > 1 && parts.every(p => p === parts[0])
                ? `<span style="color:#ffd12f;">${parts[0]}</span>` : m
        })

        return {
            wpIcon, wpName: detail.WeaponName || detail.Name || '',
            wpTypeIcon, wpTypeName: detail.WeaponTypeName || '',
            wpQualityName: detail.QualityName || '', star: stars[q] || '',
            qualityId: q, qualityColor: this._qualityColor(q),
            firstProp, secondProp,
            resonName: detail.ResonName || '', resonDesc,
            bgDesc: (detail.BgDescription || '').slice(0, 200),
            saveId: `weapon_${detail.ItemId || detail.Id}`
        }
    }

    /** 获取名片详情 */
    async _fetchNamecardDetail(id) {
        let data = readLocalDetail('namecard', id)
        if (data) return data
        try {
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/namecard/${id}`)
            if (!res.ok) return null
            data = await res.json()
            saveLocalDetail('namecard', id, data)
            return data
        } catch (e) { return null }
    }

    /** 获取称号详情 */
    async _fetchTitleDetail(id) {
        let data = readLocalDetail('title', id)
        if (data) return data
        try {
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/title/${id}`)
            if (!res.ok) return null
            data = await res.json()
            saveLocalDetail('title', id, data)
            return data
        } catch (e) { return null }
    }

    /** 构建名片渲染数据 */
    _buildNamecardData(detail) {
        const stars = { 5: '★★★★★', 4: '★★★★', 3: '★★★', 2: '★★', 1: '★' }
        const q = detail.QualityId || 0
        const cardImg = detail.CardPath ? this._getIconUrl(detail.CardPath) : ''
        const longCardImg = detail.LongCardPath ? this._getIconUrl(detail.LongCardPath) : ''
        return {
            id: detail.Id,
            name: detail.Title || detail.Name || '',
            qualityName: detail.QualityName || '',
            star: stars[q] || '',
            qualityId: q,
            typeName: detail.TypeDescription || '',
            cardImg: cardImg || this._getIconUrl(detail.Icon || ''),
            longCardImg: longCardImg || cardImg,
            desc: detail.AttributesDescription || '',
            bgDesc: (detail.BgDescription || '').replace(/^\?+$/, '') || '',
            tips: detail.Tips || '',
            accessDescriptions: (detail.AccessDescriptions || []).filter(d => d && d !== '???'),
            saveId: `namecard_${detail.Id}`
        }
    }

    /** 构建称号渲染数据 */
    _buildTitleData(detail) {
        const titleTypeMap = { 1: '角色称号', 2: '活动称号', 3: '赛季称号', 4: '成就称号', 5: '特殊称号' }
        return {
            id: detail.Id,
            name: detail.TitleName || '',
            titleType: detail.TitleType || 0,
            titleTypeName: titleTypeMap[detail.TitleType] || '',
            titleQuality: detail.TitleQuality || 0,
            image: this._getIconUrl(detail.Image || ''),
            roleHeadIcon: this._getIconUrl(detail.RoleHeadIcon || ''),
            femaleRoleHeadIcon: this._getIconUrl(detail.FemaleRoleHeadIcon || ''),
            decorateLeftIcon: this._getIconUrl(detail.DecorateLeftIcon || ''),
            decorateRightIcon: this._getIconUrl(detail.DecorateRightIcon || ''),
            titleBgIcon: this._getIconUrl(detail.TitleBgIcon || ''),
            selectedIcon: this._getIconUrl(detail.SelectedIcon || ''),
            iconInTitleInfo: this._getIconUrl(detail.IconInTitleInfo || ''),
            description: detail.Description || '',
            honorDescription: detail.HonorDescription || '',
            itemAccess: (detail.ItemAccess || '').replace(/\s*（当前已激活.+链）/, '').trim(),
            saveId: `title_${detail.Id}`
        }
    }

    /** 图标URL — 本地优先，武器/角色图标目录均可，支持完整HTTP URL */
    _getIconUrl(iconPath) {
        if (!iconPath) return ''
        // 完整HTTP URL — 本地优先，否则直接返回（修正域名和扩展名）
        if (iconPath.startsWith('http')) {
            let url = iconPath.replace(/\.png$/i, '.webp')
            url = url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/')
            try {
                const filename = path.basename(new URL(url).pathname)
                const dirs = ['weapon', 'character', 'namecard', 'title']
                for (const dir of dirs) {
                    const p = path.join(pluginResources, 'data', 'encore', 'details', dir, 'icon', filename)
                    if (fs.existsSync(p)) return `file://${p}`
                }
            } catch (e) {}
            return url
        }
        const lastSlash = iconPath.lastIndexOf('/')
        const rawName = lastSlash >= 0 ? iconPath.slice(lastSlash + 1) : iconPath
        const dotIdx = rawName.lastIndexOf('.')
        const filename = dotIdx > 0 ? rawName.substring(0, dotIdx) : rawName
        if (!filename) return ''
        // 查武器/角色/名片/称号目录
        const dirs = ['weapon', 'character', 'namecard', 'title']
        for (const dir of dirs) {
            const p = path.join(pluginResources, 'data', 'encore', 'details', dir, 'icon', `${filename}.webp`)
            if (fs.existsSync(p)) return `file://${p}`
        }
        return `https://api-v2.encore.moe/resource/Data${iconPath.replace(/\.([^./]+)$/, '.webp')}`
    }

    /** 格式化单个属性值 — 只展示90级满级数值 */
    formatPropValue(name, baseValue, growthValues) {
        const maxG = growthValues && growthValues.length > 0
            ? growthValues[growthValues.length - 1] : null
        const maxRaw = maxG ? (maxG.value || maxG.Value) : baseValue

        // 百分比字符串直接返回
        if (typeof maxRaw === 'string' && maxRaw.includes('%')) return maxRaw

        const num = Number(maxRaw) || 0

        // 内部点数格式：暴击=500→5%, 暴伤=15000→150%, 谐度=10000→100%
        const pctProps = ['暴击', '暴击伤害', '共鸣效率']
        if (pctProps.includes(name)) return (num / 100).toFixed(1) + '%'

        // 普通数值属性
        return Math.round(num).toString()
    }

    /** 清理HTML标签，保留纯文本和换行 */
    stripHtml(html) {
        if (!html) return ''
        return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\n{3,}/g, '\n\n').trim()
    }

    /** 处理技能描述HTML — 保留颜色span和换行，移除其余标签 */
    processSkillDesc(html) {
        if (!html) return ''
        let text = html
        // 清理无效标签：<size=N> </span> 对 和 孤立 <size>
        text = text.replace(/<size=\d+>\s*<\/span>/gi, '')
        text = text.replace(/<size=\d+>/gi, '')
        // 保护需要保留的标签：color span、</span>、<br>
        text = text.replace(/<span\s[^>]*?\bcolor:\s*([a-zA-Z]+|#[a-fA-F0-9]{3,8})[^>]*>/gi, '{{{COLOR:$1}}}')
        text = text.replace(/<\/span>/gi, '{{{/COLOR}}}')
        text = text.replace(/<br\s*\/?>/gi, '{{{BR}}}')
        // 移除其余所有HTML标签（<te>, <size>, 多余</span>等）
        text = text.replace(/<[^>]+>/g, '')
        // 还原保护的标签
        text = text.replace(/\{\{\{COLOR:([^}]+)\}\}\}/gi, '<span style="color:$1">')
        text = text.replace(/\{\{\{\/COLOR\}\}\}/gi, '</span>')
        text = text.replace(/\{\{\{BR\}\}\}/gi, '<br>')
        // 清理多余</span>和空白
        text = text.replace(/(<\/span>\s*)+<\/span>/gi, '</span>')
        text = text.replace(/(<br>\s*){3,}/gi, '<br><br>').trim()
        return text
    }

    /** 提取技能数据 — 使用 SkillAttributes，只显示 Lv6-10 倍率表格 */
    buildSkills(skillsData) {
        if (!skillsData || !Array.isArray(skillsData)) return []
        const excludeTypes = ['谐度破坏']
        const excludeNames = ['dnt/1']
        const levelHeaders = ['Lv 6', 'Lv 7', 'Lv 8', 'Lv 9', 'Lv 10']

        return skillsData
            .filter(s => s.SkillName && !excludeNames.includes(s.SkillName) && !excludeTypes.includes(s.SkillType))
            .map(s => {
                // 使用 SkillAttributes 而非 DamageList
                const attrs = (s.SkillAttributes || [])
                    .filter(a => a.values && a.values.length >= 10)
                    .map(a => ({
                        name: a.attributeName || '',
                        values: (a.values || []).slice(5, 10)  // Lv6-10
                    }))

                return {
                    type: s.SkillType || '',
                    name: s.SkillName || '',
                    desc: this.processSkillDesc(s.SkillDescribe || ''),
                    icon: this.getLocalCharIcon(s.Icon || ''),
                    attributes: attrs,
                    levels: levelHeaders,
                    hasTable: attrs.length > 0
                }
            })
    }

    /** 提取共鸣链数据 */
    buildResonantChain(rcData) {
        if (!rcData || !Array.isArray(rcData)) return []
        return rcData.map(r => ({
            index: r.GroupIndex || 0,
            name: r.NodeName || '',
            desc: this.processSkillDesc(r.AttributesDescription || ''),
            icon: this.getLocalCharIcon((r.NodeIcon || '').replace(/^\/Game\/Aki\//, 'https://api.encore.moe/resource/Data/Game/Aki/'))
        }))
    }

    /** 提取核心机制数据 — 特殊能量 + 招式说明 */
    buildCoreMechanics(skillInputsData) {
        if (!skillInputsData || !Array.isArray(skillInputsData) || skillInputsData.length === 0) {
            return {
                features: [],
                energyItems: [],
                inputDetails: [],
                hasData: false
            }
        }
        const si = skillInputsData[0]

        // 角色特点 — 从 SkillDescList 提取
        const features = (si.SkillDescList || []).map(d => {
            if (typeof d === 'string') return this.processSkillDesc(d)
            return ''
        }).filter(Boolean)

        // 特殊能量 — 图标与描述一一配对
        const energyDescs = (si.DescList || []).map(d => {
            if (typeof d === 'string') return this.processSkillDesc(d)
            return ''
        }).filter(Boolean)
        const energyIcons = (si.IconList || [])
            .filter(Boolean)
            .map(url => this.getLocalCharIcon(url))
        const energyItems = []
        const maxLen = Math.max(energyDescs.length, energyIcons.length)
        for (let i = 0; i < maxLen; i++) {
            energyItems.push({
                icon: energyIcons[i] || '',
                desc: energyDescs[i] || ''
            })
        }

        // 招式说明 — 将 img 标签按 alt 匹配替换为本地按键图标
        const inputDetails = (si.InputDetails || []).map(inp => {
            // 构建 alt → 按键图标映射
            const keyMap = {}
            const mappings = inp.mappings
            if (Array.isArray(mappings)) {
                for (const m of mappings) {
                    const kds = m.keyDetails
                    if (Array.isArray(kds)) {
                        for (const kd of kds) {
                            const rawUrl = kd.keyIconPath || ''
                            const fixedUrl = rawUrl.replace(/^https:\/\/api\.encore\.moe\/resource\//, 'https://api-v2.encore.moe/resource/')
                            const iconSrc = this.getLocalCharIcon(fixedUrl)
                            const altName = kd.keyName || kd.keyDisplayName || ''
                            if (iconSrc && altName && !keyMap[altName]) {
                                keyMap[altName] = `<img src="${iconSrc}" class="key-icon" alt="${kd.keyDisplayName || altName}">`
                            }
                        }
                    }
                }
            }
            // 替换原始 img：提取 alt → 查 keyMap → 替换，同时用占位符保护
            let desc = inp.description || ''
            const replacements = []
            desc = desc.replace(/<img\s[^>]*?\balt="([^"]*)"[^>]*?\/?>/gi, (m, alt) => {
                const keyImg = keyMap[alt]
                if (keyImg) {
                    replacements.push(keyImg)
                    return '\x00KEYIMG' + (replacements.length - 1) + '\x00'
                }
                return m
            })
            desc = this.processSkillDesc(desc)
            desc = desc.replace(/\x00KEYIMG(\d+)\x00/g, (m, idx) => replacements[parseInt(idx)] || '')
            return {
                inputId: inp.inputId || 0,
                desc: desc
            }
        })

        return {
            features,
            energyItems,
            inputDetails,
            hasData: features.length > 0 || energyItems.length > 0 || inputDetails.length > 0
        }
    }

    /** 辅助方法 — 添加URL到集合 */
    _addUrl(urls, url) {
        if (url && typeof url === 'string' && url.startsWith('http')) urls.add(url)
    }

    /** 图标URL — 本地文件优先，否则用原始URL */
    getLocalCharIcon(url) {
        if (!url) return ''
        try {
            const u = new URL(url)
            const filename = path.basename(u.pathname)
            const localPath = path.join(CHAR_ICON_DIR, filename)
            if (fs.existsSync(localPath)) return `file://${localPath}`
        } catch (e) {}
        return url
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

    _qualityColor(qualityId) {
        const m = { 5: '#ffd700', 4: '#a080c0', 3: '#5898b8', 2: '#6b8e6b', 1: '#888' }
        return m[qualityId] || '#888'
    }

    buildRenderData(detail) {
        const stars = { 5: '★★★★★', 4: '★★★★', 3: '★★★', 2: '★★', 1: '★' }
        const q = detail.QualityId || 0

        // Name 字段可能是对象 {Title, Content} 或纯字符串
        const charName = typeof detail.Name === 'object' && detail.Name
            ? (detail.Name.Content || '')
            : (detail.Name || '')

        // 属性 — 只展示90级满级值，无Lv标签
        let properties = []
        if (detail.Properties && Array.isArray(detail.Properties)) {
            properties = detail.Properties.map(p => ({
                Name: p.Name,
                Icon: this.getLocalCharIcon(p.Icon),
                display: this.formatPropValue(p.Name, p.BaseValue || 0, p.GrowthValues || [])
            }))
        }

        // 简介
        const intro = detail.Introduction && detail.Introduction.Content
            ? detail.Introduction.Content.replace(/<[^>]+>/g, '') : ''

        // 皮肤 — 使用 FormationRoleCard 全身图
        const skins = (detail.Skins || []).map(s => ({
            Name: s.Name,
            SubDecName: s.SubDecName || '',
            avatar: this.getLocalCharIcon(s.FormationRoleCard || s.RoleHeadIconLarge || ''),
            bgDesc: this.stripHtml(s.BgDescription || '')
        }))

        // 技能 — 提取技能详情
        const skills = this.buildSkills(detail.Skills || [])

        // 共鸣链 — 提取共鸣链数据
        const resonantChain = this.buildResonantChain(detail.ResonantChain || [])

        // 核心机制 — 角色特点 + 特殊能量 + 招式说明
        const coreMechanics = this.buildCoreMechanics(detail.SkillInputs || [])

        // 角色身份信息 — favorRole
        const fr = detail.favorRole || {}
        const infoFields = []
        if (fr.Birthday && fr.Birthday.Content) infoFields.push({ label: '生日', value: fr.Birthday.Content.replace(/<[^>]+>/g, '') })
        if (fr.Country && fr.Country.Content) infoFields.push({ label: '出生', value: fr.Country.Content.replace(/<[^>]+>/g, '') })
        if (fr.Influence && fr.Influence.Content) infoFields.push({ label: '势力', value: fr.Influence.Content.replace(/<[^>]+>/g, '') })
        const sex = (fr.Sex && fr.Sex.Content) ? fr.Sex.Content : ''

        return {
            charId: detail.Id || '',
            charName,
            charAvatar: this.getLocalCharIcon(detail.RoleHeadIconLarge || detail.RoleHeadIcon || ''),
            charElementName: detail.ElementName || '',
            charElementIcon: this.getLocalCharIcon(detail.ElementIcon || ''),
            charWeaponTypeName: detail.WeaponTypeName || '',
            charWeaponTypeIcon: this.getLocalCharIcon(detail.WeaponTypeIcon || ''),
            charQualityName: detail.QualityName || '',
            star: stars[q] || '',
            charBorderColor: this._qualityColor(q),
            introduction: intro,
            tags: detail.Tags || [],
            properties,
            infoFields,
            sex,
            maxLevel: detail.MaxLevel || 90,
            skins: skins,
            skills: skills,
            resonantChain: resonantChain,
            coreMechanics: coreMechanics,
            saveId: `char_${detail.Id}`
        }
    }

    async downloadCharIcons(e) {
        if (!e.isMaster) return e.reply('仅主人可使用此命令')
        const data = this.getCharacterData()
        if (!data || !Array.isArray(data)) return e.reply('角色数据未下载，请先使用 ~下载encore资源')

        if (!fs.existsSync(CHAR_ICON_DIR)) fs.mkdirSync(CHAR_ICON_DIR, { recursive: true })

        const est = Math.ceil(data.length * 2.5) // 每个约需2.5秒
        const estStr = est > 60 ? `预计 ${Math.ceil(est / 60)} 分钟` : `预计 ${est} 秒`
        await e.reply(`开始下载角色图标（${estStr}），共 ${data.length} 个…`)
        let ok = 0, skip = 0, fail = 0
        const total = data.length

        for (let i = 0; i < total; i++) {
            const c = data[i]
            if (!c) continue

            const detail = await this.fetchCharacterDetail(c.Id)
            if (!detail) { fail++; continue }

            const urls = new Set()
            // 详情API图标
            this._addUrl(urls, detail.RoleHeadIconLarge || detail.RoleHeadIcon)
            this._addUrl(urls, detail.ElementIcon)
            this._addUrl(urls, detail.WeaponTypeIcon)

            // 列表API图标（~角色列表使用）
            this._addUrl(urls, c.RoleHeadIcon)  // 列表头像
            this._addUrl(urls, c.RoleHeadIconLarge) // 列表大头像
            // 列表元素图标 — UE路径转HTTP
            if (c.Element && c.Element.Icon) {
                const elemHttp = `https://api-v2.encore.moe/resource/Data/Game/Aki/${c.Element.Icon.replace(/^\/Game\/Aki\//, '')}.webp`
                this._addUrl(urls, elemHttp)
            }

            const props = detail.Properties
            if (Array.isArray(props)) props.forEach(p => this._addUrl(urls, p.Icon))

            const skills = detail.Skills
            if (Array.isArray(skills)) skills.forEach(s => this._addUrl(urls, s.Icon))

            const rc = detail.ResonantChain
            if (Array.isArray(rc)) rc.forEach(r => {
                if (r.NodeIcon) this._addUrl(urls, r.NodeIcon.replace(/^\/Game\/Aki\//, 'https://api.encore.moe/resource/Data/Game/Aki/'))
            })

            const skins = detail.Skins
            if (Array.isArray(skins)) skins.forEach(s => {
                this._addUrl(urls, s.FormationRoleCard || s.RoleHeadIconLarge)
            })

            const siList = detail.SkillInputs
            if (Array.isArray(siList) && siList.length > 0) {
                const si = siList[0]
                this._addUrl(urls, si.Icon)
                const iconList = si.IconList
                if (Array.isArray(iconList)) iconList.forEach(icon => this._addUrl(urls, icon))
                const inputDetails = si.InputDetails
                if (Array.isArray(inputDetails)) {
                    for (const inp of inputDetails) {
                        const desc = inp.description || ''
                        const imgRe = /<img\s[^>]*?src="([^"]+)"[^>]*?>/gi
                        let m
                        while ((m = imgRe.exec(desc)) !== null) {
                            const src = m[1].replace(/https:\/\/api\.encore\.moe\/resource\//, 'https://api-v2.encore.moe/resource/')
                            this._addUrl(urls, src)
                        }
                        const mappings = inp.mappings
                        if (Array.isArray(mappings)) {
                            for (const map of mappings) {
                                const kds = map.keyDetails
                                if (Array.isArray(kds)) kds.forEach(kd => {
                                    const rawUrl = kd.keyIconPath || ''
                                    const fixedUrl = rawUrl.replace(/^https:\/\/api\.encore\.moe\/resource\//, 'https://api-v2.encore.moe/resource/')
                                    this._addUrl(urls, fixedUrl)
                                })
                            }
                        }
                    }
                }
            }

            let downloaded = 0
            for (const url of urls) {
                if (await this.downloadIcon(url, CHAR_ICON_DIR)) downloaded++
            }
            if (downloaded > 0) ok++
            else skip++
        }

        await e.reply(`角色图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }

    async characterList(e) {
        const data = this.getCharacterData()
        if (!data || !Array.isArray(data)) return e.reply('角色数据未下载，请先使用 ~下载encore资源')

        const qMap = { 5: '★★★★★', 4: '★★★★', 3: '★★★', 2: '★★', 1: '★' }
        // 品质对应的底部色条颜色
        const qualityColors = { 5: '#ffd700', 4: '#a080c0', 3: '#5898b8', 2: '#6b8e6b', 1: '#888' }

        const list = []
        for (const c of data) {
            if (!c) continue
            const q = c.QualityId || 0
            const elemIconPath = c.Element?.Icon || ''
            const elemIconUrl = elemIconPath
                ? `https://api-v2.encore.moe/resource/Data/Game/Aki/${elemIconPath.replace(/^\/Game\/Aki\//, '')}.webp`
                : ''
            // 列表直接使用原始URL，不走本地缓存（头像数量多，file:// 在 puppeteer 中不可靠）
            const avatarUrl = (c.RoleHeadIcon || '').replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/')
            list.push({
                id: c.Id,
                name: c.Name || '',
                avatar: avatarUrl,
                elementIcon: elemIconUrl,
                qualityColor: qualityColors[q] || '#888',
                quality: q
            })
        }

        // 按品质降序，同品质按名称排序
        list.sort((a, b) => b.quality - a.quality || a.name.localeCompare(b.name, 'zh'))

        const renderData = { list }
        const img = await Render.render('Template/encore/character/list/character_list', renderData, { e, retType: 'base64' })
        return e.reply(img, false)
    }
}