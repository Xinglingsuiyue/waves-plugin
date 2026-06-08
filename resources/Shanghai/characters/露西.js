import { calcSingleDamage } from '../../../utils/damage/formula.js';
import { getPercentAttr, normalizeRoleDetailData } from '../../../utils/damage/parser.js';
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

function parseMultiplierExpr(expr) {
  if (typeof expr === 'number') return expr;
  const parts = String(expr)
    .replace(/\s+/g, '')
    .replace(/%/g, '')
    .replace(/偏谐系数/g, '')
    .split('+')
    .filter(Boolean);

  return parts.reduce((sum, part) => {
    const factors = part.split('*').filter(Boolean).map(Number);
    if (!factors.length) return sum;

    const head = Number(factors.shift() || 0) / 100;
    const tail = factors.reduce((acc, value) => acc * value, 1);
    return sum + head * tail;
  }, 0);
}

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = parseMultiplierExpr(value);
  return map;
}, {});

const LUCY_SKILLS = {
  multiThread: {
    name: '重击·多线程伤害',
    type: 'heavy',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '30.00%+30.00%*3',
      '32.46%+32.46%*3',
      '34.92%+34.92%*3',
      '38.37%+38.37%*3',
      '40.83%+40.83%*3',
      '43.66%+43.66%*3',
      '47.59%+47.59%*3',
      '51.53%+51.53%*3',
      '55.47%+55.47%*3',
      '59.65%+59.65%*3'
    )
  },
  pulseInterference: {
    name: '共鸣技能·脉冲干扰伤害',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '15.52%*2+31.04%*3+31.04%',
      '16.80%*2+33.59%*3+33.59%',
      '18.07%*2+36.14%*3+36.14%',
      '19.85%*2+39.70%*3+39.70%',
      '21.12%*2+42.24%*3+42.24%',
      '22.59%*2+45.17%*3+45.17%',
      '24.62%*2+49.24%*3+49.24%',
      '26.66%*2+53.32%*3+53.32%',
      '28.70%*2+57.39%*3+57.39%',
      '30.86%*2+61.72%*3+61.72%'
    )
  },
  deadlock: {
    name: '共鸣技能·死锁伤害',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '26.00%+104.00%',
      '28.14%+112.53%',
      '30.27%+121.06%',
      '33.25%+133.00%',
      '35.39%+141.53%',
      '37.84%+151.34%',
      '41.25%+164.98%',
      '44.66%+178.62%',
      '48.07%+192.27%',
      '51.70%+206.77%'
    )
  },
  dataBreakdown: {
    name: '骇破响应·数据崩解伤害',
    type: 'hack',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '550.37%+34.40%*4偏谐系数',
      '595.50%+37.22%*4偏谐系数',
      '640.63%+40.04%*4偏谐系数',
      '703.82%+43.99%*4偏谐系数',
      '748.95%+46.81%*4偏谐系数',
      '800.85%+50.06%*4偏谐系数',
      '873.05%+54.57%*4偏谐系数',
      '945.26%+59.08%*4偏谐系数',
      '1017.47%+63.60%*4偏谐系数',
      '1094.19%+68.39%*4偏谐系数'
    )
  },
  networkWalker: {
    name: '共鸣解放·网络行者·覆写篡改伤害',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '450.00%',
      '486.90%',
      '523.80%',
      '575.46%',
      '612.36%',
      '654.80%',
      '713.84%',
      '772.88%',
      '831.92%',
      '894.65%'
    )
  },
  darkWeb: {
    name: '共鸣解放·暗网深潜·覆写篡改伤害',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '900.00%',
      '973.80%',
      '1047.60%',
      '1150.92%',
      '1224.72%',
      '1309.59%',
      '1427.67%',
      '1545.75%',
      '1663.83%',
      '1789.29%'
    )
  },
  motionFailure: {
    name: '欺骗程式·运动失能伤害',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '458.64%偏谐系数',
      '496.25%偏谐系数',
      '533.86%偏谐系数',
      '586.51%偏谐系数',
      '624.12%偏谐系数',
      '667.37%偏谐系数',
      '727.55%偏谐系数',
      '787.72%偏谐系数',
      '847.89%偏谐系数',
      '911.83%偏谐系数'
    )
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '衍射伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  return total;
}

function getRoleSelfBuff({ skill, chainCount }) {
  const buff = {
    attackPercent: 0,
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    ignoreDefense: 0,
    source: '露西·自身'
  };

  if (chainCount >= 3) {
    if (
      skill.name === '共鸣解放·网络行者·覆写篡改伤害' ||
      skill.name === '共鸣解放·暗网深潜·覆写篡改伤害'
    ) {
      buff.multiplierBonus += 0.50;
      buff.critDamage += 1.00;
    }

    if (
      skill.name === '骇破响应·数据崩解伤害' ||
      skill.name === '欺骗程式·运动失能伤害'
    ) {
      buff.multiplierBonus += 0.65;
    }
  }

  return buff;
}

function getSkillMultiplier(skill, level, chainCount) {
  const base = skill.levelMap[level] || skill.levelMap[10];

  if (skill.name === '重击·多线程伤害') {
    return base + (chainCount >= 2 ? 5.60 : 2.70);
  }

  return base;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const skillMultiplier = getSkillMultiplier(skill, level, chainCount);

  const roleBuff = getRoleSelfBuff({ skill, chainCount });
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name })
    : {};

  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);
  const extraCritRate = Number(roleBuff.critRate || 0) + Number(weaponBuff.critRate || 0)
    + Number(phantomBuff.critRate || 0) + Number(groupBuff.critRate || 0);
  const extraCritDamage = Number(roleBuff.critDamage || 0) + Number(weaponBuff.critDamage || 0)
    + Number(phantomBuff.critDamage || 0) + Number(groupBuff.critDamage || 0);

  const finalAttack = panel.attack * (1 + (mergedBuff.attackPercent || 0)) + (mergedBuff.flatAttack || 0);

  return {
    name: skill.name,
    ...calcSingleDamage({
      attack: finalAttack,
      skillMultiplier,
      multiplierBonus: mergedBuff.multiplierBonus || 0,
      damageBonus: getPanelDamageBonus(panel.attrMap || {}, skill.type) + (mergedBuff.damageBonus || 0),
      deepen: mergedBuff.deepen || 0,
      critRate: panel.critRate + extraCritRate,
      critDamage: panel.critDamage + extraCritDamage,
      attackerLevel: panel.level || 90,
      enemyLevel: enemy?.level || 90,
      resistance: enemy?.resistance ?? 0.1,
      ignoreDefense: mergedBuff.ignoreDefense || enemy?.ignoreDefense || 0,
      sourceDetail: mergedBuff.sources
    })
  };
}

function pickTopItems(items, count = 4) {
  return items
    .filter(Boolean)
    .sort((a, b) => (b?.detail?.skillMultiplier || 0) - (a?.detail?.skillMultiplier || 0))
    .slice(0, count);
}

export default {
  name: '露西',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const items = pickTopItems([
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: LUCY_SKILLS.darkWeb }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: LUCY_SKILLS.networkWalker }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: LUCY_SKILLS.motionFailure }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: LUCY_SKILLS.dataBreakdown }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: LUCY_SKILLS.pulseInterference }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: LUCY_SKILLS.deadlock }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: LUCY_SKILLS.multiThread })
    ]);

    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1502669582481317888', items };
  }
};
