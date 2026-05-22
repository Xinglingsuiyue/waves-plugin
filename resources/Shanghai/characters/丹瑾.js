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
// 丹瑾
// 数据来源：库街区 Wiki entryId=1233430505140629504
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1233430505140629504",
  "name": "丹瑾",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2026-05-09",
  "currentVersion": "62.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.288, 0.3117, 0.3353, 0.3683, 0.392, 0.4191, 0.4569, 0.4947, 0.5325, 0.5726)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.296, 0.3203, 0.3446, 0.3786, 0.4028, 0.4308, 0.4696, 0.5084, 0.5473, 0.5885)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953)
  },
  skill4: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5601, 0.606, 0.6519, 0.7164, 0.7623, 0.8151, 0.8886, 0.9618, 1.0353, 1.1136)
  },
  skill5: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.496, 0.5367, 0.5774, 0.6343, 0.675, 0.7218, 0.7869, 0.8519, 0.917, 0.9861)
  },
  skill6: {
    name: "极限闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.96, 1.0389, 1.1175, 1.2279, 1.3065, 1.3971, 1.5231, 1.6488, 1.7748, 1.9086)
  },
  skill7: {
    name: "赤华",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.384, 0.4156, 0.447, 0.4912, 0.5226, 0.5588, 0.6092, 0.6596, 0.71, 0.7636)
  },
  skill8: {
    name: "朱蚀一段",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.648, 0.7012, 0.7544, 0.8288, 0.8818, 0.943, 1.028, 1.113, 1.198, 1.2884)
  },
  skill9: {
    name: "朱蚀二段",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.6, 0.6492, 0.6984, 0.7674, 0.8166, 0.8732, 0.9518, 1.0306, 1.1094, 1.193)
  },
  skill10: {
    name: "烬灭第一段",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.564, 0.6104, 0.6566, 0.7214, 0.7676, 0.8208, 0.8948, 0.9688, 1.0428, 1.1214)
  },
  skill11: {
    name: "烬灭第二段",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.648, 0.7014, 0.7545, 0.8289, 0.882, 0.9432, 1.0281, 1.113, 1.1982, 1.2885)
  },
  skill12: {
    name: "烬灭第三段",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.972, 1.0518, 1.1316, 1.2432, 1.3227, 1.4145, 1.542, 1.6695, 1.797, 1.9326)
  },
  skill13: {
    name: "缭乱",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(2.1, 2.2722, 2.4444, 2.6859, 2.8581, 3.0562, 3.3313, 3.6071, 3.8829, 4.1755)
  },
  skill14: {
    name: "纷落",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.9, 0.9738, 1.0476, 1.151, 1.2248, 1.3096, 1.4277, 1.5458, 1.6639, 1.7893)
  },
  skill15: {
    name: "满能缭乱",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(5.04, 5.4537, 5.8667, 6.4456, 6.8586, 7.3339, 7.9954, 8.6562, 9.3177, 10.0205)
  },
  skill16: {
    name: "满能纷落",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(2.16, 2.3372, 2.5143, 2.7623, 2.9394, 3.1431, 3.4265, 3.7098, 3.9932, 4.2943)
  },
  skill17: {
    name: "连续攻击",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(1.9752, 2.1376, 2.2992, 2.5264, 2.688, 2.8744, 3.1336, 3.3928, 3.6512, 3.9272)
  },
  skill18: {
    name: "绯刹爆发",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(1.975, 2.137, 2.2989, 2.5257, 2.6876, 2.8739, 3.133, 3.3921, 3.6512, 3.9265)
  },
  skill19: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(1, 1.082, 1.164, 1.2788, 1.3608, 1.4552, 1.5864, 1.7176, 1.8488, 1.9884)
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
  name: "丹瑾",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill15",
      "skill18",
      "skill17"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1233430505140629504', items };
  }
};
