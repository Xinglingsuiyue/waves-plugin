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
// 莫宁
// 数据来源：库街区 Wiki entryId=1429461088674648064
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1429461088674648064",
  "name": "莫宁",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2026-04-21",
  "currentVersion": "23.0"
};

const SKILLS = {
  skill1: {
    name: "普攻第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.28, 0.303, 0.326, 0.3583, 0.3813, 0.4076, 0.4443, 0.481, 0.5177, 0.5569)
  },
  skill2: {
    name: "普攻第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6, 0.6494, 0.6986, 0.7674, 0.8166, 0.8734, 0.952, 1.0306, 1.1094, 1.1932)
  },
  skill3: {
    name: "普攻第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.52, 0.5629, 0.6058, 0.665, 0.7079, 0.7569, 0.825, 0.8937, 0.9618, 1.034)
  },
  skill4: {
    name: "普攻第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.68, 0.7358, 0.7916, 0.8696, 0.9254, 0.9895, 1.0787, 1.1679, 1.2572, 1.352)
  },
  skill5: {
    name: "普攻·广域观测模式第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.28, 0.3032, 0.326, 0.3584, 0.3812, 0.4076, 0.4444, 0.4812, 0.518, 0.5568)
  },
  skill6: {
    name: "普攻·广域观测模式第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.52, 0.5628, 0.6056, 0.6652, 0.708, 0.7568, 0.8252, 0.8932, 0.9616, 1.034)
  },
  skill7: {
    name: "普攻·广域观测模式第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.52, 0.563, 0.6054, 0.6652, 0.7078, 0.7568, 0.8252, 0.8932, 0.9618, 1.0342)
  },
  skill8: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.186, 0.2014, 0.2167, 0.238, 0.2533, 0.2707, 0.2953, 0.3196, 0.344, 0.37)
  },
  skill9: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.496, 0.5367, 0.5774, 0.6343, 0.675, 0.7218, 0.7869, 0.8519, 0.917, 0.9861)
  },
  skill10: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.816, 0.883, 0.9499, 1.0436, 1.1105, 1.1874, 1.2945, 1.4015, 1.5086, 1.6223)
  },
  skill11: {
    name: "闪避反击·广域观测模式",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.52, 0.5628, 0.6056, 0.6652, 0.708, 0.7568, 0.8252, 0.8932, 0.9616, 1.034)
  },
  skill12: {
    name: "分布式阵列治疗量",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.54, 0.5616, 0.5832, 0.6156, 0.6588, 0.702, 0.783, 0.8748, 0.972, 1.134)
  },
  skill13: {
    name: "期望误差治疗量",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.1188, 0.1235, 0.1283, 0.1354, 0.1449, 0.1544, 0.1722, 0.1924, 0.2138, 0.2494)
  },
  skill14: {
    name: "最优求解",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.904, 0.9782, 1.0523, 1.1561, 1.2302, 1.3155, 1.4341, 1.5527, 1.6713, 1.7973)
  },
  skill15: {
    name: "分布式阵列",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.8, 0.8656, 0.9312, 1.0232, 1.0888, 1.1644, 1.2692, 1.374, 1.4792, 1.5908)
  },
  skill16: {
    name: "谐振场治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.0963, 0.1002, 0.1041, 0.1098, 0.1175, 0.1253, 0.1397, 0.1561, 0.1735, 0.2024)
  },
  skill17: {
    name: "谐振场",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1, 1.082, 1.164, 1.279, 1.361, 1.4555, 1.5865, 1.7175, 1.849, 1.9885)
  },
  skill18: {
    name: "重击·位势转换",
    type: "heavy",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.7201, 0.7791, 0.8381, 0.9208, 0.9799, 1.0477, 1.1423, 1.2367, 1.3311, 1.4316)
  },
  skill19: {
    name: "重击·反演",
    type: "heavy",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.3, 1.4066, 1.5132, 1.6625, 1.7691, 1.8917, 2.0622, 2.2328, 2.4034, 2.5846)
  },
  skill20: {
    name: "震谐响应·粒子射流",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.5, 1.623, 1.746, 1.9182, 2.0412, 2.1827, 2.3795, 2.5763, 2.7731, 2.9822)
  },
  skill21: {
    name: "技能",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(2.6273, 2.8427, 3.0582, 3.3598, 3.5752, 3.823, 4.1677, 4.5124, 4.857, 5.2233)
  },
  skill22: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(1.02, 1.1037, 1.1873, 1.3044, 1.3881, 1.4843, 1.6181, 1.7519, 1.8857, 2.0279)
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
  name: "莫宁",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill21",
      "skill20",
      "skill14"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1429461088674648064', items };
  }
};
