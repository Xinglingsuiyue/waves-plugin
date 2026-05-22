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
// 漂泊者-男-湮灭
// 数据来源：库街区 Wiki entryId=1242115703531454464
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1242115703531454464",
  "name": "漂泊者-男-湮灭",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "42.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.285, 0.3084, 0.3318, 0.3645, 0.3879, 0.4148, 0.4521, 0.4895, 0.5269, 0.5667)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.57, 0.6168, 0.6636, 0.729, 0.7758, 0.8296, 0.9042, 0.979, 1.0538, 1.1334)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4275, 0.4626, 0.4977, 0.5467, 0.5818, 0.6221, 0.6782, 0.7343, 0.7904, 0.85)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6081, 0.6579, 0.708, 0.7776, 0.8274, 0.885, 0.9645, 1.0443, 1.1241, 1.209)
  },
  skill5: {
    name: "第五段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.95, 1.028, 1.1058, 1.215, 1.2928, 1.3824, 1.507, 1.6318, 1.7564, 1.8888)
  },
  skill6: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.48, 0.5194, 0.5588, 0.6139, 0.6532, 0.6985, 0.7615, 0.8244, 0.8874, 0.9543)
  },
  skill7: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.589, 0.6373, 0.6856, 0.7533, 0.8016, 0.8571, 0.9344, 1.0117, 1.0889, 1.171)
  },
  skill8: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.9025, 0.9766, 1.0506, 1.1542, 1.2282, 1.3133, 1.4317, 1.5501, 1.6685, 1.7943)
  },
  skill9: {
    name: "行刃",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(2.88, 3.1162, 3.3524, 3.683, 3.9192, 4.1908, 4.5686, 4.9464, 5.3244, 5.7258)
  },
  skill10: {
    name: "灭音",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.1475, 1.2416, 1.3357, 1.4675, 1.5616, 1.6698, 1.8203, 1.9709, 2.1214, 2.2814)
  },
  skill11: {
    name: "暗流·普攻第一段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.2835, 0.3068, 0.33, 0.3626, 0.3858, 0.4126, 0.4498, 0.487, 0.5242, 0.5637)
  },
  skill12: {
    name: "暗流·普攻第二段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.4725, 0.5113, 0.55, 0.6043, 0.643, 0.6876, 0.7496, 0.8116, 0.8736, 0.9394)
  },
  skill13: {
    name: "暗流·普攻第三段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.783, 0.8473, 0.9115, 1.0014, 1.0656, 1.1394, 1.2421, 1.3449, 1.4476, 1.5567)
  },
  skill14: {
    name: "暗流·普攻第四段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.1207, 1.2125, 1.3044, 1.4332, 1.525, 1.6307, 1.7777, 1.9247, 2.0717, 2.2278)
  },
  skill15: {
    name: "暗流·普攻第五段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.1478, 1.2416, 1.3359, 1.4678, 1.5616, 1.6701, 1.8206, 1.9711, 2.1215, 2.2815)
  },
  skill16: {
    name: "暗流·重击",
    type: "heavy",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.648, 0.7012, 0.7543, 0.8287, 0.8818, 0.943, 1.028, 1.113, 1.198, 1.2883)
  },
  skill17: {
    name: "暗流·鸣刃",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.837, 0.9057, 0.9743, 1.0706, 1.1393, 1.2181, 1.3281, 1.4377, 1.5477, 1.6645)
  },
  skill18: {
    name: "暗流·下落攻击",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.62, 0.6709, 0.7217, 0.7929, 0.8437, 0.9022, 0.9836, 1.0649, 1.1462, 1.2327)
  },
  skill19: {
    name: "暗流·闪避反击",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.593, 1.7237, 1.8543, 2.0372, 2.1678, 2.318, 2.527, 2.736, 2.945, 3.1671)
  },
  skill20: {
    name: "暗流·破命",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(2.98, 3.2244, 3.4688, 3.8112, 4.0556, 4.3364, 4.7276, 5.1184, 5.5094, 5.925)
  },
  skill21: {
    name: "临渊死寂",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(7.65, 8.2773, 8.9046, 9.7829, 10.4102, 11.1316, 12.1352, 13.1389, 14.1426, 15.209)
  },
  skill22: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(1, 1.082, 1.164, 1.2788, 1.3608, 1.4551, 1.5863, 1.7175, 1.8487, 1.9881)
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
  name: "漂泊者-男-湮灭",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill21",
      "skill9",
      "skill20"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1242115703531454464', items };
  }
};
