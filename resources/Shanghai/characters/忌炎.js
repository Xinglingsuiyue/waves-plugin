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

// 忌炎（5★ 气动 长刃）
// 数据来源：库街区角色详情优先；本轮以 BWiki 技能倍率页交叉核对。
// 默认展示 3 个代表输出：破阵之枪三段中最高两段 + 苍躣八荒·后动。
const JIYAN_SKILLS = {
  spearThree: {
    name: '重击·破阵之枪第三段',
    type: 'heavy',
    levelFrom: '共鸣解放',
    levelMap: { 1: 0.3358 * 8, 2: 0.3634 * 8, 3: 0.3909 * 8, 4: 0.4295 * 8, 5: 0.4570 * 8, 6: 0.4887 * 8, 7: 0.5328 * 8, 8: 0.5768 * 8, 9: 0.6209 * 8, 10: 0.6676 * 8 }
  },
  spearOne: {
    name: '重击·破阵之枪第一段',
    type: 'heavy',
    levelFrom: '共鸣解放',
    levelMap: { 1: 0.3296 * 8, 2: 0.3566 * 8, 3: 0.3837 * 8, 4: 0.4215 * 8, 5: 0.4485 * 8, 6: 0.4796 * 8, 7: 0.5228 * 8, 8: 0.5661 * 8, 9: 0.6094 * 8, 10: 0.6552 * 8 }
  },
  circuit: {
    name: '共鸣回路·苍躣八荒·后动',
    type: 'heavy',
    levelFrom: '共鸣回路',
    levelMap: { 1: 0.7190 * 2 + 2.1570, 2: 0.7779 * 2 + 2.3339, 3: 0.8369 * 2 + 2.5108, 4: 0.9194 * 2 + 2.7582, 5: 0.9784 * 2 + 2.9351, 6: 1.0462 * 2 + 3.1385, 7: 1.1405 * 2 + 3.4214, 8: 1.2348 * 2 + 3.7044, 9: 1.3290 * 2 + 3.9873, 10: 1.4291 * 2 + 4.2873 }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '气动伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  return total;
}

function getRoleSelfBuff({ skill, chainCount }) {
  const buff = { damageBonus: 0, deepen: 0, multiplierBonus: 0, ignoreDefense: 0, critDamage: 0, attackPercent: 0, source: '忌炎·自身' };

  // 固有技能：变奏后攻击 +10%；命中后暴伤 +12%。默认爆发链路在线。
  buff.attackPercent += 0.10;
  buff.critDamage += 0.12;

  // 共鸣回路：破阵值强化共鸣技能伤害 +20%，后动为重击伤害，不在此套用。
  // 共鸣链未稳定提取，先保守处理常见爆发收益入口。
  if (chainCount >= 3 && skill.name.includes('破阵之枪')) {
    buff.critDamage += 0.30;
  }
  if (chainCount >= 6) {
    buff.damageBonus += 0.20;
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
  name: '忌炎',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const items = [
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: JIYAN_SKILLS.spearThree }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: JIYAN_SKILLS.spearOne }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: JIYAN_SKILLS.circuit })
    ];

    return { enemyName: enemy?.name || '无妄者', items };
  }
};
