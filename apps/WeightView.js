import plugin from '../../../lib/plugins/plugin.js'
import YAML from 'yaml'
import fs from 'fs'
import { pluginResources } from '../model/path.js'
import Wiki from '../components/Wiki.js'
import Render from '../components/Render.js'

function getWeightClass(weight) {
    if (weight >= 1) return 'weight-1'
    if (weight >= 0.75) return 'weight-075'
    if (weight >= 0.5) return 'weight-05'
    if (weight > 0) return 'weight-025'
    return 'weight-0'
}

function getSubWeight(role, propName) {
    if (!role || !role.subProps) return { value: 0, cls: 'weight-0' }
    const prop = role.subProps.find(p => p.name === propName)
    const w = prop ? prop.weight : 0
    return { value: w, cls: getWeightClass(w) }
}

function getMainWeight(role, cost, propName) {
    if (!role || !role.mainProps || !role.mainProps[cost]) return { value: 0, cls: 'weight-0' }
    const props = role.mainProps[cost]
    const prop = props.find(p => p.name === propName)
    const w = prop ? prop.weight : 0
    return { value: w, cls: getWeightClass(w) }
}

export class WeightView extends plugin {
    constructor() {
        super({
            name: "鸣潮-查看权重",
            event: "message",
            priority: 1005,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)评分权重$",
                    fnc: "allWeights"
                },
                {
                    reg: "^(?:～|~|鸣潮)(.*)权重$",
                    fnc: "singleWeight"
                }
            ]
        })
    }

    /** 加载所有角色权重数据 */
    loadAllWeights() {
        const weightDir = `${pluginResources}/Weight`
        const baseWeight = YAML.parse(fs.readFileSync(`${weightDir}/weight.yaml`, 'utf-8'))
        const roleFiles = fs.readdirSync(weightDir)
            .filter(f => /^\d{4}\.yaml$/.test(f))
            .sort()

        const simulatorData = YAML.parse(fs.readFileSync(`${pluginResources}/Simulator.yaml`, 'utf-8'))

        // 构建角色映射
        const imageMap = {}
        for (const [key, val] of Object.entries(simulatorData)) {
            if (val.star >= 4) {
                imageMap[key] = val.image
            }
        }

        const charNameMap = {}

        const id2NamePath = `${pluginResources}/Chiyoulv/id2Name.json`
        if (fs.existsSync(id2NamePath)) {
            try {
                const id2Name = JSON.parse(fs.readFileSync(id2NamePath, 'utf-8'))
                for (const [roleId, info] of Object.entries(id2Name)) {
                    if (info && info.name) {
                        // 漂泊者统一处理
                        let displayName = info.name
                        if (displayName.startsWith('漂泊者-')) {
                            displayName = displayName.replace(/-(男|女)$/, '')
                        }
                        charNameMap[roleId] = displayName
                    }
                }
            } catch (e) { }
        }

        const roleMap = new Map()

        for (const file of roleFiles) {
            const roleId = file.replace('.yaml', '')
            const roleWeight = YAML.parse(fs.readFileSync(`${weightDir}/${file}`, 'utf-8'))
            if (!roleWeight) continue

            const name = charNameMap[roleId] || roleId
            const imageUrl = imageMap[name] || ''

            // 预处理副词条权重
            const subWeightList = (baseWeight.subProps || []).map(prop => {
                const w = getSubWeight(roleWeight, prop.name)
                return { name: prop.name, value: w.value, cls: w.cls }
            })

            // 预处理主词条权重
            const mainWeightList = {}
            for (const cost of ['C4', 'C3', 'C1']) {
                mainWeightList[cost] = (baseWeight.mainProps[cost] || []).map(prop => {
                    const w = getMainWeight(roleWeight, cost, prop.name)
                    return { name: prop.name, value: w.value, cls: w.cls }
                })
            }

            if (roleMap.has(name)) {
                continue
            }

            roleMap.set(name, {
                roleId,
                name,
                image: imageUrl,
                subWeightList,
                mainWeightList
            })
        }

        const roles = Array.from(roleMap.values())

        return { baseWeight, roles }
    }

    //查看所有角色权重
    async allWeights(e) {
        try {
            const { baseWeight, roles } = this.loadAllWeights()

            if (roles.length === 0) {
                return await e.reply('未找到任何角色权重数据')
            }

            const imageCard = await Render.render('Template/weightView/weightView', {
                data: {
                    mode: 'all',
                    roles,
                    baseWeight
                }
            }, { e, retType: 'base64' })

            if (imageCard) {
                await e.reply(imageCard)
            } else {
                await e.reply('生成权重表失败，请检查模板配置')
            }
        } catch (error) {
            logger.error('[WAVES 查看权重] 出错:', error)
            await e.reply(`生成权重表时出错: ${error.message}`)
        }
        return true
    }

    async singleWeight(e) {
        const match = e.msg.match(this.rule[1].reg)
        const message = match ? match[1].trim() : ''

        if (!message) {
            return await e.reply('请输入角色名，如：～今汐权重')
        }

        try {
            const wiki = new Wiki()
            const name = await wiki.getAlias(message)

            const { baseWeight, roles } = this.loadAllWeights()
            const role = roles.find(r => r.name === name)

            if (!role) {
                return await e.reply(`未找到【${name}】的权重数据`)
            }

            const imageCard = await Render.render('Template/weightView/weightView', {
                data: {
                    mode: 'single',
                    role,
                    baseWeight
                }
            }, { e, retType: 'base64' })

            if (imageCard) {
                await e.reply(imageCard)
            } else {
                await e.reply('生成权重表失败，请检查模板配置')
            }
        } catch (error) {
            logger.error('[WAVES 查看权重] 出错:', error)
            await e.reply(`生成权重表时出错: ${error.message}`)
        }
        return true
    }
}
