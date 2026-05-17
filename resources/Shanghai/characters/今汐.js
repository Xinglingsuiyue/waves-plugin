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

const JINHSI_SKILLS = {
  intro: {
    name: '变奏技能·蟠龙清辉',
    type: 'intro',
    levelMap: {
      1: 0.80,
      2: 0.8656,
      3: 0.9312,
      4: 1.0231,
      5: 1.0887,
      6: 1.1641,
      7: 1.2691,
      8: 1.3740,
      9: 1.4790,
      10: 1.5905
    }
  },
  liberation: {
    name: '共鸣解放·移岁诛邪',
    type: 'liberation',
    levelMap: {
      1: { part1: 2.5140, part2: 5.8660 },
      2: { part1: 2.7202, part2: 6.3471 },
      3: { part1: 2.9263, part2: 6.8281 },
      4: { part1: 3.2150, part2: 7.5015 },
      5: { part1: 3.4211, part2: 7.9825 },
      6: { part1: 3.6582, part2: 8.5357 },
      7: { part1: 3.9880, part2: 9.3053 },
      8: { part1: 4.3178, part2: 10.0749 },
      9: { part1: 4.6477, part2: 10.8445 },
      10: { part1: 4.9981, part2: 11.6622 }
    }
  },
  dragon: {
    name: '共鸣技能·惊龙破空(50韶光)',
    type: 'skill'
  }
};

function getDragonMultiplier(level = 10, shaoGuang = 50, chainCount = 0) {
  const yiriMap = {
    1: 0.10 * 6,
    2: 0.1082 * 6,
    3: 0.1164 * 6,
    4: 0.1279 * 6,
    5: 0.1361 * 6,
    6: 0.1456 * 6,
    7: 0.1587 * 6,
    8: 0.1718 * 6,
    9: 0.1849 * 6,
    10: 0.1989 * 6
  };

  const bingxingBaseMap = {
    1: 1.75,
    2: 1.8935,
    3: 2.0370,
    4: 2.2379,
    5: 2.3814,
    6: 2.5465,
    7: 2.7761,
    8: 3.0057,
    9: 3.2353,
    10: 3.4792
  };

  const perStackMap = {
    1: 0.2240,
    2: 0.2424,
    3: 0.2608,
    4: 0.2865,
    5: 0.3049,
    6: 0.3260,
    7: 0.3554,
    8: 0.3848,
    9: 0.4142,
    10: 0.4454
  };

  let base = (yiriMap[level] || yiriMap[10]) + (bingxingBaseMap[level] || bingxingBaseMap[10]);
  let perStack = perStackMap[level] || perStackMap[10];

  // 6链：惊龙破空伤害倍率提升45%，韶光倍率额外提升45%
  if (chainCount >= 6) {
    base *= 1.45;
    perStack *= 1.45;
  }

  return base + perStack * Math.min(shaoGuang, 50);
}

function getPanelBonusDetail(attrMap, skillType) {
  const elementBonus = getPercentAttr(attrMap, '衍射伤害加成');

  let skillTypeBonus = 0;
  if (skillType === 'skill') {
    skillTypeBonus = getPercentAttr(attrMap, '共鸣技能伤害加成');
  } else if (skillType === 'liberation') {
    skillTypeBonus = getPercentAttr(attrMap, '共鸣解放伤害加成');
  } else if (skillType === 'intro') {
    skillTypeBonus = getPercentAttr(attrMap, '变奏技能伤害加成');
  }

  return {
    elementBonus,
    skillTypeBonus,
    total: elementBonus + skillTypeBonus
  };
}

