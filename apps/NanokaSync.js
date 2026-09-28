import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import {
    SUPPORTED, MODES, getVersion, getLang, getDataDir, getDetailDir,
    listPath, detailPath, toAssetUrl, sharedIconPaths, writeJSON, rawSub,
    refreshManifest, getLatestVersion, getLiveVersion, isAutoVersion,
    stampVersion, listKey, detailKey
} from '../components/NanokaSource.js'
import { diffEntries, formatDiff, deepFieldDiff, formatDetailDiff } from '../components/ResourceDiff.js'

const BASE = 'https://static.nanoka.cc'

const LIST_DEFS = [
    { name: 'character', desc: '角色', url: (v) => `${BASE}/ww/${v}/character.json` },
    { name: 'weapon', desc: '武器', url: (v) => `${BASE}/ww/${v}/weapon.json` },
    { name: 'echo', desc: '声骸', url: (v) => `${BASE}/ww/${v}/echo.json` },
    { name: 'monster', desc: '残像', url: (v) => `${BASE}/ww/${v}/monster.json` },
    { name: 'sonata', desc: '合鸣效果', url: (v, l) => `${BASE}/ww/${v}/${l}/sonata.json` },
    { name: 'toa', desc: '逆境深塔', url: (v) => `${BASE}/ww/${v}/tower.json` },
    { name: 'whiwa', desc: '冥歌海墟', url: (v) => `${BASE}/ww/${v}/slash.json` },
    { name: 'dpmatrix', desc: '终焉矩阵', url: (v) => `${BASE}/ww/${v}/newtower.json` }
]

const DETAIL_DEFS = [...SUPPORTED, ...MODES]

function readJSON(filePath) {
    if (!fs.existsSync(filePath)) return null
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) } catch { return null }
}

function rmdirRecursive(dir) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name)
        if (entry.isDirectory()) rmdirRecursive(p)
        else fs.unlinkSync(p)
    }
    fs.rmdirSync(dir)
}

function nanokaNameOf(item, id) {
    if (!item || typeof item !== 'object') return String(id)
    const n = item.name ?? item.zh ?? item.en
    if (typeof n === 'string' && n) return n
    if (n && typeof n === 'object') return n[getLang()] || n.zh || n.en || String(id)
    return String(id)
}

export class NanokaSync extends plugin {
    constructor() {
        super({
            name: '鸣潮-Nanoka数据管理',
            event: 'message',
            priority: 1010,
            rule: [
                { reg: '^(?:～|~|鸣潮)下载nanoka(?:所有)?资源$', fnc: 'downloadAll' },
                { reg: '^(?:～|~|鸣潮)更新nanoka(?:所有)?资源$', fnc: 'updateAll' },
                { reg: '^(?:～|~|鸣潮)删除nanoka(?:所有)?资源$', fnc: 'deleteAll' },
                { reg: '^(?:～|~|鸣潮)nanoka资源状态$', fnc: 'showStatus' },
                { reg: '^(?:～|~|鸣潮)下载(?:全部)?nanoka图标$', fnc: 'downloadAllIcons' }
            ]
        })
    }

    _checkMaster(e) {
        if (!e.isMaster) { e.reply('仅主人可使用此命令'); return false }
        return true
    }

    async _fetch(url) {
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
    }

    /* ========== 列表 / 详情下载 ========== */

    _writeMeta(patch) {
        const p = path.join(getDataDir(), '_meta.json')
        const meta = readJSON(p) || {}
        Object.assign(meta, patch, { downloadedAt: new Date().toISOString() })
        writeJSON(p, meta)
    }

    async downloadList(def) {
        const ver = getVersion(), lang = getLang()
        const raw = await this._fetch(def.url(ver, lang))
        writeJSON(listPath(def.name), raw)
        stampVersion(listKey(def.name), ver)
        const count = raw && typeof raw === 'object' ? Object.keys(raw).length : 0
        console.log(`[NanokaSync] ${def.name} 列表完成: ${count} 条`)
        return { count, data: raw }
    }

