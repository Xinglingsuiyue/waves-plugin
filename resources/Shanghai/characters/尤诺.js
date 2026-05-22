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
// 尤诺
// 数据来源：库街区 Wiki entryId=1400453856120164352
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1400453856120164352",
  "name": "尤诺",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "19.0"
};

const SKILLS = {
  skill1: {
    name: "月环·普攻第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.441, 0.4772, 0.5134, 0.564, 0.6002, 0.6417, 0.6996, 0.7575, 0.8153, 0.8768)
  },
  skill2: {
    name: "月环·普攻第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7021, 0.7597, 0.8173, 0.8979, 0.9554, 1.0216, 1.1137, 1.2058, 1.2979, 1.3958)
  },
  skill3: {
    name: "月环·普攻第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.3412, 1.4512, 1.5612, 1.7151, 1.8249, 1.9515, 2.1273, 2.3033, 2.4793, 2.6661)
  },
  skill4: {
    name: "月弓·普攻第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.636, 0.6882, 0.7404, 0.8134, 0.8655, 0.9255, 1.0089, 1.0924, 1.1758, 1.2645)
  },
  skill5: {
    name: "月弓·普攻第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.84, 0.909, 0.978, 1.0743, 1.1433, 1.2225, 1.3326, 1.4427, 1.5531, 1.6701)
  },
  skill6: {
    name: "月弓·普攻第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.68, 1.8178, 1.9556, 2.1484, 2.2862, 2.4446, 2.665, 2.8854, 3.106, 3.3402)
  },
  skill7: {
    name: "月弓·闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.56, 1.6881, 1.8159, 1.995, 2.1231, 2.2701, 2.4747, 2.6793, 2.8842, 3.1017)
  },
  skill8: {
    name: "原初的律动",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.3131, 1.4209, 1.5286, 1.6796, 1.7873, 1.9108, 2.0831, 2.2553, 2.4275, 2.6107)
  },
  skill9: {
    name: "告终的喧响",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(2.1451, 2.321, 2.497, 2.7431, 2.9191, 3.1213, 3.4027, 3.6842, 3.9657, 4.2646)
  },
  skill10: {
    name: "未终的喧响",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(2.1451, 2.321, 2.497, 2.7431, 2.9191, 3.1213, 3.4027, 3.6842, 3.9657, 4.2646)
  },
  skill11: {
    name: "越限的弦引",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(2.211, 2.3924, 2.5738, 2.8276, 3.0088, 3.2174, 3.5074, 3.7974, 4.0876, 4.3958)
  },
  skill12: {
    name: "流变·月弓",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.26, 1.3634, 1.4667, 1.6113, 1.7147, 1.8335, 1.9988, 2.1641, 2.3294, 2.5051)
  },
  skill13: {
    name: "流变·月环",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.5932, 1.724, 1.8544, 2.0372, 2.168, 2.318, 2.5272, 2.736, 2.9452, 3.1672)
  },
  skill14: {
    name: "月弓·普攻第一段强化",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.036, 1.121, 1.206, 1.3249, 1.4098, 1.5075, 1.6435, 1.7794, 1.9153, 2.0597)
  },
  skill15: {
    name: "月弓·普攻第二段强化",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.44, 1.5582, 1.6764, 1.8417, 1.9596, 2.0955, 2.2845, 2.4732, 2.6622, 2.8629)
  },
  skill16: {
    name: "月弓·普攻第三段强化",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(2.68, 2.8998, 3.1196, 3.4272, 3.647, 3.8998, 4.2514, 4.603, 4.9546, 5.3282)
  },
  skill17: {
    name: "月弓·闪避反击强化",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(2.3601, 2.5536, 2.7471, 3.018, 3.2115, 3.4341, 3.7437, 4.0533, 4.3632, 4.692)
  },
  skill18: {
    name: "越限的弦引强化",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(3.211, 3.4744, 3.7378, 4.1064, 4.3696, 4.6724, 5.0938, 5.515, 5.9362, 6.3838)
  },
  skill19: {
    name: "月弓·普攻第一段治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.1303, 0.141, 0.1517, 0.1667, 0.1773, 0.1896, 0.2067, 0.2238, 0.2409, 0.2591)
  },
  skill20: {
    name: "月弓·普攻第二段治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.1303, 0.141, 0.1517, 0.1667, 0.1773, 0.1896, 0.2067, 0.2238, 0.2409, 0.2591)
  },
  skill21: {
    name: "月弓·普攻第三段治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.2443, 0.2644, 0.2844, 0.3124, 0.3325, 0.3555, 0.3875, 0.4196, 0.4516, 0.4857)
  },
  skill22: {
    name: "月弓·闪避反击治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.1629, 0.1763, 0.1896, 0.2083, 0.2217, 0.237, 0.2584, 0.2797, 0.3011, 0.3238)
  },
  skill23: {
    name: "越限的弦引治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.2443, 0.2644, 0.2844, 0.3124, 0.3325, 0.3555, 0.3875, 0.4196, 0.4516, 0.4857)
  },
  skill24: {
    name: "至臻的完满",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.8, 0.8656, 0.9312, 1.0231, 1.0887, 1.1641, 1.2691, 1.374, 1.479, 1.5905)
  },
  skill25: {
    name: "至臻的完满治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.9771, 1.0573, 1.1374, 1.2496, 1.3297, 1.4218, 1.55, 1.6782, 1.8064, 1.9426)
  },
  skill26: {
    name: "满月领域周期治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.1629, 0.1763, 0.1896, 0.2083, 0.2217, 0.237, 0.2584, 0.2797, 0.3011, 0.3238)
  },
  skill27: {
    name: "技能",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(5.5, 5.951, 6.402, 7.0334, 7.4844, 8.0031, 8.7247, 9.4463, 10.1679, 10.9346)
  },
  skill28: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.8, 0.8659, 0.9318, 1.0238, 1.0889, 1.1648, 1.2698, 1.374, 1.479, 1.5909)
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
  name: "尤诺",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill27",
      "skill18",
      "skill16"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1400453856120164352', items };
  }
};
