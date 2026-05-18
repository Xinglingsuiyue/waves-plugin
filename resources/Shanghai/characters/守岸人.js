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

// 守岸人（5★ 衍射 治疗/辅助）
// 数据来源：库街区角色详情优先；本轮用本地 CharacterMAX 缓存与 BWiki 倍率页交叉核对。
// 治疗/伤害百分比按生命值基底，默认展示 3 个代表治疗项 + 2 个关键伤害项。
const SHOREKEEPER_HEALS = {
  skill: {
    name: '共鸣技能·混沌理论治疗',
    levelFrom: '共鸣技能',
    flatMap: { 1: 660, 2: 715, 3: 769, 4: 845, 5: 899, 6: 961, 7: 1047, 8: 1134, 9: 1221, 10: 1313 },
    percentMap: { 1: 0.0300, 2: 0.0325, 3: 0.0350, 4: 0.0384, 5: 0.0409, 6: 0.0437, 7: 0.0476, 8: 0.0516, 9: 0.0555, 10: 0.0597 }
  },
  liberation: {
    name: '共鸣解放·终末回环持续治疗',
    levelFrom: '共鸣解放',
    flatMap: { 1: 220, 2: 239, 3: 257, 4: 282, 5: 300, 6: 321, 7: 349, 8: 378, 9: 407, 10: 438 },
    percentMap: { 1: 0.0120, 2: 0.0130, 3: 0.0140, 4: 0.0154, 5: 0.0164, 6: 0.0175, 7: 0.0191, 8: 0.0207, 9: 0.0222, 10: 0.0239 }
  },
  insight: {
    name: '变奏技能·洞悉治疗',
    levelFrom: '变奏技能',
    flatMap: { 1: 145, 2: 157, 3: 169, 4: 186, 5: 198, 6: 211, 7: 231, 8: 250, 9: 269, 10: 289 },
    percentMap: { 1: 0.0066, 2: 0.0072, 3: 0.0077, 4: 0.0085, 5: 0.0090, 6: 0.0097, 7: 0.0105, 8: 0.0114, 9: 0.0123, 10: 0.0132 }
  }
};

const SHOREKEEPER_DAMAGES = {
  liberation: {
    name: '共鸣解放·终末回环伤害',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: { 1: 0.2470, 2: 0.2673, 3: 0.2875, 4: 0.3159, 5: 0.3361, 6: 0.3594, 7: 0.3918, 8: 0.4242, 9: 0.4566, 10: 0.4910 }
  },
  insight: {
    name: '变奏技能·洞悉伤害',
    type: 'liberation',
    levelFrom: '变奏技能',
    levelMap: { 1: 0.0988 * 3, 2: 0.1069 * 3, 3: 0.1150 * 3, 4: 0.1264 * 3, 5: 0.1345 * 3, 6: 0.1438 * 3, 7: 0.1567 * 3, 8: 0.1697 * 3, 9: 0.1826 * 3, 10: 0.1964 * 3 },
    forceCrit: true
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '衍射伤害加成');
  if (skillType === 'liberation') {
    total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  }
  return total;
}

function getRoleDamageBuff({ skill, chainCount }) {
  const buff = {
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    source: '守岸人·自身'
  };

  if (chainCount >= 6 && skill.name === '变奏技能·洞悉伤害') {
    buff.multiplierBonus += 0.42;
    buff.critDamage += 5.00;
  }

  return buff;
}

function calcOneDamage({ roleDetailData, panel, equipment, enemy, modules, skill }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const multiplier = skill.levelMap[level] || skill.levelMap[10];

  const roleBuff = getRoleDamageBuff({ skill, chainCount });
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name })
    : {};

  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);
  const extraCritDamage = Number(roleBuff.critDamage || 0) + Number(weaponBuff.critDamage || 0)
                        + Number(phantomBuff.critDamage || 0) + Number(groupBuff.critDamage || 0);
  const extraCritRate = Number(roleBuff.critRate || 0) + Number(weaponBuff.critRate || 0)
                      + Number(phantomBuff.critRate || 0) + Number(groupBuff.critRate || 0);
  const critRate = skill.forceCrit ? 1 : panel.critRate + extraCritRate;

  const result = calcSingleDamage({
    attack: panel.hp,
    skillMultiplier: multiplier,
    multiplierBonus: mergedBuff.multiplierBonus || 0,
    damageBonus: getPanelDamageBonus(panel.attrMap || {}, skill.type) + (mergedBuff.damageBonus || 0),
    deepen: mergedBuff.deepen || 0,
    critRate,
    critDamage: panel.critDamage + extraCritDamage,
    attackerLevel: panel.level || 90,
    enemyLevel: enemy?.level || 90,
    resistance: enemy?.resistance ?? 0.1,
    ignoreDefense: mergedBuff.ignoreDefense || enemy?.ignoreDefense || 0,
    sourceDetail: mergedBuff.sources
  });

  return { name: skill.name, ...result };
}

function calcOneHeal({ roleDetailData, panel, equipment, enemy, modules, heal }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const level = getSkillLevel(roleDetailData, heal.levelFrom);
  const flat = heal.flatMap[level] ?? heal.flatMap[10];
  const percent = heal.percentMap[level] ?? heal.percentMap[10];

  const roleBuff = { healingBonus: 0, multiplierBonus: 0, deepen: 0, source: '守岸人·自身' };
  if (chainCount >= 4 && heal.name.includes('混沌理论')) {
    roleBuff.healingBonus += 0.70;
  }

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
  const healingBonus = getPercentAttr(panel.attrMap || {}, '治疗效果加成')
    + Number(roleBuff.healingBonus || 0)
    + Number(weaponBuff.healingBonus || 0)
    + Number(phantomBuff.healingBonus || 0)
    + Number(groupBuff.healingBonus || 0);

  const result = calcSingleHeal({
    base: panel.hp,
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
  name: '守岸人',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const items = [
      calcOneHeal({ roleDetailData, panel, equipment, enemy, modules, heal: SHOREKEEPER_HEALS.skill }),
      calcOneHeal({ roleDetailData, panel, equipment, enemy, modules, heal: SHOREKEEPER_HEALS.liberation }),
      calcOneHeal({ roleDetailData, panel, equipment, enemy, modules, heal: SHOREKEEPER_HEALS.insight }),
      calcOneDamage({ roleDetailData, panel, equipment, enemy, modules, skill: SHOREKEEPER_DAMAGES.liberation }),
      calcOneDamage({ roleDetailData, panel, equipment, enemy, modules, skill: SHOREKEEPER_DAMAGES.insight })
    ];

    return {
      enemyName: enemy?.name || '无妄者',
      items
    };
  }
};
