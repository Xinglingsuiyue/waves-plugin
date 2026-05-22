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
// 夏空
// 数据来源：库街区 Wiki entryId=1357568005112766464
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1357568005112766464",
  "name": "夏空",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "21.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.287, 0.3106, 0.3341, 0.3671, 0.3906, 0.4177, 0.4553, 0.493, 0.5306, 0.5706)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.82, 0.8873, 0.9546, 1.0487, 1.116, 1.1933, 1.3011, 1.4086, 1.516, 1.6304)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6644, 0.7188, 0.7732, 0.8496, 0.904, 0.9668, 1.054, 1.1408, 1.228, 1.3208)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.23, 1.3312, 1.432, 1.5732, 1.674, 1.79, 1.9512, 2.1128, 2.274, 2.4456)
  },
  skill5: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5412, 0.5856, 0.63, 0.6921, 0.7365, 0.7876, 0.8586, 0.9296, 1.0006, 1.076)
  },
  skill6: {
    name: "瞄准",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.164, 0.1775, 0.1909, 0.2098, 0.2232, 0.2387, 0.2602, 0.2817, 0.3032, 0.3261)
  },
  skill7: {
    name: "瞄准完全蓄力",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.369, 0.3993, 0.4296, 0.4719, 0.5022, 0.537, 0.5854, 0.6338, 0.6822, 0.7337)
  },
  skill8: {
    name: "空中攻击第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5576, 0.6034, 0.6492, 0.7132, 0.7588, 0.8114, 0.8846, 0.9578, 1.031, 1.1086)
  },
  skill9: {
    name: "空中攻击第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.492, 0.5324, 0.5728, 0.6292, 0.6696, 0.716, 0.7808, 0.8452, 0.9096, 0.9784)
  },
  skill10: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.1504, 1.2448, 1.3392, 1.4712, 1.5652, 1.674, 1.8248, 1.9756, 2.1264, 2.2868)
  },
  skill11: {
    name: "谐律速奏",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.8128, 0.8792, 0.946, 1.0392, 1.106, 1.1824, 1.2892, 1.3956, 1.5024, 1.6156)
  },
  skill12: {
    name: "四拍重奏",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(3.1595, 3.4191, 3.6776, 4.0399, 4.2994, 4.5974, 5.0116, 5.4258, 5.8411, 6.2813)
  },
  skill13: {
    name: "即兴的交响诗",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(5.535, 5.9889, 6.4428, 7.0782, 7.5321, 8.054, 8.7802, 9.5064, 10.2326, 11.0042)
  },
  skill14: {
    name: "交响诗·主音",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(0.616, 0.666, 0.716, 0.788, 0.838, 0.896, 0.976, 1.058, 1.138, 1.224)
  },
  skill15: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.9512, 1.0292, 1.1072, 1.2164, 1.2944, 1.3841, 1.5089, 1.6337, 1.7585, 1.8911)
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
  name: "夏空",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill13",
      "skill12",
      "skill11"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1357568005112766464', items };
  }
};
