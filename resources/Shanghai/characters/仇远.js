import { calcSingleDamage } from '../../../utils/damage/formula.js';
import {  getPercentAttr, normalizeRoleDetailData, calcFinalAttack  } from '../../../utils/damage/parser.js';
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

// =============================================================
// 仇远（5★ 气动 迅刀 重击主 C / 快速协奏）
// 数据来源：库街区 wiki entryId=1415139197615755264。
//
// 计算范围（4 个代表输出）：
//   1) 答剑·弦歌不辍（普攻第二段）
//   2) 答剑·割股之心（普攻第三段，主要爆发段）
//   3) 重击（仇远「重击伤害」分类）
//   4) 闪避反击
//
// 共鸣链：
//   S1：暴击 +20%
//   S2：【竹照】获得时，附近队伍声骸技能伤害加深 +30%
//   S3：共鸣解放万钧一断倍率 +500%（本模块未计算共鸣解放）
//   S4：攻击 +20%
//   S5：无视防御 +15%
//   S6：施放共鸣技能荷蓑出林时暴伤 +100%（持续 6s）
// =============================================================
const QIUYUAN_SKILLS = {
  // 普攻·质黑相青 第二段：17.5%+17.5% → 34.80%+34.80% (10级)
  normalTwo: {
    name: '普攻·质黑相青第二段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: {
      1: 0.1750 * 2, 2: 0.1894 * 2, 3: 0.2037 * 2, 4: 0.2238 * 2,
      5: 0.2382 * 2, 6: 0.2547 * 2, 7: 0.2777 * 2, 8: 0.3006 * 2,
      9: 0.3236 * 2, 10: 0.3480 * 2
    }
  },
  // 普攻·质黑相青 第三段：12.39%×4 + 33.04% → 24.64%×4 + 65.69% (10级)
  normalThree: {
    name: '普攻·质黑相青第三段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: {
      1: 0.1239 * 4 + 0.3304, 2: 0.1341 * 4 + 0.3575, 3: 0.1443 * 4 + 0.3846,
      4: 0.1585 * 4 + 0.4226, 5: 0.1687 * 4 + 0.4497, 6: 0.1803 * 4 + 0.4808,
      7: 0.1966 * 4 + 0.5242, 8: 0.2128 * 4 + 0.5675, 9: 0.2291 * 4 + 0.6109,
      10: 0.2464 * 4 + 0.6569
    }
  },
  // 重击伤害：83.3% → 165.61% (10级)
  heavy: {
    name: '重击伤害',
    type: 'heavy',
    levelFrom: '常态攻击',
    levelMap: {
      1: 0.8330, 2: 0.9014, 3: 0.9697, 4: 1.0653, 5: 1.1336,
      6: 1.2121, 7: 1.3214, 8: 1.4307, 9: 1.5400, 10: 1.6561
    }
  },
  // 闪避反击：98%+14%×3 → 194.84%+27.84%×3 (10级)
  dodge: {
    name: '闪避反击',
    type: 'heavy',
    levelFrom: '常态攻击',
    levelMap: {
      1: 0.9800 + 0.1400 * 3, 2: 1.0604 + 0.1515 * 3, 3: 1.1408 + 0.1630 * 3,
      4: 1.2533 + 0.1791 * 3, 5: 1.3336 + 0.1906 * 3, 6: 1.4260 + 0.2038 * 3,
      7: 1.5546 + 0.2221 * 3, 8: 1.6832 + 0.2405 * 3, 9: 1.8118 + 0.2589 * 3,
      10: 1.9484 + 0.2784 * 3
    }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = 0;
  total += getPercentAttr(attrMap, '气动伤害加成');
  if (skillType === 'normal') {
    total += getPercentAttr(attrMap, '普攻伤害加成');
  }
  if (skillType === 'heavy') {
    total += getPercentAttr(attrMap, '重击伤害加成');
  }
  return total;
}

function getRoleSelfBuff({ skillName, chainCount }) {
  const buff = {
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    attackPercent: 0,
    ignoreDefense: 0,
    source: '仇远·自身'
  };

  // 固有「与尔同销万古愁」：施放声骸技能后，下次获得【挑灯问剑】时消耗【金药玉馔】，
  // 仇远攻击提升 10%，持续 20 秒（默认循环中已触发）。
  buff.attackPercent += 0.10;
  // 固有「且从容」：目标受到重击 答剑·弦歌不辍 / 答剑·割股之心 / 答剑·忠烈死节的伤害提升 50%。
  // 本模块展示的 4 个技能属于普攻·质黑相青、重击、闪避反击，均非「答剑」系列，故不计入。

  // S1：暴击 +20%
  if (chainCount >= 1) buff.critRate += 0.20;
  // S4：攻击 +20%
  if (chainCount >= 4) buff.attackPercent += 0.20;
  // S5：无视防御 +15%
  if (chainCount >= 5) buff.ignoreDefense += 0.15;
  // S6：默认按共鸣技能荷蓑出林后，暴伤 +100%（持续 6s）；仅当 chainCount>=6 时按"窗口期内"开启
  if (chainCount >= 6) buff.critDamage += 1.00;

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const skill = QIUYUAN_SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const multiplier = skill.levelMap[level] || skill.levelMap[10];

  const roleBuff = getRoleSelfBuff({ skillName: skill.name, chainCount });
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

  const extraCritDamage = Number(roleBuff.critDamage || 0) + Number(weaponBuff.critDamage || 0)
                        + Number(phantomBuff.critDamage || 0) + Number(groupBuff.critDamage || 0);
  const extraCritRate = Number(roleBuff.critRate || 0) + Number(weaponBuff.critRate || 0)
                      + Number(phantomBuff.critRate || 0) + Number(groupBuff.critRate || 0);

  const finalAttack = calcFinalAttack(panel, mergedBuff, roleDetailData);

  const attrMap = panel.attrMap || {};
  const panelBonus = getPanelDamageBonus(attrMap, skill.type);

  const result = calcSingleDamage({
    attack: finalAttack,
    skillMultiplier: multiplier,
    multiplierBonus: mergedBuff.multiplierBonus || 0,
    damageBonus: panelBonus + (mergedBuff.damageBonus || 0),
    deepen: mergedBuff.deepen || 0,
    critRate: panel.critRate + extraCritRate,
    critDamage: panel.critDamage + extraCritDamage,
    attackerLevel: panel.level || 90,
    enemyLevel: enemy?.level || 90,
    resistance: enemy?.resistance ?? 0.1,
    ignoreDefense: mergedBuff.ignoreDefense || enemy?.ignoreDefense || 0
  });

  return { name: skill.name, ...result };
}

export default {
  name: '仇远',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = ['normalTwo', 'normalThree', 'heavy', 'dodge'].map(k =>
      calcOneSkill({ ...args, skillKey: k })
    );
    return { enemyName: enemy?.name || '无妄者', items };
  }
};
