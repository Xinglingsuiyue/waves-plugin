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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function parseMultiplierExpr(expr) {
  if (typeof expr === 'number') return expr;
  const clean = String(expr)
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .replace(/%/g, '');

  return clean.split('+').filter(Boolean).reduce((sum, part) => {
    const factors = part.split('*').filter(Boolean).map(Number);
    if (!factors.length || factors.some(Number.isNaN)) return sum;
    const head = Number(factors.shift() || 0) / 100;
    const tail = factors.reduce((acc, value) => acc * value, 1);
    return sum + head * tail;
  }, 0);
}

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = parseMultiplierExpr(value);
  return map;
}, {});

const WIKI_DETAIL = {
  id: '1514097978770092032',
  name: '洛瑟菈',
  orgFullName: '角色组 > 共鸣者前瞻',
  lastUpdateTime: '2026-06-13',
  currentVersion: '12.0'
};

const LOSERA_SKILLS = {
  cutAway: {
    key: 'cutAway',
    name: '断舍离伤害',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '42.66%*3+298.60%',
      '46.16%*3+323.08%',
      '49.66%*3+347.57%',
      '54.55%*3+381.84%',
      '58.05%*3+406.33%',
      '62.07%*3+434.49%',
      '67.67%*3+473.66%',
      '73.27%*3+512.84%',
      '78.86%*3+552.01%',
      '84.81%*3+593.64%'
    )
  },
  chaseLight: {
    key: 'chaseLight',
    name: '追光伤害',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '41.42%+41.42%+138.06%+55.23%',
      '44.82%+44.82%+149.39%+59.76%',
      '48.22%+48.22%+160.71%+64.29%',
      '52.97%+52.97%+176.56%+70.63%',
      '56.37%+56.37%+187.88%+75.15%',
      '60.27%+60.27%+200.90%+80.36%',
      '65.71%+65.71%+219.01%+87.61%',
      '71.14%+71.14%+237.12%+94.85%',
      '76.57%+76.57%+255.24%+102.10%',
      '82.35%+82.35%+274.48%+109.80%'
    )
  },
  reminiscenceNormal3: {
    key: 'reminiscenceNormal3',
    name: '普攻·溯念留形第三段伤害',
    type: 'normal',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '26.22%*8',
      '28.37%*8',
      '30.52%*8',
      '33.53%*8',
      '35.67%*8',
      '38.15%*8',
      '41.59%*8',
      '45.02%*8',
      '48.46%*8',
      '52.12%*8'
    )
  },
  forget: {
    key: 'forget',
    name: '遗忘伤害',
    type: 'hack',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '143.59%',
      '155.37%',
      '167.14%',
      '183.63%',
      '195.40%',
      '208.94%',
      '227.78%',
      '246.62%',
      '265.46%',
      '285.48%'
    )
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '冷凝伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  return total;
}

function getRoleSelfBuff({ skill, chainCount, options }) {
  const buff = {
    attackPercent: 0,
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    ignoreDefense: 0,
    source: '洛瑟菈·自身'
  };

  if (chainCount >= 1 && (options?.loseraC1Crit ?? true)) {
    buff.critRate += 0.20;
  }

  if (chainCount >= 3 && skill.key === 'cutAway') {
    buff.multiplierBonus += 1.00;
  }

  if (chainCount >= 4) {
    const forgetStacks = clamp(options?.loseraForgetStacks ?? 3, 0, 3);
    buff.attackPercent += 0.10 * forgetStacks;
  }

  if (chainCount >= 5 && skill.key === 'forget') {
    buff.multiplierBonus += 0.50;
  }

  if (chainCount >= 6 && skill.key === 'cutAway') {
    const memoryStacks = clamp(options?.loseraMemoryStacks ?? 3, 0, 3);
    buff.damageBonus += 2.00 * memoryStacks;
  }

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skill }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const level = getSkillLevel(roleDetailData, skill.levelFrom);

  const roleBuff = getRoleSelfBuff({ skill, chainCount, options });
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options })
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
      skillMultiplier: skill.levelMap[level] || skill.levelMap[10],
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
  name: '洛瑟菈',
  wiki: WIKI_DETAIL,
  skills: LOSERA_SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = pickTopItems([
      calcOneSkill({ ...args, skill: LOSERA_SKILLS.cutAway }),
      calcOneSkill({ ...args, skill: LOSERA_SKILLS.chaseLight }),
      calcOneSkill({ ...args, skill: LOSERA_SKILLS.reminiscenceNormal3 }),
      calcOneSkill({ ...args, skill: LOSERA_SKILLS.forget })
    ]);

    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1514097978770092032', items };
  }
};
