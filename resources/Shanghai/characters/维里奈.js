import { calcSingleDamage, calcSingleHeal } from '../../../utils/damage/formula.js';
import { getPercentAttr, normalizeRoleDetailData } from '../../../utils/damage/parser.js';
import { mergeBuff } from '../../../utils/damage/buff.js';

function getSkillLevel(roleDetailData, typeName) {
  const data = normalizeRoleDetailData(roleDetailData);
  const skillList = data?.skillList || [];
  const target = skillList.find(s => s?.skill?.type === typeName);
  return target?.level || 10;
}

function getChainUnlockedCount(roleDetailData) {
  const data = normalizeRoleDetailData(roleDetailData);
  const chainList = data?.chainList || [];
  return chainList.filter(c => c?.unlocked).length;
}

// 维里奈（5★ 衍射 治疗）
// 数据来源：库街区 wiki 优先；本轮通过 BWiki 对库街区公开数据补充核对。
// 默认展示治疗定位的 3 个代表治疗量：共鸣回路、共鸣解放、协同治疗。
const VERINA_DAMAGES = {
  liberation: {
    name: '共鸣解放·草木生长伤害',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: { 1: 1.0, 2: 1.082, 3: 1.164, 4: 1.2788, 5: 1.3608, 6: 1.4551, 7: 1.5863, 8: 1.7175, 9: 1.8487, 10: 1.9881 }
  }
};

const VERINA_HEALS = {
  circuit: {
    name: '共鸣回路·星星花绽放治疗',
    levelFrom: '共鸣回路',
    flatMap: { 1: 625, 2: 750, 3: 875, 4: 1000, 5: 1032, 6: 1113, 7: 1125, 8: 1144, 9: 1163, 10: 1188 },
    percentMap: { 1: 0.1417, 2: 0.1629, 3: 0.1771, 4: 0.1983, 5: 0.2125, 6: 0.2267, 7: 0.2408, 8: 0.2550, 9: 0.2692, 10: 0.2975 }
  },
  liberation: {
    name: '共鸣解放·草木生长治疗',
    levelFrom: '共鸣解放',
    flatMap: { 1: 500, 2: 600, 3: 700, 4: 800, 5: 825, 6: 890, 7: 900, 8: 915, 9: 930, 10: 950 },
    percentMap: { 1: 0.1133, 2: 0.1303, 3: 0.1417, 4: 0.1587, 5: 0.1700, 6: 0.1813, 7: 0.1927, 8: 0.2040, 9: 0.2153, 10: 0.2380 }
  },
  coordinated: {
    name: '共鸣解放·协同攻击治疗',
    levelFrom: '共鸣解放',
    flatMap: { 1: 225, 2: 270, 3: 315, 4: 360, 5: 372, 6: 401, 7: 405, 8: 412, 9: 419, 10: 428 },
    percentMap: { 1: 0.0510, 2: 0.0587, 3: 0.0638, 4: 0.0714, 5: 0.0765, 6: 0.0816, 7: 0.0867, 8: 0.0918, 9: 0.0969, 10: 0.1071 }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '衍射伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function calcOneDamage({ roleDetailData, panel, equipment, enemy, modules, damage }) {
  const level = getSkillLevel(roleDetailData, damage.levelFrom);
  const weaponBuff = modules.weapon?.apply ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: damage.type, skillName: damage.name }) : {};
  const phantomBuff = modules.phantom?.apply ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: damage.type, skillName: damage.name }) : {};
  const groupBuff = modules.group?.apply ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: damage.type, skillName: damage.name }) : {};
  const mergedBuff = mergeBuff(weaponBuff, phantomBuff, groupBuff);
  const finalAttack = (panel.attack || 0) * (1 + (mergedBuff.attackPercent || 0)) + (mergedBuff.flatAttack || 0);
  const result = calcSingleDamage({
    attack: finalAttack,
    skillMultiplier: damage.levelMap[level] || damage.levelMap[10],
    multiplierBonus: mergedBuff.multiplierBonus || 0,
    damageBonus: getPanelDamageBonus(panel.attrMap || {}, damage.type) + (mergedBuff.damageBonus || 0),
    deepen: mergedBuff.deepen || 0,
    critRate: panel.critRate,
    critDamage: panel.critDamage,
    attackerLevel: panel.level || 90,
    enemyLevel: enemy?.level || 90,
    resistance: enemy?.resistance ?? 0.1,
    ignoreDefense: mergedBuff.ignoreDefense || enemy?.ignoreDefense || 0,
    sourceDetail: mergedBuff.sources
  });
  return { name: damage.name, ...result };
}

function getHealingBonus(panel, mergedBuff) {
  const attrMap = panel.attrMap || {};
  return getPercentAttr(attrMap, '治疗效果加成') + Number(mergedBuff.healingBonus || 0);
}

function calcOneHeal({ roleDetailData, panel, equipment, enemy, modules, heal }) {
  const level = getSkillLevel(roleDetailData, heal.levelFrom);
  const flat = heal.flatMap[level] ?? heal.flatMap[10];
  const percent = heal.percentMap[level] ?? heal.percentMap[10];

  const roleBuff = { healingBonus: 0, multiplierBonus: 0, deepen: 0, source: '维里奈·自身' };
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: 'heal', skillName: heal.name })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: 'heal', skillName: heal.name })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: 'heal', skillName: heal.name })
    : {};

  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);
  const healingBonus = getHealingBonus(panel, mergedBuff)
    + Number(weaponBuff.healingBonus || 0)
    + Number(phantomBuff.healingBonus || 0)
    + Number(groupBuff.healingBonus || 0);

  const result = calcSingleHeal({
    base: panel.attack,
    skillMultiplier: percent,
    multiplierBonus: mergedBuff.multiplierBonus || 0,
    flatHeal: flat,
    healingBonus,
    deepen: mergedBuff.deepen || 0,
    sourceDetail: mergedBuff.sources
  });

  return {
    name: heal.name,
    ...result
  };
}

export default {
  name: '维里奈',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    getChainUnlockedCount(roleDetailData);

    const items = [
      calcOneHeal({ roleDetailData, panel, equipment, enemy, modules, heal: VERINA_HEALS.circuit }),
      calcOneHeal({ roleDetailData, panel, equipment, enemy, modules, heal: VERINA_HEALS.liberation }),
      calcOneHeal({ roleDetailData, panel, equipment, enemy, modules, heal: VERINA_HEALS.coordinated }),
      calcOneDamage({ roleDetailData, panel, equipment, enemy, modules, damage: VERINA_DAMAGES.liberation })
    ];

    return {
      enemyName: enemy?.name || '无妄者',
      items
    };
  }
};
