import { calcSingleDamage } from '../../../utils/damage/formula.js';
import {  getPercentAttr, getNumberAttr, normalizeRoleDetailData, calcFinalAttack  } from '../../../utils/damage/parser.js';
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
// 陆·赫斯
// 数据来源：库街区 Wiki entryId=1457750329618771968
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1457750329618771968",
  "name": "陆·赫斯",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2026-02-26",
  "currentVersion": "20.0"
};

const SKILLS = {
  skill1: {
    name: "普攻第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.408, 0.4416, 0.475, 0.5218, 0.5554, 0.5938, 0.6474, 0.7008, 0.7544, 0.8112)
  },
  skill2: {
    name: "普攻第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7565, 0.8187, 0.8807, 0.9675, 1.0295, 1.1009, 1.2002, 1.2994, 1.3987, 1.504)
  },
  skill3: {
    name: "普攻第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.759, 0.819, 0.882, 0.969, 1.032, 1.101, 1.203, 1.302, 1.401, 1.506)
  },
  skill4: {
    name: "普攻第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4845, 0.5243, 0.564, 0.6196, 0.6594, 0.705, 0.7686, 0.8322, 0.8957, 0.9633)
  },
  skill5: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.459, 0.4967, 0.5343, 0.587, 0.6247, 0.6679, 0.7282, 0.7884, 0.8486, 0.9126)
  },
  skill6: {
    name: "空中攻击第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.289, 0.3127, 0.3364, 0.3696, 0.3933, 0.4206, 0.4585, 0.4964, 0.5343, 0.5746)
  },
  skill7: {
    name: "空中攻击第二段·镰刀·剖解",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4733, 0.512, 0.551, 0.6053, 0.644, 0.6887, 0.7507, 0.8127, 0.8749, 0.9409)
  },
  skill8: {
    name: "空中攻击第三段·镰刀·剖解",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7197, 0.7789, 0.8379, 0.9204, 0.9794, 1.0473, 1.1417, 1.2363, 1.3306, 1.431)
  },
  skill9: {
    name: "空中攻击第二段·镰刀·裁断",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5072, 0.5488, 0.5904, 0.6486, 0.6902, 0.738, 0.8046, 0.8712, 0.9376, 1.0084)
  },
  skill10: {
    name: "空中攻击第三段·镰刀·裁断",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7538, 0.8156, 0.8774, 0.9638, 1.0256, 1.0968, 1.1956, 1.2946, 1.3934, 1.4984)
  },
  skill11: {
    name: "空中攻击第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.527, 0.5703, 0.6135, 0.674, 0.7172, 0.7669, 0.836, 0.9052, 0.9743, 1.0478)
  },
  skill12: {
    name: "地面闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.2666, 1.3704, 1.4744, 1.6198, 1.7236, 1.843, 2.0092, 2.1754, 2.3414, 2.518)
  },
  skill13: {
    name: "空中闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.292, 1.398, 1.5039, 1.6523, 1.7582, 1.88, 2.0495, 2.2191, 2.3886, 2.5687)
  },
  skill14: {
    name: "流金回潮",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.012, 1.095, 1.178, 1.2942, 1.3772, 1.4726, 1.6054, 1.7382, 1.8709, 2.012)
  },
  skill15: {
    name: "斩杀日冕·环",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.1133, 1.2048, 1.2959, 1.424, 1.515, 1.62, 1.7664, 1.9123, 2.0582, 2.2133)
  },
  skill16: {
    name: "斩杀日冕·破",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.4472, 1.566, 1.6845, 1.8507, 1.9695, 2.106, 2.2959, 2.4855, 2.6754, 2.8773)
  },
  skill17: {
    name: "斩杀日冕·曜",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.7812, 1.9272, 2.0733, 2.2777, 2.4238, 2.5918, 2.8254, 3.0591, 3.2928, 3.5411)
  },
  skill18: {
    name: "普攻·流金贯行",
    // Wiki：此伤害为普攻伤害。
    type: "normal",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.782, 0.8462, 0.9103, 1.0001, 1.0642, 1.1379, 1.2405, 1.3431, 1.4457, 1.5547)
  },
  skill19: {
    name: "日髓阵列",
    // Wiki：此伤害为普攻伤害。
    type: "normal",
    levelFrom: "共鸣技能",
    levelMap: levelMap(0.7719, 0.8352, 0.8984, 0.9871, 1.0503, 1.1231, 1.2244, 1.3256, 1.4269, 1.5345)
  },
  skill20: {
    name: "判决大地裂响",
    // Wiki：空中攻击·判决大地裂响，此伤害为普攻伤害。
    type: "normal",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.5437, 1.6703, 1.7968, 1.9741, 2.1006, 2.2462, 2.4487, 2.6512, 2.8538, 3.069)
  },
  skill21: {
    name: "于永冻中释义",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(5, 5.41, 5.82, 6.394, 6.804, 7.2757, 7.9317, 8.5877, 9.2437, 9.9409)
  },
  skill22: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(1.0965, 1.1865, 1.2765, 1.4025, 1.4922, 1.5957, 1.7394, 1.8834, 2.0271, 2.1801)
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

