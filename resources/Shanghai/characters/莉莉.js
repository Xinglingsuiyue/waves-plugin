import { calcSingleDamage, calcSingleHeal, calcSingleShield } from '../../../utils/damage/formula.js';
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

function getFinalAttack(panel, buff = {}) {
  const attack = Number(panel?.attack || 0);
  return attack * (1 + Number(buff?.attackPercent || 0)) + Number(buff?.flatAttack || 0);
}

function getFinalHp(panel, buff = {}) {
  const hp = Number(panel?.hp || 0);
  return hp * (1 + Number(buff?.hpPercent || 0)) + Number(buff?.flatHp || 0);
}

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = value;
  return map;
}, {});


const WIKI_DETAIL = {
  id: '1512',
  name: '莉莉',
  orgFullName: '角色组 > 共鸣者',
  lastUpdateTime: '2026-11-12',
  currentVersion: '3.8'
};

const LILY_SKILLS = {
  normal1: {
    name: '普攻第一段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(0.32, 0.3463, 0.3725, 0.4093, 0.4355, 0.4657, 0.5077, 0.5496, 0.5916, 0.6362)
  },
  normal2: {
    name: '普攻第二段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(0.5864, 0.6348, 0.6828, 0.75, 0.798, 0.8536, 0.9304, 1.0072, 1.0844, 1.166)
  },
  normal3: {
    name: '普攻第三段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(0.48, 0.5194, 0.5588, 0.6139, 0.6532, 0.6985, 0.7615, 0.8244, 0.8874, 0.9543)
  },
  normal4: {
    name: '普攻第四段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(0.7736, 0.8372, 0.9008, 0.9896, 1.0528, 1.126, 1.2272, 1.3288, 1.4304, 1.538)
  },
  plunge: {
    name: '下落攻击',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(0.576, 0.6233, 0.6705, 0.7366, 0.7839, 0.8382, 0.9138, 0.9893, 1.0649, 1.1452)
  },
  dodge: {
    name: '闪避反击',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(1.2, 1.2984, 1.3968, 1.5346, 1.633, 1.7462, 1.9036, 2.061, 2.2185, 2.3858)
  },
  // 共鸣技能·美梦调和 / 梦魇调和 共用同一倍率
  dreamHarmony: {
    name: '共鸣技能·美梦调和',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(0.8, 0.8656, 0.9312, 1.0231, 1.0887, 1.1641, 1.2691, 1.374, 1.479, 1.5905)
  },
  nightmareHarmony: {
    name: '共鸣技能·梦魇调和',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(0.8, 0.8656, 0.9312, 1.0231, 1.0887, 1.1641, 1.2691, 1.374, 1.479, 1.5905)
  },
  // 共鸣解放领域内的持续伤害（单跳）
  dreamBind: {
    name: '共鸣解放·梦缚持续伤害',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(0.1, 0.1082, 0.1164, 0.1279, 0.1361, 0.1456, 0.1587, 0.1718, 0.1849, 0.1989)
  },
  // 重击·编织的梦之童话：24.86% × 20 段
  weaveDream: {
    name: '重击·编织的梦之童话',
    type: 'heavy',
    levelFrom: '共鸣回路',
    levelMap: levelMap(2.5, 2.706, 2.91, 3.198, 3.402, 3.638, 3.966, 4.294, 4.622, 4.972)
  },
  // 重击·编织的梦之魇影：21.61% × 23 段
  weaveNightmare: {
    name: '重击·编织的梦之魇影',
    type: 'heavy',
    levelFrom: '共鸣回路',
    levelMap: levelMap(2.5001, 2.7071, 2.9118, 3.197, 3.404, 3.6386, 3.9675, 4.2941, 4.623, 4.9703)
  },
  // 重击·梦之童话的落幕：按生命上限结算（不享受共鸣效率暴击转化）
  finaleDream: {
    name: '重击·梦之童话的落幕',
    type: 'heavy',
    levelFrom: '共鸣回路',
    hpScaling: true,
    levelMap: levelMap(0.18, 0.1948, 0.2096, 0.2302, 0.245, 0.262, 0.2856, 0.3092, 0.3328, 0.3579)
  },
  // 重击·梦之魇影的终结：按生命上限结算（不享受共鸣效率暴击转化）
  finaleNightmare: {
    name: '重击·梦之魇影的终结',
    type: 'heavy',
    levelFrom: '共鸣回路',
    hpScaling: true,
    levelMap: levelMap(0.18, 0.1948, 0.2096, 0.2302, 0.245, 0.262, 0.2856, 0.3092, 0.3328, 0.3579)
  },
  // 变奏技能·初绽：54.36% + 54.36% × 3
  introBloom: {
    name: '变奏技能·初绽',
    type: 'intro',
    levelFrom: '变奏技能',
    levelMap: levelMap(1.0936, 1.1836, 1.2732, 1.3988, 1.4884, 1.5916, 1.7348, 1.8784, 2.022, 2.1744)
  },
  // 变奏技能·永绽：按生命上限结算，且享受共鸣效率暴击 / 暴伤加成
  introEternal: {
    name: '变奏技能·永绽',
    type: 'intro',
    levelFrom: '变奏技能',
    hpScaling: true,
    erCrit: true,
    levelMap: levelMap(0.1816, 0.1965, 0.2114, 0.2322, 0.2471, 0.2642, 0.288, 0.3118, 0.3357, 0.361)
  }
};

