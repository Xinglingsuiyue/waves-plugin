import { parsePanel, parseEquipment } from './parser.js'
import {
  loadCharacterModule,
  loadWeaponModule,
  loadPhantomModule,
  loadGroupModule,
  loadEnemyModule
} from './loader.js'
import { WAVERIDER_ATTRIBUTES } from './waveriderMap.js'

const log = (...args) => {
  if (typeof logger !== 'undefined' && logger?.info) {
    logger.info('[伤害计算]', ...args)
  } else {
    console.log('[伤害计算]', ...args)
  }
}

function fmtPercent(n, digits = 2) {
  return `${(Number(n || 0) * 100).toFixed(digits)}%`
}

function fmtNumber(n, digits = 0) {
  return Number(n || 0).toFixed(digits)
}

function fmtCritDamage(n) {
  return `${fmtPercent(Number(n || 0) - 1, 2)}`
}

/**
 * 把单段技能伤害结果格式化成"乘区分解"日志
 * 公式：
 *   非暴 = 攻击 × 倍率(1+倍率提升) × (1+总增伤) × (1+深化) × 防御乘区 × 抗性乘区
 *   暴击 = 非暴 × 暴伤乘区
 *   期望 = 非暴 × (1 - 暴率 + 暴率 × 暴伤乘区)
 */
export function logDamageBreakdown(item, ctx = {}) {
  const d = item?.detail || {}

  if (item?.type === 'heal') {
    const base = d.base || 0
    const sm = d.skillMultiplier || 0
    const hba = d.healingBonusArea || 1
    const dpa = d.deepenArea || 1
    const flat = d.flatHeal || 0
    const lines = [
      `─── ${item.name} ───`,
      `治疗 = [${base}(基础属性) × ${sm.toFixed(4)}(倍率) + ${flat}(固定治疗)] × ${hba.toFixed(4)}(治疗加成) × ${dpa.toFixed(4)}(深化区) = ${item.heal || item.expected}`
    ]
    log(lines.join('\n'))
    return
  }

  if (item?.type === 'shield') {
    const base = d.base || 0
    const sm = d.skillMultiplier || 0
    const sba = d.shieldBonusArea || 1
    const dpa = d.deepenArea || 1
    const flat = d.flatShield || 0
    const lines = [
      `─── ${item.name} ───`,
      `护盾 = [${base}(基础属性) × ${sm.toFixed(4)}(倍率) + ${flat}(固定护盾)] × ${sba.toFixed(4)}(护盾加成) × ${dpa.toFixed(4)}(深化区) = ${item.shield || item.expected}`
    ]
    log(lines.join('\n'))
    return
  }

  const attack = d.attack || 0
  const sm = d.skillMultiplier || 0
  const dba = d.damageBonusArea || 1
  const dpa = d.deepenArea || 1
  const def = d.defenseArea || 1
  const res = d.resistanceArea || 1
  const critRate = ctx.critRate ?? 0
  const critDamage = ctx.critDamage ?? 1.5

  const expectedMul = 1 - critRate + critRate * critDamage

  const lines = [
    `─── ${item.name} ───`,
    `非暴 = ${attack}(攻击) × ${sm.toFixed(4)}(倍率) × ${dba.toFixed(4)}(增伤区) × ${dpa.toFixed(4)}(深化区) × ${def.toFixed(6)}(防御区) × ${res.toFixed(4)}(抗性区) = ${item.nonCrit}`,
    `暴击 = ${item.nonCrit}(非暴) × ${critDamage.toFixed(4)}(暴伤乘区) = ${item.crit}`,
    `期望 = ${item.nonCrit}(非暴) × [1 - ${fmtPercent(critRate)} + ${fmtPercent(critRate)} × ${critDamage.toFixed(4)}] = ${item.nonCrit} × ${expectedMul.toFixed(4)} = ${item.expected}`
  ]
  log(lines.join('\n'))
}

export async function calcDamage(roleDetailData, options = {}) {
  const panel = parsePanel(roleDetailData)
  const equipment = parseEquipment(roleDetailData)

  // 漂泊者特殊处理
  const isWaverider = panel.roleName === '漂泊者'
  const waveriderAttr = isWaverider ? WAVERIDER_ATTRIBUTES[String(panel.roleId)] : null
  const characterModuleName = isWaverider
    ? (waveriderAttr ? `漂泊者/${waveriderAttr}` : null)
    : panel.roleName

  const characterModuleRaw = characterModuleName
    ? await loadCharacterModule(characterModuleName)
    : null
  const characterModule = characterModuleRaw?.default || characterModuleRaw

  if (!characterModule || typeof characterModule.calc !== 'function') {
    return {
      target: options.enemyName || '无妄者',
      list: [],
      message: '暂无伤害数据'
    }
  }

  const weaponModuleRaw = equipment.weaponName
    ? await loadWeaponModule(equipment.weaponName)
    : null
  const phantomModuleRaw = equipment.phantomName
    ? await loadPhantomModule(equipment.phantomName)
    : null
  const groupModuleRaw = equipment.groupName
    ? await loadGroupModule(equipment.groupName)
    : null

  const weaponModule = weaponModuleRaw?.default || weaponModuleRaw
  const phantomModule = phantomModuleRaw?.default || phantomModuleRaw
  const groupModule = groupModuleRaw?.default || groupModuleRaw

  const enemyName = options.enemyName || '无妄者'
  const enemyModuleRaw = await loadEnemyModule(enemyName)
  const enemyModule = enemyModuleRaw?.default || enemyModuleRaw

  const enemy = enemyModule?.build
    ? enemyModule.build({ options, panel, equipment })
    : {
        name: enemyName,
        level: Number(options.enemyLevel ?? 90),
        resistance: Number(options.resistance ?? 0.1),
        ignoreDefense: Number(options.ignoreDefense ?? 0)
      }

  const context = {
    roleDetailData,
    panel,
    equipment,
    enemy,
    options,
    modules: {
      weapon: weaponModule,
      phantom: phantomModule,
      group: groupModule
    }
  }

  const displayRoleName = isWaverider && waveriderAttr ? `漂泊者(${waveriderAttr})` : panel.roleName

  log(`▼▼▼ ${displayRoleName} → ${enemy.name} (等级${panel.level} vs ${enemy.level}) | 武器:${equipment.weaponName || '-'} | 主声骸:${equipment.phantomName || '-'} | 套装:${equipment.groupName || '-'}(${equipment.groupCount || 0}件) ▼▼▼`)
  log(`面板：攻击 ${fmtNumber(panel.attack)} | 暴击 ${fmtPercent(panel.critRate)} | 暴伤 ${fmtPercent(panel.critDamage - 1)}（暴伤乘区 ${panel.critDamage.toFixed(4)}） | 共鸣效率 ${fmtPercent(panel.resonanceEfficiency)}`)

  const result = await characterModule.calc(context)

  if (Array.isArray(result?.items)) {
    for (const item of result.items) {
      logDamageBreakdown(item, {
        critRate: item?.detail?.critRate ?? panel.critRate,
        critDamage: item?.detail?.critDamage ?? panel.critDamage
      })
    }
  }
  log(`▲▲▲ ${displayRoleName} 伤害计算结束 ▲▲▲`)

  return {
    target: enemy.name || enemyName,
    ...result
  }
}
