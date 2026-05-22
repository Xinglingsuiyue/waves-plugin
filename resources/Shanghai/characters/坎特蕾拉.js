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
// 坎特蕾拉
// 数据来源：库街区 Wiki entryId=1342471419668557824
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1342471419668557824",
  "name": "坎特蕾拉",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "28.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7332, 0.7932, 0.8536, 0.9376, 0.9976, 1.0668, 1.1628, 1.2592, 1.3552, 1.4576)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.73, 0.79, 0.8498, 0.9336, 0.9934, 1.0624, 1.158, 1.2538, 1.3496, 1.4514)
  },
  skill4: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5752, 0.6224, 0.6696, 0.7356, 0.7828, 0.837, 0.9126, 0.988, 1.0634, 1.1436)
  },
  skill5: {
    name: "浮潜幻海",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5336, 0.5774, 0.6212, 0.6824, 0.7262, 0.7766, 0.8466, 0.9166, 0.9866, 1.061)
  },
  skill6: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.528, 0.5714, 0.6147, 0.6753, 0.7187, 0.7684, 0.8377, 0.907, 0.9762, 1.0498)
  },
  skill7: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.0664, 1.154, 1.2416, 1.364, 1.4512, 1.552, 1.692, 1.8316, 1.9716, 2.1204)
  },
  skill8: {
    name: "翩跹",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.7404, 0.8012, 0.862, 0.947, 1.0076, 1.0774, 1.1746, 1.2718, 1.3688, 1.472)
  },
  skill9: {
    name: "斑驳幻梦",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.987, 1.068, 1.1489, 1.2622, 1.3432, 1.4362, 1.5657, 1.6952, 1.8247, 1.9623)
  },
  skill10: {
    name: "惊醒",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1, 1.082, 1.164, 1.2788, 1.3608, 1.4551, 1.5863, 1.7175, 1.8487, 1.9881)
  },
  skill11: {
    name: "蛰幻第一段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.5331, 0.5769, 0.6207, 0.6819, 0.7254, 0.7758, 0.8457, 0.9156, 0.9855, 1.0599)
  },
  skill12: {
    name: "蛰幻第二段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.633, 0.685, 0.737, 0.8096, 0.8614, 0.9212, 1.0042, 1.0872, 1.1704, 1.2586)
  },
  skill13: {
    name: "蛰幻第三段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.3, 1.4068, 1.5132, 1.6628, 1.7692, 1.892, 2.0624, 2.2328, 2.4036, 2.5848)
  },
  skill14: {
    name: "暗涌漩涡",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.528, 0.5714, 0.6147, 0.6753, 0.7187, 0.7684, 0.8377, 0.907, 0.9762, 1.0498)
  },
  skill15: {
    name: "感知汲取",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(6.72, 7.271, 7.822, 8.5934, 9.1444, 9.7782, 10.6598, 11.5414, 12.423, 13.3598)
  },
  skill16: {
    name: "掠影",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.1331, 1.2261, 1.3191, 1.449, 1.542, 1.6488, 1.7973, 1.9461, 2.0946, 2.2527)
  },
  skill17: {
    name: "感知汲取治疗量",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.9, 0.936, 0.972, 1.026, 1.098, 1.17, 1.305, 1.458, 1.62, 1.89)
  },
  skill18: {
    name: "陷溺",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(1.8913, 2.0464, 2.2015, 2.4186, 2.5737, 2.752, 3.0001, 3.2483, 3.4964, 3.76)
  },
  skill19: {
    name: "弥漫",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(1.5351, 1.6611, 1.7871, 1.9635, 2.0895, 2.2344, 2.436, 2.6376, 2.8392, 3.0534)
  },
  skill20: {
    name: "点水",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.85, 0.92, 0.9896, 1.0872, 1.1568, 1.2372, 1.3484, 1.46, 1.5716, 1.69)
  },
  skill21: {
    name: "逐浪",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.85, 0.9198, 0.9896, 1.087, 1.1568, 1.2369, 1.3486, 1.46, 1.5716, 1.69)
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
  name: "坎特蕾拉",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill15",
      "skill18",
      "skill19"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1342471419668557824', items };
  }
};
