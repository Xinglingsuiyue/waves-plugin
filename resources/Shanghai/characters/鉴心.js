import { calcSingleDamage, calcSingleHeal, calcSingleShield } from '../../../utils/damage/formula.js';
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
  id: '1242295527595823104',
  name: '鉴心',
  lastUpdateTime: '2025-12-29',
  currentVersion: '34.0'
};

const JIANXIN_SKILLS = {
  liberationBurst: {
    name: '涤净力场·炸裂',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(3.2, 3.4624, 3.7248, 4.0922, 4.3546, 4.6564, 5.0762, 5.496, 5.9159, 6.362)
  }
};

const JIANXIN_SHIELDS = {
  inner: {
    name: '大周天·内最终盾量',
    levelFrom: '共鸣回路',
    flatMap: levelMap(1750, 1960, 2187, 2450, 2765, 3062, 3115, 3185, 3237, 3325),
    percentMap: levelMap(0.6825, 0.7098, 0.7371, 0.7781, 0.8327, 0.8873, 0.9896, 1.1057, 1.2285, 1.4333)
  },
  outer: {
    name: '大周天·外最终盾量',
    levelFrom: '共鸣回路',
    flatMap: levelMap(2915, 3265, 3644, 4081, 4606, 5102, 5189, 5306, 5393, 5539),
    percentMap: levelMap(1.137, 1.1825, 1.228, 1.2962, 1.3872, 1.4782, 1.6487, 1.842, 2.0467, 2.3878)
  }
};

const JIANXIN_HEALS = {
  shieldRegen: {
    name: '护盾回复生命值',
    levelFrom: '共鸣回路',
    flatMap: levelMap(700, 784, 875, 980, 1106, 1225, 1246, 1274, 1295, 1330),
    percentMap: levelMap(0.273, 0.2839, 0.2948, 0.3112, 0.3331, 0.3549, 0.3959, 0.4423, 0.4914, 0.5733)
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '气动伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function getPanelHealingBonus(attrMap) {
  return getPercentAttr(attrMap, '治疗效果加成') + getPercentAttr(attrMap, '治疗加成');
}

function getPanelShieldBonus(attrMap) {
  return getPercentAttr(attrMap, '护盾加成') + getPercentAttr(attrMap, '护盾效果加成');
}

function getFinalAttack(panel, mergedBuff) {
  return (panel.attack || 0) * (1 + (mergedBuff.attackPercent || 0)) + (mergedBuff.flatAttack || 0);
}

function calcDamageSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = JIANXIN_SKILLS[skillKey];
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

function calcShield({ roleDetailData, panel, skillKey }) {
  const skill = JIANXIN_SHIELDS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  return {
    name: skill.name,
    ...calcSingleShield({
      base: panel.attack || 0,
      skillMultiplier: skill.percentMap[level] || skill.percentMap[10],
      flatShield: skill.flatMap[level] || skill.flatMap[10],
      shieldBonus: getPanelShieldBonus(panel.attrMap || {}),
      sourceDetail: [{ source: '鉴心·重击混元气旋', desc: '按攻击力结算，默认展示大周天·外最终盾量' }]
    })
  };
}

function calcHeal({ roleDetailData, panel, skillKey }) {
  const skill = JIANXIN_HEALS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  return {
    name: skill.name,
    ...calcSingleHeal({
      base: panel.attack || 0,
      skillMultiplier: skill.percentMap[level] || skill.percentMap[10],
      flatHeal: skill.flatMap[level] || skill.flatMap[10],
      healingBonus: getPanelHealingBonus(panel.attrMap || {}),
      sourceDetail: [{ source: '鉴心·重击混元气旋', desc: '护盾持续期间每6秒回复一次' }]
    })
  };
}

export default {
  name: '鉴心',
  wiki: WIKI_DETAIL,
  skills: { ...JIANXIN_SKILLS, ...JIANXIN_SHIELDS, ...JIANXIN_HEALS },

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = [
      calcShield({ roleDetailData, panel, skillKey: 'outer' }),
      calcShield({ roleDetailData, panel, skillKey: 'inner' }),
      calcHeal({ roleDetailData, panel, skillKey: 'shieldRegen' }),
      calcDamageSkill({ ...args, skillKey: 'liberationBurst' })
    ];
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1242295527595823104', items };
  }
};
