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

// 长离（5★ 热熔 迅刀）
// 数据来源：库街区角色详情优先；本轮以 BWiki 技能倍率页交叉核对。
// 默认展示 3 个代表输出：离火照丹心、焚身以火、心眼·劫。
const CHANGLI_SKILLS = {
  liberation: {
    name: '共鸣解放·离火照丹心',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: { 1: 6.1000, 2: 6.6002, 3: 7.1004, 4: 7.8004, 5: 8.3006, 6: 8.8759, 7: 9.6757, 8: 10.4755, 9: 11.2753, 10: 12.1275 }
  },
  circuit: {
    name: '重击·焚身以火',
    type: 'skill',
    levelFrom: '共鸣回路',
    levelMap: { 1: 0.1975 * 5 + 2.3030, 2: 0.2137 * 5 + 2.4919, 3: 0.2299 * 5 + 2.6808, 4: 0.2526 * 5 + 2.9451, 5: 0.2688 * 5 + 3.1340, 6: 0.2874 * 5 + 3.3512, 7: 0.3133 * 5 + 3.6533, 8: 0.3392 * 5 + 3.9555, 9: 0.3652 * 5 + 4.2576, 10: 0.3925 * 5 + 4.5785 }
  },
  skill: {
    name: '共鸣技能·心眼·劫',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: { 1: 0.4120 * 3 + 0.8240, 2: 0.4458 * 3 + 0.8916, 3: 0.4796 * 3 + 0.9592, 4: 0.5269 * 3 + 1.0538, 5: 0.5607 * 3 + 1.1214, 6: 0.5996 * 3 + 1.1991, 7: 0.6536 * 3 + 1.3071, 8: 0.7076 * 3 + 1.4150, 9: 0.7615 * 3 + 1.5229, 10: 0.8188 * 3 + 1.6376 }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '热熔伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  return total;
}

function getRoleSelfBuff({ skill, chainCount }) {
  const buff = { damageBonus: 0, deepen: 0, multiplierBonus: 0, ignoreDefense: 0, critRate: 0, attackPercent: 0, source: '长离·自身' };

  // 固有技能：散势。焚身以火/离火照丹心 热熔 +20%，忽视 15% 防御。
  if (skill.name === CHANGLI_SKILLS.circuit.name || skill.name === CHANGLI_SKILLS.liberation.name) {
    buff.damageBonus += 0.20;
    buff.ignoreDefense += 0.15;
  }

  // 焰羽：解放后焚身以火攻击提升 25%，默认输出链路在线。
  if (skill.name === CHANGLI_SKILLS.circuit.name) {
    buff.attackPercent += 0.25;
  }

  if (chainCount >= 1 && (skill.name === CHANGLI_SKILLS.circuit.name || skill.type === 'skill')) {
    buff.damageBonus += 0.10;
  }
  if (chainCount >= 2) {
    buff.critRate += 0.25;
  }
  if (chainCount >= 3 && skill.name === CHANGLI_SKILLS.liberation.name) {
    buff.multiplierBonus += 0.80;
  }
  if (chainCount >= 4) {
    buff.attackPercent += 0.20;
  }
  if (chainCount >= 5 && skill.name === CHANGLI_SKILLS.circuit.name) {
    buff.multiplierBonus += 0.50;
    buff.damageBonus += 0.50;
  }
  if (chainCount >= 6 && (skill.name === CHANGLI_SKILLS.circuit.name || skill.name === CHANGLI_SKILLS.liberation.name || skill.type === 'skill')) {
    buff.ignoreDefense += 0.40;
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
  name: '长离',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const items = [
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: CHANGLI_SKILLS.liberation }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: CHANGLI_SKILLS.circuit }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: CHANGLI_SKILLS.skill })
    ];

    return { enemyName: enemy?.name || '无妄者', items };
  }
};
