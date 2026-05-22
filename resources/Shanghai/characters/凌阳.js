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
// 凌阳
// 数据来源：库街区 Wiki entryId=1242296125975633920
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1242296125975633920",
  "name": "凌阳",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "33.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.3, 0.3246, 0.3492, 0.3837, 0.4083, 0.4366, 0.4759, 0.5153, 0.5547, 0.5965)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.733, 0.7932, 0.8534, 0.9374, 0.9976, 1.0666, 1.1628, 1.259, 1.3552, 1.4574)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7334, 0.7935, 0.8535, 0.9378, 0.9978, 1.067, 1.1629, 1.2592, 1.3556, 1.4577)
  },
  skill5: {
    name: "第五段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.767, 0.8299, 0.8928, 0.9809, 1.0438, 1.1161, 1.2167, 1.3174, 1.418, 1.5249)
  },
  skill6: {
    name: "崩拳·当头咆哮",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.8, 0.8656, 0.9312, 1.0232, 1.0888, 1.1642, 1.2692, 1.374, 1.479, 1.5906)
  },
  skill7: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.733, 0.7932, 0.8533, 0.9374, 0.9975, 1.0666, 1.1628, 1.259, 1.3551, 1.4573)
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
    levelMap: levelMap(1.268, 1.372, 1.476, 1.6216, 1.7256, 1.8452, 2.0116, 2.1778, 2.3442, 2.521)
  },
  skill10: {
    name: "冲掌·势式相承",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.667, 0.7217, 0.7764, 0.853, 0.9077, 0.9706, 1.0581, 1.1456, 1.2331, 1.3261)
  },
  skill11: {
    name: "惊跃·郁怒追逃",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.767, 0.83, 0.8928, 0.981, 1.0438, 1.1162, 1.2168, 1.3174, 1.418, 1.525)
  },
  skill12: {
    name: "起势·纵地金光",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.867, 0.9381, 1.0092, 1.1088, 1.1799, 1.2616, 1.3754, 1.4891, 1.6029, 1.7237)
  },
  skill13: {
    name: "狂态·摇光金狮舞第一段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.46, 1.5799, 1.6996, 1.8673, 1.987, 2.1246, 2.316, 2.5077, 2.6993, 2.9027)
  },
  skill14: {
    name: "狂态·摇光金狮舞第二段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.9588, 1.0374, 1.116, 1.2264, 1.305, 1.3956, 1.521, 1.647, 1.773, 1.9062)
  },
  skill15: {
    name: "飞身式·翻山越涧",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.8338, 0.9022, 0.9706, 1.0662, 1.1346, 1.2132, 1.3226, 1.432, 1.5414, 1.6576)
  },
  skill16: {
    name: "凌云式·腿打连环",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(2.4169, 2.6146, 2.8131, 3.0904, 3.2889, 3.516, 3.8332, 4.1504, 4.4676, 4.8039)
  },
  skill17: {
    name: "登楼·尾坠千斤",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.76, 1.9044, 2.0488, 2.2508, 2.3952, 2.561, 2.792, 3.0228, 3.2538, 3.4992)
  },
  skill18: {
    name: "奋进·狮子奋迅，俱足万行",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(2, 2.164, 2.328, 2.5576, 2.7216, 2.9102, 3.1726, 3.435, 3.6974, 3.9762)
  },
  skill19: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(1, 1.082, 1.164, 1.2788, 1.3608, 1.4552, 1.5864, 1.7176, 1.8488, 1.9882)
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
  name: "凌阳",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill18",
      "skill16",
      "skill17"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1242296125975633920', items };
  }
};
