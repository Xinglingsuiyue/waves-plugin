import { calcSingleDamage } from '../../../utils/damage/formula.js';
import { getPercentAttr, normalizeRoleDetailData } from '../../../utils/damage/parser.js';
import { mergeBuff } from '../../../utils/damage/buff.js';

function getSkillLevel(roleDetailData, typeName) {
  const data = normalizeRoleDetailData(roleDetailData);
  const skillList = data?.skillList || [];
  const target = skillList.find(s => s?.skill?.type === typeName);
  return target?.level || 10;
}

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = value;
  return map;
}, {});

// =============================================================
// 桃祈
// 数据来源：库街区 Wiki entryId=1240051046261592064
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1240051046261592064",
  "name": "桃祈",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "40.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4534, 0.4906, 0.5278, 0.5799, 0.617, 0.6598, 0.7193, 0.7788, 0.8383, 0.9015)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4267, 0.4617, 0.4967, 0.5457, 0.5807, 0.6209, 0.6769, 0.7329, 0.7889, 0.8484)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.56, 0.606, 0.6519, 0.7162, 0.7621, 0.8149, 0.8884, 0.9618, 1.0353, 1.1134)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.36, 1.4716, 1.5831, 1.7392, 1.8507, 1.979, 2.1574, 2.3358, 2.5143, 2.7039)
  },
  skill5: {
    name: "重击攻击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.1084, 1.1993, 1.2902, 1.4175, 1.5084, 1.6129, 1.7583, 1.9037, 2.0491, 2.2037)
  },
  skill6: {
    name: "重击时伤害减免",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 0.35)
  },
  skill7: {
    name: "后发制人",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.3959, 0.4284, 0.4608, 0.5063, 0.5387, 0.5761, 0.628, 0.6799, 0.7319, 0.787)
  },
  skill8: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.62, 0.6709, 0.7217, 0.7929, 0.8437, 0.9022, 0.9836, 1.0649, 1.1462, 1.2327)
  },
  skill9: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.25, 1.3525, 1.455, 1.5985, 1.701, 1.8189, 1.9829, 2.1469, 2.3109, 2.4852)
  },
  skill10: {
    name: "技能",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.6786, 0.7343, 0.7899, 0.8678, 0.9235, 0.9875, 1.0765, 1.1655, 1.2546, 1.3492)
  },
  skill11: {
    name: "御反之隙第一段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.4336, 0.4692, 0.5047, 0.5545, 0.59, 0.6309, 0.6878, 0.7447, 0.8016, 0.862)
  },
  skill12: {
    name: "御反之隙第二段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.558, 0.6038, 0.6495, 0.7136, 0.7593, 0.8119, 0.8851, 0.9583, 1.0316, 1.1093)
  },
  skill13: {
    name: "御反之隙第三段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.7314, 0.7914, 0.8514, 0.9353, 0.9953, 1.0643, 1.1602, 1.2562, 1.3522, 1.4541)
  },
  skill14: {
    name: "御反之隙第一段护盾",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.1125, 0.117, 0.1215, 0.1282, 0.1372, 0.1462, 0.1631, 0.1822, 0.2025, 0.2362)
  },
  skill15: {
    name: "御反之隙第二段护盾",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.1687, 0.1755, 0.1822, 0.1923, 0.2058, 0.2193, 0.2446, 0.2733, 0.3037, 0.3543)
  },
  skill16: {
    name: "御反之隙第三段护盾",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.2812, 0.2925, 0.3037, 0.3206, 0.3431, 0.3656, 0.4078, 0.4556, 0.5062, 0.5906)
  },
  skill17: {
    name: "技能",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(2.262, 2.4475, 2.633, 2.8927, 3.0782, 3.2915, 3.5883, 3.885, 4.1818, 4.4971)
  },
  skill18: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(1.05, 1.1361, 1.2222, 1.3428, 1.4289, 1.5279, 1.6657, 1.8034, 1.9412, 2.0876)
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

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const weaponBuff = modules.weapon?.apply ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const phantomBuff = modules.phantom?.apply ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const groupBuff = modules.group?.apply ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const mergedBuff = mergeBuff(weaponBuff, phantomBuff, groupBuff);
  const finalAttack = panel.attack * (1 + (mergedBuff.attackPercent || 0)) + (mergedBuff.flatAttack || 0);
  const result = calcSingleDamage({
    attack: finalAttack,
    skillMultiplier: skill.levelMap[level] || skill.levelMap[10],
    multiplierBonus: mergedBuff.multiplierBonus || 0,
    damageBonus: getPanelDamageBonus(panel.attrMap || {}, skill.type) + (mergedBuff.damageBonus || 0),
    deepen: mergedBuff.deepen || 0,
    critRate: panel.critRate,
    critDamage: panel.critDamage,
    attackerLevel: panel.level || 90,
    enemyLevel: enemy?.level || 90,
    resistance: enemy?.resistance ?? 0.1,
    ignoreDefense: mergedBuff.ignoreDefense || enemy?.ignoreDefense || 0,
    sourceDetail: mergedBuff.sources
  });
  return { name: skill.name, ...result };
}

export default {
  name: "桃祈",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill17",
      "skill10",
      "skill18"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1240051046261592064', items };
  }
};
