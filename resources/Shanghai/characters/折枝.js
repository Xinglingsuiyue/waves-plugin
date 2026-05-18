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

// 折枝（5★ 冷凝 音感仪）
// 数据来源：库街区 wiki entryId=1269802618305703936。
// 默认展示 3 个倍率较高代表输出：极意·神来之笔、以形写神、墨鹤合计。
const ZHEZHI_SKILLS = {
  circuit: {
    name: '共鸣回路·极意·神来之笔',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: { 1: 0.6000 * 3, 2: 0.6492 * 3, 3: 0.6984 * 3, 4: 0.7673 * 3, 5: 0.8165 * 3, 6: 0.8731 * 3, 7: 0.9518 * 3, 8: 1.0305 * 3, 9: 1.1093 * 3, 10: 1.1929 * 3 }
  },
  skill: {
    name: '共鸣技能·以形写神',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: { 1: 0.4950 * 3, 2: 0.5356 * 3, 3: 0.5762 * 3, 4: 0.6331 * 3, 5: 0.6736 * 3, 6: 0.7203 * 3, 7: 0.7853 * 3, 8: 0.8502 * 3, 9: 0.9152 * 3, 10: 0.9842 * 3 }
  },
  liberation: {
    name: '共鸣解放·墨鹤协同合计',
    type: 'normal',
    levelFrom: '共鸣解放',
    levelMap: { 1: 0.3280 * 21, 2: 0.3549 * 21, 3: 0.3818 * 21, 4: 0.4195 * 21, 5: 0.4464 * 21, 6: 0.4773 * 21, 7: 0.5204 * 21, 8: 0.5634 * 21, 9: 0.6064 * 21, 10: 0.6521 * 21 }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '冷凝伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function getRoleSelfBuff({ skill, chainCount }) {
  const buff = { damageBonus: 0, deepen: 0, multiplierBonus: 0, ignoreDefense: 0, critRate: 0, attackPercent: 0, source: '折枝·自身' };

  // 固有技能：挥毫，施放神来之笔/极意·神来之笔时攻击提升 6%，最多 3 层；默认满层。
  if (skill.name === ZHEZHI_SKILLS.circuit.name) {
    buff.attackPercent += 0.18;
    // 极意·神来之笔让折枝普攻伤害加成提升 18%。
    buff.damageBonus += 0.18;
  }

  if (chainCount >= 2) {
    buff.damageBonus += 0.20;
  }
  if (chainCount >= 6 && skill.type === 'normal') {
    buff.damageBonus += 0.30;
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

export default {
  name: '折枝',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const items = [
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: ZHEZHI_SKILLS.liberation }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: ZHEZHI_SKILLS.circuit }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: ZHEZHI_SKILLS.skill })
    ];

    return { enemyName: enemy?.name || '无妄者', items };
  }
};
