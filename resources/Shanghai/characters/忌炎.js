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
  const buff = { damageBonus: 0, deepen: 0, multiplierBonus: 0, ignoreDefense: 0, critRate: 0, critDamage: 0, attackPercent: 0, source: '忌炎·自身' };

  // 固有「垂天平澜」：施放变奏技能攻其不备后攻击 +10% 持续 15 秒（默认已触发）。
  buff.attackPercent += 0.10;
  // 固有「蕴风集流」：攻击命中目标时暴击伤害 +12% 持续 8 秒（默认已触发）。
  buff.critDamage += 0.12;

  // S1「济世」：枪扫风定使用次数 +1、消耗破阵值 -15（不参与伤害）。

  // S2「通变」：施放变奏技能攻其不备后攻击 +28% 持续 15 秒（默认已触发）。
  if (chainCount >= 2) {
    buff.attackPercent += 0.28;
  }

  // S3「观势」：施放枪扫风定/苍躣八荒·谋定/后动/攻其不备时暴击 +16%、暴伤 +32% 持续 8 秒（默认已触发）。
  if (chainCount >= 3) {
    buff.critRate += 0.16;
    buff.critDamage += 0.32;
  }

  // S4「奇正」：施放苍躣八荒·谋定/后动时队伍重击伤害 +25% 持续 30 秒（默认已触发）。
  if (chainCount >= 4 && skill.type === 'heavy') {
    buff.damageBonus += 0.25;
  }

  // S5「明断」：延奏技能克己倍率 +120%（本模块不展示）；
  // 攻击命中时攻击 +3% 可叠 15 层，施放攻其不备后叠满（+45%，默认已触发）。
  if (chainCount >= 5) {
    buff.attackPercent += 0.03 * 15;
  }

  // S6「移山」：施放苍躣八荒·后动时消耗全部锐意之势，每层使后动倍率 +120%，最多 2 层。
  if (chainCount >= 6 && skill.name === JIYAN_SKILLS.circuit.name) {
    buff.multiplierBonus += 1.20 * 2;
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
