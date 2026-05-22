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
// 釉瑚
// 数据来源：库街区 Wiki entryId=1287721354505175040
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1287721354505175040",
  "name": "釉瑚",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "31.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2383, 0.2579, 0.2774, 0.3048, 0.3243, 0.3468, 0.378, 0.4093, 0.4405, 0.4738)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4586, 0.4962, 0.5339, 0.5865, 0.624, 0.6673, 0.7274, 0.7876, 0.8477, 0.9117)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4255, 0.4604, 0.4953, 0.5442, 0.579, 0.6191, 0.6749, 0.7307, 0.7866, 0.8458)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5853, 0.6333, 0.6813, 0.7484, 0.7964, 0.8516, 0.9284, 1.0052, 1.082, 1.1635)
  },
  skill5: {
    name: "重击·落霜坠",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4362, 0.4722, 0.5076, 0.5574, 0.5934, 0.6348, 0.6918, 0.7488, 0.8058, 0.867)
  },
  skill6: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.62, 0.6709, 0.7217, 0.7929, 0.8437, 0.9022, 0.9836, 1.0649, 1.1462, 1.2327)
  },
  skill7: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.8718, 0.9438, 1.0152, 1.1148, 1.1868, 1.269, 1.383, 1.4976, 1.6116, 1.7334)
  },
  skill8: {
    name: "技能",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.787, 0.8516, 0.9161, 1.0064, 1.071, 1.1452, 1.2484, 1.3517, 1.4549, 1.5646)
  },
  skill9: {
    name: "匣中问祯治疗量",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.39, 0.4056, 0.4212, 0.4446, 0.4758, 0.507, 0.5655, 0.6318, 0.702, 0.819)
  },
  skill10: {
    name: "编钟",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.4748, 1.5958, 1.7169, 1.886, 2.007, 2.146, 2.3395, 2.5329, 2.7264, 2.9322)
  },
  skill11: {
    name: "如意",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.5314, 1.6569, 1.7825, 1.9584, 2.0839, 2.2283, 2.4292, 2.6302, 2.8311, 3.0445)
  },
  skill12: {
    name: "鼎",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.4377, 1.555, 1.6729, 1.8379, 1.9559, 2.0917, 2.2799, 2.4687, 2.6569, 2.857)
  },
  skill13: {
    name: "面具",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.7416, 0.8022, 0.8627, 0.9476, 1.009, 1.0786, 1.1762, 1.2728, 1.3704, 1.4734)
  },
  skill14: {
    name: "诗中物技能",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.872, 2.026, 2.179, 2.394, 2.547, 2.724, 2.969, 3.215, 3.46, 3.721)
  },
  skill15: {
    name: "诗中物治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.442, 0.4597, 0.4774, 0.5039, 0.5392, 0.5746, 0.6409, 0.716, 0.7956, 0.9282)
  },
  skill16: {
    name: "双关额外治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.26, 0.2704, 0.2808, 0.2964, 0.3172, 0.338, 0.377, 0.4212, 0.468, 0.546)
  },
  skill17: {
    name: "技能",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(1.6458, 1.7807, 1.9157, 2.1046, 2.2395, 2.3947, 2.6106, 2.8266, 3.0425, 3.2719)
  },
  skill18: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(1, 1.082, 1.164, 1.2789, 1.3609, 1.4552, 1.5864, 1.7176, 1.8488, 1.9882)
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
  name: "釉瑚",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill17",
      "skill14",
      "skill11"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1287721354505175040', items };
  }
};
