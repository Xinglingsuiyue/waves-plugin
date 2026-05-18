import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const pluginPackagePath = path.join(__dirname, '..', 'package.json')
let packageJson = JSON.parse(fs.readFileSync(pluginPackagePath, 'utf8'))

const currentVersion = packageJson.version
const yunzaiVersion = packageJson.version
const isMiao = packageJson.name === 'miao-yunzai'
const isTrss = !!(typeof Bot !== 'undefined' && Array.isArray(Bot.uin))

let Version = {
  isMiao,
  isTrss,
  get version() {
    return currentVersion
  },
  get yunzai() {
    return yunzaiVersion
  }
}

export default Version