    async downloadAllDetails(type, ids) {
        const total = ids.length
        let ok = 0, fail = 0
        const batchSize = 5
        const ver = getVersion(), lang = getLang()
        if (!fs.existsSync(getDetailDir(type))) fs.mkdirSync(getDetailDir(type), { recursive: true })
        console.log(`[NanokaSync] 开始下载 ${type} 详情，共 ${total} 条`)
        for (let i = 0; i < total; i += batchSize) {
            const batch = ids.slice(i, i + batchSize)
            const results = await Promise.all(batch.map(async (id) => {
                try {
                    const res = await fetch(`${BASE}/ww/${ver}/${lang}/${rawSub(type)}/${id}.json`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
                    if (!res.ok) return false
                    writeJSON(detailPath(type, id), await res.json())
                    stampVersion(detailKey(type, id), ver)
                    return true
                } catch { return false }
            }))
            for (const r of results) r ? ok++ : fail++
            if ((i + batchSize) % 50 === 0 || i + batchSize >= total) {
                console.log(`[NanokaSync] ${type} 详情: ${Math.min(i + batchSize, total)}/${total}`)
            }
        }
        console.log(`[NanokaSync] ${type} 详情完成: ${ok}/${total}, 失败${fail}`)
        return { ok, fail }
    }

    _idsFromList(name) {
        const raw = readJSON(listPath(name))
        return raw && typeof raw === 'object' ? Object.keys(raw) : []
    }

    async downloadAll(e) {
        if (!this._checkMaster(e)) return
        await refreshManifest(true)
        const ver = getVersion(), lang = getLang()
        await e.reply(`开始下载 nanoka 所有资源（版本 ${ver} / 语言 ${lang}）…`)

        const results = []
        const details = {}
        for (const def of LIST_DEFS) {
            try {
                const { count } = await this.downloadList(def)
                results.push({ success: true, name: def.name, count })
            } catch (err) {
                results.push({ success: false, name: def.name, error: err.message })
            }
        }
        for (const type of DETAIL_DEFS) {
            const ids = this._idsFromList(type)
            if (ids.length === 0) { details[type] = { total: 0, ok: 0, fail: 0 }; continue }
            const dr = await this.downloadAllDetails(type, ids)
            details[type] = { total: ids.length, ok: dr.ok, fail: dr.fail }
        }

        this._writeMeta({ version: ver, lang, lists: results, details })

        const ok = results.filter(r => r.success).length
        const failList = results.filter(r => !r.success).map(r => `${r.name}(${r.error})`)
        let msg = `下载完成！列表: ${ok}/${results.length}`
        if (failList.length > 0) msg += `\n失败: ${failList.join(', ')}`
        msg += `\n\n详情数据:`
        for (const [type, info] of Object.entries(details)) {
            msg += `\n  ${type}: ${info.ok}/${info.total}`
            if (info.fail > 0) msg += ` (失败${info.fail})`
        }
        await e.reply(msg)
    }

    async updateAll(e) {
        if (!this._checkMaster(e)) return
        await refreshManifest(true)
        const ver = getVersion(), lang = getLang()
        const meta = readJSON(path.join(getDataDir(), '_meta.json'))
        if (!meta) return e.reply('尚未下载过 nanoka 资源，请先使用 ~下载nanoka资源')

        // 数据版本变化时，已下载的详情也需重新拉取，否则只补缺失
        const versionChanged = (meta.version || '') !== ver
        await e.reply(versionChanged
            ? `检测到数据版本变化（${meta.version || '未知'} → ${ver}），将全量刷新 nanoka 资源…`
            : '开始增量更新 nanoka 资源… ')
        const results = []
        const metaLists = []
        const details = {}
        for (const def of LIST_DEFS) {
            try {
                // 先读旧列表，再拉取覆盖，才能算出新旧差异
                const oldRaw = readJSON(listPath(def.name))
                const { count, data } = await this.downloadList(def)
                const report = diffEntries(oldRaw, data, { nameOf: nanokaNameOf })
                results.push({ success: true, name: def.name, count, report })
                metaLists.push({
                    success: true, name: def.name, count,
                    added: report.added.length, removed: report.removed.length, changed: report.changed.length
                })
            } catch (err) {
                results.push({ success: false, name: def.name, error: err.message })
                metaLists.push({ success: false, name: def.name, error: err.message })
            }
        }
        const reportByType = {}
        for (const r of results) if (r.success) reportByType[r.name] = r.report

        for (const type of DETAIL_DEFS) {
            const ids = this._idsFromList(type)
            const rep = reportByType[type]
            const targetSet = new Set()
            if (versionChanged) {
                ids.forEach(id => targetSet.add(String(id)))
            } else {
                const exist = fs.existsSync(getDetailDir(type))
                    ? new Set(fs.readdirSync(getDetailDir(type)).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')))
                    : new Set()
                ids.filter(id => !exist.has(String(id))).forEach(id => targetSet.add(String(id)))
                // 变更/新增条目也重新拉取详情，用于字段级对比
                if (rep) {
                    rep.added.forEach(a => targetSet.add(String(a.id)))
                    rep.changed.forEach(c => targetSet.add(String(c.id)))
                }
            }
            const targets = [...targetSet]
            // 下载前快照旧详情，用于计算详情字段级差异
            const snapshot = new Map()
            for (const id of targets) {
                const old = readJSON(detailPath(type, id))
                if (old) snapshot.set(String(id), old)
            }
            const dr = targets.length ? await this.downloadAllDetails(type, targets) : { ok: 0, fail: 0 }
            const diffList = []
            for (const id of targets) {
                const old = snapshot.get(String(id))
                if (!old) continue
                const now = readJSON(detailPath(type, id))
                if (!now) continue
                const fields = deepFieldDiff(old, now)
                if (fields.length) diffList.push({ id: String(id), name: nanokaNameOf(now, id), fields })
            }
            details[type] = { total: ids.length, ok: dr.ok, fail: dr.fail, diff: diffList }
        }

        this._writeMeta({ version: ver, lang, lists: metaLists, details })

        let msg = (versionChanged ? `全量刷新完成（版本 ${ver}）！\n` : `增量更新完成！\n`)
        for (const r of results) {
            const desc = LIST_DEFS.find(d => d.name === r.name)?.desc || r.name
            // 新旧差异：新增 / 变更（含字段级 旧值 → 新值）/ 移除
            msg += r.success ? formatDiff(desc, r.report) : `\n❌ ${desc}: ${r.error}`
        }
        for (const [type, info] of Object.entries(details)) {
            const desc = LIST_DEFS.find(d => d.name === type)?.desc || type
            if (info.diff && info.diff.length) {
                // 详情字段级差异（如 baseAttack: 963 → 962）
                msg += formatDetailDiff(info.diff, { label: `${desc} 详情字段变化` })
            } else if (info.ok > 0) {
                msg += `\n  ${desc} 详情 +${info.ok}`
            }
        }
        await e.reply(msg)
    }

    async deleteAll(e) {
        if (!this._checkMaster(e)) return
        const dir = getDataDir()
        if (!fs.existsSync(dir)) return e.reply('nanoka 资源目录不存在，无需删除')
        try {
            let fileCount = 0
            const countDir = (d) => {
                if (!fs.existsSync(d)) return
                for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
                    if (entry.isDirectory()) countDir(path.join(d, entry.name))
                    else fileCount++
                }
            }
            countDir(dir)
            rmdirRecursive(dir)
            e.reply(`已删除全部 nanoka 资源（共 ${fileCount} 个文件）`)
        } catch (err) {
            console.error('[NanokaSync] 删除失败:', err)
            e.reply('删除资源时出错，请查看控制台')
        }
    }

    async showStatus(e) {
        const meta = readJSON(path.join(getDataDir(), '_meta.json'))
        if (!fs.existsSync(getDataDir())) return e.reply('nanoka 资源尚未下载，请使用 ~下载nanoka资源')

        await refreshManifest()
        const latest = getLatestVersion(), live = getLiveVersion(), cur = getVersion()
        const local = meta?.version || ''
        let msg = '📦 Nanoka 资源状态:\n'
        msg += `模式: ${isAutoVersion() ? '自动跟随「最新数据版本」' : '固定版本'}\n`
        msg += `最新数据版本: ${latest || '未知'}   正式版本: ${live || '未知'}\n`
        msg += `当前请求版本: ${cur}\n`
        msg += `本地数据版本: ${local || '未知'}`
        if (local && local !== cur) msg += '（已过期，建议执行 ~更新nanoka资源）'
        msg += `\n语言: ${meta?.lang || getLang()}\n`
        msg += `下载时间: ${meta?.downloadedAt || '未知'}\n\n`
        for (const def of LIST_DEFS) {
            const p = listPath(def.name)
            if (fs.existsSync(p)) {
                const sizeKB = (fs.statSync(p).size / 1024).toFixed(1)
                msg += `✅ ${def.desc}: ${sizeKB}KB\n`
            } else {
                msg += `❌ ${def.desc}: 未下载\n`
            }
        }
        for (const type of DETAIL_DEFS) {
            const dir = getDetailDir(type)
            const cnt = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).length : 0
            msg += `详情 ${type}: ${cnt}\n`
        }
        await e.reply(msg)
    }

