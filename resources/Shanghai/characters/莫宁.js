import { calcSingleDamage, calcSingleHeal } from '../../../utils/damage/formula.js';
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

function getFinalAttack(panel, mergedBuff) {
  return (panel.attack || 0) * (1 + (mergedBuff.attackPercent || 0)) + (mergedBuff.flatAttack || 0);
}

function getFinalDefense(panel, mergedBuff) {
  return (panel.defense || panel.def || 0) * (1 + (mergedBuff.defensePercent || 0)) + (mergedBuff.flatDefense || 0);
}

function calcHeal({ roleDetailData, panel, skillKey }) {
  const skill = MONING_HEALS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  return {
    name: skill.name,
    ...calcSingleHeal({
      base: getFinalDefense(panel, {}),
      skillMultiplier: skill.percentMap[level] || skill.percentMap[10],
      flatHeal: skill.flatMap[level] || skill.flatMap[10],
      healingBonus: getPanelHealingBonus(panel.attrMap || {}),
      sourceDetail: [{ source: '莫宁', desc: '治疗按防御力结算' }]
    })
  };
}

function calcDamageSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = MONING_SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const weaponBuff = modules.weapon?.apply ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const phantomBuff = modules.phantom?.apply ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const groupBuff = modules.group?.apply ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const mergedBuff = mergeBuff(weaponBuff, phantomBuff, groupBuff);
  const result = calcSingleDamage({
    attack: getFinalAttack(panel, mergedBuff),
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
  name: '莫宁',
  wiki: WIKI_DETAIL,
  skills: { ...MONING_HEALS, ...MONING_SKILLS },

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = [
      calcHeal({ roleDetailData, panel, skillKey: 'arrayHeal' }),
      calcHeal({ roleDetailData, panel, skillKey: 'strongFieldHeal' }),
      calcHeal({ roleDetailData, panel, skillKey: 'errorHeal' }),
      calcDamageSkill({ ...args, skillKey: 'liberation' })
    ];
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1429461088674648064', items };
  }
};
