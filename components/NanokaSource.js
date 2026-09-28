import fs from 'fs'
import path from 'path'
import { pluginResources } from '../model/path.js'
import Config from './Config.js'


const BASE = 'https://static.nanoka.cc'
const DATA_DIR = path.join(pluginResources, 'data', 'nanoka')
const DETAIL_DIR = path.join(DATA_DIR, 'details')
const ENCORE_DETAIL_DIR = path.join(pluginResources, 'data', 'encore', 'details')

export const SUPPORTED = ['character', 'weapon', 'echo', 'monster']
export const MODES = ['toa', 'whiwa', 'dpmatrix']
export const ALL = [...SUPPORTED, ...MODES]

const LIST_FILE = { character: 'character', weapon: 'weapon', echo: 'echo', monster: 'monster', sonata: 'sonata', toa: 'tower', whiwa: 'slash', dpmatrix: 'newtower' }
const RAW_SUB = { toa: 'tower', whiwa: 'slash', dpmatrix: 'newtower' }

export function rawSub(type) { return RAW_SUB[type] || type }

const ELEMENTS = {
    0: { name: '物理', normal: '/Game/Aki/UI/UIResources/Common/Image/IconElement/T_IconElementZero2.T_IconElementZero2', round: '/Game/Aki/UI/UIResources/Common/Image/IconElementRound/T_IconElementZero1_UI.T_IconElementZero1_UI' },
    1: { name: '冷凝', normal: '/Game/Aki/UI/UIResources/Common/Image/IconElement/T_IconElementIce2.T_IconElementIce2', round: '/Game/Aki/UI/UIResources/Common/Image/IconElementRound/T_IconElementIce1_UI.T_IconElementIce1_UI' },
    2: { name: '热熔', normal: '/Game/Aki/UI/UIResources/Common/Image/IconElement/T_IconElementFire2.T_IconElementFire2', round: '/Game/Aki/UI/UIResources/Common/Image/IconElementRound/T_IconElementFire1_UI.T_IconElementFire1_UI' },
    3: { name: '导电', normal: '/Game/Aki/UI/UIResources/Common/Image/IconElement/T_IconElementThunder2.T_IconElementThunder2', round: '/Game/Aki/UI/UIResources/Common/Image/IconElementRound/T_IconElementThunder1_UI.T_IconElementThunder1_UI' },
    4: { name: '气动', normal: '/Game/Aki/UI/UIResources/Common/Image/IconElement/T_IconElementWind2.T_IconElementWind2', round: '/Game/Aki/UI/UIResources/Common/Image/IconElementRound/T_IconElementWind1_UI.T_IconElementWind1_UI' },
    5: { name: '衍射', normal: '/Game/Aki/UI/UIResources/Common/Image/IconElement/T_IconElementLight2.T_IconElementLight2', round: '/Game/Aki/UI/UIResources/Common/Image/IconElementRound/T_IconElementLight1_UI.T_IconElementLight1_UI' },
    6: { name: '湮灭', normal: '/Game/Aki/UI/UIResources/Common/Image/IconElement/T_IconElementDark2.T_IconElementDark2', round: '/Game/Aki/UI/UIResources/Common/Image/IconElementRound/T_IconElementDark1_UI.T_IconElementDark1_UI' }
}

// 武器类型
const WEAPON_TYPES = {
    1: { name: '长刃', icon: '/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorSword' },
    2: { name: '迅刀', icon: '/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorKnife' },
    3: { name: '佩枪', icon: '/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorGun' },
    4: { name: '臂铠', icon: '/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorFist' },
    5: { name: '音感仪', icon: '/Game/Aki/UI/UIResources/Common/Atlas/SkillIcon/SkillIconNor/SP_IconNorMagic' }
}

const MONSTER_RARITY = { 1: '轻波级', 2: '巨浪级', 3: '怒涛级', 4: '海啸级' }


function readJSON(filePath) {
    if (!fs.existsSync(filePath)) return null
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { return null }
}

export function writeJSON(filePath, data) {
    if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8')
}

const DEFAULT_VERSION = '3.7.4'
const MANIFEST_TTL = 60 * 60 * 1000

let _manifest = null

