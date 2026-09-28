import Config from './Config.js'
import { readLocalData as encoreReadData, readLocalDetail as encoreReadDetail, saveLocalDetail as encoreSaveDetail } from '../apps/EncoreSync.js'
import * as Nanoka from './NanokaSource.js'


export function isNanoka() {
    const cfg = Config.getConfig() || {}
    return String(cfg.data_source || 'encore').toLowerCase() === 'nanoka'
}

export function dataHint() {
    return isNanoka() ? '~下载nanoka资源' : '~下载encore资源'
}

export async function ensureManifest() {
    if (isNanoka()) await Nanoka.refreshManifest()
}

export function readLocalData(name) {
    if (isNanoka() && Nanoka.ALL.includes(name)) {
        const data = Nanoka.readList(name)
        if (data) return data
    }
    return encoreReadData(name)
}

export function readLocalDetail(type, id) {
    if (isNanoka() && Nanoka.ALL.includes(type)) {
        const data = Nanoka.readDetail(type, id)
        if (data) return data
    }
    return encoreReadDetail(type, id)
}

export async function ensureList(name) {
    if (isNanoka() && Nanoka.ALL.includes(name)) {
        const data = await Nanoka.ensureList(name)
        if (data) return data
    }
    return encoreReadData(name)
}

export function saveLocalDetail(type, id, data) {
    return encoreSaveDetail(type, id, data)
}

export function resolveIcon(input, type = 'character') {
    return isNanoka() ? Nanoka.resolveIcon(input, type) : input
}

export async function fetchDetail(type, id) {
    if (!isNanoka() || !Nanoka.ALL.includes(type)) return null
    return Nanoka.fetchDetail(type, id)
}