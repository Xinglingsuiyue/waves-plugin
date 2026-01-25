import plugin from '../../../lib/plugins/plugin.js'
import YAML from 'yaml'
import fs from 'fs'
import path from 'path'
import Wiki from '../components/Wiki.js'
import { pluginResources } from '../model/path.js'

export class Weight extends plugin {
  constructor() {
    super({
      name: '鸣潮-权重查询与修改',
      event: 'message',
      priority: 1009,
      rule: [
        {
          reg: '^(?:～|~|鸣潮)?修改(.+?)权重[\\s\\S]*$',
          fnc: 'editWeight'
        },
        {
          reg: '^(?:～|~|鸣潮)?(.+?)权重$',
          fnc: 'queryWeight'
        }
      ]
    })
    this.nameToId = this.buildNameToIdMap()
    this.weightDir = path.join(pluginResources, 'Weight')
    this.examplePath = path.join(pluginResources, 'Weight', 'Examples.yaml')
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
    } catch (err) {
      logger.error('[Weight] 读取id2Name.json失败:', err)
    }
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
    // 排除修改命令
    if (/修改/.test(e.msg)) return false

    try {
      const wiki = new Wiki()
      const match = e.msg.match(/^(?:～|~|鸣潮)?(.+?)权重$/)
      if (!match || !match[1]) return false
      let name = match[1].trim()

      name = await wiki.getAlias(name)
      const roleId = this.resolveRoleId(name)
      if (!roleId) {
        await e.reply('当前没有该角色权重信息')
        return true
      }
      const filePath = path.join(this.weightDir, `${roleId}.yaml`)
      if (!fs.existsSync(filePath)) {
        await e.reply('当前没有该角色权重信息')
        return true
      }
      const roleWeight = YAML.parse(fs.readFileSync(filePath, 'utf-8'))
      const displayName = name.replace(/-(男|女)-/, '')

      // 单条消息输出
      let msg = `【${displayName}】权重\n\n`
      msg += `━━ 副词条权重 ━━\n`
      for (const i of (roleWeight.subProps || [])) {
        msg += `${i.name}: ${i.weight}\n`
      }
      msg += `\n━━ 主词条权重 ━━\n`
      msg += `【C4】\n`
      for (const i of (roleWeight.mainProps?.C4 || [])) {
        msg += `${i.name}: ${i.weight}\n`
      }
      msg += `\n【C3】\n`
      for (const i of (roleWeight.mainProps?.C3 || [])) {
        msg += `${i.name}: ${i.weight}\n`
      }
      msg += `\n【C1】\n`
      for (const i of (roleWeight.mainProps?.C1 || [])) {
        msg += `${i.name}: ${i.weight}\n`
      }

      await e.reply(msg.trim())
      return true
    } catch (err) {
      logger.error('[Weight] queryWeight错误:', err)
      return false
    }
  }

  getExampleYaml() {
    return `baseAttack: 500
baseDefense: 1356
baseHP: 15375
subProps:
  - name: 暴击伤害
    weight: 0
  - name: 暴击
    weight: 0
  - name: 攻击百分比
    weight: 0
  - name: 生命百分比
    weight: 0
  - name: 防御百分比
    weight: 0
  - name: 共鸣效率
    weight: 0
  - name: 普攻伤害加成
    weight: 0
  - name: 重击伤害加成
    weight: 0
  - name: 共鸣技能伤害加成
    weight: 0
  - name: 共鸣解放伤害加成
    weight: 0
mainProps:
  C4:
    - name: 暴击伤害
      weight: 0
    - name: 暴击
      weight: 0
    - name: 治疗效果加成
      weight: 0
    - name: 生命百分比
      weight: 0
    - name: 攻击百分比
      weight: 0
    - name: 防御百分比
      weight: 0
  C3:
    - name: 伤害加成
      weight: 0
    - name: 攻击百分比
      weight: 0
    - name: 生命百分比
      weight: 0
    - name: 防御百分比
      weight: 0
    - name: 共鸣效率
      weight: 0
  C1:
    - name: 攻击百分比
      weight: 0
    - name: 防御百分比
      weight: 0
    - name: 生命百分比
      weight: 0`
  }

  async editWeight(e) {
    try {
      const wiki = new Wiki()
      
      // 提取角色名和YAML内容
      const fullMsg = e.msg.trim()
      const firstLineMatch = fullMsg.match(/^(?:～|~|鸣潮)?修改(.+?)权重/)
      if (!firstLineMatch || !firstLineMatch[1]) return false

      let name = firstLineMatch[1].trim()
      name = await wiki.getAlias(name)
      const roleId = this.resolveRoleId(name)

      if (!roleId) {
        await e.reply('未找到该角色信息，请检查角色名称是否正确')
        return true
      }

      // 获取第一行之后的内容作为YAML
      const firstLineEnd = fullMsg.indexOf('\n')
      const yamlContent = firstLineEnd > 0 ? fullMsg.substring(firstLineEnd + 1).trim() : ''

      const filePath = path.join(this.weightDir, `${roleId}.yaml`)

      // 如果没有提供 YAML 内容，返回当前权重或示例模板
      if (!yamlContent) {
        let currentYaml = ''
        let isNew = true
        
        if (fs.existsSync(filePath)) {
          currentYaml = fs.readFileSync(filePath, 'utf-8')
          isNew = false
        } else if (fs.existsSync(this.examplePath)) {
          currentYaml = fs.readFileSync(this.examplePath, 'utf-8')
        } else {
          currentYaml = this.getExampleYaml()
        }

        let msg = `【${name}】权重修改\n\n`
        if (isNew) {
          msg += `当前暂无该角色权重，以下为示例模板：\n\n`
        } else {
          msg += `当前权重如下：\n\n`
        }
        msg += `请复制下方内容，修改后一次性发送：\n`
        msg += `━━━━━━━━━━━━━━━━━━\n`
        msg += `～修改${name}权重\n`
        msg += currentYaml
        msg += `\n━━━━━━━━━━━━━━━━━━\n`
        msg += `提示：修改 weight 后面的数值，然后整体复制发送`

        await e.reply(msg)
        return true
      }

      // 解析用户提供的 YAML
      let newWeight
      try {
        newWeight = YAML.parse(yamlContent)
      } catch (parseErr) {
        let errMsg = `YAML 格式错误：${parseErr.message}\n\n`
        errMsg += `常见问题：\n`
        errMsg += `1. 缩进必须使用空格，不能用Tab\n`
        errMsg += `2. 冒号后面需要有空格\n`
        errMsg += `3. 列表项 - 后面需要有空格`
        await e.reply(errMsg)
        return true
      }

      // 验证权重数据结构
      const validation = this.validateWeight(newWeight)
      if (!validation.valid) {
        await e.reply(`权重数据验证失败：${validation.message}`)
        return true
      }

      // 确保目录存在
      if (!fs.existsSync(this.weightDir)) {
        fs.mkdirSync(this.weightDir, { recursive: true })
      }

      // 保存文件
      fs.writeFileSync(filePath, YAML.stringify(newWeight), 'utf-8')

      let msg = `✅【${name}】权重修改成功！\n\n`
      msg += `已保存到：${roleId}.yaml\n`
      msg += `可发送"～${name}权重"查看`

      await e.reply(msg)
      return true
    } catch (err) {
      logger.error('[Weight] editWeight错误:', err)
      await e.reply('修改权重失败：' + err.message)
      return true
    }
  }

  validateWeight(weight) {
    if (!weight || typeof weight !== 'object') {
      return { valid: false, message: '权重数据必须是一个对象' }
    }

    // 检查基础属性（可选）
    const numFields = ['baseAttack', 'baseDefense', 'baseHP']
    for (const field of numFields) {
      if (weight[field] !== undefined && typeof weight[field] !== 'number') {
        return { valid: false, message: `${field} 必须是数字` }
      }
    }

    // 检查 subProps
    if (weight.subProps) {
      if (!Array.isArray(weight.subProps)) {
        return { valid: false, message: 'subProps 必须是数组' }
      }
      for (let i = 0; i < weight.subProps.length; i++) {
        const prop = weight.subProps[i]
        if (!prop || typeof prop !== 'object') {
          return { valid: false, message: `subProps[${i}] 格式错误` }
        }
        if (!prop.name || typeof prop.name !== 'string') {
          return { valid: false, message: `subProps[${i}] 缺少 name` }
        }
        if (typeof prop.weight !== 'number') {
          return { valid: false, message: `subProps "${prop.name}" 的 weight 必须是数字` }
        }
      }
    }

    // 检查 mainProps
    if (weight.mainProps) {
      if (typeof weight.mainProps !== 'object') {
        return { valid: false, message: 'mainProps 必须是对象' }
      }
      for (const slot of ['C4', 'C3', 'C1']) {
        if (weight.mainProps[slot]) {
          if (!Array.isArray(weight.mainProps[slot])) {
            return { valid: false, message: `mainProps.${slot} 必须是数组` }
          }
          for (let i = 0; i < weight.mainProps[slot].length; i++) {
            const prop = weight.mainProps[slot][i]
            if (!prop || typeof prop !== 'object') {
              return { valid: false, message: `mainProps.${slot}[${i}] 格式错误` }
            }
            if (!prop.name || typeof prop.name !== 'string') {
              return { valid: false, message: `mainProps.${slot}[${i}] 缺少 name` }
            }
            if (typeof prop.weight !== 'number') {
              return { valid: false, message: `mainProps.${slot} "${prop.name}" 的 weight 必须是数字` }
            }
          }
        }
      }
    }

    return { valid: true }
  }
}