// 治疗项：flat 为固定治疗量，pct 为生命上限百分比
const LILY_HEALS = {
  // 共鸣解放·梦乡治疗量：每 3 秒回复
  dreamLand: {
    name: '共鸣解放·梦乡治疗量',
    levelFrom: '共鸣解放',
    flatMap: levelMap(287, 321, 359, 402, 454, 503, 511, 523, 531, 546),
    percentMap: levelMap(0.0052, 0.0054, 0.0056, 0.0059, 0.0063, 0.0068, 0.0075, 0.0084, 0.0094, 0.0109)
  },
  // 重击·编织的梦之童话治疗量：每秒回复
  weave: {
    name: '重击·编织的梦之童话治疗量',
    levelFrom: '共鸣回路',
    flatMap: levelMap(185, 207, 231, 259, 292, 323, 329, 336, 342, 351),
    percentMap: levelMap(0.0033, 0.0035, 0.0036, 0.0038, 0.0041, 0.0043, 0.0048, 0.0054, 0.006, 0.007)
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  const elementKeys = ['冷凝伤害加成', '热熔伤害加成', '导电伤害加成', '气动伤害加成', '衍射伤害加成', '湮灭伤害加成'];
  let total = elementKeys.reduce((sum, key) => sum + getPercentAttr(attrMap, key), 0);
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function getPanelHealingBonus(attrMap) {
  return getPercentAttr(attrMap, '治疗效果加成') + getPercentAttr(attrMap, '治疗加成');
}

function getPanelShieldBonus(attrMap) {
  return getPercentAttr(attrMap, '护盾加成') + getPercentAttr(attrMap, '护盾效果加成');
}

// 共鸣效率转化暴击 / 暴伤：>100% 时每超 1% 暴击 +0.5%（上限 80%）、暴伤 +1%（上限 160%）
function getResonanceEfficiencyCrit(panel) {
  const efficiency = Number(panel?.resonanceEfficiency || 0);
  const excess = Math.max(0, efficiency - 1);
  return {
    critRate: Math.min(0.80, excess * 0.50),
    critDamage: Math.min(1.60, excess * 1.00)
  };
}

function getRoleSelfBuff({ skillName, chainCount }) {
  const buff = {
    attackPercent: 0, damageBonus: 0, critRate: 0, critDamage: 0,
    deepen: 0, multiplierBonus: 0, ignoreDefense: 0, source: '莉莉·自身'
  };

  // S6「愿我的美梦永不落幕」：落幕 / 终结 衍射伤害额外 +100%，永绽 衍射伤害额外 +700%。
  if (chainCount >= 6) {
    if (skillName === '重击·梦之童话的落幕' || skillName === '重击·梦之魇影的终结') {
      buff.damageBonus += 1.00;
    }
    if (skillName === '变奏技能·永绽') buff.damageBonus += 7.00;
  }

  return buff;
}

function applyModules({ roleDetailData, panel, equipment, enemy, modules, options, skillType, skillName }) {
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType, skillName, options })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType, skillName, options })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType, skillName, options })
    : {};
  return { weaponBuff, phantomBuff, groupBuff, mergedBuff: mergeBuff(weaponBuff, phantomBuff, groupBuff) };
}

