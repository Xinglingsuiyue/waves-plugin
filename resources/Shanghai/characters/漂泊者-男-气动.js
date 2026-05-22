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
// 漂泊者-男-气动
// 数据来源：库街区 Wiki entryId=1353291691268767744
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1353291691268767744",
  "name": "漂泊者-男-气动",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "17.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.1776, 0.1922, 0.2068, 0.2272, 0.2417, 0.2585, 0.2818, 0.3051, 0.3284, 0.3531)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4332, 0.4686, 0.5042, 0.5538, 0.5894, 0.6302, 0.687, 0.7438, 0.8006, 0.861)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2769, 0.2996, 0.3223, 0.3541, 0.3768, 0.4029, 0.4392, 0.4756, 0.5119, 0.5505)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.3859, 0.4176, 0.4492, 0.4935, 0.5251, 0.5615, 0.6121, 0.6628, 0.7134, 0.7672)
  },
  skill5: {
    name: "飞刃",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.25, 0.2725, 0.2925, 0.32, 0.3425, 0.365, 0.3975, 0.43, 0.4625, 0.4975)
  },
  skill6: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2703, 0.2925, 0.3147, 0.3456, 0.3678, 0.3933, 0.4287, 0.4644, 0.4998, 0.5373)
  },
  skill7: {
    name: "绞息",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4066, 0.44, 0.4733, 0.52, 0.5533, 0.5916, 0.6449, 0.6982, 0.7516, 0.8083)
  },
  skill8: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.708, 0.7661, 0.8242, 0.9054, 0.9635, 1.0303, 1.1232, 1.216, 1.3089, 1.4076)
  },
  skill9: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6309, 0.6827, 0.7344, 0.8068, 0.8585, 0.918, 1.0008, 1.0836, 1.1663, 1.2543)
  },
  skill10: {
    name: "苍息破象",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.8355, 0.904, 0.9725, 1.0685, 1.137, 1.2157, 1.3254, 1.435, 1.5445, 1.661)
  },
  skill11: {
    name: "碧霄断行",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.8817, 0.9539, 1.0264, 1.1273, 1.1997, 1.2829, 1.3985, 1.5141, 1.6297, 1.7526)
  },
  skill12: {
    name: "抃风儛润第一段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.6479, 0.701, 0.7541, 0.8285, 0.8816, 0.9427, 1.0277, 1.1127, 1.1977, 1.288)
  },
  skill13: {
    name: "抃风儛润第二段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.7116, 0.7699, 0.8283, 0.91, 0.9683, 1.0354, 1.1288, 1.2221, 1.3155, 1.4147)
  },
  skill14: {
    name: "抃风儛润治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.11, 0.1144, 0.1188, 0.1254, 0.1342, 0.143, 0.1595, 0.1782, 0.198, 0.231)
  },
  skill15: {
    name: "缥缈无相第一段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.863, 0.9335, 1.0045, 1.1035, 1.174, 1.2555, 1.3685, 1.4815, 1.595, 1.715)
  },
  skill16: {
    name: "缥缈无相第二段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(3.6368, 3.935, 4.2332, 4.6507, 4.949, 5.2919, 5.769, 6.2462, 6.7233, 7.2303)
  },
  skill17: {
    name: "技能",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(2.7, 2.9214, 3.1428, 3.4528, 3.6742, 3.9288, 4.2831, 4.6373, 4.9915, 5.3679)
  },
  skill18: {
    name: "治疗量",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(0.3667, 0.3813, 0.396, 0.418, 0.4473, 0.4767, 0.5317, 0.594, 0.66, 0.77)
  },
  skill19: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(1, 1.082, 1.164, 1.2789, 1.3609, 1.4552, 1.5864, 1.7175, 1.8488, 1.9882)
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
  name: "漂泊者-男-气动",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill17",
      "skill16",
      "skill19"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1353291691268767744', items };
  }
};
