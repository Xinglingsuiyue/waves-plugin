export function toIdMap(data, idField = 'Id') {
    const map = {}
    if (Array.isArray(data)) {
        for (const item of data) {
            if (!item) continue
            const id = item[idField] ?? item.Id ?? item.id ?? item.Season
            if (id === undefined || id === null) continue
            map[String(id)] = item
        }
    } else if (data && typeof data === 'object') {
        for (const [id, item] of Object.entries(data)) map[id] = item
    }
    return map
}

function brief(v) {
    if (v === undefined) return '(无)'
    if (v === null) return 'null'
    if (Array.isArray(v)) return `[${v.length}项]`
    if (typeof v === 'object') return '{...}'
    const s = String(v)
    return s.length > 24 ? `${s.slice(0, 24)}…` : s
}

export function fieldDiff(oldItem, newItem, maxFields = 3) {
    const keys = new Set([...Object.keys(oldItem || {}), ...Object.keys(newItem || {})])
    const out = []
    for (const key of keys) {
        const a = oldItem?.[key]
        const b = newItem?.[key]
        if (JSON.stringify(a) === JSON.stringify(b)) continue
        out.push(`${key}: ${brief(a)} → ${brief(b)}`)
        if (out.length >= maxFields) break
    }
    return out
}

export function deepFieldDiff(oldObj, newObj, { maxFields = 6, maxDepth = 6 } = {}) {
    const out = []
    const walk = (a, b, p, depth) => {
        if (out.length >= maxFields) return
        if (a === b) return
        const aObj = a && typeof a === 'object'
        const bObj = b && typeof b === 'object'
        if (!aObj || !bObj || depth >= maxDepth) {
            out.push(`${p || '(root)'}: ${brief(a)} → ${brief(b)}`)
            return
        }
        const keys = new Set([...Object.keys(a), ...Object.keys(b)])
        for (const k of keys) {
            const av = a[k]
            const bv = b[k]
            if (JSON.stringify(av) === JSON.stringify(bv)) continue
            const isArr = Array.isArray(a) || Array.isArray(b)
            const np = isArr ? `${p}[${k}]` : (p ? `${p}.${k}` : k)
            walk(av, bv, np, depth + 1)
            if (out.length >= maxFields) return
        }
    }
    walk(oldObj, newObj, '', 0)
    return out
}

export function diffEntries(oldData, newData, { idField = 'Id', nameOf } = {}) {
    const oldMap = toIdMap(oldData, idField)
    const newMap = toIdMap(newData, idField)
    const name = (item, id) => {
        if (typeof nameOf === 'function') return nameOf(item, id) || String(id)
        return item?.Name || item?.name || item?.Title || item?.title || String(id)
    }
    const added = []
    const removed = []
    const changed = []
    for (const [id, item] of Object.entries(newMap)) {
        if (!(id in oldMap)) {
            added.push({ id, name: name(item, id) })
            continue
        }
        if (JSON.stringify(oldMap[id]) !== JSON.stringify(item)) {
            changed.push({ id, name: name(item, id), fields: fieldDiff(oldMap[id], item) })
        }
    }
    for (const [id, item] of Object.entries(oldMap)) {
        if (!(id in newMap)) removed.push({ id, name: name(item, id) })
    }
    return { oldMap, newMap, added, removed, changed }
}

export function formatDiff(desc, report, { maxItems = 6, maxFields = 3 } = {}) {
    const { added = [], removed = [], changed = [], newMap = {} } = report || {}
    const total = Object.keys(newMap).length
    let line = `\n✅ ${desc}: 共 ${total}`
    if (added.length || removed.length || changed.length) {
        line += `  新增 ${added.length} 变更 ${changed.length} 移除 ${removed.length}`
    } else {
        line += '  无变化'
    }
    const briefList = (arr) => arr.slice(0, maxItems).map(x => `${x.name}(${x.id})`).join(', ')
        + (arr.length > maxItems ? ` 等${arr.length}项` : '')
    if (added.length) line += `\n   新增: ${briefList(added)}`
    if (changed.length) {
        line += '\n   变更:'
        for (const c of changed.slice(0, maxItems)) {
            line += `\n     · ${c.name}(${c.id})`
            const fields = c.fields.slice(0, maxFields)
            if (fields.length) line += `  ${fields.join('; ')}`
            if (c.fields.length > maxFields) line += ` 等${c.fields.length}处`
        }
        if (changed.length > maxItems) line += `\n     …等 ${changed.length} 项`
    }
    if (removed.length) line += `\n   移除: ${briefList(removed)}`
    return line
}

export function formatDetailDiff(list, { maxItems = 6, label = '详情字段变化' } = {}) {
    if (!list || list.length === 0) return ''
    let s = `\n   ${label}:`
    for (const c of list.slice(0, maxItems)) {
        s += `\n     · ${c.name}(${c.id})  ${c.fields.join('; ')}`
    }
    if (list.length > maxItems) s += `\n     …等 ${list.length} 项`
    return s
}