import plugin from '../../../lib/plugins/plugin.js'
import YAML from 'yaml'
import fs from 'fs'
import path from 'path'
import Wiki from '../components/Wiki.js'
import { pluginResources } from '../model/path.js'

export class Weight extends plugin {
  constructor() {
    super({
      name: '鸣潮-权重查询',
      event: 'message',
      priority: 1009,
      rule: [
        {
          reg: '^(?:～|~|鸣潮)?(.*?)权重$',
          fnc: 'queryWeight'
        }
      ]
    })
    this.nameToId = this.buildNameToIdMap()
    this.weightDir = path.join(pluginResources, 'Weight')
  }

  buildNameToIdMap() {
    const map = new Map()
    const id2NamePath = path.join(pluginResources, 'Chiyoulv', 'id2Name.json')
    if (!fs.existsSync(id2NamePath)) return map
    try {
      const raw = JSON.parse(fs.readFileSync(id2NamePath, 'utf-8'))
      for (const [id, info] of Object.entries(raw)) {
        const name = info?.name || ''
        if (!name) continue
        map.set(name, id)
        if (name.startsWith('漂泊者')) {
          const parts = name.split('-')
          if (parts.length === 3) {
            const attr = parts[1]
            const gender = parts[2]
            map.set(`漂泊者${attr}`, id)
            map.set(`漂泊者-${gender}-${attr}`, id)
          }
        }
      }
    } catch {}
    return map
  }

  resolveRoleId(name) {
    if (this.nameToId.has(name)) return this.nameToId.get(name)
    if (/^漂泊者/.test(name)) {
      const attrMatch = name.match(/湮灭|衍射|气动/)
      if (attrMatch) {
        const attr = attrMatch[0]
        const candidates = [`漂泊者${attr}`, `漂泊者-男-${attr}`, `漂泊者-女-${attr}`, `漂泊者-${attr}-男`, `漂泊者-${attr}-女`]
        for (const key of candidates) {
          if (this.nameToId.has(key)) return this.nameToId.get(key)
        }
      }
    }
    return null
  }

  async queryWeight(e) {
    try {
      const wiki = new Wiki()
      const match = e.msg.match(this.rule[0].reg)
      if (!match || !match[1]) return false
      let name = match[1].trim()
      name = await wiki.getAlias(name)
      const roleId = this.resolveRoleId(name)
      if (!roleId) {
        return await e.reply('当前没有该角色权重信息')
      }
      const filePath = path.join(this.weightDir, `${roleId}.yaml`)
      if (!fs.existsSync(filePath)) {
        return await e.reply('当前没有该角色权重信息')
      }
      const roleWeight = YAML.parse(fs.readFileSync(filePath, 'utf-8'))
      const displayName = name.replace(/-(男|女)-/, '')
      const nodes = []
      nodes.push({ message: `${displayName} 权重` })
      nodes.push({ message: `副词条权重：` })
      for (const i of (roleWeight.subProps || [])) {
        nodes.push({ message: `${i.name}-${i.weight}` })
      }
      nodes.push({ message: `主词条权重：` })
      nodes.push({ message: `C4：` })
      for (const i of (roleWeight.mainProps?.C4 || [])) {
        nodes.push({ message: `${i.name}-${i.weight}` })
      }
      nodes.push({ message: `C3：` })
      for (const i of (roleWeight.mainProps?.C3 || [])) {
        nodes.push({ message: `${i.name}-${i.weight}` })
      }
      nodes.push({ message: `C1：` })
      for (const i of (roleWeight.mainProps?.C1 || [])) {
        nodes.push({ message: `${i.name}-${i.weight}` })
      }
      const forward = await Bot.makeForwardMsg([{ message: `用户 ${e.user_id}` }, ...nodes])
      return await e.reply(forward)
    } catch (err) {
      logger.error(err)
      return false
    }
  }
}

