import { calcSingleDamage, calcSingleHeal } from '../../../utils/damage/formula.js';
import { getPercentAttr, normalizeRoleDetailData, calcFinalAttack, calcFinalDefense } from '../../../utils/damage/parser.js';
import { mergeBuff } from '../../../utils/damage/buff.js';

function getSkillLevel(roleDetailData, typeName) {
  const data = normalizeRoleDetailData(roleDetailData);
  const skillList = data?.skillList || [];
  const target = skillList.find(s => s?.skill?.type === typeName);
  return target?.level || 10;
}

function getChainUnlockedCount(roleDetailData) {
  const data = normalizeRoleDetailData(roleDetailData);
  const chainList = data?.chainList || [];
  return chainList.filter(c => c?.unlocked).length;
}

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = value;
  return map;
}, {});

const WIKI_DETAIL = {
  id: '1429461088674648064',
  name: '莫宁',
  lastUpdateTime: '2026-04-21',
  currentVersion: '23.0'
};

const MONING_HEALS = {
  arrayHeal: {
    name: '分布式阵列治疗量',
    levelFrom: '共鸣技能',
    flatMap: levelMap(225, 252, 281, 315, 355, 393, 400, 409, 416, 427),
    percentMap: levelMap(0.54, 0.5616, 0.5832, 0.6156, 0.6588, 0.702, 0.783, 0.8748, 0.972, 1.134)
  },
  errorHeal: {
    name: '期望误差治疗量',
    levelFrom: '共鸣技能',
    flatMap: levelMap(49, 55, 61, 69, 78, 86, 88, 90, 91, 94),
    percentMap: levelMap(0.1188, 0.1235, 0.1283, 0.1354, 0.1449, 0.1544, 0.1722, 0.1924, 0.2138, 0.2494)
  },
  fieldHeal: {
    name: '谐振场治疗量',
    levelFrom: '共鸣回路',
    flatMap: levelMap(40, 44, 50, 56, 63, 70, 71, 73, 74, 76),
    percentMap: levelMap(0.0963, 0.1002, 0.1041, 0.1098, 0.1175, 0.1253, 0.1397, 0.1561, 0.1735, 0.2024)
  },
  strongFieldHeal: {
    name: '强谐振场治疗量',
    levelFrom: '共鸣回路',
    flatMap: levelMap(40 * 1.4, 44 * 1.4, 50 * 1.4, 56 * 1.4, 63 * 1.4, 70 * 1.4, 71 * 1.4, 73 * 1.4, 74 * 1.4, 76 * 1.4),
    percentMap: levelMap(0.0963 * 1.4, 0.1002 * 1.4, 0.1041 * 1.4, 0.1098 * 1.4, 0.1175 * 1.4, 0.1253 * 1.4, 0.1397 * 1.4, 0.1561 * 1.4, 0.1735 * 1.4, 0.2024 * 1.4)
  }
};

const MONING_SKILLS = {
  liberation: {
    name: '临界协议伤害',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(2.6273, 2.8427, 3.0582, 3.3598, 3.5752, 3.823, 4.1677, 4.5124, 4.857, 5.2233)
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '热熔伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function getPanelHealingBonus(attrMap) {
  return getPercentAttr(attrMap, '治疗效果加成') + getPercentAttr(attrMap, '治疗加成');
}

function getFinalAttack(panel, mergedBuff, roleDetailData) {
  return calcFinalAttack(panel, mergedBuff, roleDetailData);
}

function getFinalDefense(panel, mergedBuff, roleDetailData) {
  return calcFinalDefense(panel, mergedBuff, roleDetailData);
}

// 干涉标记：目标处于【震谐·干涉】/【集谐·干涉】时（S1 起不再需要该状态），
// 附近队伍中所有角色对其造成的伤害提升。共鸣效率 > 100% 时，每超过 1% 提升 0.25%，上限 40%。
function getInterferenceDeepen(panel) {
  const efficiencyPercent = Number(panel?.resonanceEfficiency || 0) * 100;
  return Math.min(0.40, Math.max(0, efficiencyPercent - 100) * 0.0025);
}

// S2：对拥有干涉标记的目标造成的暴击伤害提升，每超过 1% 共鸣效率提升 0.2%，上限 32%。
function getInterferenceCritDamage(panel, chainCount) {
  if (chainCount < 2) return 0;
  const efficiencyPercent = Number(panel?.resonanceEfficiency || 0) * 100;
  return Math.min(0.32, Math.max(0, efficiencyPercent - 100) * 0.002);
}

function calcHeal({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = MONING_HEALS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const chainCount = getChainUnlockedCount(roleDetailData);
  const weaponBuff = modules.weapon?.apply ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: 'heal', skillName: skill.name, options }) : {};
  const phantomBuff = modules.phantom?.apply ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: 'heal', skillName: skill.name, options }) : {};
  const groupBuff = modules.group?.apply ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: 'heal', skillName: skill.name, options }) : {};
  const mergedBuff = mergeBuff(weaponBuff, phantomBuff, groupBuff);
  // S4「宇宙的隐变量」：强谐振场治疗量提升 30%。
  const chainHealing = chainCount >= 4 && skillKey === 'strongFieldHeal' ? 0.30 : 0;
  return {
    name: skill.name,
    ...calcSingleHeal({
      // 莫宁治疗按防御力结算：专武「宙算仪轨」的防御提升必须计入。
      base: getFinalDefense(panel, mergedBuff, roleDetailData),
      skillMultiplier: skill.percentMap[level] || skill.percentMap[10],
      flatHeal: skill.flatMap[level] || skill.flatMap[10],
      // mergeBuff 已汇总 weapon/phantom/group 的 healingBonus，此处不再重复相加。
      healingBonus: getPanelHealingBonus(panel.attrMap || {})
        + Number(mergedBuff.healingBonus || 0)
        + chainHealing,
      sourceDetail: [{ source: '莫宁', desc: '治疗按防御力结算' }]
    })
  };
}

function calcDamageSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = MONING_SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const chainCount = getChainUnlockedCount(roleDetailData);
  const weaponBuff = modules.weapon?.apply ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const phantomBuff = modules.phantom?.apply ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const groupBuff = modules.group?.apply ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const mergedBuff = mergeBuff(weaponBuff, phantomBuff, groupBuff);
  // S5「钟慢效应」：共鸣解放·临界协议伤害倍率提升 40%。
  const chainMultiplier = chainCount >= 5 ? 0.40 : 0;
  // S1 起干涉标记无条件生效；S6「直到群星的尽头」：临界协议造成的伤害提升 400%（增伤区）。
  const chainDeepen = getInterferenceDeepen(panel);
  const chainDamageBonus = chainCount >= 6 ? 4.00 : 0;
  // 临界协议：共鸣效率 > 100% 时，每超过 1% 使该技能暴击 +0.5%（上限 80%）、
  // 暴击伤害 +1%（上限 160%）。
  const efficiencyPercent = Number(panel?.resonanceEfficiency || 0) * 100;
  const liberationCritRate = Math.min(0.80, Math.max(0, efficiencyPercent - 100) * 0.005);
  const liberationCritDamage = Math.min(1.60, Math.max(0, efficiencyPercent - 100) * 0.01);
  const result = calcSingleDamage({
    attack: getFinalAttack(panel, mergedBuff, roleDetailData),
    skillMultiplier: skill.levelMap[level] || skill.levelMap[10],
    multiplierBonus: (mergedBuff.multiplierBonus || 0) + chainMultiplier,
    damageBonus: getPanelDamageBonus(panel.attrMap || {}, skill.type) + (mergedBuff.damageBonus || 0) + chainDamageBonus,
    deepen: (mergedBuff.deepen || 0) + chainDeepen,
    critRate: panel.critRate + Number(mergedBuff.critRate || 0) + liberationCritRate,
    critDamage: panel.critDamage + Number(mergedBuff.critDamage || 0) + getInterferenceCritDamage(panel, chainCount) + liberationCritDamage,
    attackerLevel: panel.level || 90,
    enemyLevel: enemy?.level || 90,
    resistance: enemy?.resistance ?? 0.1,
    ignoreDefense: Math.max(Number(mergedBuff.ignoreDefense || 0), Number(enemy?.ignoreDefense || 0)),
    sourceDetail: mergedBuff.sources
  });
  return { name: skill.name, ...result };
}

export default {
  name: '莫宁',
  wiki: WIKI_DETAIL,
  skills: { ...MONING_HEALS, ...MONING_SKILLS },

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = [
      calcHeal({ ...args, skillKey: 'arrayHeal' }),
      calcHeal({ ...args, skillKey: 'strongFieldHeal' }),
      calcHeal({ ...args, skillKey: 'errorHeal' }),
      calcDamageSkill({ ...args, skillKey: 'liberation' })
    ];
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1429461088674648064', items };
  }
};