export function manifestPath() { return path.join(DATA_DIR, 'manifest.json') }
export function metaPath() { return path.join(DATA_DIR, '_meta.json') }

export async function refreshManifest(force = false) {
    const p = manifestPath()
    if (!force) {
        if (_manifest) return _manifest
        try {
            if (fs.existsSync(p) && Date.now() - fs.statSync(p).mtimeMs < MANIFEST_TTL) {
                _manifest = JSON.parse(fs.readFileSync(p, 'utf-8'))
                return _manifest
            }
        } catch {}
    }
    try {
        const res = await fetch(`${BASE}/manifest.json`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (res.ok) {
            _manifest = await res.json()
            writeJSON(p, _manifest)
            return _manifest
        }
    } catch (e) {
        console.error('[NanokaSource] 获取 manifest 失败:', e.message)
    }
    return _manifest
}

function readManifest() {
    if (_manifest) return _manifest
    try { _manifest = readJSON(manifestPath()) } catch {}
    return _manifest
}

export function getLatestVersion() {
    const m = readManifest()
    return m && m.ww && m.ww.latest ? String(m.ww.latest) : ''
}

export function getLiveVersion() {
    const m = readManifest()
    return m && m.ww && m.ww.live ? String(m.ww.live) : ''
}

export function isAutoVersion() {
    const v = String((Config.getConfig() || {}).nanoka_version ?? 'auto').trim().toLowerCase()
    return v === '' || v === 'auto'
}

export function getVersion() {
    if (isAutoVersion()) return getLatestVersion() || DEFAULT_VERSION
    return String((Config.getConfig() || {}).nanoka_version)
}

export function getLang() { return String((Config.getConfig() || {}).nanoka_lang || 'zh') }

export function getDataDir() { return DATA_DIR }
export function getDetailDir(type) { return path.join(DETAIL_DIR, type) }
export function listPath(name) { return path.join(DATA_DIR, `${LIST_FILE[name] || name}.json`) }
export function detailPath(type, id) { return path.join(DETAIL_DIR, type, `${id}.json`) }
export function sonataPath() { return path.join(DATA_DIR, 'sonata.json') }


export const listKey = (name) => `list:${name}`
export const detailKey = (type, id) => `detail:${type}/${id}`

export function stampVersion(key, ver) {
    const meta = readJSON(metaPath()) || {}
    meta.versions = (meta.versions && typeof meta.versions === 'object') ? meta.versions : {}
    meta.versions[key] = ver
    meta.version = ver
    meta.updatedAt = new Date().toISOString()
    writeJSON(metaPath(), meta)
}

export function isStale(key) {
    const meta = readJSON(metaPath()) || {}
    const v = (meta.versions && meta.versions[key]) || meta.version || ''
    return v ? v !== getVersion() : false
}

function langName(v) {
    if (!v) return ''
    if (typeof v === 'string') return v
    const lang = getLang()
    return v[lang] || v.zh || v.en || ''
}

function isCurrent(begin, end) {
    if (!begin || !end) return false
    const now = new Date()
    const b = new Date(begin + 'T04:00:00')
    const e = new Date(end + 'T04:00:00')
    return now >= b && now <= e
}

function maxKey(obj) {
    const keys = Object.keys(obj || {}).filter(k => !isNaN(Number(k)))
    if (keys.length === 0) return null
    return keys.reduce((a, b) => (Number(a) >= Number(b) ? a : b))
}

function stripTags(html) {
    if (!html) return ''
    return String(html)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
}

function fillParams(text, params, color) {
    if (!text) return ''
    const list = Array.isArray(params) ? params : []
    return String(text).replace(/\{(\d+)\}/g, (m, i) => {
        const v = list[Number(i)]
        if (v == null || v === '') return m
        return color ? `<span style="color:#ffd12f;">${v}</span>` : String(v)
    })
}


export function toAssetUrl(uePath) {
    if (!uePath) return ''
    if (/^https?:\/\//i.test(uePath)) return uePath
    let p = String(uePath).replace(/^\/Game\/Aki\/UI\//, '')
    const lastSlash = p.lastIndexOf('/')
    const base = lastSlash >= 0 ? p.slice(lastSlash + 1) : p
    const dot = base.indexOf('.')
    if (dot >= 0) p = p.slice(0, lastSlash + 1) + base.slice(0, dot)
    return `${BASE}/assets/ww/${p}.webp`
}

function iconFilename(input) {
    if (!input) return ''
    if (/^https?:\/\//i.test(input)) {
        try { return path.basename(new URL(input).pathname) } catch { return '' }
    }
    const lastSlash = input.lastIndexOf('/')
    const base = lastSlash >= 0 ? input.slice(lastSlash + 1) : input
    const dot = base.indexOf('.')
    return (dot >= 0 ? base.slice(0, dot) : base) + '.webp'
}

function localIconDirs(type) {
    const dirs = [path.join(DETAIL_DIR, type, 'icon')]
    dirs.push(path.join(ENCORE_DETAIL_DIR, type, 'icon'))
    if (type !== 'character') {
        dirs.push(path.join(DETAIL_DIR, 'character', 'icon'))
        dirs.push(path.join(ENCORE_DETAIL_DIR, 'character', 'icon'))
    }
    return dirs
}

export function resolveIcon(input, type = 'character') {
    if (!input) return ''
    const filename = iconFilename(input)
    if (filename) {
        const dirs = localIconDirs(type)
        for (const dir of dirs) {
            const p = path.join(dir, filename)
            if (fs.existsSync(p)) return `file://${p}`
        }
    }
    return toAssetUrl(input)
}


function adaptCharList(raw) {
    return Object.entries(raw).map(([id, c]) => {
        const el = ELEMENTS[c.element] || {}
        const wt = WEAPON_TYPES[c.weapon] || {}
        return {
            Id: Number(id),
            Name: c.zh || c.en || '',
            QualityId: c.rank || 0,
            Element: { Id: c.element, Name: el.name || '', Icon: el.normal || '' },
            WeaponType: { Id: c.weapon, Name: wt.name || '', Icon: wt.icon || '' },
            RoleHeadIcon: c.icon || ''
        }
    })
}

function adaptWeaponList(raw) {
    return Object.entries(raw).map(([id, w]) => {
        const wt = WEAPON_TYPES[w.type] || {}
        return {
            Id: Number(id),
            Name: w.zh || w.en || '',
            QualityId: w.rank || 0,
            Icon: w.icon || '',
            TypeId: w.type,
            TypeName: wt.name || '',
            TypeIcon: wt.icon || ''
        }
    })
}

function sonataName(entry, lang) {
    if (!entry) return ''
    const n = entry.name
    if (typeof n === 'string') return n
    if (n && typeof n === 'object') return n[lang] || n.zh || n.en || ''
    return ''
}

function adaptEchoList(raw, sonata, lang) {
    return Object.entries(raw).map(([id, e]) => {
        const rankArr = Array.isArray(e.rank) ? e.rank : [e.rank]
        const quality = rankArr.filter(v => v != null).reduce((a, b) => Math.max(a, b), 0)
        const groups = (Array.isArray(e.group) ? e.group : [e.group]).filter(v => v != null).map(gid => {
            const s = sonata && sonata[gid]
            return s ? { Id: Number(gid), Name: sonataName(s, lang), Icon: s.icon || '' } : null
        }).filter(Boolean)
        return {
            Id: Number(id),
            Name: e.zh || e.en || '',
            QualityId: quality,
            Rarity: quality,
            Icon: e.icon || '',
            IconMiddle: e.icon || '',
            Element: {},
            FetterGroups: groups
        }
    })
}

function adaptMonsterList(raw) {
    return Object.entries(raw).map(([id, m]) => {
        const el = ELEMENTS[m.element] || {}
        return {
            Id: Number(id),
            Name: m.zh || m.en || '',
            Rarity: MONSTER_RARITY[m.rank] || '',
            RarityId: m.rank,
            Icon: m.icon || '',
            Element: { Id: m.element, Name: el.name || '', Icon: el.round || el.normal || '' }
        }
    })
}


function adaptCharDetail(d) {
    const el = ELEMENTS[d.element] || {}
    const wt = WEAPON_TYPES[d.weapon] || {}

    const statsPhase = maxKey(d.stats)
    const statsLv = d.stats && statsPhase != null ? d.stats[statsPhase] : {}
    const lastLv = statsLv && maxKey(statsLv) != null ? statsLv[maxKey(statsLv)] : {}
    const properties = []
    if (lastLv.life != null) properties.push({ Name: '生命', Icon: '', BaseValue: 0, GrowthValues: [{ value: Math.round(lastLv.life) }] })
    if (lastLv.atk != null) properties.push({ Name: '攻击', Icon: '', BaseValue: 0, GrowthValues: [{ value: Math.round(lastLv.atk) }] })
    if (lastLv.def != null) properties.push({ Name: '防御', Icon: '', BaseValue: 0, GrowthValues: [{ value: Math.round(lastLv.def) }] })

    const seen = new Set()
    const skills = []
    for (const node of Object.values(d.skill_trees || {})) {
        const sk = node && node.skill
        if (!sk || !sk.name) continue
        const key = `${sk.type || ''}|${sk.name}`
        if (seen.has(key)) continue
        seen.add(key)
        const attributes = []
        for (const lvEntry of Object.values(sk.level || {})) {
            const rows = (lvEntry && lvEntry.param) || []
            rows.forEach((row, idx) => {
                if (Array.isArray(row) && row.length >= 10) {
                    attributes.push({ attributeName: (lvEntry.name || '') + (rows.length > 1 ? ` ${idx + 1}` : ''), values: row })
                }
            })
        }
        skills.push({
            SkillName: sk.name,
            SkillType: sk.type || '',
            SkillDescribe: sk.desc || '',
            Icon: sk.icon || '',
            SkillAttributes: attributes
        })
    }

    // 共鸣链
    const resonantChain = Object.entries(d.chains || {}).map(([k, c]) => ({
        GroupIndex: Number(k),
        NodeName: c.name || '',
        AttributesDescription: fillParams(c.desc || '', c.param),
        NodeIcon: c.icon || ''
    })).sort((a, b) => a.GroupIndex - b.GroupIndex)

    const forte = d.forte || {}
    const inputList = Object.values(forte.skill_input_list || {})
    const skillInputs = [{
        SkillDescList: (forte.desc_list || []).slice(),
        DescList: [],
        IconList: [],
        InputDetails: inputList.map((v, i) => ({
            inputId: i,
            description: fillParams(v.desc || '', v.input_list || []),
            mappings: []
        }))
    }]

    // 皮肤
    const skins = Object.values(d.skin || {}).map(s => ({
        Name: s.name || '',
        SubDecName: s.sub_dec_name || '',
        BgDescription: s.bg_description || '',
        FormationRoleCard: s.portrait || s.background || '',
        RoleHeadIconLarge: s.background || ''
    }))

    const ci = d.chara_info || {}
    const favorRole = {
        Birthday: { Content: ci.birth || '' },
        Country: { Content: ci.country || '' },
        Influence: { Content: ci.influence || '' },
        Sex: { Content: ci.sex || '' }
    }

    const tags = Object.values(d.tag || {}).map(t => ({
        TagName: t.name || '',
        TagNameColor: t.color ? `#${String(t.color).replace(/^#/, '')}` : '',
        TagDesc: t.desc || ''
    }))

    return {
        Id: d.id,
        QualityId: d.rarity || 0,
        Name: { Content: d.name || '' },
        NickName: { Content: d.nick_name || '' },
        Introduction: { Content: stripTags(d.desc || '') },
        Tags: tags,
        ElementId: d.element,
        ElementName: el.name || '',
        ElementIcon: el.normal || '',
        WeaponTypeName: wt.name || '',
        WeaponTypeIcon: wt.icon || '',
        QualityName: '',
        RoleHeadIconLarge: d.icon || '',
        RoleHeadIcon: d.icon || '',
        Properties: properties,
        Skins: skins,
        Skills: skills,
        ResonantChain: resonantChain,
        SkillInputs: skillInputs,
        favorRole,
        MaxLevel: 90
    }
}

function adaptWeaponDetail(w) {
    const phases = w.stats || {}
    const phase = phases[maxKey(phases)] || {}
    const lvArr = phase[maxKey(phase)] || []
    const props = lvArr.slice(0, 2).map(p => {
        const num = Number(p.value) || 0
        let v
        if (p.is_ratio) v = `${(num * 100).toFixed(1)}%`
        else if (p.is_percent) v = `${(num / 100).toFixed(1)}%`
        else v = Math.round(num)
        return { Name: p.name || '', GrowthValues: [{ value: v }] }
    })
    const wt = WEAPON_TYPES[w.type] || {}
    const param = (w.param || []).map(arr => (Array.isArray(arr) ? arr[arr.length - 1] : arr))

    return {
        Id: w.id,
        ItemId: w.id,
        QualityId: w.rarity || 0,
        Name: w.name || '',
        WeaponName: w.name || '',
        Icon: w.icon || '',
        TypeIcon: wt.icon || '',
        WeaponTypeName: wt.name || '',
        QualityName: '',
        Properties: props,
        FirstPropId: { Value: props[0] ? props[0].GrowthValues[0].value : 0 },
        SecondPropId: props[1] ? { Id: 1 } : null,
        Desc: fillParams(w.effect || '', param, true),
        ResonName: w.effect_name || '',
        BgDescription: ''
    }
}

function adaptEchoDetail(e) {
    // 合鸣（套装）效果
    const fetterGroupIds = []
    const fetterDetails = {}
    for (const [gid, g] of Object.entries(e.group || {})) {
        fetterGroupIds.push(Number(gid))
        const keys = Object.keys(g.set || {}).map(Number).sort((a, b) => a - b)
        fetterDetails[g.name || String(gid)] = {
            EffectKeys: keys,
            EffectDescriptions: keys.map(k => ((g.set || {})[k] || {}).desc || ''),
            DefineDescriptions: []
        }
    }

    // 声骸技能
    const sk = e.skill || {}
    const dmg = sk.damage || {}
    const damageList = Object.entries(dmg).map(([k, v]) => ({
        EntryNumber: Number(k) || 0,
        Type: '',
        DmgType: '',
        PropertyName: v.related_property || '',
        RateLv: Array.isArray(v.rate_lv) && v.rate_lv.length ? [v.rate_lv[v.rate_lv.length - 1]] : [],
        Energy: Array.isArray(v.energy) ? v.energy : [v.energy ?? 0],
        ToughLv: Array.isArray(v.tough_lv) ? v.tough_lv : [v.tough_lv ?? 0]
    }))
    const lastParam = Array.isArray(sk.param) && sk.param.length ? sk.param[sk.param.length - 1] : []
    const hasSkill = !!(sk.desc || sk.simple_desc || sk.icon)

    const firstEl = Object.values(dmg).map(v => v.element).find(x => x != null)
    const el = ELEMENTS[firstEl] || {}
    const quality = (Array.isArray(e.rarity) ? e.rarity : [e.rarity]).filter(v => v != null).reduce((a, b) => Math.max(a, b), 0)

    return {
        Id: e.id,
        ItemId: e.id,
        QualityId: quality,
        Rarity: quality,
        Name: e.name || '',
        Icon: e.icon || '',
        IconMiddle: e.icon || '',
        Element: firstEl != null ? { Id: firstEl, Name: el.name || '', Icon: el.normal || '' } : {},
        ElementIcon: el.normal || '',
        Handbook: {
            Name: e.name || '',
            TypeDescrtption: e.type || '',
            Intensity: e.intensity || '',
            Place: e.place || ''
        },
        Skill: hasSkill ? {
            SkillCD: '',
            SimplyDescription: stripTags(fillParams(sk.simple_desc || '', lastParam)),
            DescriptionEx: stripTags(fillParams(sk.desc || '', lastParam)),
            BattleViewIcon: sk.icon || '',
            LevelDescStrArray: lastParam.length ? [{ ArrayString: lastParam }] : [],
            DamageList: damageList
        } : {},
        FetterGroup: fetterGroupIds,
        FetterDetails: fetterDetails,
        MainProp: null
    }
}

function adaptMonsterDetail(m) {
    const stats = m.stats || {}
    const last = stats[maxKey(stats)] || {}
    const bs = m.base_stats || {}
    const el = ELEMENTS[m.element] || {}

    const properties = {}
    if (last.life != null) properties.LifeMax = { Name: '生命', GrowthValues: [{ value: Math.round(last.life) }] }
    if (last.atk != null) properties.Atk = { Name: '攻击', GrowthValues: [{ value: Math.round(last.atk) }] }
    if (last.def != null) properties.Def = { Name: '防御', GrowthValues: [{ value: Math.round(last.def) }] }
    const hardness = last.hardness_max || bs.tough_change || 0
    properties.HardnessMax = { Name: '共振度上限', GrowthValues: [{ value: Math.round(hardness) }] }

    const resistMap = {
        DamageResistancePhys: 'damage_resistance_phys',
        DamageResistanceElement1: 'damage_resistance_element1',
        DamageResistanceElement2: 'damage_resistance_element2',
        DamageResistanceElement3: 'damage_resistance_element3',
        DamageResistanceElement4: 'damage_resistance_element4',
        DamageResistanceElement5: 'damage_resistance_element5',
        DamageResistanceElement6: 'damage_resistance_element6'
    }
    for (const [key, src] of Object.entries(resistMap)) {
        if (bs[src] != null) properties[key] = { Name: '', Value: bs[src] }
    }

    return {
        Id: m.id,
        DiscoveredDes: stripTags(m.desc_open || m.desc || ''),
        UndiscoveredDes: '',
        Properties: properties,
        ElementIdArray: [m.element],
        Element: { Id: m.element, Name: el.name || '', Icon: el.round || el.normal || '' },
        Rarity: MONSTER_RARITY[m.rarity != null ? m.rarity : m.rank] || ''
    }
}

export function sharedIconPaths(type) {
    const paths = []
    const pushEl = (key) => { for (const e of Object.values(ELEMENTS)) if (e[key]) paths.push(e[key]) }
    if (type === 'character' || type === 'echo') pushEl('normal')
    if (type === 'monster') pushEl('round')
    if (type === 'character' || type === 'weapon') {
        for (const w of Object.values(WEAPON_TYPES)) paths.push(w.icon)
    }
    return paths
}

function adaptTowerList(raw) {
    const seasons = Object.entries(raw).map(([id, s]) => ({
        id: Number(id),
        name: `Season ${id}`,
        areas: 3,
        start: s.begin,
        finish: s.end,
        current: isCurrent(s.begin, s.end)
    }))
    return { seasons }
}

function adaptSlashList(raw) {
    return Object.entries(raw)
        .map(([id, s]) => ({
            Season: Number(id),
            Name: `Season ${id}`,
            start: s.begin,
            finish: s.end,
            current: isCurrent(s.begin, s.end)
        }))
        .sort((a, b) => a.Season - b.Season)
}

function adaptNewTowerList(raw) {
    const groups = {}
    const sortedIds = Object.keys(raw).sort((a, b) => Number(a) - Number(b))
    for (const id of sortedIds) {
        const v = raw[id] || {}
        const cy = v.cycle || {}
        const se = v.season || {}
        const gid = cy.id != null ? Number(cy.id) : 0
        if (!groups[gid]) {
            const cyName = langName(cy.name) || `Cycle ${gid}`
            groups[gid] = {
                Season: gid,
                Name: cyName,
                CycleName: cyName,
                SeasonId: se.id || 0,
                SeasonName: langName(se.name),
                EndVersion: se.end_version_id || '',
                LevelIds: [],
                LevelNames: []
            }
        }
        groups[gid].LevelIds.push(Number(id))
        groups[gid].LevelNames.push(langName(v.name))
    }
    return Object.values(groups).sort((a, b) => a.Season - b.Season)
}

function adaptTowerFloor(f) {
    const monsters = Object.values(f.monsters || {}).map(m => ({
        name: m.name || '',
        icon: m.icon || '',
        elements: (Array.isArray(m.element_array) ? m.element_array : [m.element])
            .filter(v => v != null).map(id => ({ id })),
        whiteGreenProps: [
            { key: 'Lv', value: m.level ?? 0 },
            { key: 'LifeMax', value: m.life ?? 0 },
            { key: 'Atk', value: m.atk ?? 0 },
            { key: 'Def', value: m.def ?? 0 }
        ]
    }))
    const buffs = Object.values(f.buffs || {}).map(b => ({ desc: b.desc || b.name || '', icon: b.icon || '' }))
    return { monsters, buffs }
}

function adaptTowerDetail(raw, phase) {
    const phaseObj = {}
    for (const [areaNum, areaData] of Object.entries(raw.area || {})) {
        const floorMap = {}
        for (const [floorKey, f] of Object.entries(areaData.floor || {})) {
            floorMap[floorKey] = { [floorKey]: [adaptTowerFloor(f)] }
        }
        phaseObj[areaNum] = floorMap
    }
    return { [phase]: phaseObj }
}

function adaptSlashDetail(raw, season) {
    const levels = Object.entries(raw.id || {}).map(([lid, l]) => ({
        id: Number(lid),
        title: l.title || '',
        desc: l.desc || '',
        targetScore: l.target_score || [],
        scoreStage: l.score_stage || [],
        passScore: l.pass_score || 0,
        stages: Object.entries(l.floor || {})
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([, fv]) => ({
                dungeonDesc: fv.desc || '',
                monsters: Object.values(fv.monsters || {}).map(m => ({
                    name: m.name || '',
                    icon: m.icon || '',
                    element: { id: m.element },
                    elements: (Array.isArray(m.element_array) ? m.element_array : [m.element])
                        .filter(v => v != null).map(id => ({ id })),
                    whiteGreenProps: [
                        { key: 'Lv', value: m.level },
                        { key: 'LifeMax', value: m.life },
                        { key: 'Atk', value: m.atk },
                        { key: 'Def', value: m.def }
                    ]
                })),
                buffs: Object.values(fv.buffs || {}).map(b => ({ desc: b.desc || b.name || '', path: b.icon || '', color: '' }))
            }))
    }))
    const haixi = levels.filter(l => l.title !== '无尽湍渊')
    const tuanyuan = levels.filter(l => l.title === '无尽湍渊')
    const stageGroups = []
    if (haixi.length) stageGroups.push({ name: '再生海域-海隙', levels: haixi })
    if (tuanyuan.length) stageGroups.push({ name: '再生海域-湍渊', levels: tuanyuan })
    return { season, name: '', stageGroups, buffItems: [], levels }
}

function newTowerWaves(raw) {
    const out = []
    let prev = null
    let idx = 0
    for (const w of Object.values(raw.waves || {})) {
        const nm = w.name || ''
        if (nm === prev) continue
        prev = nm
        idx++
        const tagKeys = Object.keys(w.tag || {})
        out.push({
            Id: w.id,
            Wave: idx,
            Round: 0,
            IsShowInView: true,
            Name: nm,
            MonsterLevel: raw.monster_level || 0,
            Icon: w.icon || '',
            ElementId: tagKeys.length ? Number(tagKeys[0]) : 0,
            Tags: Object.values(w.tag || {}).map(t => ({ Name: t.name || '', Path: t.icon || '', Color: '' })),
            RecommendTeamFeature: [],
            ShowBuffIds: []
        })
    }
    return out
}

function adaptNewTowerLevel(raw) {
    const buffs = Object.entries(raw.buffs || {}).map(([k, b]) => ({
        Id: Number(k) || 0,
        Icon: b.icon || '',
        Name: b.name || '',
        Desc: fillParams(b.desc || '', b.param)
    }))
    return {
        Id: raw.id,
        Name: langName(raw.name),
        TeamLimit: raw.team_limit || 0,
        NewTowerBuffs: buffs,
        NewTowerBuffCount: buffs.length,
        ScoreLevelRule: (raw.score_level_rule || []).map(r => ({ Key: r.key, Value: r.value, Icon: '' })),
        Waves: newTowerWaves(raw)
    }
}

function readNewTowerDetail(season) {
    const list = readNewTowerListFromDisk()
    if (!list) return null
    const item = list.find(i => i.Season === Number(season))
    if (!item) return null
    const levels = []
    for (const lid of item.LevelIds) {
        const raw = readJSON(detailPath('dpmatrix', lid))
        if (raw) levels.push(adaptNewTowerLevel(raw))
    }
    if (levels.length === 0) return null
    return {
        Season: item.Season,
        Name: item.Name,
        CycleName: item.CycleName,
        SeasonId: item.SeasonId,
        SeasonName: item.SeasonName,
        EndVersion: item.EndVersion,
        LevelIds: item.LevelIds,
        Levels: levels
    }
}

function readNewTowerListFromDisk() {
    const raw = readJSON(listPath('dpmatrix'))
    return raw ? adaptNewTowerList(raw) : null
}


function adaptList(name, raw) {
    const lang = getLang()
    switch (name) {
        case 'character': return adaptCharList(raw)
        case 'weapon': return adaptWeaponList(raw)
        case 'echo': return adaptEchoList(raw, readJSON(sonataPath()), lang)
        case 'monster': return adaptMonsterList(raw)
        case 'toa': return adaptTowerList(raw)
        case 'whiwa': return adaptSlashList(raw)
        case 'dpmatrix': return adaptNewTowerList(raw)
        default: return null
    }
}

function adaptDetail(type, raw, id) {
    switch (type) {
        case 'character': return adaptCharDetail(raw)
        case 'weapon': return adaptWeaponDetail(raw)
        case 'echo': return adaptEchoDetail(raw)
        case 'monster': return adaptMonsterDetail(raw)
        case 'toa': return adaptTowerDetail(raw, id)
        case 'whiwa': return adaptSlashDetail(raw, id)
        default: return null
    }
}

export function readList(name) {
    if (!ALL.includes(name)) return null
    if (isStale(listKey(name))) return null
    const raw = readJSON(listPath(name))
    return raw ? adaptList(name, raw) : null
}

export function readDetail(type, id) {
    if (!ALL.includes(type)) return null
    if (isStale(detailKey(type, id))) return null
    if (type === 'dpmatrix') {
        const list = readNewTowerListFromDisk()
        const item = list && list.find(i => i.Season === Number(id))
        if (!item) return null
        if (item.LevelIds.some(lid => isStale(detailKey('dpmatrix', lid)))) return null
        return readNewTowerDetail(id)
    }
    const raw = readJSON(detailPath(type, id))
    return raw ? adaptDetail(type, raw, id) : null
}

async function fetchList(name) {
    await refreshManifest()
    const file = LIST_FILE[name] || name
    const ver = getVersion()
    const url = `${BASE}/ww/${ver}/${file}.json`
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (!res.ok) return null
        const raw = await res.json()
        writeJSON(listPath(name), raw)
        stampVersion(listKey(name), ver)
        return raw
    } catch (e) {
        console.error(`[NanokaSource] 获取列表 ${name} 失败:`, e.message)
        return null
    }
}

export async function ensureList(name) {
    await refreshManifest()
    let raw = readJSON(listPath(name))
    if (raw && isStale(listKey(name))) raw = null
    if (!raw) raw = await fetchList(name)
    return raw ? adaptList(name, raw) : null
}

export async function fetchRawDetail(type, id) {
    await refreshManifest()
    const ver = getVersion()
    const url = `${BASE}/ww/${ver}/${getLang()}/${rawSub(type)}/${id}.json`
    try {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (!res.ok) return null
        const raw = await res.json()
        writeJSON(detailPath(type, id), raw)
        stampVersion(detailKey(type, id), ver)
        return raw
    } catch (e) {
        console.error(`[NanokaSource] 获取 ${type}/${id} 失败:`, e.message)
        return null
    }
}

export async function fetchDetail(type, id) {
    const local = readDetail(type, id)
    if (local) return local
    if (type === 'dpmatrix') {
        await ensureList('dpmatrix')
        const list = readNewTowerListFromDisk()
        const item = list && list.find(i => i.Season === Number(id))
        if (!item) return null
        for (const lid of item.LevelIds) {
            if (!readJSON(detailPath('dpmatrix', lid)) || isStale(detailKey('dpmatrix', lid))) {
                await fetchRawDetail('dpmatrix', lid)
            }
        }
        return readNewTowerDetail(id)
    }
    const raw = await fetchRawDetail(type, id)
    return raw ? adaptDetail(type, raw, id) : null
}