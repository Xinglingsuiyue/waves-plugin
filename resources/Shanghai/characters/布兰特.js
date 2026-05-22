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
// 布兰特
// 数据来源：库街区 Wiki entryId=1309566040441675776
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1309566040441675776",
  "name": "布兰特",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "24.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2542, 0.275, 0.2959, 0.3251, 0.3459, 0.3699, 0.4032, 0.4366, 0.4699, 0.5053)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.51, 0.552, 0.5938, 0.6522, 0.6942, 0.7422, 0.8092, 0.876, 0.943, 1.014)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6658, 0.7205, 0.775, 0.8513, 0.906, 0.9689, 1.056, 1.1434, 1.2307, 1.3234)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.705, 0.7625, 0.8206, 0.9013, 0.9593, 1.0256, 1.1181, 1.2106, 1.3031, 1.4012)
  },
  skill5: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.9937, 1.0752, 1.1567, 1.2707, 1.3522, 1.4459, 1.5763, 1.7066, 1.837, 1.9755)
  },
  skill6: {
    name: "重击·狂想即兴",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.85, 0.9197, 0.9894, 1.087, 1.1567, 1.2369, 1.3484, 1.4599, 1.5714, 1.6899)
  },
  skill7: {
    name: "空中攻击第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.618, 0.6687, 0.7193, 0.7903, 0.841, 0.8992, 0.9803, 1.0614, 1.1425, 1.2286)
  },
  skill8: {
    name: "空中攻击第一段长按",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.672, 1.8096, 1.9465, 2.1385, 2.2753, 2.4335, 2.6528, 2.872, 3.0912, 3.3248)
  },
  skill9: {
    name: "空中攻击第一段空翻",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4675, 0.5059, 0.5442, 0.5979, 0.6363, 0.6803, 0.7417, 0.803, 0.8643, 0.9295)
  },
  skill10: {
    name: "空中攻击第一段斩击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4251, 0.4599, 0.4947, 0.5436, 0.5784, 0.6186, 0.6744, 0.7302, 0.7857, 0.8451)
  },
  skill11: {
    name: "空中攻击第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.8544, 0.9244, 0.9944, 1.0926, 1.1626, 1.2432, 1.3552, 1.4672, 1.5794, 1.6984)
  },
  skill12: {
    name: "空中攻击第二段长按",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.9924, 1.0734, 1.155, 1.269, 1.35, 1.4436, 1.5738, 1.704, 1.8342, 1.9722)
  },
  skill13: {
    name: "空中攻击第二段空翻",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4675, 0.5059, 0.5442, 0.5979, 0.6363, 0.6803, 0.7417, 0.803, 0.8643, 0.9295)
  },
  skill14: {
    name: "空中攻击第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.8502, 0.9198, 0.9894, 1.0872, 1.1568, 1.2372, 1.3488, 1.4604, 1.5714, 1.6902)
  },
  skill15: {
    name: "空中攻击第三段空翻",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4675, 0.5059, 0.5442, 0.5979, 0.6363, 0.6803, 0.7417, 0.803, 0.8643, 0.9295)
  },
  skill16: {
    name: "空中攻击第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.2769, 1.3817, 1.4865, 1.6328, 1.7377, 1.8579, 2.0255, 2.1929, 2.3605, 2.5385)
  },
  skill17: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.1477, 1.2418, 1.3361, 1.4676, 1.5617, 1.6699, 1.8204, 1.9711, 2.1216, 2.2817)
  },
  skill18: {
    name: "技能",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.6795, 1.8173, 1.955, 2.1478, 2.2855, 2.444, 2.6643, 2.8847, 3.105, 3.3392)
  },
  skill19: {
    name: "下落攻击",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.527, 0.5703, 0.6135, 0.674, 0.7172, 0.7669, 0.836, 0.9052, 0.9743, 1.0478)
  },
  skill20: {
    name: "火焰归亡曲",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(9.5, 10.2791, 11.0581, 12.149, 12.9278, 13.8237, 15.07, 16.3167, 17.5629, 18.8871)
  },
  skill21: {
    name: "技能",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(3.4224, 3.7032, 3.9839, 4.3767, 4.6575, 4.98, 5.4293, 5.8782, 6.3271, 6.8045)
  },
  skill22: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(1.275, 1.3797, 1.4842, 1.6305, 1.7352, 1.8554, 2.0227, 2.1899, 2.3572, 2.5349)
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
  name: "布兰特",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill20",
      "skill21",
      "skill18"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1309566040441675776', items };
  }
};