function getRoleSelfBuff(roleDetailData, skillType, chainCount) {
  const buff = {
    damageBonus: 0,
    elementDamageBonus: 0,
    skillDamageBonus: 0,
    deepen: 0,
    multiplierBonus: 0,
    ignoreDefense: 0,
    source: 'character:今汐'
  };

  // 固有技能：沐光（常驻）不在这里重复计算

  // 1链：惊蛰
  // 第一版展示口径：默认按 1 层惊蛰展示，仅作用于惊龙破空
  if (chainCount >= 1 && skillType === 'skill') {
    buff.damageBonus += 0.20;
    buff.source = 'character:今汐(1链惊蛰默认1层)';
  }

  // 4链：施放共鸣解放或惊龙破空时，全属性伤害加成提升20%
  if (chainCount >= 4 && (skillType === 'skill' || skillType === 'liberation')) {
    buff.damageBonus += 0.20;
    buff.source = (chainCount >= 1 && skillType === 'skill')
      ? 'character:今汐(1链惊蛰默认1层+4链)'
      : 'character:今汐(4链)';
  }

  return buff;
}

function buildSourceDetail({
  skillName,
  skillType,
  panelBonus,
  mergedBuff,
  chainCount,
  extra = {}
}) {
  return {
    skillName,
    skillType,
    chainCount,
    panel: {
      elementDamageBonus: Number(panelBonus.elementBonus || 0),
      skillDamageBonus: Number(panelBonus.skillTypeBonus || 0),
      total: Number(panelBonus.total || 0)
    },
    buffs: {
      damageBonus: Number(mergedBuff.damageBonus || 0),
      elementDamageBonus: Number(mergedBuff.elementDamageBonus || 0),
      skillDamageBonus: Number(mergedBuff.skillDamageBonus || 0),
      deepen: Number(mergedBuff.deepen || 0),
      multiplierBonus: Number(mergedBuff.multiplierBonus || 0),
      ignoreDefense: Number(mergedBuff.ignoreDefense || 0)
    },
    mergedSources: mergedBuff.sources || [],
    ...extra
  };
}

function calcOneSkill({
  roleDetailData,
  panel,
  equipment,
  enemy,
  modules,
  skillName,
  skillType,
  skillMultiplier
}) {
  const chainCount = getChainUnlockedCount(roleDetailData);

  const roleBuff = getRoleSelfBuff(roleDetailData, skillType, chainCount);
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType })
    : {};

  console.log('[伤害计算][skillBuffRaw]', skillName, JSON.stringify({
    roleBuff,
    weaponBuff,
    phantomBuff,
    groupBuff
  }, null, 2));

  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);

  const attrMap = panel.attrMap || {};
  const panelBonus = getPanelBonusDetail(attrMap, skillType);

  const totalDamageBonus =
    Number(panelBonus.total || 0) +
    Number(mergedBuff.damageBonus || 0) +
    Number(mergedBuff.elementDamageBonus || 0) +
    Number(mergedBuff.skillDamageBonus || 0);

  const sourceDetail = buildSourceDetail({
    skillName,
    skillType,
    panelBonus,
    mergedBuff,
    chainCount
  });

  const result = calcSingleDamage({
    attack: panel.attack,
    skillMultiplier,
    multiplierBonus: mergedBuff.multiplierBonus || 0,
    damageBonus: totalDamageBonus,
    deepen: mergedBuff.deepen || 0,
    critRate: panel.critRate,
    critDamage: panel.critDamage,
    attackerLevel: panel.level || 90,
    enemyLevel: enemy?.level || 90,
    resistance: enemy?.resistance ?? 0.1,
    ignoreDefense: mergedBuff.ignoreDefense || enemy?.ignoreDefense || 0,
    sourceDetail
  });

  return {
    name: skillName,
    ...result
  };
}

