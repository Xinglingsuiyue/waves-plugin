import plugin from '../../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import { pluginResources } from '../model/path.js'

const API_BASE = 'https://api-v2.encore.moe/api/zh-Hans'
const DATA_DIR = path.join(pluginResources, 'data', 'encore')
const DETAIL_DIR = path.join(DATA_DIR, 'details')
const ICON_DIRS = {
    character: path.join(pluginResources, 'data', 'encore', 'details', 'character', 'icon'),
    echo:      path.join(pluginResources, 'data', 'encore', 'details', 'echo', 'icon'),
    monster:   path.join(pluginResources, 'data', 'encore', 'details', 'monster', 'icon'),
    namecard:  path.join(pluginResources, 'data', 'encore', 'details', 'namecard', 'icon'),
    title:     path.join(pluginResources, 'data', 'encore', 'details', 'title', 'icon'),
    weapon:    path.join(pluginResources, 'data', 'encore', 'details', 'weapon', 'icon'),
    toa:       path.join(pluginResources, 'data', 'encore', 'details', 'toa', 'icon'),
    whiwa:     path.join(pluginResources, 'data', 'encore', 'details', 'whiwa', 'icon'),
    fotg:      path.join(pluginResources, 'data', 'encore', 'details', 'fotg', 'icon'),
    dpmatrix:  path.join(pluginResources, 'data', 'encore', 'details', 'dpmatrix', 'icon')
}

const ENDPOINTS = {
    character: { path: 'character', key: 'roleList', desc: '角色', hasDetail: true },
    weapon:     { path: 'weapon',    key: 'weapons',    desc: '武器', hasDetail: true },
    echo:       { path: 'echo',      key: 'Echo',       desc: '声骸', hasDetail: true },
    monster:    { path: 'monster',   key: 'monsterList', desc: '怪物', hasDetail: true },
    namecard:   { path: 'namecard',  key: 'namecardList', desc: '名片', hasDetail: true },
    title:      { path: 'title',     key: 'titleList',    desc: '称号', hasDetail: true },
    fotg:       { path: 'fotg',      key: null,           desc: '千道门扉异想', hasDetail: true },
    whiwa:      { path: 'whiwa',     key: null,           desc: '冥歌海墟',     hasDetail: true },
    dpmatrix:   { path: 'dpmatrix',  key: null,           desc: '终焉矩阵',     hasDetail: true },
    toa:        { path: 'toa',       key: 'seasons',      desc: '逆境深塔',     hasDetail: true }
}

const ID_FIELDS = { character: 'Id', weapon: 'Id', echo: 'Id', monster: 'Id', namecard: 'Id', title: 'Id', fotg: 'Id', whiwa: 'Season', dpmatrix: 'Season', toa: 'id' }


function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function getDataPath(name) {
    return path.join(DATA_DIR, `${name}.json`)
}

function getDetailDir(type) {
    return path.join(DETAIL_DIR, type)
}

function getDetailPath(type, id) {
    return path.join(DETAIL_DIR, type, `${id}.json`)
}

function writeJSON(filePath, data) {
    ensureDir(path.dirname(filePath))
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8')
}

function readJSON(filePath) {
    if (!fs.existsSync(filePath)) return null
    try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')) }
    catch { return null }
}

function getMeta() {
    return readJSON(path.join(DATA_DIR, '_meta.json')) || {}
}

