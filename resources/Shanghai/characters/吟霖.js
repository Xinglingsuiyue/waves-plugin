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

// 吟霖（5★ 导电 音感仪）
// 数据来源：库街区 wiki entryId=1239319812692709376。
// 默认展示 3 个倍率较高代表输出：破天雷灭击、召雷磁爆、千面魅影。
const YINLIN_SKILLS = {
  liberation: {
    name: '共鸣解放·破天雷灭击',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: { 1: 0.5863 * 7, 2: 0.6344 * 7, 3: 0.6825 * 7, 4: 0.7498 * 7, 5: 0.7979 * 7, 6: 0.8532 * 7, 7: 0.9301 * 7, 8: 1.0070 * 7, 9: 1.0839 * 7, 10: 1.1656 * 7 }
  },
  skill: {
    name: '共鸣技能·召雷磁爆',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: { 1: 0.4500 * 4, 2: 0.4869 * 4, 3: 0.5238 * 4, 4: 0.5755 * 4, 5: 0.6124 * 4, 6: 0.6548 * 4, 7: 0.7139 * 4, 8: 0.7729 * 4, 9: 0.8320 * 4, 10: 0.8947 * 4 }
  },
  circuit: {
    name: '共鸣回路·千面魅影',
    type: 'heavy',
    levelFrom: '共鸣回路',
    levelMap: { 1: 0.9000 * 2, 2: 0.9738 * 2, 3: 1.0476 * 2, 4: 1.1510 * 2, 5: 1.2248 * 2, 6: 1.3096 * 2, 7: 1.4277 * 2, 8: 1.5458 * 2, 9: 1.6639 * 2, 10: 1.7893 * 2 }
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
  const buff = { damageBonus: 0, deepen: 0, multiplierBonus: 0, ignoreDefense: 0, critRate: 0, attackPercent: 0, source: '吟霖·自身' };

  // 固有技能：浸渍痛楚，默认爆发链路中磁殛咆哮后暴击 +15%。
  buff.critRate += 0.15;

  // 固有技能：目标专注，召雷磁爆命中缚罪标记目标时伤害 +10%、攻击 +10%。
  if (skill.name === YINLIN_SKILLS.skill.name) {
    buff.damageBonus += 0.10;
    buff.attackPercent += 0.10;
  }

  // 共鸣链只保留通用保守入口，后续如需精确链效果再按库街区链文本细化。
  if (chainCount >= 2 && skill.type === 'skill') {
    buff.damageBonus += 0.20;
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
  name: '吟霖',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const items = [
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: YINLIN_SKILLS.liberation }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: YINLIN_SKILLS.skill }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: YINLIN_SKILLS.circuit })
    ];

    return { enemyName: enemy?.name || '无妄者', items };
  }
};
