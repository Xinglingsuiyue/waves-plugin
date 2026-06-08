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

const REBECCA_SKILLS = {
  bigFirework: {
    name: '大烟花！伤害',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '32.00%+288.00%',
      '34.63%+311.62%',
      '37.25%+335.24%',
      '40.93%+368.30%',
      '43.55%+391.92%',
      '46.57%+419.07%',
      '50.77%+456.86%',
      '54.96%+494.64%',
      '59.16%+532.43%',
      '63.62%+572.58%'
    )
  },
  hackResponse: {
    name: '骇破响应·熔触伤害',
    type: 'hack',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '1186.50%偏谐系数',
      '1283.80%偏谐系数',
      '1381.09%偏谐系数',
      '1517.30%偏谐系数',
      '1614.59%偏谐系数',
      '1726.48%偏谐系数',
      '1882.15%偏谐系数',
      '2037.82%偏谐系数',
      '2193.49%偏谐系数',
      '2358.89%偏谐系数'
    )
  },
  hunterBurst: {
    name: '重击·哒哒哒！·猎手伤害',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '10.00%+10.00%+10.00%+160.00%+10.00%',
      '10.82%+10.82%+10.82%+173.12%+10.82%',
      '11.64%+11.64%+11.64%+186.24%+11.64%',
      '12.79%+12.79%+12.79%+204.61%+12.79%',
      '13.61%+13.61%+13.61%+217.73%+13.61%',
      '14.56%+14.56%+14.56%+232.82%+14.56%',
      '15.87%+15.87%+15.87%+253.81%+15.87%',
      '17.18%+17.18%+17.18%+274.80%+17.18%',
      '18.49%+18.49%+18.49%+295.80%+18.49%',
      '19.89%+19.89%+19.89%+318.10%+19.89%'
    )
  },
  ironcladBurst: {
    name: '重击·砰砰砰！·铁胆伤害',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '140.00%',
      '151.48%',
      '162.96%',
      '179.04%',
      '190.52%',
      '203.72%',
      '222.09%',
      '240.45%',
      '258.82%',
      '278.34%'
    )
  },
  skillBig: {
    name: '共鸣技能·来发大的！伤害',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '11.90%+11.90%+11.90%+11.90%+17.85%+17.85%+17.85%+17.85%',
      '12.88%+12.88%+12.88%+12.88%+19.32%+19.32%+19.32%+19.32%',
      '13.86%+13.86%+13.86%+13.86%+20.78%+20.78%+20.78%+20.78%',
      '15.22%+15.22%+15.22%+15.22%+22.83%+22.83%+22.83%+22.83%',
      '16.20%+16.20%+16.20%+16.20%+24.30%+24.30%+24.30%+24.30%',
      '17.32%+17.32%+17.32%+17.32%+25.98%+25.98%+25.98%+25.98%',
      '18.88%+18.88%+18.88%+18.88%+28.32%+28.32%+28.32%+28.32%',
      '20.44%+20.44%+20.44%+20.44%+30.66%+30.66%+30.66%+30.66%',
      '22.00%+22.00%+22.00%+22.00%+33.00%+33.00%+33.00%+33.00%',
      '23.66%+23.66%+23.66%+23.66%+35.49%+35.49%+35.49%+35.49%'
    )
  },
  skillCatchMe: {
    name: '共鸣技能·有本事来抓我！伤害',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '11.90%+2.38%+11.90%+11.90%+69.02%+5.95%+5.95%',
      '12.88%+2.58%+12.88%+12.88%+74.68%+6.44%+6.44%',
      '13.86%+2.78%+13.86%+13.86%+80.34%+6.93%+6.93%',
      '15.22%+3.05%+15.22%+15.22%+88.27%+7.61%+7.61%',
      '16.20%+3.24%+16.20%+16.20%+93.93%+8.10%+8.10%',
      '17.32%+3.47%+17.32%+17.32%+100.44%+8.66%+8.66%',
      '18.88%+3.78%+18.88%+18.88%+109.49%+9.44%+9.44%',
      '20.44%+4.09%+20.44%+20.44%+118.55%+10.22%+10.22%',
      '22.00%+4.40%+22.00%+22.00%+127.60%+11.00%+11.00%',
      '23.66%+4.74%+23.66%+23.66%+137.22%+11.83%+11.83%'
    )
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '导电伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  return total;
}

function getRoleSelfBuff({ skill, skillType, chainCount }) {
  const buff = {
    attackPercent: 0,
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    ignoreDefense: 0,
    source: '丽贝卡·自身'
  };

  const isModeAttack =
    skill.name.includes('来发大的！') ||
    skill.name.includes('有本事来抓我！') ||
    skill.name.includes('哒哒哒！·猎手') ||
    skill.name.includes('砰砰砰！·铁胆') ||
    skill.name.includes('呜呼，来发大的！') ||
    skill.name.includes('蠢货，有本事来抓我！');

  if (chainCount >= 1 && isModeAttack) {
    buff.multiplierBonus += 0.50;
  }

  if (chainCount >= 3 && skill.name === '大烟花！伤害') {
    buff.multiplierBonus += 0.60;
  }

  if (chainCount >= 4) {
    buff.damageBonus += 0.60;
  }

  if (chainCount >= 5 && skillType === 'normal') {
    buff.damageBonus += 0.20;
  }

  if (chainCount >= 6 && skillType === 'normal') {
    buff.damageBonus += 0.40;
  }

  return buff;
}

function getSkillMultiplier(skill, level, chainCount) {
  const base = skill.levelMap[level] || skill.levelMap[10];

  if (
    chainCount >= 6 &&
    (skill.name === '重击·哒哒哒！·猎手伤害' || skill.name === '重击·砰砰砰！·铁胆伤害')
  ) {
    return base + 9.00;
  }

  return base;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const skillMultiplier = getSkillMultiplier(skill, level, chainCount);

  const roleBuff = getRoleSelfBuff({ skill, skillType: skill.type, chainCount });
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
  name: '丽贝卡',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const items = pickTopItems([
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: REBECCA_SKILLS.bigFirework }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: REBECCA_SKILLS.hackResponse }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: REBECCA_SKILLS.skillBig }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: REBECCA_SKILLS.skillCatchMe }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: REBECCA_SKILLS.hunterBurst }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: REBECCA_SKILLS.ironcladBurst })
    ]);

    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1502681773647212544', items };
  }
};
