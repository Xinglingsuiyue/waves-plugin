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
// 卜灵
// 数据来源：库街区 Wiki entryId=1429461100965666816
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1429461100965666816",
  "name": "卜灵",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "17.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2086, 0.2256, 0.2428, 0.2668, 0.2838, 0.3034, 0.3308, 0.3582, 0.3856, 0.4146)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.3366, 0.3642, 0.3918, 0.4304, 0.458, 0.4898, 0.5338, 0.578, 0.6222, 0.669)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2366, 0.256, 0.2754, 0.3026, 0.322, 0.3442, 0.3752, 0.4062, 0.4374, 0.4702)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.471, 0.5097, 0.5483, 0.6024, 0.641, 0.6854, 0.7472, 0.809, 0.8708, 0.9364)
  },
  skill5: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.372, 0.4026, 0.4331, 0.4758, 0.5063, 0.5413, 0.5902, 0.639, 0.6878, 0.7396)
  },
  skill6: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2366, 0.256, 0.2754, 0.3026, 0.322, 0.3442, 0.3752, 0.4062, 0.4374, 0.4702)
  },
  skill7: {
    name: "重击·山雷颐",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.9, 0.9738, 1.0476, 1.151, 1.2248, 1.3096, 1.4277, 1.5458, 1.6639, 1.7893)
  },
  skill8: {
    name: "重击·雷山小过",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.45, 0.4869, 0.5238, 0.5755, 0.6124, 0.6548, 0.7139, 0.7729, 0.832, 0.8947)
  },
  skill9: {
    name: "重击·艮为山治疗量",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.68, 0.7358, 0.7916, 0.8696, 0.9254, 0.9895, 1.0787, 1.1679, 1.2572, 1.352)
  },
  skill10: {
    name: "重击·震为雷治疗量",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.092, 0.0996, 0.1071, 0.1177, 0.1252, 0.1339, 0.146, 0.1581, 0.1701, 0.183)
  },
  skill11: {
    name: "引雷符",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.2937, 0.3178, 0.3419, 0.3756, 0.3997, 0.4274, 0.4659, 0.5045, 0.543, 0.584)
  },
  skill12: {
    name: "飞雷诀·归一",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(2.7, 2.9214, 3.1428, 3.4528, 3.6742, 3.9288, 4.2831, 4.6373, 4.9915, 5.3679)
  },
  skill13: {
    name: "飞雷诀",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(1.8, 1.9476, 2.0952, 2.3019, 2.4495, 2.6192, 2.8554, 3.0915, 3.3277, 3.5786)
  },
  skill14: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.6594, 0.7135, 0.7676, 0.8433, 0.8974, 0.9595, 1.0461, 1.1326, 1.2191, 1.311)
  },
  skill15: {
    name: "技能治疗量",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953)
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
  name: "卜灵",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill12",
      "skill13",
      "skill14"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1429461100965666816', items };
  }
};
