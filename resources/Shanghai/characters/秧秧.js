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
// 秧秧
// 数据来源：库街区 Wiki entryId=1233436648562032640
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1233436648562032640",
  "name": "秧秧",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "50.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.225, 0.2434, 0.2618, 0.2877, 0.3061, 0.3273, 0.3569, 0.3864, 0.4159, 0.4473)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.3, 0.3246, 0.3492, 0.3836, 0.4082, 0.4365, 0.4758, 0.5152, 0.5546, 0.5964)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.471, 0.5096, 0.5482, 0.6022, 0.6408, 0.6852, 0.747, 0.8088, 0.8706, 0.9362)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.9977, 1.077, 1.1586, 1.2729, 1.3546, 1.4483, 1.579, 1.7096, 1.84, 1.9787)
  },
  skill5: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.3, 0.3246, 0.3492, 0.3834, 0.408, 0.4365, 0.4758, 0.5151, 0.5544, 0.5964)
  },
  skill6: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.465, 0.5031, 0.5412, 0.5946, 0.6327, 0.6766, 0.7376, 0.7986, 0.8596, 0.9244)
  },
  skill7: {
    name: "风吟",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5362, 0.5802, 0.6242, 0.6857, 0.7297, 0.7802, 0.8506, 0.921, 0.9913, 1.0661)
  },
  skill8: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.876, 0.9478, 1.0196, 1.1202, 1.192, 1.2746, 1.3894, 1.5044, 1.6194, 1.7414)
  },
  skill9: {
    name: "技能",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.737, 1.8792, 2.0215, 2.2211, 2.3634, 2.5273, 2.7552, 2.9831, 3.2111, 3.4531)
  },
  skill10: {
    name: "风袭",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.3824, 0.4138, 0.4452, 0.489, 0.5204, 0.5564, 0.6066, 0.6568, 0.707, 0.7604)
  },
  skill11: {
    name: "释羽",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.8221, 1.9717, 2.1208, 2.3304, 2.48, 2.6517, 2.8906, 3.13, 3.3689, 3.6227)
  },
  skill12: {
    name: "技能",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(4.6862, 5.0703, 5.4545, 5.9925, 6.3766, 6.8186, 7.4341, 8.0485, 8.664, 9.3166)
  },
  skill13: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.8, 0.8656, 0.9312, 1.023, 1.0886, 1.164, 1.269, 1.374, 1.4788, 1.5904)
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
  name: "秧秧",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill12",
      "skill9",
      "skill11"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1233436648562032640', items };
  }
};
