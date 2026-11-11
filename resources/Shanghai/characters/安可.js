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

// 安可（5★ 热熔 音感仪）
// 数据来源：库街区 wiki entryId=1242296163679776768。
// 默认展示 3 个代表输出：黑咩·胡闹第四段、黑咩·暴走之炎、热力羊咩。
const ENCORE_SKILLS = {
  blackNormal: {
    name: '共鸣解放·黑咩·胡闹第四段',
    type: 'normal',
    levelFrom: '共鸣解放',
    levelMap: { 1: 0.9759 * 3, 2: 1.0559 * 3, 3: 1.1359 * 3, 4: 1.2479 * 3, 5: 1.3279 * 3, 6: 1.4200 * 3, 7: 1.5480 * 3, 8: 1.6760 * 3, 9: 1.8040 * 3, 10: 1.9401 * 3 }
  },
  circuit: {
    name: '共鸣回路·黑咩·暴走之炎',
    type: 'liberation',
    levelFrom: '共鸣回路',
    levelMap: { 1: 0.2335 * 6 + 2.4908, 2: 0.2526 * 6 + 2.6951, 3: 0.2718 * 6 + 2.8993, 4: 0.2986 * 6 + 3.1853, 5: 0.3177 * 6 + 3.3895, 6: 0.3397 * 6 + 3.6244, 7: 0.3704 * 6 + 3.9512, 8: 0.4010 * 6 + 4.2780, 9: 0.4317 * 6 + 4.6048, 10: 0.4642 * 6 + 4.9521 }
  },
  skill: {
    name: '共鸣技能·热力羊咩',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: { 1: 0.3853 * 8, 2: 0.4169 * 8, 3: 0.4485 * 8, 4: 0.4928 * 8, 5: 0.5244 * 8, 6: 0.5607 * 8, 7: 0.6113 * 8, 8: 0.6618 * 8, 9: 0.7124 * 8, 10: 0.7661 * 8 }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '热熔伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function getRoleSelfBuff({ skill, chainCount }) {
  const buff = { damageBonus: 0, deepen: 0, multiplierBonus: 0, ignoreDefense: 0, critRate: 0, attackPercent: 0, source: '安可·自身' };

  // 固有「生气的黑咩」：黑咩大暴走期间生命高于 70% 时伤害 +10%。
  if (skill.name.includes('黑咩')) {
    buff.damageBonus += 0.10;
  }

  // 固有「咩咩加油歌」：施放热力羊咩/黑咩·狂热后热熔伤害加成 +10%（默认已触发）。
  buff.damageBonus += 0.10;

  // S1「羊咩的童话书」：普攻命中时热熔伤害 +3%，可叠 4 层（默认满层 +12%）。
  if (chainCount >= 1 && skill.type === 'normal') {
    buff.damageBonus += 0.12;
  }

  // S2「数羊安眠曲」：回复共鸣能量（不参与伤害）。

  // S3「迷雾？黑海岸！」：白咩·失控之炎 / 黑咩·暴走之炎 伤害倍率 +40%。
  if (chainCount >= 3 && skill.name === ENCORE_SKILLS.circuit.name) {
    buff.multiplierBonus += 0.40;
  }

  // S4「冒险？好有趣！」：施放黑咩·暴走之炎时队伍热熔伤害加成 +20%，持续 30 秒（默认已触发）。
  // 暴走之炎本身是触发源，不计入；其余技能享受。
  if (chainCount >= 4 && skill.name !== ENCORE_SKILLS.circuit.name) {
    buff.damageBonus += 0.20;
  }

  // S5「聚光灯，勇士登场！」：共鸣技能伤害加成 +35%。
  if (chainCount >= 5 && skill.type === 'skill') {
    buff.damageBonus += 0.35;
  }

  // S6「羊咩，拯救世界！」：黑咩大暴走期间每次造成伤害叠 1 层迷失羔羊，
  // 每层攻击 +5%，最多 5 层（默认满层 +25%）。
  if (chainCount >= 6 && skill.name.includes('黑咩')) {
    buff.attackPercent += 0.05 * 5;
  }

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const skillMultiplier = skill.levelMap[level] || skill.levelMap[10];

  const roleBuff = getRoleSelfBuff({ skill, chainCount });
  const weaponBuff = modules.weapon?.apply ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name }) : {};
  const phantomBuff = modules.phantom?.apply ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name }) : {};
  const groupBuff = modules.group?.apply ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name }) : {};
  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);

  const extraCritRate = Number(roleBuff.critRate || 0) + Number(weaponBuff.critRate || 0) + Number(phantomBuff.critRate || 0) + Number(groupBuff.critRate || 0);
  const extraCritDamage = Number(roleBuff.critDamage || 0) + Number(weaponBuff.critDamage || 0) + Number(phantomBuff.critDamage || 0) + Number(groupBuff.critDamage || 0);
  const finalAttack = calcFinalAttack(panel, mergedBuff, roleDetailData);

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

export default {
  name: '安可',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const items = [
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: ENCORE_SKILLS.blackNormal }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: ENCORE_SKILLS.circuit }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: ENCORE_SKILLS.skill })
    ];

    return { enemyName: enemy?.name || '无妄者', items };
  }
};
