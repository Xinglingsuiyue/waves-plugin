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
// 渊武
// 数据来源：库街区 Wiki entryId=1239990507047161856
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1239990507047161856",
  "name": "渊武",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "38.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.247, 0.2673, 0.2876, 0.3159, 0.3362, 0.3595, 0.3919, 0.4243, 0.4567, 0.4911)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5212, 0.564, 0.6068, 0.6666, 0.7092, 0.7584, 0.8268, 0.8952, 0.9636, 1.0362)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5494, 0.5944, 0.6394, 0.7024, 0.7474, 0.7994, 0.8714, 0.9434, 1.0154, 1.092)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5212, 0.564, 0.6068, 0.6666, 0.7092, 0.7584, 0.8268, 0.8952, 0.9636, 1.0362)
  },
  skill5: {
    name: "第五段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.8234, 0.891, 0.9586, 1.053, 1.1206, 1.1983, 1.3063, 1.4143, 1.5223, 1.637)
  },
  skill6: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.8, 0.8656, 0.9312, 1.0231, 1.0887, 1.1641, 1.2691, 1.374, 1.479, 1.5905)
  },
  skill7: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.496, 0.5367, 0.5774, 0.6343, 0.675, 0.7218, 0.7869, 0.8519, 0.917, 0.9861)
  },
  skill8: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.152, 1.2466, 1.341, 1.4732, 1.5678, 1.6764, 1.8276, 1.9786, 2.1298, 2.2904)
  },
  skill9: {
    name: "技能",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.12, 0.1299, 0.1397, 0.1535, 0.1633, 0.1747, 0.1904, 0.2061, 0.2219, 0.2386)
  },
  skill10: {
    name: "雷之楔协同攻击",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.04, 0.0433, 0.0466, 0.0512, 0.0545, 0.0583, 0.0635, 0.0687, 0.074, 0.0796)
  },
  skill11: {
    name: "雷之楔引爆",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965)
  },
  skill12: {
    name: "万壑雷",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.546, 0.5907, 0.6355, 0.6982, 0.7429, 0.7944, 0.866, 0.9376, 1.0093, 1.0854)
  },
  skill13: {
    name: "掀雷",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.2, 0.2164, 0.2328, 0.2558, 0.2722, 0.2911, 0.3173, 0.3435, 0.3698, 0.3977)
  },
  skill14: {
    name: "雷厉风行普攻第一段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.1235, 0.1337, 0.1438, 0.158, 0.1681, 0.1798, 0.196, 0.2122, 0.2284, 0.2456)
  },
  skill15: {
    name: "雷厉风行普攻第二段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.2606, 0.282, 0.3034, 0.3334, 0.3546, 0.3792, 0.4134, 0.4476, 0.4818, 0.5182)
  },
  skill16: {
    name: "雷厉风行普攻第三段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.2748, 0.2974, 0.3198, 0.3514, 0.3738, 0.3998, 0.4358, 0.4718, 0.5078, 0.546)
  },
  skill17: {
    name: "雷厉风行普攻第四段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.2885, 0.312, 0.3355, 0.369, 0.3925, 0.4195, 0.4575, 0.495, 0.533, 0.573)
  },
  skill18: {
    name: "雷厉风行普攻第五段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.4119, 0.4455, 0.4794, 0.5265, 0.5604, 0.5994, 0.6534, 0.7074, 0.7614, 0.8185)
  },
  skill19: {
    name: "雷厉风行重击",
    type: "heavy",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.156, 0.1688, 0.1816, 0.1995, 0.2123, 0.227, 0.2475, 0.268, 0.2884, 0.3102)
  },
  skill20: {
    name: "蹑风追雷",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.364, 0.394, 0.4238, 0.4655, 0.4955, 0.5298, 0.5775, 0.6254, 0.673, 0.7238)
  },
  skill21: {
    name: "雷厉风行闪避反击",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.544, 0.5887, 0.6333, 0.6959, 0.7404, 0.7917, 0.863, 0.9344, 1.0059, 1.0817)
  },
  skill22: {
    name: "技能",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(1.76, 1.9044, 2.0488, 2.2508, 2.3952, 2.561, 2.792, 3.0228, 3.2538, 3.4992)
  },
  skill23: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.32, 0.3463, 0.3725, 0.4093, 0.4355, 0.4657, 0.5077, 0.5496, 0.5916, 0.6362)
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
  name: "渊武",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill22",
      "skill11",
      "skill8"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1239990507047161856', items };
  }
};
