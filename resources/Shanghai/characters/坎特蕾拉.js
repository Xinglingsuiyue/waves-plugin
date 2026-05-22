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
  id: '1342471419668557824',
  name: '坎特蕾拉',
  lastUpdateTime: '2025-12-29',
  currentVersion: '28.0'
};

const CANTARELLA_HEALS = {
  tranceConsume: {
    name: '消耗迷离治疗量',
    levelFrom: '共鸣回路',
    flatMap: levelMap(90, 100, 112, 126, 142, 157, 160, 163, 166, 171),
    percentMap: levelMap(0.216, 0.2246, 0.2333, 0.2462, 0.2635, 0.2808, 0.3132, 0.3499, 0.3888, 0.4536)
  },
  perceptionDrain: {
    name: '感知汲取治疗量',
    levelFrom: '共鸣回路',
    flatMap: levelMap(375, 420, 468, 525, 592, 656, 667, 682, 693, 712),
    percentMap: levelMap(0.9, 0.936, 0.972, 1.026, 1.098, 1.17, 1.305, 1.458, 1.62, 1.89)
  }
};

const CANTARELLA_SKILLS = {
  phantasm: {
    name: '斑驳幻梦伤害',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(0.987, 1.068, 1.1489, 1.2622, 1.3432, 1.4362, 1.5657, 1.6952, 1.8247, 1.9623)
  },
  wake: {
    name: '惊醒伤害',
    type: 'normal',
    levelFrom: '共鸣技能',
    levelMap: levelMap(1, 1.082, 1.164, 1.2788, 1.3608, 1.4551, 1.5863, 1.7175, 1.8487, 1.9881)
  },
  perceptionDrain: {
    name: '感知汲取伤害',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: levelMap(6.72, 7.271, 7.822, 8.5934, 9.1444, 9.7782, 10.6598, 11.5414, 12.423, 13.3598)
  },
  jellyfish: {
    name: '弥漫·织梦水母总伤害',
    type: 'normal',
    levelFrom: '共鸣解放',
    levelMap: levelMap(0.0731 * 21, 0.0791 * 21, 0.0851 * 21, 0.0935 * 21, 0.0995 * 21, 0.1064 * 21, 0.116 * 21, 0.1256 * 21, 0.1352 * 21, 0.1454 * 21)
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '湮灭伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function getPanelHealingBonus(attrMap) {
  return getPercentAttr(attrMap, '治疗效果加成') + getPercentAttr(attrMap, '治疗加成');
}

function getFinalAttack(panel, mergedBuff) {
  return (panel.attack || 0) * (1 + (mergedBuff.attackPercent || 0)) + (mergedBuff.flatAttack || 0);
}

function calcHeal({ roleDetailData, panel, skillKey }) {
  const skill = CANTARELLA_HEALS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  return {
    name: skill.name,
    ...calcSingleHeal({
      base: panel.attack || 0,
      skillMultiplier: skill.percentMap[level] || skill.percentMap[10],
      flatHeal: skill.flatMap[level] || skill.flatMap[10],
      healingBonus: getPanelHealingBonus(panel.attrMap || {}) + 0.2,
      sourceDetail: [{ source: '坎特蕾拉·固有技能「药」', desc: '治疗效果加成默认计入20%' }]
    })
  };
}

function calcDamageSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = CANTARELLA_SKILLS[skillKey];
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
  name: '坎特蕾拉',
  wiki: WIKI_DETAIL,
  skills: { ...CANTARELLA_HEALS, ...CANTARELLA_SKILLS },

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = [
      calcHeal({ roleDetailData, panel, skillKey: 'perceptionDrain' }),
      calcHeal({ roleDetailData, panel, skillKey: 'tranceConsume' }),
      calcDamageSkill({ ...args, skillKey: 'perceptionDrain' })
    ];
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1342471419668557824', items };
  }
};
