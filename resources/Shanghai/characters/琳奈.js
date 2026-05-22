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
// 琳奈
// 数据来源：库街区 Wiki entryId=1445377391854534656
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1445377391854534656",
  "name": "琳奈",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2026-01-15",
  "currentVersion": "27.0"
};

const SKILLS = {
  skill1: {
    name: "普攻第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4335, 0.4691, 0.5046, 0.5544, 0.59, 0.6308, 0.6877, 0.7446, 0.8015, 0.8619)
  },
  skill2: {
    name: "普攻第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7905, 0.8556, 0.9204, 1.011, 1.0758, 1.1505, 1.254, 1.3578, 1.4616, 1.5717)
  },
  skill3: {
    name: "普攻第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6205, 0.6714, 0.7223, 0.7935, 0.8444, 0.9029, 0.9843, 1.0658, 1.1472, 1.2337)
  },
  skill4: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.207, 1.306, 1.405, 1.5436, 1.6425, 1.7564, 1.9147, 2.0731, 2.2314, 2.3997)
  },
  skill5: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7226, 0.7818, 0.841, 0.924, 0.9833, 1.0514, 1.1462, 1.241, 1.3358, 1.4365)
  },
  skill6: {
    name: "普攻·灵感碰撞·1级",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.559, 0.6048, 0.6506, 0.7148, 0.7606, 0.8134, 0.8866, 0.96, 1.0332, 1.1112)
  },
  skill7: {
    name: "普攻·灵感碰撞·2级",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.6768, 1.8142, 1.9516, 2.1442, 2.2816, 2.4398, 2.6598, 2.8798, 3.0996, 3.3334)
  },
  skill8: {
    name: "普攻·灵感碰撞·3级",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(2.7944, 3.0236, 3.2528, 3.5736, 3.8026, 4.0662, 4.4328, 4.7994, 5.166, 5.5556)
  },
  skill9: {
    name: "绮彩巡游·普攻第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4165, 0.4507, 0.4849, 0.5327, 0.5668, 0.6061, 0.6607, 0.7154, 0.77, 0.8281)
  },
  skill10: {
    name: "绮彩巡游·普攻第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.391, 0.4232, 0.4552, 0.5002, 0.5322, 0.569, 0.6204, 0.6716, 0.723, 0.7774)
  },
  skill11: {
    name: "绮彩巡游·普攻第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5697, 0.6162, 0.663, 0.7284, 0.7752, 0.8289, 0.9036, 0.9783, 1.053, 1.1325)
  },
  skill12: {
    name: "绮彩巡游·普攻第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.748, 0.8096, 0.871, 0.9568, 1.018, 1.0886, 1.1868, 1.285, 1.383, 1.4874)
  },
  skill13: {
    name: "绮彩巡游·普攻第五段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.2666, 1.3709, 1.4745, 1.6198, 1.724, 1.8431, 2.0095, 2.1757, 2.3416, 2.5181)
  },
  skill14: {
    name: "绮彩巡游·地面重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6209, 0.672, 0.7224, 0.7938, 0.8449, 0.903, 0.9849, 1.0661, 1.1473, 1.2341)
  },
  skill15: {
    name: "绮彩巡游·跃动集束",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.527, 0.5703, 0.6135, 0.674, 0.7172, 0.7669, 0.836, 0.9052, 0.9743, 1.0478)
  },
  skill16: {
    name: "绮彩巡游·空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7226, 0.7818, 0.841, 0.924, 0.9833, 1.0514, 1.1462, 1.241, 1.3358, 1.4365)
  },
  skill17: {
    name: "绮彩巡游·空中重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.2243, 1.3244, 1.4252, 1.5659, 1.666, 1.7815, 1.9418, 2.1028, 2.2631, 2.4339)
  },
  skill18: {
    name: "琳奈式创想",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.4016, 1.5166, 1.6314, 1.7922, 1.9073, 2.0394, 2.2234, 2.4071, 2.5912, 2.7863)
  },
  skill19: {
    name: "加色混合",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.17, 1.266, 1.362, 1.4962, 1.5922, 1.7026, 1.856, 2.0096, 2.163, 2.3262)
  },
  skill20: {
    name: "普攻·虹彩飞溅",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.53, 1.6555, 1.781, 1.9566, 2.0821, 2.2264, 2.4271, 2.6278, 2.8286, 3.0418)
  },
  skill21: {
    name: "普攻·视觉冲击",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(6.12, 6.6219, 7.1237, 7.8263, 8.3281, 8.9053, 9.7082, 10.5111, 11.3141, 12.1672)
  },
  skill22: {
    name: "震谐响应·光谱解析",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(9.46, 10.2358, 11.0115, 12.0975, 12.8732, 13.7653, 15.0064, 16.2476, 17.4888, 18.8075)
  },
  skill23: {
    name: "爆炸喷涂",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(4.4, 4.761, 5.122, 5.627, 5.988, 6.403, 6.98, 7.557, 8.135, 8.748)
  },
  skill24: {
    name: "普攻·向着多彩的明天！",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(1.0124, 1.0942, 1.1782, 1.2938, 1.3756, 1.4716, 1.6036, 1.7368, 1.8698, 2.0106)
  },
  skill25: {
    name: "来点儿颜色瞧瞧！",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(1.131, 1.224, 1.316, 1.446, 1.539, 1.645, 1.794, 1.942, 2.09, 2.248)
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
  name: "琳奈",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill22",
      "skill21",
      "skill23"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1445377391854534656', items };
  }
};
