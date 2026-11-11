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

// 卡卡罗（5★ 导电 长刃）
// 数据来源：库街区 wiki entryId=1242295483584421888。
// 默认展示 3 个代表输出：死告、幻影蚀刻、猎犬剑技·狂噬影狱第五段。
const CALCHARO_SKILLS = {
  circuitDeath: {
    name: '共鸣回路·重击「死告」',
    type: 'liberation',
    levelFrom: '共鸣回路',
    levelMap: { 1: 0.4918 * 8 + 0.9835, 2: 0.5321 * 8 + 1.0642, 3: 0.5724 * 8 + 1.1448, 4: 0.6289 * 8 + 1.2577, 5: 0.6692 * 8 + 1.3384, 6: 0.7156 * 8 + 1.4311, 7: 0.7801 * 8 + 1.5602, 8: 0.8446 * 8 + 1.6892, 9: 0.9091 * 8 + 1.8182, 10: 0.9777 * 8 + 1.9553 }
  },
  liberation: {
    name: '共鸣解放·幻影蚀刻',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: { 1: 3.0000, 2: 3.2460, 3: 3.4920, 4: 3.8364, 5: 4.0824, 6: 4.3653, 7: 4.7589, 8: 5.1525, 9: 5.5461, 10: 5.9643 }
  },
  phantomFifth: {
    name: '普攻·猎犬剑技·狂噬影狱第五段',
    type: 'normal',
    levelFrom: '共鸣解放',
    levelMap: { 1: 0.7554 * 2, 2: 0.8174 * 2, 3: 0.8793 * 2, 4: 0.9661 * 2, 5: 1.0280 * 2, 6: 1.0992 * 2, 7: 1.1983 * 2, 8: 1.2974 * 2, 9: 1.3966 * 2, 10: 1.5019 * 2 }
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
  const buff = { damageBonus: 0, deepen: 0, multiplierBonus: 0, ignoreDefense: 0, critDamage: 0, source: '卡卡罗·自身' };

  // 固有「喋血觉悟」：重击「仁慈」时，共鸣解放伤害加成 +10%，持续 15 秒（默认已触发）。
  if (skill.type === 'liberation') {
    buff.damageBonus += 0.10;
  }

  // S1「隐秘谈判」：灭杀指令额外回复共鸣能量（不参与伤害）。
  // S2「零和博弈」：施放变奏技能后共鸣技能伤害加成 +30%（本模块不展示共鸣技能）。

  // S3「铁腕外交」：共鸣解放·杀戮武装状态持续期间，导电伤害加成 +25%。
  // 死告与狂噬影狱均在杀戮武装状态下施放，可享受；幻影蚀刻是进入该状态的起手技能，不计入。
  if (chainCount >= 3 && (skill.name === '共鸣回路·重击「死告」' || skill.name === '普攻·猎犬剑技·狂噬影狱第五段')) {
    buff.damageBonus += 0.25;
  }

  // S4「集群威胁」：施放延奏技能掠影奇袭时队伍导电伤害 +20%（本模块不展示延奏技能）。
  // S5「替代协议」：变奏技能伤害 +50%（本模块不展示变奏技能）。

  // S6「最后通牒」：施放重击「死告」时召唤 2 个猎杀影，各造成 100% 攻击的共鸣解放伤害。
  if (chainCount >= 6 && skill.name === '共鸣回路·重击「死告」') {
    buff.multiplierBonus += 2 * 1.00;
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
  name: '卡卡罗',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const items = [
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: CALCHARO_SKILLS.circuitDeath }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: CALCHARO_SKILLS.liberation }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: CALCHARO_SKILLS.phantomFifth })
    ];

    return { enemyName: enemy?.name || '无妄者', items };
  }
};