const CRIMSON_SUN_SKILLS = new Set(['斩杀日冕·环', '斩杀日冕·破', '斩杀日冕·曜']);
const GOLDEN_JUDGEMENT_EXTRA = new Set(['日髓阵列', '判决大地裂响']);
const AIR_ATTACK_SKILLS = new Set([
  '空中攻击第一段', '空中攻击第二段·镰刀·剖解', '空中攻击第三段·镰刀·剖解',
  '空中攻击第二段·镰刀·裁断', '空中攻击第三段·镰刀·裁断', '空中攻击第四段', '判决大地裂响'
]);

// 陆·赫斯自身增益（共鸣回路 + 固有 + 共鸣链）：
//   共鸣回路·黄金的裁量：所有形态斩杀日冕倍率 +110%，斩杀日冕·曜后日髓阵列/判决大地裂响倍率 +110%；
//   共鸣回路·终局之释义：于永冻中释义倍率 +25%，可叠 3 层；
//   固有「无因的医谕」：攻击 +25%；对有集谐·干涉的目标每 10 点谐度破坏增幅伤害加深 5%，上限 30%；
//   S1「流金于灰白中灼烧」空中攻击伤害加成 +150%；
//   S2「眼底尚有雪崩未止」于永冻中释义倍率 +60%，无因的医谕加深上限提升至 60%；
//   S3「金雨浇筑你的脊骨」斩杀日冕倍率 +136%，曜后的日髓阵列/判决大地裂响倍率 +136%；
//   S4「冻土之下，亦有新生」队伍造成谐度破坏后全队伤害 +20%，持续 20 秒；
//   S5「穿过风雪构筑的静场」流金回潮倍率 +50%；
//   S6「冰原之上，铺开无垠曦光」斩杀日冕/日髓阵列/判决大地裂响伤害 +30%，
//      每层终局之释义使于永冻中释义伤害加成 +40%，上限 120%。
function getRoleSelfBuff({ skillName, skillType, panel, chainCount }) {
  const buff = {
    attackPercent: 0,
    damageBonus: 0,
    critRate: 0,
    critDamage: 0,
    deepen: 0,
    multiplierBonus: 0,
    ignoreDefense: 0,
    source: '陆·赫斯·自身'
  };

  const isCrimsonSun = CRIMSON_SUN_SKILLS.has(skillName);
  const isGoldenExtra = GOLDEN_JUDGEMENT_EXTRA.has(skillName);

  // 黄金的裁量：斩杀日冕全形态倍率 +110%，曜后的日髓阵列/判决大地裂响倍率 +110%。
  if (isCrimsonSun || isGoldenExtra) buff.multiplierBonus += 1.10;

  // 终局之释义：于永冻中释义倍率 +25%/层，最多 3 层。
  if (skillName === '于永冻中释义') buff.multiplierBonus += 0.25 * 3;

  // 固有「无因的医谕」：附近队伍附加集谐·偏移或造成谐度破坏后攻击 +25%。
  buff.attackPercent += 0.25;

  // 固有「无因的医谕」：对有集谐·干涉的目标，每 10 点谐度破坏增幅伤害加深 5%。
  const harmonyBreak = getNumberAttr(panel?.attrMap || {}, '谐度破坏增幅');
  const deepenCap = chainCount >= 2 ? 0.60 : 0.30;
  buff.deepen += Math.min(deepenCap, Math.floor(harmonyBreak / 10) * 0.05);

  // S1：空中攻击伤害加成 +150%。
  if (chainCount >= 1 && AIR_ATTACK_SKILLS.has(skillName)) buff.damageBonus += 1.50;

  // S2：于永冻中释义倍率 +60%。
  if (chainCount >= 2 && skillName === '于永冻中释义') buff.multiplierBonus += 0.60;

  // S3：斩杀日冕倍率 +136%；曜后的日髓阵列/判决大地裂响倍率 +136%。
  if (chainCount >= 3 && (isCrimsonSun || isGoldenExtra)) buff.multiplierBonus += 1.36;

  // S4：队伍造成谐度破坏后全队伤害 +20%，持续 20 秒。
  if (chainCount >= 4) buff.damageBonus += 0.20;

  // S5：流金回潮倍率 +50%。
  if (chainCount >= 5 && skillName === '流金回潮') buff.multiplierBonus += 0.50;

  // S6：斩杀日冕/日髓阵列/判决大地裂响伤害 +30%。
  if (chainCount >= 6 && (isCrimsonSun || isGoldenExtra)) buff.damageBonus += 0.30;

  // S6：每层终局之释义使于永冻中释义伤害加成 +40%，上限 120%。
  if (chainCount >= 6 && skillType === 'liberation') buff.damageBonus += 0.40 * 3;

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const chainCount = getChainUnlockedCount(roleDetailData);
  const roleBuff = getRoleSelfBuff({ skillName: skill.name, skillType: skill.type, panel, chainCount });
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
  name: "陆·赫斯",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill21",
      "skill17",
      "skill20"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1457750329618771968', items };
  }
};
