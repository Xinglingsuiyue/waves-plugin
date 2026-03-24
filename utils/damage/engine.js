import { parsePanel, parseEquipment } from './parser.js'
import {
  loadCharacterModule,
  loadWeaponModule,
  loadPhantomModule,
  loadGroupModule,
  loadEnemyModule
} from './loader.js'

export async function calcDamage(roleDetailData, options = {}) {
  const panel = parsePanel(roleDetailData)
  const equipment = parseEquipment(roleDetailData)

  console.log('[伤害计算][panel]', JSON.stringify(panel, null, 2))
  console.log('[伤害计算][equipment]', JSON.stringify(equipment, null, 2))

  const characterModuleRaw = await loadCharacterModule(panel.roleName)
  const characterModule = characterModuleRaw?.default || characterModuleRaw

  console.log('[伤害计算][characterModule]', panel.roleName, !!characterModule)

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

  console.log('[伤害计算][weaponModule]', equipment.weaponName, !!weaponModule)
  console.log('[伤害计算][phantomModule]', equipment.phantomName, !!phantomModule)
  console.log('[伤害计算][groupModule]', equipment.groupName, !!groupModule)

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

  console.log('[伤害计算][enemy]', JSON.stringify(enemy, null, 2))

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

  const result = await characterModule.calc(context)

  console.log('[伤害计算][result]', JSON.stringify(result, null, 2))

  if (Array.isArray(result?.items)) {
    for (const item of result.items) {
      console.log('[伤害计算][itemSources]', item?.name, JSON.stringify(item?.sources || {}, null, 2))
    }
  }

  return {
    target: enemy.name || enemyName,
    ...result
  }
}
