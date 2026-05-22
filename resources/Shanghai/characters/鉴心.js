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
// 鉴心
// 数据来源：库街区 Wiki entryId=1242295527595823104
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1242295527595823104",
  "name": "鉴心",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "34.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.3494, 0.378, 0.4067, 0.4468, 0.4754, 0.5084, 0.5542, 0.6001, 0.6459, 0.6946)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6699, 0.7249, 0.7798, 0.8568, 0.9115, 0.9748, 1.0628, 1.1505, 1.2384, 1.3318)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.84, 0.9088, 0.9776, 1.074, 1.1428, 1.222, 1.3324, 1.4424, 1.5528, 1.67)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5704, 0.6172, 0.6639, 0.7294, 0.7762, 0.83, 0.9048, 0.9796, 1.0545, 1.134)
  },
  skill5: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6341, 0.6861, 0.7381, 0.8109, 0.8629, 0.9227, 1.0059, 1.0891, 1.1723, 1.2607)
  },
  skill6: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.62, 0.6709, 0.7217, 0.7929, 0.8437, 0.9022, 0.9836, 1.0649, 1.1462, 1.2327)
  },
  skill7: {
    name: "极限闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.2322, 1.3331, 1.4343, 1.5756, 1.6767, 1.7928, 1.9545, 2.1161, 2.2776, 2.4495)
  },
  skill8: {
    name: "行气反击",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.683, 1.8211, 1.9591, 2.1523, 2.2903, 2.449, 2.6698, 2.8906, 3.1114, 3.346)
  },
  skill9: {
    name: "降气反击",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.3014, 1.4081, 1.5148, 1.6642, 1.7709, 1.8936, 2.0644, 2.2351, 2.4059, 2.5873)
  },
  skill10: {
    name: "冲拳",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.25, 1.3525, 1.455, 1.5985, 1.701, 1.8189, 1.9829, 2.1469, 2.3109, 2.4852)
  },
  skill11: {
    name: "小周天震气",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.7, 0.7574, 0.8148, 0.8952, 0.9526, 1.0186, 1.1105, 1.2023, 1.2941, 1.3917)
  },
  skill12: {
    name: "大周天·内震气",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.9, 2.0558, 2.2116, 2.4298, 2.5856, 2.7647, 3.014, 3.2633, 3.5126, 3.7774)
  },
  skill13: {
    name: "大周天·外震气",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(2.6, 2.8132, 3.0264, 3.3249, 3.5381, 3.7833, 4.1244, 4.4655, 4.8067, 5.1691)
  },
  skill14: {
    name: "推手",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.1, 1.1902, 1.2804, 1.4067, 1.4969, 1.6007, 1.745, 1.8893, 2.0336, 2.187)
  },
  skill15: {
    name: "共鸣解放炸裂",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(3.2, 3.4624, 3.7248, 4.0922, 4.3546, 4.6564, 5.0762, 5.496, 5.9159, 6.362)
  },
  skill16: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.85, 0.9199, 0.9895, 1.087, 1.1569, 1.237, 1.3485, 1.46, 1.5715, 1.69)
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
  name: "鉴心",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill15",
      "skill13",
      "skill12"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1242295527595823104', items };
  }
};
