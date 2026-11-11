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

// 椿（5★ 湮灭 迅刀）
// 数据来源：库街区角色详情优先；本轮以 BWiki 技能倍率页交叉核对。
// 默认展示 3 个代表输出：一日花、芳华绽烬、烬华蔓舞。
const CAMELLYA_SKILLS = {
  circuit: {
    name: '共鸣回路·一日花',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: { 1: 6.3500, 2: 6.8707, 3: 7.3914, 4: 8.1203, 5: 8.6410, 6: 9.2399, 7: 10.0728, 8: 10.9058, 9: 11.7387, 10: 12.6245 }
  },
  liberation: {
    name: '共鸣解放·芳华绽烬',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: { 1: 6.0500, 2: 6.5461, 3: 7.0422, 4: 7.7365, 5: 8.2326, 6: 8.8031, 7: 9.5968, 8: 10.3905, 9: 11.1842, 10: 12.0281 }
  },
  jinHua: {
    name: '普攻·烬华蔓舞',
    type: 'normal',
    levelFrom: '共鸣技能',
    levelMap: { 1: 0.1104 * 19, 2: 0.1195 * 19, 3: 0.1285 * 19, 4: 0.1412 * 19, 5: 0.1502 * 19, 6: 0.1606 * 19, 7: 0.1751 * 19, 8: 0.1896 * 19, 9: 0.2041 * 19, 10: 0.2195 * 19 }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '湮灭伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  return total;
}

function getRoleSelfBuff({ skill, chainCount }) {
  const buff = {
    damageBonus: 0,
    deepen: 0,
    multiplierBonus: 0,
    ignoreDefense: 0,
    critRate: 0,
    critDamage: 0,
    attackPercent: 0,
    source: '椿·自身'
  };

  // 固有「温床」：湮灭伤害加成 +15%（重击修枝视为普攻伤害）。
  buff.damageBonus += 0.15;
  // 固有「侵占」：普攻伤害加成 +15%。
  if (skill.type === 'normal') {
    buff.damageBonus += 0.15;
  }

  // 含苞状态：指定普攻系倍率提升最高 100%，默认按满红椿·蕊。
  // S6「为你的千千万万次盛放」：酣梦的倍率提升效果额外 +150%（100% → 250%）。
  if (skill.type === 'normal' && skill.name !== CAMELLYA_SKILLS.circuit.name) {
    buff.multiplierBonus += chainCount >= 6 ? 2.50 : 1.00;
  }

  // S1「在无人知晓的秘密小径」：施放变奏技能八千春秋时暴伤 +28% 持续 18 秒（默认已触发）。
  if (chainCount >= 1) {
    buff.critDamage += 0.28;
  }

  // S2「呼唤那沉默之花的芬芳」：共鸣回路一日花伤害倍率 +120%。
  if (chainCount >= 2 && skill.name === CAMELLYA_SKILLS.circuit.name) {
    buff.multiplierBonus += 1.20;
  }

  // S3「一根荆棘胜过千颗花种」：共鸣解放芳华绽烬倍率 +50%；含苞状态期间攻击 +58%。
  // 含苞状态为全技能生效的角色状态（本模块默认按含苞循环结算），故攻击加成本身不区分技能类型。
  if (chainCount >= 3) {
    if (skill.name === CAMELLYA_SKILLS.liberation.name) buff.multiplierBonus += 0.50;
    buff.attackPercent += 0.58;
  }

  // S4「它的根茎持续到永恒中」：施放变奏技能八千春秋后队伍普攻伤害加成 +25% 持续 30 秒（默认已触发）。
  if (chainCount >= 4 && skill.type === 'normal') {
    buff.damageBonus += 0.25;
  }

  // S5「将那无限置于你的手掌」：变奏技能八千春秋 +303%、延奏技能缠绕 +68%（本模块不展示）。
  // S6 的永生花为一日花 100% 的独立普攻伤害（每 25 秒 1 次），本模块不单独计入。

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
  name: '椿',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const items = [
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: CAMELLYA_SKILLS.circuit }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: CAMELLYA_SKILLS.liberation }),
      calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, skill: CAMELLYA_SKILLS.jinHua })
    ];

    return { enemyName: enemy?.name || '无妄者', items };
  }
};
