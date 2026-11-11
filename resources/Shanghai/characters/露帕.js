import { calcSingleDamage, calcResistanceMultiplier } from '../../../utils/damage/formula.js';
import {  getPercentAttr, normalizeRoleDetailData, calcFinalAttack  } from '../../../utils/damage/parser.js';
import { mergeBuff } from '../../../utils/damage/buff.js';

function getChainUnlockedCount(roleDetailData) {
  const data = normalizeRoleDetailData(roleDetailData);
  const chainList = data?.chainList || [];
  return chainList.filter(c => c?.unlocked).length;
}

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
// 露帕
// 数据来源：库街区 Wiki entryId=1370474602963382272
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1370474602963382272",
  "name": "露帕",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "20.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4532, 0.4904, 0.5275, 0.5795, 0.6167, 0.6595, 0.7188, 0.7783, 0.8376, 0.9008)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4531, 0.4903, 0.5274, 0.5794, 0.6166, 0.6593, 0.7187, 0.7782, 0.8376, 0.9008)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7932, 0.8587, 0.9236, 1.0147, 1.0796, 1.1542, 1.2585, 1.3627, 1.4663, 1.5768)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.2386, 1.3404, 1.4418, 1.584, 1.6854, 1.8024, 1.9648, 2.1274, 2.2898, 2.4624)
  },
  skill5: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.567, 0.6136, 0.66, 0.7252, 0.7716, 0.825, 0.8994, 0.9738, 1.0482, 1.1272)
  },
  skill6: {
    name: "重击·狼咬",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5644, 0.6108, 0.657, 0.7218, 0.7682, 0.8214, 0.8954, 0.9694, 1.0436, 1.1222)
  },
  skill7: {
    name: "重击·锐爪",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.21, 1.309, 1.408, 1.5473, 1.6462, 1.7606, 1.9192, 2.0779, 2.2366, 2.405)
  },
  skill8: {
    name: "空中攻击第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.3859, 0.4176, 0.4492, 0.4935, 0.5252, 0.5616, 0.6122, 0.6628, 0.7135, 0.7673)
  },
  skill9: {
    name: "空中攻击第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7773, 0.8408, 0.9046, 0.9936, 1.0575, 1.1309, 1.2326, 1.3344, 1.4366, 1.5447)
  },
  skill10: {
    name: "空中攻击第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2866, 0.31, 0.3336, 0.3664, 0.39, 0.417, 0.4544, 0.492, 0.5296, 0.5696)
  },
  skill11: {
    name: "空中攻击·焰袭",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2866, 0.31, 0.3336, 0.3664, 0.39, 0.417, 0.4544, 0.492, 0.5296, 0.5696)
  },
  skill12: {
    name: "空中下落攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5271, 0.5704, 0.6136, 0.674, 0.7172, 0.7671, 0.836, 0.9052, 0.9744, 1.0479)
  },
  skill13: {
    name: "普攻·星灭",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.8487, 0.9182, 0.9876, 1.085, 1.1545, 1.2345, 1.346, 1.4571, 1.5686, 1.6866)
  },
  skill14: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.3757, 1.4885, 1.6013, 1.759, 1.8718, 2.0014, 2.1821, 2.3623, 2.5429, 2.7344)
  },
  skill15: {
    name: "技能",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.7081, 0.7662, 0.8242, 0.9055, 0.9636, 1.0303, 1.1232, 1.2161, 1.309, 1.4077)
  },
  skill16: {
    name: "凶噬",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.5774, 1.7068, 1.8361, 2.0172, 2.1466, 2.2953, 2.5023, 2.7092, 2.9162, 3.1361)
  },
  skill17: {
    name: "狼舞的决意",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(2.818, 3.049, 3.2799, 3.6036, 3.8345, 4.1, 4.47, 4.8396, 5.2091, 5.6021)
  },
  skill18: {
    name: "狼舞的决意·极",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(3.8039, 4.1159, 4.4278, 4.8647, 5.1767, 5.5353, 6.0342, 6.5333, 7.0326, 7.5626)
  },
  skill19: {
    name: "此刻，让火焰延燃赛场",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.0652, 1.1525, 1.2398, 1.3622, 1.4494, 1.5499, 1.6897, 1.8293, 1.969, 2.1175)
  },
  skill20: {
    name: "荣光欢酣于火",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(4.1268, 4.4652, 4.8036, 5.2773, 5.6157, 6.0048, 6.5463, 7.0877, 7.6291, 8.2044)
  },
  skill21: {
    name: "破敌",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(1.5314, 1.657, 1.7826, 1.9584, 2.084, 2.2284, 2.4293, 2.6302, 2.8311, 3.0446)
  },
  skill22: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.9981, 1.08, 1.1619, 1.2763, 1.3581, 1.4523, 1.5831, 1.7143, 1.8452, 1.984)
  },
  skill23: {
    name: "你无法逃离！",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(4.9896, 5.399, 5.8079, 6.3809, 6.7898, 7.2606, 7.9151, 8.5696, 9.2245, 9.9197)
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

function getRoleSelfBuff({ skillName, skillType, enemy, chainCount }) {
  const buff = {
    attackPercent: 0, damageBonus: 0, critRate: 0, critDamage: 0,
    deepen: 0, multiplierBonus: 0, ignoreDefense: 0, source: '露帕·自身'
  };
  // 共鸣解放·荣光欢酣于火 赋予「追猎」：攻击提升 6%；对怒涛级/海啸级目标热熔伤害加成提升 10%。
  // 伤害计算默认以 Boss 为目标，按追猎基础层数计入。
  buff.attackPercent += 0.06;
  buff.damageBonus += 0.10;
  // 固有「胜利为我呼嚎」荣光：队伍角色攻击时无视 3% 热熔抗性；S3 将荣光替换为无视 15% 热熔抗性。
  // 负抗性分支走 1 - res/2，必须按抗性乘区实际比值折算。
  const ignoreRes = chainCount >= 3 ? 0.15 : 0.03;
  const baseRes = Math.min(0.95, Math.max(0, Number(enemy?.resistance ?? 0.1)));
  buff.damageBonus += calcResistanceMultiplier(baseRes - ignoreRes) / calcResistanceMultiplier(baseRes) - 1;
  // S1「看那无名之人」：施放荣光欢酣于火时暴击提升 20%，持续 10 秒。
  if (chainCount >= 1) buff.critRate += 0.20;
  // S2「所处皆为猎场」：荣光欢酣于火/重击·狼咬/重击·锐爪/空中攻击·焰袭 使队伍热熔伤害加成 +20%，可叠 2 层。
  if (chainCount >= 2) buff.damageBonus += 0.20 * 2;
  // S3「狼影随焰咆哮」：变奏技能·你无法逃离！伤害倍率提升 100%。
  if (chainCount >= 3 && skillName === '你无法逃离！') buff.multiplierBonus += 1.00;
  // S4「旗帜于火飞扬」：狼舞的决意·极伤害倍率提升 125%。
  if (chainCount >= 4 && skillName === '狼舞的决意·极') buff.multiplierBonus += 1.25;
  // S5「胜利让掌声喝彩」：施放你在看哪里？/你无法逃离！时共鸣解放伤害加成提升 15%，持续 10 秒。
  if (chainCount >= 5 && skillType === 'liberation') buff.damageBonus += 0.15;
  // S6「致那最闪耀的焰星」：狼舞的决意·极/荣光欢酣于火/你无法逃离！攻击时忽视目标 30% 防御。
  if (chainCount >= 6 && ['狼舞的决意·极', '荣光欢酣于火', '你无法逃离！'].includes(skillName)) {
    buff.ignoreDefense += 0.30;
  }
  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const chainCount = getChainUnlockedCount(roleDetailData);
  const roleBuff = getRoleSelfBuff({ skillName: skill.name, skillType: skill.type, enemy, chainCount });
  const weaponBuff = modules.weapon?.apply ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const phantomBuff = modules.phantom?.apply ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const groupBuff = modules.group?.apply ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);
  const finalAttack = calcFinalAttack(panel, mergedBuff, roleDetailData);
  const result = calcSingleDamage({
    attack: finalAttack,
    skillMultiplier: skill.levelMap[level] || skill.levelMap[10],
    multiplierBonus: mergedBuff.multiplierBonus || 0,
    damageBonus: getPanelDamageBonus(panel.attrMap || {}, skill.type) + (mergedBuff.damageBonus || 0),
    deepen: mergedBuff.deepen || 0,
    critRate: panel.critRate + Number(mergedBuff.critRate || 0),
    critDamage: panel.critDamage + Number(mergedBuff.critDamage || 0),
    attackerLevel: panel.level || 90,
    enemyLevel: enemy?.level || 90,
    resistance: enemy?.resistance ?? 0.1,
    ignoreDefense: Math.max(Number(mergedBuff.ignoreDefense || 0), Number(enemy?.ignoreDefense || 0)),
    sourceDetail: mergedBuff.sources
  });
  return { name: skill.name, ...result };
}

export default {
  name: "露帕",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill20",
      "skill23",
      "skill18"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1370474602963382272', items };
  }
};
