export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function round(num) {
  return Math.round(Number(num) || 0);
}

export function roundFixed(num, digits = 4) {
  return Number((Number(num) || 0).toFixed(digits));
}

/**
 * 防御乘区
 * 采用简化公式：
 * (100 + 角色等级) / (199 + 角色等级 + 怪物等级)
 */
export function calcDefenseMultiplier({
  attackerLevel = 90,
  enemyLevel = 90,
  ignoreDefense = 0
} = {}) {
  const base = (100 + attackerLevel) / (199 + attackerLevel + enemyLevel);
  const ignore = clamp(ignoreDefense, 0, 0.95);
  return base / Math.max(0.05, 1 - ignore);
}

/**
 * 抗性乘区
 */
export function calcResistanceMultiplier(resistance = 0.1) {
  if (resistance < 0) {
    return 1 - resistance / 2;
  }
  if (resistance < 0.8) {
    return 1 - resistance;
  }
  return 1 / (1 + resistance * 5);
}

/**
 * 暴击期望乘区
 * critDamage 直接传 2.738 这类最终暴伤乘区
 */
export function calcExpectedCritMultiplier(critRate = 0, critDamage = 1.5) {
  const rate = clamp(critRate, 0, 1);
  return (1 - rate) + rate * critDamage;
}

/**
 * 单段伤害计算
 */
export function calcSingleDamage({
  attack = 0,
  skillMultiplier = 0,
  multiplierBonus = 0,

  // 这里的 damageBonus 是“最终总伤加成”，例如：
  // 面板衍射 + 面板共鸣技能 + 武器/声骸/套装补的触发态
  damageBonus = 0,

  deepen = 0,
  critRate = 0,
  critDamage = 1.5,
  attackerLevel = 90,
  enemyLevel = 90,
  resistance = 0.1,
  ignoreDefense = 0,

  // 调试信息
  sourceDetail = null
}) {
  const baseArea = Number(attack) || 0;
  const multiArea = (Number(skillMultiplier) || 0) * (1 + (Number(multiplierBonus) || 0));
  const damageBonusArea = 1 + (Number(damageBonus) || 0);
  const deepenArea = 1 + (Number(deepen) || 0);
  const defenseArea = calcDefenseMultiplier({ attackerLevel, enemyLevel, ignoreDefense });
  const resistanceArea = calcResistanceMultiplier(resistance);

  const nonCrit = baseArea * multiArea * damageBonusArea * deepenArea * defenseArea * resistanceArea;
  const crit = nonCrit * critDamage;
  const expected = nonCrit * calcExpectedCritMultiplier(critRate, critDamage);

  return {
    type: 'damage',
    nonCrit: round(nonCrit),
    crit: round(crit),
    expected: round(expected),
    detail: {
      attack: round(baseArea),
      skillMultiplier: roundFixed(multiArea, 4),
      damageBonusArea: roundFixed(damageBonusArea, 4),
      deepenArea: roundFixed(deepenArea, 4),
      defenseArea: roundFixed(defenseArea, 12),
      resistanceArea: roundFixed(resistanceArea, 4),
      critRate: roundFixed(clamp(critRate, 0, 1), 4),
      critDamage: roundFixed(critDamage, 4)
    },
    sources: sourceDetail || null
  };
}

/**
 * 单段治疗/回血计算
 * 治疗通常不吃防御、抗性、暴击；为兼容现有模板和日志，
 * nonCrit / crit / expected 均填入同一治疗量，真实治疗值使用 heal 字段读取。
 */
export function calcSingleHeal({
  base = 0,
  skillMultiplier = 0,
  multiplierBonus = 0,
  flatHeal = 0,
  healingBonus = 0,
  deepen = 0,
  sourceDetail = null
} = {}) {
  const baseArea = Number(base) || 0;
  const multiArea = (Number(skillMultiplier) || 0) * (1 + (Number(multiplierBonus) || 0));
  const flatArea = Number(flatHeal) || 0;
  const healingBonusArea = 1 + (Number(healingBonus) || 0);
  const deepenArea = 1 + (Number(deepen) || 0);
  const heal = (baseArea * multiArea + flatArea) * healingBonusArea * deepenArea;
  const roundedHeal = round(heal);

  return {
    type: 'heal',
    heal: roundedHeal,
    nonCrit: roundedHeal,
    crit: roundedHeal,
    expected: roundedHeal,
    detail: {
      base: round(baseArea),
      skillMultiplier: roundFixed(multiArea, 4),
      flatHeal: round(flatArea),
      healingBonusArea: roundFixed(healingBonusArea, 4),
      deepenArea: roundFixed(deepenArea, 4)
    },
    sources: sourceDetail || null
  };
}

/**
 * 单段护盾计算
 * 护盾通常不吃防御、抗性、暴击；为兼容现有模板和日志，
 * nonCrit / crit / expected 均填入同一护盾量，真实护盾值使用 shield 字段读取。
 */
export function calcSingleShield({
  base = 0,
  skillMultiplier = 0,
  multiplierBonus = 0,
  flatShield = 0,
  shieldBonus = 0,
  deepen = 0,
  sourceDetail = null
} = {}) {
  const baseArea = Number(base) || 0;
  const multiArea = (Number(skillMultiplier) || 0) * (1 + (Number(multiplierBonus) || 0));
  const flatArea = Number(flatShield) || 0;
  const shieldBonusArea = 1 + (Number(shieldBonus) || 0);
  const deepenArea = 1 + (Number(deepen) || 0);
  const shield = (baseArea * multiArea + flatArea) * shieldBonusArea * deepenArea;
  const roundedShield = round(shield);

  return {
    type: 'shield',
    shield: roundedShield,
    nonCrit: roundedShield,
    crit: roundedShield,
    expected: roundedShield,
    detail: {
      base: round(baseArea),
      skillMultiplier: roundFixed(multiArea, 4),
      flatShield: round(flatArea),
      shieldBonusArea: roundFixed(shieldBonusArea, 4),
      deepenArea: roundFixed(deepenArea, 4)
    },
    sources: sourceDetail || null
  };
}