function saveMeta(meta) {
    writeJSON(path.join(DATA_DIR, '_meta.json'), meta)
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


export function readLocalData(name) {
    return readJSON(getDataPath(name))
}

export function readLocalDetail(type, id) {
    return readJSON(getDetailPath(type, id))
}

export function saveLocalDetail(type, id, data) {
    writeJSON(getDetailPath(type, id), data)
}

/* ========== EncoreSync 插件类 ========== */

export class EncoreSync extends plugin {
    constructor() {
        super({
            name: '鸣潮-Encore数据管理',
            event: 'message',
            priority: 1010,
            rule: [
                {
                    reg: '^(?:～|~|鸣潮)下载encore(?:所有)?资源$',
                    fnc: 'downloadAll'
                },
                {
                    reg: '^(?:～|~|鸣潮)删除encore(?:所有)?资源$',
                    fnc: 'deleteAll'
                },
                {
                    reg: '^(?:～|~|鸣潮)更新encore(?:所有)?资源$',
                    fnc: 'updateAll'
                },
                {
                    reg: '^(?:～|~|鸣潮)encore资源状态$',
                    fnc: 'showStatus'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载全部encore$',
                    fnc: 'downloadAllIcons'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载角色encore$',
                    fnc: 'downloadCharIcons'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载声骸encore$',
                    fnc: 'downloadEchoIcons'
                },
                {
                    reg: '^(?:～|~|鸣潮)(?:下载残像|下载怪物)encore$',
                    fnc: 'downloadMonsterIcons'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载名片encore$',
                    fnc: 'downloadNamecardIcons'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载称号encore$',
                    fnc: 'downloadTitleIcons'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载武器encore$',
                    fnc: 'downloadWeaponIcons'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载深塔encore$',
                    fnc: 'downloadTowerIcons'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载海墟encore$',
                    fnc: 'downloadWhiWaIcons'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载千道encore$',
                    fnc: 'downloadFotgIcons'
                },
                {
                    reg: '^(?:～|~|鸣潮)下载矩阵encore$',
                    fnc: 'downloadDpMatrixIcons'
                }
            ]
        })
    }

    async _fetch(url) {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Origin': 'https://encore.moe',
                'Referer': 'https://encore.moe/'
            }
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
    }

    async downloadList(name, config) {
        const url = `${API_BASE}/${config.path}`
        console.log(`[EncoreSync] 下载列表: ${name}`)
        const raw = await this._fetch(url)
        const data = config.key === null ? raw : raw[config.key]
        if (!data && config.key !== null) throw new Error(`缺少字段 "${config.key}"`)
        writeJSON(getDataPath(name), data)
        const count = Array.isArray(data) ? data.length : Object.keys(data).length
        console.log(`[EncoreSync] ${name} 列表完成: ${count} 条`)
        return { count, data }
    }

    async downloadDetail(type, id) {
        const url = `${API_BASE}/${type}/${id}`
        try {
            const data = await this._fetch(url)
            writeJSON(getDetailPath(type, id), data)
            return { success: true, id }
        } catch (e) {
            return { success: false, id, error: e.message }
        }
    }

    async downloadAllDetails(type, items) {
        const idField = ID_FIELDS[type] || 'Id'
        const total = items.length
        let ok = 0, fail = 0
        const batchSize = 5

        ensureDir(getDetailDir(type))
        console.log(`[EncoreSync] 开始下载 ${type} 详情，共 ${total} 条`)

        for (let i = 0; i < total; i += batchSize) {
            const batch = items.slice(i, i + batchSize)
            const tasks = batch.map(item => {
                const id = item[idField]
                if (!id) return Promise.resolve({ success: false, id: '?', error: '无ID' })
                return this.downloadDetail(type, id)
            })
            const results = await Promise.all(tasks)
            for (const r of results) {
                if (r.success) ok++
                else fail++
            }
            if ((i + batchSize) % 50 === 0 || i + batchSize >= total) {
                console.log(`[EncoreSync] ${type} 详情: ${Math.min(i + batchSize, total)}/${total}`)
            }
        }
        console.log(`[EncoreSync] ${type} 详情完成: ${ok}/${total}, 失败${fail}`)
        return { ok, fail }
    }

    /* ========== 权限检查 ========== */

    /** 检查是否为主人，不是则自动回复并返回 false */
    _checkMaster(e) {
        if (!e.isMaster) { e.reply('仅主人可使用此命令'); return false }
        return true
    }

    /* ========== 玩家指令 ========== */

    async downloadAll(e) {
        if (!this._checkMaster(e)) return
        await e.reply('开始下载 encore 所有资源… ')

        const meta = { downloadedAt: new Date().toISOString(), endpoints: {}, details: {} }
        const results = []

        for (const [name, config] of Object.entries(ENDPOINTS)) {
            try {
                const { count, data } = await this.downloadList(name, config)
                results.push({ success: true, name, count })
                meta.endpoints[name] = { count, downloadedAt: meta.downloadedAt }

                if (config.hasDetail && Array.isArray(data) && data.length > 0) {
                    const dr = await this.downloadAllDetails(name, data)
                    meta.details[name] = {
                        total: data.length,
                        ok: dr.ok,
                        fail: dr.fail,
                        downloadedAt: new Date().toISOString()
                    }
                }

                if (name === 'fotg') {
                    try {
                        const bpUrl = `${API_BASE}/fotg/buffpool`
                        const bpData = await this._fetch(bpUrl)
                        writeJSON(getDataPath('fotg_buffpool'), bpData)
                        console.log(`[EncoreSync] fotg buffpool 下载完成: ${Array.isArray(bpData) ? bpData.length : '?'} 条`)
                    } catch (e) {
                        console.error('[EncoreSync] fotg buffpool 下载失败:', e.message)
                    }
                }
            } catch (err) {
                results.push({ success: false, name, error: err.message })
            }
        }

        saveMeta(meta)

        const ok = results.filter(r => r.success).length
        const failList = results.filter(r => !r.success).map(r => `${r.name}(${r.error})`)

        let msg = `下载完成！列表: ${ok}/${results.length}`
        if (failList.length > 0) msg += `\n失败: ${failList.join(', ')}`
        msg += `\n\n详情数据:`
        for (const [type, info] of Object.entries(meta.details || {})) {
            msg += `\n  ${ENDPOINTS[type]?.desc || type}: ${info.ok}/${info.total}`
            if (info.fail > 0) msg += ` (失败${info.fail})`
        }
        msg += `\n数据保存在...`
        await e.reply(msg)
    }

    async deleteAll(e) {
        if (!fs.existsSync(DATA_DIR)) {
            return e.reply('encore 资源目录不存在，无需删除')
        }
        try {
            let fileCount = 0
            const countDir = (dir) => {
                if (!fs.existsSync(dir)) return
                for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                    if (entry.isDirectory()) countDir(path.join(dir, entry.name))
                    else fileCount++
                }
            }
            countDir(DATA_DIR)
            rmdirRecursive(DATA_DIR)
            e.reply(`已删除全部 encore 资源（共 ${fileCount} 个文件）`)
        } catch (err) {
            console.error('[EncoreSync] 删除失败:', err)
            e.reply('删除资源时出错，请查看控制台')
        }
    }

    /** 增量更新单个端点：对比新旧列表，仅下载新增/变更的详情 */
    async _updateEndpoint(name, config, meta) {
        const idField = ID_FIELDS[name] || 'Id'
        const oldData = readJSON(getDataPath(name))
        const oldIds = new Set(Array.isArray(oldData) ? oldData.map(d => String(d[idField])) : [])

        // 拉取最新列表
        const { count, data } = await this.downloadList(name, config)
        const items = Array.isArray(data) ? data : []
        const newIds = new Set(items.map(d => String(d[idField])))

        // 计算新增
        const added = items.filter(d => !oldIds.has(String(d[idField])))
        const removed = [...oldIds].filter(id => !newIds.has(id))
        const unchanged = items.length - added.length

        // 计算新增 + 缺失详情（对比磁盘上实际文件与期望 ID 列表）
        let toDownload = []
        let missingCount = 0
        if (config.hasDetail) {
            ensureDir(getDetailDir(name))
            const addedIds = new Set(added.map(d => String(d[idField])).filter(Boolean))
            toDownload = [...added]

            // 直接对比磁盘文件：找出期望 ID 中缺失的
            const expectedIds = new Set(items.map(d => String(d[idField])).filter(Boolean))
            const existingIds = new Set(
                fs.existsSync(getDetailDir(name))
                    ? fs.readdirSync(getDetailDir(name)).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
                    : []
            )
            const missingIds = [...expectedIds].filter(id => !existingIds.has(id) && !addedIds.has(id))
            missingCount = missingIds.length
            if (missingIds.length > 0) {
                console.log(`[EncoreSync] ${name} 缺失详情 ID: ${missingIds.join(', ')}`)
                const missingItems = items.filter(d => missingIds.includes(String(d[idField])))
                toDownload.push(...missingItems)
            }
        }

        let detailResult = { ok: 0, fail: 0 }
        if (config.hasDetail && toDownload.length > 0) {
            console.log(`[EncoreSync] ${name} 增量下载详情: 新增 ${added.length}, 补缺 ${missingCount}`)
            detailResult = await this.downloadAllDetails(name, toDownload)
        }

        if (name === 'fotg') {
            try {
                const bpUrl = `${API_BASE}/fotg/buffpool`
                const bpData = await this._fetch(bpUrl)
                writeJSON(getDataPath('fotg_buffpool'), bpData)
                console.log(`[EncoreSync] fotg buffpool 更新完成: ${Array.isArray(bpData) ? bpData.length : '?'} 条`)
            } catch (e) {
                console.error('[EncoreSync] fotg buffpool 更新失败:', e.message)
            }
        }
        meta.endpoints[name] = { count, downloadedAt: new Date().toISOString() }
        if (config.hasDetail) {
            let actualOk = 0
            if (fs.existsSync(getDetailDir(name))) {
                actualOk = fs.readdirSync(getDetailDir(name)).filter(f => f.endsWith('.json')).length
            }
            meta.details[name] = {
                total: items.length,
                ok: actualOk,
                fail: items.length - actualOk,
                downloadedAt: new Date().toISOString()
            }
        }

        return { name, added: added.length, missing: missingCount, removed: removed.length, unchanged, total: items.length, detailOk: detailResult.ok, detailFail: detailResult.fail }
    }

    async updateAll(e) {
        const meta = getMeta()
        if (Object.keys(meta.endpoints || {}).length === 0) {
            return e.reply('尚未下载过 encore 资源，请先使用 ~下载encore资源')
        }

        await e.reply('开始增量更新 encore 资源… ')

        const results = []
        const now = new Date().toISOString()
        meta.downloadedAt = now
        if (!meta.details) meta.details = {}

        for (const [name, config] of Object.entries(ENDPOINTS)) {
            try {
                const r = await this._updateEndpoint(name, config, meta)
                results.push({ success: true, ...r })
            } catch (err) {
                results.push({ success: false, name, error: err.message })
            }
        }

        saveMeta(meta)

        let msg = `增量更新完成！\n`
        for (const r of results) {
            const desc = ENDPOINTS[r.name]?.desc || r.name
            if (r.success) {
                msg += `\n✅ ${desc}: 新增 ${r.added}, 移除 ${r.removed}, 未变 ${r.unchanged} (共 ${r.total})`
                if (r.missing > 0) msg += `  补缺 ${r.missing}`
                if (r.detailOk > 0) msg += `  详情 +${r.detailOk}`
                if (r.detailFail > 0) msg += ` (失败${r.detailFail})`
            } else {
                msg += `\n❌ ${desc}: ${r.error}`
            }
        }
        await e.reply(msg)
    }

    async showStatus(e) {
        const meta = getMeta()
        if (!fs.existsSync(DATA_DIR)) {
            return e.reply('encore 资源尚未下载，请使用 ~下载encore资源')
        }

        let msg = '📦 Encore 资源状态:\n'
        msg += `下载时间: ${meta.downloadedAt || '未知'}\n\n`

        for (const [name, config] of Object.entries(ENDPOINTS)) {
            const listPath = getDataPath(name)
            if (fs.existsSync(listPath)) {
                const sizeKB = (fs.statSync(listPath).size / 1024).toFixed(1)
                const mi = meta.endpoints?.[name]
                const countStr = mi?.count ? ` (${mi.count}条)` : ''
                msg += `✅ ${config.desc}: ${sizeKB}KB${countStr}`

                if (config.hasDetail) {
                    const di = meta.details?.[name]
                    const detailDir = getDetailDir(name)
                    if (di && fs.existsSync(detailDir)) {
                        const files = fs.readdirSync(detailDir).filter(f => f.endsWith('.json'))
                        msg += `  详情: ${files.length}/${di.total}`
                        if (di.fail > 0) msg += ` ⚠️ 失败${di.fail}`
                    } else {
                        msg += `  详情: 未下载`
                    }
                }
                msg += '\n'
            } else {
                msg += `❌ ${config.desc}: 未下载\n`
            }
        }
        await e.reply(msg)
    }

    /* ========== 图标下载辅助方法 ========== */

    /** 从 UE 路径提取图标文件名 */
    _iconFilenameFromPath(uePath) {
        if (!uePath || typeof uePath !== 'string') return ''
        const lastSlash = uePath.lastIndexOf('/')
        const filename = lastSlash >= 0 ? uePath.slice(lastSlash + 1) : uePath
        const dotIdx = filename.lastIndexOf('.')
        return dotIdx > 0 ? filename.substring(0, dotIdx) : filename
    }

    /** 修复图片URL：域名修正 + .png→.webp */
    _fixImageUrl(url) {
        if (!url) return ''
        let fixed = url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/')
        fixed = fixed.replace(/\.png(\?.*)?$/, '.webp$1')
        return fixed
    }

    /** 辅助方法 — 添加URL到集合 */
    _addUrl(urls, url) {
        if (url && typeof url === 'string' && url.startsWith('http')) {
            const fixed = url.replace(/\.png$/i, '.webp').replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/')
            urls.add(fixed)
        }
    }

    /** 下载单个图标文件 */
    async _downloadIcon(url, saveDir) {
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

    /** 获取详情（供下载方法使用）*/
    async _fetchDetail(type, id) {
        let data = readLocalDetail(type, id)
        if (data) return data
        try {
            const res = await fetch(`https://api-v2.encore.moe/api/zh-Hans/${type}/${id}`, {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            data = await res.json()
            saveLocalDetail(type, id, data)
            return data
        } catch (e) { return null }
    }

    /** 获取深塔时间表 */
    async _fetchTowerSchedule() {
        let data = readLocalData('toa')
        if (data && data.seasons) {
            const schedule = {}
            data.seasons.forEach(s => { if (s.id != null && s.start && s.finish) schedule[s.id] = { begin: s.start, end: s.finish } })
            return schedule
        }
        try {
            const res = await fetch('https://api.encore.moe/zh-Hans/toa', {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            const raw = await res.json()
            if (!raw.seasons) return null
            const schedule = {}
            raw.seasons.forEach(s => { if (s.id != null && s.start && s.finish) schedule[s.id] = { begin: s.start, end: s.finish } })
            return schedule
        } catch (e) { return null }
    }

    /** 获取海墟列表 */
    async _fetchWhiWaList() {
        let data = readLocalData('whiwa')
        if (data && Array.isArray(data) && data.length > 0) return data
        try {
            const res = await fetch('https://api-v2.encore.moe/api/zh-Hans/whiwa', {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            return await res.json()
        } catch (e) { return null }
    }

    /** 获取千道门扉列表 */
    async _fetchFotgList() {
        let data = readLocalData('fotg')
        if (data && Array.isArray(data) && data.length > 0) return data
        try {
            const res = await fetch('https://api-v2.encore.moe/api/zh-Hans/fotg', {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            return await res.json()
        } catch (e) { return null }
    }

    /** 获取终焉矩阵列表 */
    async _fetchDpMatrixList() {
        let data = readLocalData('dpmatrix')
        if (data && Array.isArray(data) && data.length > 0) return data
        try {
            const res = await fetch('https://api-v2.encore.moe/api/zh-Hans/dpmatrix', {
                headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
            })
            if (!res.ok) return null
            return await res.json()
        } catch (e) { return null }
    }

    /* ========== 图标下载 ========== */

    async downloadAllIcons(e) {
        if (!this._checkMaster(e)) return
        const methods = [
            'downloadCharIcons', 'downloadEchoIcons', 'downloadMonsterIcons',
            'downloadNamecardIcons', 'downloadTitleIcons', 'downloadWeaponIcons',
            'downloadTowerIcons', 'downloadWhiWaIcons', 'downloadFotgIcons', 'downloadDpMatrixIcons'
        ]
        for (const fn of methods) {
            try {
                await this[fn](e)
            } catch (err) {
                console.error(`[EncoreSync] ${fn} 失败:`, err.message)
            }
        }
        return true
    }

    async downloadCharIcons(e) {
        if (!this._checkMaster(e)) return
        const data = readLocalData('character')
        if (!data || !Array.isArray(data)) return e.reply('角色数据未下载，请先使用 ~下载encore资源')
        const dir = ICON_DIRS.character
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const est = Math.ceil(data.length * 2.5)
        const estStr = est > 60 ? `预计 ${Math.ceil(est / 60)} 分钟` : `预计 ${est} 秒`
        await e.reply(`开始下载角色图标（${estStr}），共 ${data.length} 个…`)
        let ok = 0, skip = 0, fail = 0
        for (let i = 0; i < data.length; i++) {
            const c = data[i]
            if (!c) continue
            const detail = await this._fetchDetail('character', c.Id)
            if (!detail) { fail++; continue }
            const urls = new Set()
            this._addUrl(urls, detail.RoleHeadIconLarge || detail.RoleHeadIcon)
            this._addUrl(urls, detail.ElementIcon)
            this._addUrl(urls, detail.WeaponTypeIcon)
            this._addUrl(urls, c.RoleHeadIcon)
            this._addUrl(urls, c.RoleHeadIconLarge)
            if (c.Element && c.Element.Icon) {
                const elemHttp = `https://api-v2.encore.moe/resource/Data/Game/Aki/${c.Element.Icon.replace(/^\/Game\/Aki\//, '')}.webp`
                this._addUrl(urls, elemHttp)
            }
            if (Array.isArray(detail.Properties)) detail.Properties.forEach(p => this._addUrl(urls, p.Icon))
            if (Array.isArray(detail.Skills)) detail.Skills.forEach(s => this._addUrl(urls, s.Icon))
            if (Array.isArray(detail.ResonantChain)) detail.ResonantChain.forEach(r => {
                if (r.NodeIcon) this._addUrl(urls, r.NodeIcon.replace(/^\/Game\/Aki\//, 'https://api.encore.moe/resource/Data/Game/Aki/'))
            })
            if (Array.isArray(detail.Skins)) detail.Skins.forEach(s => {
                this._addUrl(urls, s.FormationRoleCard || s.RoleHeadIconLarge)
            })
            if (Array.isArray(detail.SkillInputs) && detail.SkillInputs.length > 0) {
                const si = detail.SkillInputs[0]
                this._addUrl(urls, si.Icon)
                if (Array.isArray(si.IconList)) si.IconList.forEach(icon => this._addUrl(urls, icon))
                if (Array.isArray(si.InputDetails)) {
                    for (const inp of si.InputDetails) {
                        const desc = inp.description || ''
                        const imgRe = /<img\s[^>]*?src="([^"]+)"[^>]*?>/gi
                        let m
                        while ((m = imgRe.exec(desc)) !== null) {
                            this._addUrl(urls, m[1].replace(/https:\/\/api\.encore\.moe\/resource\//, 'https://api-v2.encore.moe/resource/'))
                        }
                        if (Array.isArray(inp.mappings)) {
                            for (const map of inp.mappings) {
                                if (Array.isArray(map.keyDetails)) map.keyDetails.forEach(kd => {
                                    this._addUrl(urls, (kd.keyIconPath || '').replace(/^https:\/\/api\.encore\.moe\/resource\//, 'https://api-v2.encore.moe/resource/'))
                                })
                            }
                        }
                    }
                }
            }
            let downloaded = 0
            for (const url of urls) { if (await this._downloadIcon(url, dir)) downloaded++ }
            if (downloaded > 0) ok++
            else skip++
        }
        await e.reply(`角色图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }

    async downloadEchoIcons(e) {
        if (!this._checkMaster(e)) return
        const data = readLocalData('echo')
        if (!data || !Array.isArray(data)) return e.reply('声骸数据未下载，请先使用 ~下载encore资源')
        const dir = ICON_DIRS.echo
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const est = Math.ceil(data.length * 1.5)
        const estStr = est > 60 ? `预计 ${Math.ceil(est / 60)} 分钟` : `预计 ${est} 秒`
        await e.reply(`开始下载声骸图标（${estStr}），共 ${data.length} 个…`)
        let ok = 0, skip = 0, fail = 0
        for (let i = 0; i < data.length; i++) {
            const echo = data[i]
            if (!echo) continue
            const detail = await this._fetchDetail('echo', echo.Id)
            if (!detail) { fail++; continue }
            const urls = new Set()
            this._addUrl(urls, detail.IconMiddle || detail.Icon || echo.IconMiddle || echo.Icon)
            this._addUrl(urls, detail.ElementIcon || detail.Element?.Icon || echo.Element?.Icon)
            this._addUrl(urls, detail.Skill?.BattleViewIcon)
            this._addUrl(urls, detail.MainProp?.Icon)
            if (detail.Handbook) {
                this._addUrl(urls, detail.Handbook.Icon)
                this._addUrl(urls, detail.Handbook.IconMiddle)
            }
            if (detail.FetterGroupDetails && Array.isArray(detail.FetterGroupDetails)) {
                for (const g of detail.FetterGroupDetails) {
                    this._addUrl(urls, g.Group?.Icon)
                    this._addUrl(urls, g.Fetter?.Icon)
                }
            }
            if (Array.isArray(echo.FetterGroups)) echo.FetterGroups.forEach(g => this._addUrl(urls, g.Icon))
            let downloaded = 0
            for (const url of urls) { if (await this._downloadIcon(url, dir)) downloaded++ }
            if (downloaded > 0) ok++
            else skip++
        }
        await e.reply(`声骸图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }

    async downloadMonsterIcons(e) {
        if (!this._checkMaster(e)) return
        const data = readLocalData('monster')
        if (!data || !Array.isArray(data)) return e.reply('残像数据未下载，请先使用 ~下载encore资源')
        const dir = ICON_DIRS.monster
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const est = Math.ceil(data.length * 0.6)
        const estStr = est > 60 ? `预计 ${Math.ceil(est / 60)} 分钟` : `预计 ${est} 秒`
        await e.reply(`开始下载残像图标（${estStr}），共 ${data.length} 个…`)
        let ok = 0, skip = 0, fail = 0
        for (let i = 0; i < data.length; i++) {
            const m = data[i]
            if (!m) continue
            const urls = new Set()
            this._addUrl(urls, m.Icon)
            this._addUrl(urls, m.Element?.Icon)
            const detail = await this._fetchDetail('monster', m.Id)
            if (detail) {
                this._addUrl(urls, detail.Icon)
                this._addUrl(urls, detail.Element?.Icon)
                this._addUrl(urls, detail.ElementIcon)
            }
            if (urls.size === 0) { skip++; continue }
            let downloaded = 0
            for (const url of urls) { if (await this._downloadIcon(url, dir)) downloaded++ }
            if (downloaded > 0) ok++
            else skip++
        }
        await e.reply(`残像图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }

    async downloadNamecardIcons(e) {
        if (!this._checkMaster(e)) return
        const data = readLocalData('namecard')
        if (!data || !Array.isArray(data)) return e.reply('名片数据未下载，请先使用 ~下载encore资源')
        const dir = ICON_DIRS.namecard
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        await e.reply(`开始下载名片图标，共 ${data.length} 个…`)
        let ok = 0, skip = 0, fail = 0
        for (let i = 0; i < data.length; i++) {
            const n = data[i]
            if (!n) continue
            const detail = await this._fetchDetail('namecard', n.Id)
            if (!detail) { fail++; continue }
            const urls = new Set()
            this._addUrl(urls, detail.CardPath)
            this._addUrl(urls, detail.Icon)
            this._addUrl(urls, detail.IconMiddle)
            this._addUrl(urls, detail.IconSmall)
            if (detail.LongCardPath) {
                const filename = this._iconFilenameFromPath(detail.LongCardPath)
                if (filename) urls.add(`https://api.encore.moe/resource/Data${detail.LongCardPath.replace(/\.([^./]+)$/, '.webp')}`)
            }
            if (urls.size === 0) { skip++; continue }
            let downloaded = 0
            for (const url of urls) { if (await this._downloadIcon(url, dir)) downloaded++ }
            if (downloaded > 0) ok++
            else fail++
        }
        await e.reply(`名片图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }

    async downloadTitleIcons(e) {
        if (!this._checkMaster(e)) return
        const data = readLocalData('title')
        if (!data || !Array.isArray(data)) return e.reply('称号数据未下载，请先使用 ~下载encore资源')
        const dir = ICON_DIRS.title
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        await e.reply(`开始下载称号图标，共 ${data.length} 个…`)
        let ok = 0, skip = 0, fail = 0
        for (let i = 0; i < data.length; i++) {
            const t = data[i]
            if (!t) continue
            const detail = await this._fetchDetail('title', t.Id)
            if (!detail) { fail++; continue }
            const urls = new Set()
            const addUrl = (url) => { if (url && typeof url === 'string' && url.startsWith('http')) urls.add(this._fixImageUrl(url)) }
            addUrl(detail.Image)
            addUrl(detail.TitleBgIcon)
            addUrl(detail.DecorateLeftIcon)
            addUrl(detail.DecorateRightIcon)
            if (urls.size === 0) { skip++; continue }
            let downloaded = 0
            for (const url of urls) { if (await this._downloadIcon(url, dir)) downloaded++ }
            if (downloaded > 0) ok++
            else fail++
        }
        await e.reply(`称号图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }

    async downloadWeaponIcons(e) {
        if (!this._checkMaster(e)) return
        const data = readLocalData('weapon')
        if (!data || !Array.isArray(data)) return e.reply('武器数据未下载，请先使用 ~下载encore资源')
        const dir = ICON_DIRS.weapon
        const est = Math.ceil(data.length * 0.8)
        const estStr = est > 60 ? `预计 ${Math.ceil(est / 60)} 分钟` : `预计 ${est} 秒`
        await e.reply(`开始下载武器图标（${estStr}），共 ${data.length} 个…`)
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        let ok = 0, skip = 0, fail = 0
        for (let i = 0; i < data.length; i++) {
            const w = data[i]
            const detail = await this._fetchDetail('weapon', w.Id)
            if (!detail || !detail.Icon) { fail++; continue }
            const baseFilename = this._iconFilenameFromPath(detail.Icon)
            if (!baseFilename) { fail++; continue }
            const urls = new Set()
            const addUrl = (uePath) => {
                if (!uePath) return
                const fn = this._iconFilenameFromPath(uePath)
                if (!fn) return
                const lp = path.join(dir, `${fn}.webp`)
                if (fs.existsSync(lp)) return
                urls.add(`https://api.encore.moe/resource/Data${uePath.replace(/\.([^./]+)$/, '.webp')}`)
            }
            addUrl(detail.Icon)
            addUrl(detail.TypeIcon)
            if (urls.size === 0) { skip++; continue }
            let downloaded = 0
            for (const iconUrl of urls) {
                try {
                    const res = await fetch(iconUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' } })
                    if (!res.ok) { console.error(`[WeaponIcon] ${w.Id} HTTP ${res.status}: ${iconUrl}`); continue }
                    const buf = Buffer.from(await res.arrayBuffer())
                    fs.writeFileSync(path.join(dir, path.basename(new URL(iconUrl).pathname)), buf)
                    downloaded++
                } catch (err) { console.error(`[WeaponIcon] ${w.Id} download error:`, err.message) }
            }
            if (downloaded > 0) ok++
            else fail++
        }
        await e.reply(`武器图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }

    async downloadTowerIcons(e) {
        if (!this._checkMaster(e)) return
        const schedule = await this._fetchTowerSchedule()
        if (!schedule) return e.reply('获取深塔时间表失败，请先使用 ~下载encore资源')
        const dir = ICON_DIRS.toa
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const ids = Object.keys(schedule).map(Number).filter(id => !isNaN(id))
        const est = Math.ceil(ids.length * 2)
        const estStr = est > 60 ? `预计 ${Math.ceil(est / 60)} 分钟` : `预计 ${est} 秒`
        await e.reply(`开始下载深塔图标（${estStr}），共 ${ids.length} 期…`)
        let ok = 0, skip = 0, fail = 0
        for (let i = 0; i < ids.length; i++) {
            const phase = ids[i]
            let rawData = readLocalDetail('toa', phase)
            if (!rawData) {
                try {
                    const res = await fetch(`https://api.encore.moe/zh-Hans/toa/${phase}`, {
                        headers: { 'User-Agent': 'Mozilla/5.0', 'Origin': 'https://encore.moe', 'Referer': 'https://encore.moe/' }
                    })
                    if (res.ok) rawData = await res.json()
                } catch {}
            }
            if (!rawData) { fail++; continue }
            const phaseData = rawData[phase]
            if (!phaseData) { fail++; continue }
            const urlFix = (url) => url ? url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/') : ''
            const urls = new Set()
            for (let areaNum = 1; areaNum <= 3; areaNum++) {
                const areaData = phaseData[areaNum.toString()]
                if (!areaData) continue
                for (const floorKey in areaData) {
                    const fc = areaData[floorKey]
                    if (!fc || typeof fc !== 'object') continue
                    const innerKeys = Object.keys(fc)
                    if (innerKeys.length === 0) continue
                    const fw = fc[innerKeys[0]]
                    if (!Array.isArray(fw) || fw.length === 0) continue
                    const fi = fw[0]
                    if (!fi) continue
                    if (fi.monsters?.length) {
                        for (const m of fi.monsters) {
                            this._addUrl(urls, urlFix(m.icon))
                            if (m.whiteGreenProps?.length) {
                                for (const p of m.whiteGreenProps) {
                                    this._addUrl(urls, urlFix(p.icon))
                                }
                            }
                        }
                    }
                }
            }
            let downloaded = 0
            for (const url of urls) { if (await this._downloadIcon(url, dir)) downloaded++ }
            if (downloaded > 0) ok++
            else skip++
        }
        await e.reply(`深塔图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }

    async downloadWhiWaIcons(e) {
        if (!this._checkMaster(e)) return
        const list = await this._fetchWhiWaList()
        if (!list || !Array.isArray(list)) return e.reply('海墟数据未下载，请先使用 ~下载encore资源')
        const dir = ICON_DIRS.whiwa
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const est = Math.ceil(list.length * 3)
        const estStr = est > 60 ? `预计 ${Math.ceil(est / 60)} 分钟` : `预计 ${est} 秒`
        await e.reply(`开始下载海墟图标（${estStr}），共 ${list.length} 期…`)
        let ok = 0, skip = 0, fail = 0
        for (let i = 0; i < list.length; i++) {
            const item = list[i]
            if (!item) continue
            const detail = await this._fetchDetail('whiwa', item.Season)
            if (!detail) { fail++; continue }
            const urlFix = (url) => url ? url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/') : ''
            const urls = new Set()
            if (detail.buffItems && Array.isArray(detail.buffItems)) {
                for (const bi of detail.buffItems) {
                    this._addUrl(urls, urlFix((bi.item || {}).icon))
                }
            }
            if (detail.stageGroups && Array.isArray(detail.stageGroups)) {
                for (const group of detail.stageGroups) {
                    if (group.levels && Array.isArray(group.levels)) {
                        for (const level of group.levels) {
                            if (level.scoreStage && Array.isArray(level.scoreStage)) {
                                for (const s of level.scoreStage) {
                                    this._addUrl(urls, urlFix(`https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/UiActivity/Image/ActivityMowingTower/T_Score${s}.webp`))
                                }
                            }
                            if (level.stages && Array.isArray(level.stages)) {
                                for (const stage of level.stages) {
                                    if (stage.monsters && Array.isArray(stage.monsters)) {
                                        for (const m of stage.monsters) {
                                            this._addUrl(urls, urlFix(m.icon))
                                            if (m.whiteGreenProps && Array.isArray(m.whiteGreenProps)) {
                                                for (const p of m.whiteGreenProps) {
                                                    this._addUrl(urls, urlFix(p.icon))
                                                }
                                            }
                                        }
                                    }
                                    if (stage.buffs && Array.isArray(stage.buffs)) {
                                        for (const b of stage.buffs) {
                                            this._addUrl(urls, urlFix(b.path))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            let downloaded = 0
            for (const url of urls) { if (await this._downloadIcon(url, dir)) downloaded++ }
            if (downloaded > 0) ok++
            else skip++
        }
        await e.reply(`海墟图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }

    async downloadFotgIcons(e) {
        if (!this._checkMaster(e)) return
        const list = await this._fetchFotgList()
        if (!list || !Array.isArray(list)) return e.reply('千道门扉数据未下载，请先使用 ~下载encore资源')
        const dir = ICON_DIRS.fotg
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const est = Math.ceil(list.length * 3)
        const estStr = est > 60 ? `预计 ${Math.ceil(est / 60)} 分钟` : `预计 ${est} 秒`
        await e.reply(`开始下载千道门扉图标（${estStr}），共 ${list.length} 期…`)
        let ok = 0, skip = 0, fail = 0
        for (let i = 0; i < list.length; i++) {
            const item = list[i]
            if (!item) continue
            const detail = await this._fetchDetail('fotg', item.Id)
            if (!detail) { fail++; continue }
            const urlFix = (url) => url ? url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/') : ''
            const urls = new Set()
            this._addUrl(urls, urlFix(detail.ViewBackground))
            if (detail.RecommendedRole) {
                for (const key of Object.keys(detail.RecommendedRole)) {
                    const r = detail.RecommendedRole[key]
                    this._addUrl(urls, urlFix(r.RoleHeadIcon))
                    this._addUrl(urls, urlFix(r.RoleHeadIconLarge))
                    if (r.Element && r.Element.Icon) {
                        this._addUrl(urls, urlFix(r.Element.Icon.replace(/IconElement\//, 'IconElementRound/').replace(/2\.webp$/, '1_UI.webp')))
                    }
                }
            }
            let downloaded = 0
            for (const url of urls) { if (await this._downloadIcon(url, dir)) downloaded++ }
            if (downloaded > 0) ok++
            else skip++
        }
        await e.reply(`千道门扉图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }

    async downloadDpMatrixIcons(e) {
        if (!this._checkMaster(e)) return
        const list = await this._fetchDpMatrixList()
        if (!list || !Array.isArray(list)) return e.reply('终焉矩阵数据未下载，请先使用 ~下载encore资源')
        const dir = ICON_DIRS.dpmatrix
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
        const est = Math.ceil(list.length * 2)
        const estStr = est > 60 ? `预计 ${Math.ceil(est / 60)} 分钟` : `预计 ${est} 秒`
        await e.reply(`开始下载终焉矩阵图标（${estStr}），共 ${list.length} 期…`)
        let ok = 0, skip = 0, fail = 0
        for (let i = 0; i < list.length; i++) {
            const item = list[i]
            if (!item) continue
            const detail = await this._fetchDetail('dpmatrix', item.Season)
            if (!detail) { fail++; continue }
            const urlFix = (url) => url ? url.replace(/^https:\/\/api\.encore\.moe\//, 'https://api-v2.encore.moe/') : ''
            const urls = new Set()
            if (detail.Levels && Array.isArray(detail.Levels)) {
                for (const level of detail.Levels) {
                    this._addUrl(urls, urlFix(`https://api-v2.encore.moe/resource/Data/Game/Aki/UI/UIResources/UiActivity/Image/Activity32/MowingTower/BossLevelItemTex/T_BossLevelItemTex${level.Id}.webp`))
                    if (level.NewTowerBuffs && Array.isArray(level.NewTowerBuffs)) {
                        for (const b of level.NewTowerBuffs) {
                            this._addUrl(urls, urlFix(b.Icon))
                        }
                    }
                    if (level.ScoreLevelRule && Array.isArray(level.ScoreLevelRule)) {
                        for (const r of level.ScoreLevelRule) {
                            this._addUrl(urls, urlFix(r.Icon))
                        }
                    }
                    if (level.Waves && Array.isArray(level.Waves)) {
                        for (const w of level.Waves) {
                            this._addUrl(urls, urlFix(w.Icon))
                            this._addUrl(urls, urlFix(w.BigIconInModeView))
                            this._addUrl(urls, urlFix(w.SmallIconInModeView))
                            if (w.Tags && Array.isArray(w.Tags)) {
                                for (const t of w.Tags) {
                                    this._addUrl(urls, urlFix(t.Path))
                                }
                            }
                            if (w.RecommendTeamFeature && Array.isArray(w.RecommendTeamFeature)) {
                                for (const f of w.RecommendTeamFeature) {
                                    this._addUrl(urls, urlFix(f.Icon))
                                }
                            }
                            if (w.ShowBuffIds && Array.isArray(w.ShowBuffIds)) {
                                for (const sb of w.ShowBuffIds) {
                                    this._addUrl(urls, urlFix(sb.SkillIcon))
                                }
                            }
                        }
                    }
                }
            }
            let downloaded = 0
            for (const url of urls) { if (await this._downloadIcon(url, dir)) downloaded++ }
            if (downloaded > 0) ok++
            else skip++
        }
        await e.reply(`终焉矩阵图标下载完成!\n成功: ${ok}, 跳过(已存在): ${skip}, 失败: ${fail}`)
    }
}