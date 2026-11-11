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

// 相里要（5★ 导电 臂铠）
// 数据来源：库街区 wiki entryId=1272626941409398784。
// 默认展示 3 个代表输出：思维矩阵、万方法则、应刃。
const XIANGLEYAO_SKILLS = {
  liberation: {
    name: '共鸣解放·思维矩阵',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: { 1: 7.3742, 2: 7.9789, 3: 8.5835, 4: 9.4301, 5: 10.0348, 6: 10.7302, 7: 11.6976, 8: 12.6651, 9: 13.6326, 10: 14.6606 }
  },
  circuit: {
    name: '共鸣回路·万方法则',
    type: 'liberation',
    levelFrom: '共鸣回路',
    levelMap: { 1: 0.4815 * 4 + 1.2840, 2: 0.5210 * 4 + 1.3893, 3: 0.5605 * 4 + 1.4946, 4: 0.6158 * 4 + 1.6420, 5: 0.6553 * 4 + 1.7473, 6: 0.7007 * 4 + 1.8684, 7: 0.7639 * 4 + 2.0369, 8: 0.8270 * 4 + 2.2053, 9: 0.8902 * 4 + 2.3738, 10: 0.9573 * 4 + 2.5528 }
  },
  circuitBlade: {
    name: '共鸣回路·应刃',
    // Wiki：应刃造成导电伤害，此次伤害为共鸣解放伤害。
    type: 'liberation',
    levelFrom: '共鸣回路',
    levelMap: { 1: 2.0010, 2: 2.1651, 3: 2.3292, 4: 2.5589, 5: 2.7230, 6: 2.9117, 7: 3.1742, 8: 3.4368, 9: 3.6993, 10: 3.9782 }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '导电伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function getRoleSelfBuff({ skill, chainCount }) {
  const buff = { damageBonus: 0, deepen: 0, multiplierBonus: 0, ignoreDefense: 0, critRate: 0, critDamage: 0, source: '相里要·自身' };

  // 固有「睿知」：施放共鸣技能时导电伤害 +5%，可叠加 4 层（默认满层）。
  buff.damageBonus += 0.20;

  // S1：施放万方法则时额外生成 6 个衍构模体，每个造成万方法则 8% 的伤害。
  if (chainCount >= 1 && skill.name === XIANGLEYAO_SKILLS.circuit.name) {
    buff.multiplierBonus += 0.08 * 6;
  }
  // S2：施放共鸣技能或共鸣解放时，暴击伤害 +30%。
  if (chainCount >= 2) buff.critDamage += 0.30;
  // S3：应刃/基本推衍/一相万殊/万方法则 伤害 +63%，最多叠加 5 层。
  if (chainCount >= 3 && (
    skill.name === XIANGLEYAO_SKILLS.circuit.name || skill.name === XIANGLEYAO_SKILLS.circuitBlade.name
  )) {
    buff.damageBonus += 0.63 * 5;
  }
  // S4：施放思维矩阵时，队伍共鸣解放伤害加成 +25%。
  if (chainCount >= 4 && skill.type === 'liberation') buff.damageBonus += 0.25;
  // S5：思维矩阵伤害倍率 +100%。
  if (chainCount >= 5 && skill.name === XIANGLEYAO_SKILLS.liberation.name) buff.multiplierBonus += 1.00;
  // S6：强化幻方，万方法则伤害倍率 +76%。
  if (chainCount >= 6 && skill.name === XIANGLEYAO_SKILLS.circuit.name) buff.multiplierBonus += 0.76;

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
  name: '相里要',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const items = [
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: XIANGLEYAO_SKILLS.liberation }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: XIANGLEYAO_SKILLS.circuit }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: XIANGLEYAO_SKILLS.circuitBlade })
    ];

    return { enemyName: enemy?.name || '无妄者', items };
  }
};