function calcMultiPartSkill({
  roleDetailData,
  panel,
  equipment,
  enemy,
  modules,
  skillName,
  skillType,
  multipliers = [],
  partNames = []
}) {
  const chainCount = getChainUnlockedCount(roleDetailData);

  const roleBuff = getRoleSelfBuff(roleDetailData, skillType, chainCount);
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType })
    : {};

  console.log('[伤害计算][skillBuffRaw]', skillName, JSON.stringify({
    roleBuff,
    weaponBuff,
    phantomBuff,
    groupBuff
  }, null, 2));

  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);

  const attrMap = panel.attrMap || {};
  const panelBonus = getPanelBonusDetail(attrMap, skillType);

  const totalDamageBonus =
    Number(panelBonus.total || 0) +
    Number(mergedBuff.damageBonus || 0) +
    Number(mergedBuff.elementDamageBonus || 0) +
    Number(mergedBuff.skillDamageBonus || 0);

  const parts = multipliers.map((multiplier, index) => {
    const partName = partNames[index] || `part${index + 1}`;
    return calcSingleDamage({
      attack: panel.attack,
      skillMultiplier: multiplier,
      multiplierBonus: mergedBuff.multiplierBonus || 0,
      damageBonus: totalDamageBonus,
      deepen: mergedBuff.deepen || 0,
      critRate: panel.critRate,
      critDamage: panel.critDamage,
      attackerLevel: panel.level || 90,
      enemyLevel: enemy?.level || 90,
      resistance: enemy?.resistance ?? 0.1,
      ignoreDefense: mergedBuff.ignoreDefense || enemy?.ignoreDefense || 0,
      sourceDetail: {
        partName,
        skillName,
        skillType
      }
    });
  });

  const sourceDetail = buildSourceDetail({
    skillName,
    skillType,
    panelBonus,
    mergedBuff,
    chainCount,
    extra: {
      parts: parts.map((part, index) => ({
        name: partNames[index] || `part${index + 1}`,
        nonCrit: part.nonCrit,
        crit: part.crit,
        expected: part.expected,
        detail: part.detail
      }))
    }
  });

  return {
    name: skillName,
    nonCrit: parts.reduce((sum, p) => sum + Number(p.nonCrit || 0), 0),
    crit: parts.reduce((sum, p) => sum + Number(p.crit || 0), 0),
    expected: parts.reduce((sum, p) => sum + Number(p.expected || 0), 0),
    detail: {
      attack: panel.attack,
      skillMultiplier: multipliers.reduce((sum, v) => sum + Number(v || 0), 0),
      damageBonusArea: parts[0]?.detail?.damageBonusArea ?? 1,
      deepenArea: parts[0]?.detail?.deepenArea ?? 1,
      defenseArea: parts[0]?.detail?.defenseArea ?? 1,
      resistanceArea: parts[0]?.detail?.resistanceArea ?? 1
    },
    sources: sourceDetail
  };
}

export default {
  name: '今汐',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const chainCount = getChainUnlockedCount(roleDetailData);

    const introLevel = getSkillLevel(roleDetailData, '变奏技能');
    const liberationLevel = getSkillLevel(roleDetailData, '共鸣解放');
    const circuitLevel = getSkillLevel(roleDetailData, '共鸣回路');

    const introMul = JINHSI_SKILLS.intro.levelMap[introLevel] || JINHSI_SKILLS.intro.levelMap[10];

    let liberationData = JINHSI_SKILLS.liberation.levelMap[liberationLevel] || JINHSI_SKILLS.liberation.levelMap[10];
    let liberationPart1 = liberationData.part1;
    let liberationPart2 = liberationData.part2;

    const dragonMul = getDragonMultiplier(circuitLevel, 50, chainCount);

    // 5链：共鸣解放伤害倍率提升120%
    // 这里按两段都提升处理
    if (chainCount >= 5) {
      liberationPart1 *= 2.2;
      liberationPart2 *= 2.2;
    }

    const intro = calcOneSkill({
      roleDetailData,
      panel,
      equipment,
      enemy,
      modules,
      skillName: JINHSI_SKILLS.intro.name,
      skillType: 'intro',
      skillMultiplier: introMul
    });

    const liberation = calcMultiPartSkill({
      roleDetailData,
      panel,
      equipment,
      enemy,
      modules,
      skillName: JINHSI_SKILLS.liberation.name,
      skillType: 'liberation',
      multipliers: [liberationPart1, liberationPart2],
      partNames: ['一段', '二段']
    });

    const dragon = calcOneSkill({
      roleDetailData,
      panel,
      equipment,
      enemy,
      modules,
      skillName: JINHSI_SKILLS.dragon.name,
      skillType: 'skill',
      skillMultiplier: dragonMul
    });

    return {
      enemyName: enemy?.name || '无妄者',
      items: [intro, liberation, dragon]
    };
  }
};