    /* ========== 图标下载 ========== */

    _collectIconPaths(type, listRaw) {
        const set = new Set()
        const add = (p) => { if (p && typeof p === 'string') set.add(p) }
        // 角色/武器/声骸/残像 补充公共元素、武器类型图标
        if (type === 'character' || type === 'weapon' || type === 'echo' || type === 'monster') {
            for (const p of sharedIconPaths(type)) set.add(p)
        }
        // 深塔 / 海墟 楼层内怪物与 buff 图标
        const addFloor = (floor) => {
            for (const m of Object.values(floor?.monsters || {})) add(m?.icon)
            for (const b of Object.values(floor?.buffs || {})) add(b?.icon)
        }
        for (const id of Object.keys(listRaw || {})) {
            const raw = readJSON(detailPath(type, id))
            if (!raw) continue
            if (type === 'character') {
                add(raw.icon); add(raw.background)
                for (const n of Object.values(raw.skill_trees || {})) add(n?.skill?.icon)
                for (const c of Object.values(raw.chains || {})) add(c.icon)
                for (const s of Object.values(raw.skin || {})) { add(s.portrait); add(s.background) }
                for (const t of Object.values(raw.tag || {})) add(t.icon)
            } else if (type === 'weapon') {
                add(raw.icon)
            } else if (type === 'echo') {
                add(raw.icon); add(raw.skill?.icon)
            } else if (type === 'monster') {
                add(raw.icon)
            } else if (type === 'toa') {
                for (const area of Object.values(raw.area || {})) {
                    for (const f of Object.values(area.floor || {})) addFloor(f)
                }
            } else if (type === 'whiwa') {
                for (const lv of Object.values(raw.id || {})) {
                    for (const f of Object.values(lv.floor || {})) addFloor(f)
                }
            } else if (type === 'dpmatrix') {
                for (const w of Object.values(raw.waves || {})) {
                    add(w?.icon)
                    for (const t of Object.values(w?.tag || {})) add(t?.icon)
                }
                for (const b of Object.values(raw.buffs || {})) add(b?.icon)
            }
        }
        return set
    }

    async _downloadIcon(uePath, dir) {
        const url = toAssetUrl(uePath)
        if (!url) return false
        try {
            const filename = path.basename(new URL(url).pathname)
            const localPath = path.join(dir, filename)
            if (fs.existsSync(localPath)) return true
            const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            if (!res.ok) return false
            fs.writeFileSync(localPath, Buffer.from(await res.arrayBuffer()))
            return true
        } catch { return false }
    }

    async downloadAllIcons(e) {
        if (!this._checkMaster(e)) return
        const summary = []
        for (const type of DETAIL_DEFS) {
            const listRaw = readJSON(listPath(type))
            if (!listRaw) { summary.push(`${type}: 列表未下载`); continue }
            const dir = path.join(getDetailDir(type), 'icon')
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
            const paths = this._collectIconPaths(type, listRaw)
            let ok = 0, skip = 0
            for (const p of paths) {
                if (await this._downloadIcon(p, dir)) ok++
                else skip++
            }
            summary.push(`${type}: 成功${ok} 跳过/失败${skip}`)
        }
        await e.reply(`nanoka 图标下载完成！\n${summary.join('\n')}`)
    }
}