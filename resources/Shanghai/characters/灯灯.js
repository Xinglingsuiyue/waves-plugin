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
// 灯灯
// 数据来源：库街区 Wiki entryId=1312376371368607744
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1312376371368607744",
  "name": "灯灯",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "16.0"
};

const SKILLS = {
  skill1: {
    name: "红灯·普攻一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.456, 0.4934, 0.5308, 0.5832, 0.6206, 0.6636, 0.7234, 0.7832, 0.8431, 0.9066)
  },
  skill2: {
    name: "红灯·普攻二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.083, 1.172, 1.2609, 1.385, 1.4739, 1.576, 1.718, 1.8606, 2.0026, 2.1536)
  },
  skill3: {
    name: "红灯·普攻三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.083, 1.1719, 1.2607, 1.385, 1.4739, 1.576, 1.718, 1.8602, 2.0022, 2.1532)
  },
  skill4: {
    name: "红灯·重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.665, 0.7196, 0.7742, 0.8506, 0.905, 0.9678, 1.055, 1.1422, 1.2294, 1.3222)
  },
  skill5: {
    name: "红灯·下落攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.57, 0.6168, 0.6635, 0.729, 0.7757, 0.8295, 0.9042, 0.979, 1.0538, 1.1333)
  },
  skill6: {
    name: "红灯·闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.683, 1.8216, 1.9596, 2.1527, 2.2907, 2.449, 2.6699, 2.8908, 3.1117, 3.346)
  },
  skill7: {
    name: "前扑",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.912, 0.9868, 1.0616, 1.1663, 1.2411, 1.3271, 1.4468, 1.5664, 1.6861, 1.8132)
  },
  skill8: {
    name: "后撤",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.874, 0.9457, 1.0174, 1.1177, 1.1894, 1.2718, 1.3865, 1.5011, 1.6158, 1.7376)
  },
  skill9: {
    name: "强光",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.41, 0.4437, 0.4773, 0.5244, 0.558, 0.5966, 0.6504, 0.7042, 0.758, 0.8152)
  },
  skill10: {
    name: "红灯聚光·普攻一段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.6048, 0.6544, 0.704, 0.7735, 0.8231, 0.8801, 0.9594, 1.0388, 1.1181, 1.2025)
  },
  skill11: {
    name: "红灯聚光·普攻二段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.3917, 1.5058, 1.6198, 1.7797, 1.8938, 2.0249, 2.2076, 2.3899, 2.5727, 2.7667)
  },
  skill12: {
    name: "红灯聚光·普攻三段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.5715, 1.7003, 1.8292, 2.0096, 2.1385, 2.2866, 2.4928, 2.699, 2.9052, 3.1242)
  },
  skill13: {
    name: "红灯聚光·重击",
    type: "heavy",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.887, 0.9598, 1.0326, 1.1344, 1.2072, 1.2908, 1.4072, 1.5236, 1.6398, 1.7636)
  },
  skill14: {
    name: "强化前扑",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.844, 1.9954, 2.1466, 2.3582, 2.5094, 2.6834, 2.9252, 3.1672, 3.4092, 3.6662)
  },
  skill15: {
    name: "强化后撤",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.266, 1.3699, 1.4737, 1.619, 1.7228, 1.8422, 2.0083, 2.1744, 2.3405, 2.517)
  },
  skill16: {
    name: "强光穿射每段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.375, 0.4058, 0.4365, 0.4796, 0.5103, 0.5457, 0.5949, 0.6441, 0.6933, 0.7456)
  },
  skill17: {
    name: "啾啾专送",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(4.8, 5.1936, 5.5872, 6.1383, 6.5319, 6.9845, 7.6143, 8.244, 8.8738, 9.5429)
  },
  skill18: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.8502, 0.9198, 0.9894, 1.0872, 1.1568, 1.2369, 1.3485, 1.4601, 1.5714, 1.6899)
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
  name: "灯灯",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill17",
      "skill14",
      "skill12"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1312376371368607744', items };
  }
};
