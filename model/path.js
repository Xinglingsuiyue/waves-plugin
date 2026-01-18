import path from 'path'
import fs from 'fs'

const _path = process.cwd().replace(/\\/g, '/')

// 插件名
const pluginName = path.basename(path.join(import.meta.url, '../../'))
// 插件根目录
const pluginRoot = path.join(_path, 'plugins', pluginName)
// 插件资源目录
const pluginResources = path.join(pluginRoot, 'resources')

// ==================== 修改：默认数据路径 ====================

// 将默认路径改为 Yunzai 根目录下的 data/waves/players
// 如果您想存到 Yunzai/data/XutheringWavesUID/players，也可以改这里
const PLAYER_PATH = path.join(_path, 'data', 'waves', 'players')

// 缓存目录 (也建议移出来)
const CACHE_PATH = path.join(_path, 'data', 'waves', 'cache')

// 获取外部 XutheringWavesUID 玩家目录（支持环境变量覆盖）
function getExternalPlayerPath() {
    // 优先使用环境变量
    const envPath = process.env.XWUID_PLAYERS_PATH
    if (envPath && fs.existsSync(envPath)) {
        return envPath
    }
    
    // 常见的 XutheringWavesUID 路径
    const possiblePaths = [
        path.join(_path, 'data', 'XutheringWavesUID', 'players'),
        path.join(_path, 'plugins', 'XutheringWavesUID', 'data', 'players'),
        // gsuid_core 的资源路径
        path.join(_path, '..', 'data', 'XutheringWavesUID', 'players'),
    ]
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return p
        }
    }
    
    return null
}

// 获取外部数据目录（用于排行榜共享）
function getExternalDataPath() {
    const envPath = process.env.WAVES_DATA_PATH
    if (envPath) {
        return envPath
    }
    return null
}

// 确保目录存在
function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
    return dirPath
}

// 初始化目录
ensureDir(PLAYER_PATH)
ensureDir(CACHE_PATH)

export { 
    _path, 
    pluginName, 
    pluginRoot, 
    pluginResources,
    PLAYER_PATH,
    CACHE_PATH,
    getExternalPlayerPath,
    getExternalDataPath,
    ensureDir
}