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
// 西格莉卡
// 数据来源：库街区 Wiki entryId=1478089902761410560
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1478089902761410560",
  "name": "西格莉卡",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2026-03-19",
  "currentVersion": "16.0"
};

const SKILLS = {
  skill1: {
    name: "普攻第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2664, 0.2883, 0.3101, 0.3407, 0.3626, 0.3877, 0.4226, 0.4576, 0.4925, 0.5297)
  },
  skill2: {
    name: "普攻第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5064, 0.548, 0.5896, 0.6476, 0.6892, 0.737, 0.8034, 0.8698, 0.9362, 1.0068)
  },
  skill3: {
    name: "普攻第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.56, 0.606, 0.652, 0.7163, 0.7623, 0.815, 0.8884, 0.962, 1.0354, 1.1136)
  },
  skill4: {
    name: "普攻第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.04, 1.1255, 1.2108, 1.33, 1.4155, 1.5135, 1.65, 1.7864, 1.9228, 2.0679)
  },
  skill5: {
    name: "普攻·明悟",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.548, 1.675, 1.802, 1.9799, 2.1069, 2.2525, 2.4559, 2.6589, 2.862, 3.0779)
  },
  skill6: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5848, 0.6328, 0.6808, 0.748, 0.7958, 0.851, 0.9278, 1.0044, 1.0812, 1.1628)
  },
  skill7: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.527, 0.5703, 0.6135, 0.674, 0.7172, 0.7669, 0.836, 0.9052, 0.9743, 1.0478)
  },
  skill8: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.105, 1.1957, 1.2863, 1.4133, 1.5039, 1.608, 1.753, 1.898, 2.043, 2.197)
  },
  skill9: {
    name: "空中闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.037, 1.1221, 1.2071, 1.3262, 1.4112, 1.509, 1.645, 1.7811, 1.9172, 2.0617)
  },
  skill10: {
    name: "闪避反击·解读",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.548, 1.675, 1.802, 1.9799, 2.1069, 2.2525, 2.4559, 2.6589, 2.862, 3.0779)
  },
  skill11: {
    name: "嘭嘭！",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.72, 0.7794, 0.8384, 0.9209, 0.98, 1.0479, 1.1424, 1.2369, 1.3314, 1.4315)
  },
  skill12: {
    name: "大嘭嘭！",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.449, 1.5679, 1.6868, 1.853, 1.9719, 2.1087, 2.2988, 2.4888, 2.6789, 2.8809)
  },
  skill13: {
    name: "日灵帮帮忙",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.3997, 1.5145, 1.6294, 1.7898, 1.9047, 2.0366, 2.2204, 2.4038, 2.5875, 2.7826)
  },
  skill14: {
    name: "重击·符语本源",
    type: "heavy",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.6665, 0.7212, 0.7759, 0.8524, 0.907, 0.9699, 1.0573, 1.1448, 1.2322, 1.3251)
  },
  skill15: {
    name: "符语爆破",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(2.9594, 3.202, 3.4448, 3.7845, 4.0271, 4.3063, 4.6944, 5.0827, 5.4709, 5.8834)
  },
  skill16: {
    name: "符语链刃",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.9999, 2.1638, 2.328, 2.5574, 2.7213, 2.9098, 3.1721, 3.4344, 3.6967, 3.9758)
  },
  skill17: {
    name: "符语日灵",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.9999, 2.1639, 2.3279, 2.5572, 2.7212, 2.9099, 3.172, 3.4346, 3.6967, 3.9754)
  },
  skill18: {
    name: "共鸣回路·我即语义",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(6.0938, 6.5934, 7.0931, 7.7926, 8.2923, 8.867, 9.6664, 10.4659, 11.2654, 12.1148)
  },
  skill19: {
    name: "如那期望般！",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(4.3329, 4.6882, 5.0435, 5.541, 5.8963, 6.3049, 6.8733, 7.4418, 8.0103, 8.6143)
  },
  skill20: {
    name: "昭日的语源",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.822, 0.8894, 0.9568, 1.0512, 1.1186, 1.1961, 1.3039, 1.4117, 1.5196, 1.6342)
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
  name: "西格莉卡",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill18",
      "skill19",
      "skill15"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1478089902761410560', items };
  }
};
