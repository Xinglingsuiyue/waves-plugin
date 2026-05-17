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
      1: 2.5140 + 5.8660,
      2: 2.7202 + 6.3471,
      3: 2.9263 + 6.8281,
      4: 3.2150 + 7.5015,
      5: 3.4211 + 7.9825,
      6: 3.6582 + 8.5357,
      7: 3.9880 + 9.3053,
      8: 4.3178 + 10.0749,
      9: 4.6477 + 10.8445,
      10: 4.9981 + 11.6622
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

function getPanelDamageBonus(attrMap, skillType) {
  let total = 0;

  total += getPercentAttr(attrMap, '衍射伤害加成');

  if (skillType === 'skill') {
    total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  } else if (skillType === 'liberation') {
    total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  } else if (skillType === 'intro') {
    total += getPercentAttr(attrMap, '变奏技能伤害加成');
  }

  return total;
}

function getRoleSelfBuff(roleDetailData, skillType, chainCount) {
  const buff = {
    damageBonus: 0,
    deepen: 0,
    multiplierBonus: 0,
    ignoreDefense: 0
  };

  // 固有技能：沐光（常驻）不在这里重复计算

  // 4链：施放共鸣解放或惊龙破空时，全属性伤害+20%
  if (chainCount >= 4 && (skillType === 'skill' || skillType === 'liberation')) {
    buff.damageBonus += 0.20;
  }

  return buff;
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

  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);

  const attrMap = panel.attrMap || {};
  const panelBonus = getPanelDamageBonus(attrMap, skillType);

  const result = calcSingleDamage({
    attack: panel.attack,
    skillMultiplier,
    multiplierBonus: mergedBuff.multiplierBonus || 0,
    damageBonus: panelBonus + (mergedBuff.damageBonus || 0),
    deepen: mergedBuff.deepen || 0,
    critRate: panel.critRate,
    critDamage: panel.critDamage,
    attackerLevel: panel.level || 90,
    enemyLevel: enemy?.level || 90,
    resistance: enemy?.resistance ?? 0.1,
    ignoreDefense: mergedBuff.ignoreDefense || enemy?.ignoreDefense || 0
  });

  return {
    name: skillName,
    ...result
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
    let liberationMul = JINHSI_SKILLS.liberation.levelMap[liberationLevel] || JINHSI_SKILLS.liberation.levelMap[10];
    const dragonMul = getDragonMultiplier(circuitLevel, 50, chainCount);

    // 5链：共鸣解放伤害倍率提升120%
    if (chainCount >= 5) {
      liberationMul *= 2.2;
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

    const liberation = calcOneSkill({
      roleDetailData,
      panel,
      equipment,
      enemy,
      modules,
      skillName: JINHSI_SKILLS.liberation.name,
      skillType: 'liberation',
      skillMultiplier: liberationMul
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