function calcOneDamage({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = LILY_SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const chainCount = getChainUnlockedCount(roleDetailData);
  const { mergedBuff } = applyModules({
    roleDetailData, panel, equipment, enemy, modules, options,
    skillType: skill.type, skillName: skill.name
  });
  const roleBuff = getRoleSelfBuff({ skillName: skill.name, chainCount });

  const baseValue = skill.hpScaling
    ? getFinalHp(panel, mergedBuff)
    : getFinalAttack(panel, mergedBuff);

  const erCrit = skill.erCrit ? getResonanceEfficiencyCrit(panel) : { critRate: 0, critDamage: 0 };

  return {
    name: skill.name,
    ...calcSingleDamage({
      attack: baseValue,
      skillMultiplier: skill.levelMap[level] || skill.levelMap[10],
      multiplierBonus: mergedBuff.multiplierBonus || 0,
      damageBonus: getPanelDamageBonus(panel.attrMap || {}, skill.type)
        + Number(mergedBuff.damageBonus || 0)
        + roleBuff.damageBonus,
      deepen: Number(mergedBuff.deepen || 0),
      critRate: panel.critRate + Number(mergedBuff.critRate || 0) + erCrit.critRate,
      critDamage: panel.critDamage + Number(mergedBuff.critDamage || 0) + erCrit.critDamage,
      attackerLevel: panel.level || 90,
      enemyLevel: enemy?.level || 90,
      resistance: enemy?.resistance ?? 0.1,
      ignoreDefense: Math.max(Number(mergedBuff.ignoreDefense || 0), Number(enemy?.ignoreDefense || 0)),
      sourceDetail: mergedBuff.sources
    })
  };
}

function calcOneHeal({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = LILY_HEALS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const chainCount = getChainUnlockedCount(roleDetailData);
  const { mergedBuff } = applyModules({
    roleDetailData, panel, equipment, enemy, modules, options,
    skillType: 'heal', skillName: skill.name
  });

  // S4「愿您的过往沉入静港」：梦乡提供的治疗量 +30%（仅共鸣解放·梦乡治疗量）。
  const chainHealBonus = chainCount >= 4 && skillKey === 'dreamLand' ? 0.30 : 0;
  // 祈梦之愿：每 25 秒 1 次，使本次编织治疗量提升 400%（默认按已持有计入）。
  const prayerWishBonus = skillKey === 'weave' && (options?.lilyPrayerWish ?? true) ? 4.00 : 0;

  return {
    name: skill.name,
    ...calcSingleHeal({
      base: getFinalHp(panel, mergedBuff),
      skillMultiplier: skill.percentMap[level] || skill.percentMap[10],
      flatHeal: skill.flatMap[level] || skill.flatMap[10],
      multiplierBonus: mergedBuff.multiplierBonus || 0,
      healingBonus: getPanelHealingBonus(panel.attrMap || {})
        + Number(mergedBuff.healingBonus || 0)
        + chainHealBonus
        + prayerWishBonus,
      deepen: Number(mergedBuff.deepen || 0),
      sourceDetail: mergedBuff.sources
    })
  };
}

function calcShield({ roleDetailData, panel, equipment, enemy, modules, options }) {
  const { weaponBuff, phantomBuff, groupBuff, mergedBuff } = applyModules({
    roleDetailData, panel, equipment, enemy, modules, options,
    skillType: 'liberation', skillName: '共鸣解放·坠于幻梦摇篮'
  });

  // 共鸣解放：获得自身生命上限 100% 的护盾，持续 4 秒。
  // mergeBuff 不透传 shieldBonus，故按各模块返回值手动累加。
  const shieldBonus = getPanelShieldBonus(panel.attrMap || {})
    + Number(weaponBuff.shieldBonus || 0)
    + Number(phantomBuff.shieldBonus || 0)
    + Number(groupBuff.shieldBonus || 0);

  return {
    name: '共鸣解放·护盾',
    ...calcSingleShield({
      base: getFinalHp(panel, mergedBuff),
      skillMultiplier: 1.00,
      shieldBonus,
      sourceDetail: mergedBuff.sources
    })
  };
}

export default {
  name: '莉莉',
  wiki: WIKI_DETAIL,
  skills: LILY_SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    // 只展示有效输出/治疗/护盾项；编织的梦之童话、梦缚持续伤害、美梦调和数值过低，不再展示。
    const items = [
      calcOneDamage({ ...args, skillKey: 'finaleDream' }),
      calcOneDamage({ ...args, skillKey: 'introEternal' }),
      calcOneHeal({ ...args, skillKey: 'dreamLand' }),
      calcOneHeal({ ...args, skillKey: 'weave' }),
      calcShield({ ...args })
    ].filter(Boolean);

    return {
      enemyName: enemy?.name || '无妄者',
      source: 'kuoruo 3.8 角色数据（roleId=1512）',
      items
    };
  }
};
