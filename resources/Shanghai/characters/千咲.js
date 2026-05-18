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

// =============================================================
// 千咲（5★ 湮灭 长刃 异常队/共鸣解放主 C）
// 数据来源：wuthering.gg + 库街区 wiki entryId=1429457793942482944。
// 注意：库街区角色页"技能数据"为空；倍率取自 wuthering.gg 的 1 级数据 ×1.988（10/1 系数）。
//
// 计算范围（4 个代表输出）：
//   1) 共鸣解放·即刻·归无（湮灭爆发）
//   2) 锯环·疾攻第三段（共鸣回路爆发段）
//   3) 锯环·终结（解放后的爆发，吃 S5 +100%）
//   4) 闪避反击·解弦之眼·收弦
//
// 共鸣链：
//   S1：附加虚无绞痕时，自身攻击 +30%（默认开启）
//   S2：造成伤害无视目标 10% 湮灭抗性（按 baseRes=0.1 折算 +damageBonus）
//   S3：锯环·疾攻/电锯·闪避反击/锯环·终结 倍率 +120%
//   S4：虚无绞痕进化（异常机制，不影响本模块倍率）
//   S5：即刻·归无 伤害加成 +100%
//   S6：拥有终焉的目标受异常加深 +30%、受千咲伤害 +40%
// =============================================================
// wuthering.gg 1 级数据
const T = 1.9882;  // 10/1 通用系数
const lvl = (v) => {
  // 生成 10 级线性近似 levelMap：levelMap[L] = v * (1 + (T-1) * (L-1)/9)
  const map = {};
  for (let L = 1; L <= 10; L++) {
    map[L] = v * (1 + (T - 1) * (L - 1) / 9);
  }
  return map;
};

const CHISA_SKILLS = {
  // 即刻·归无：1级 480% → 10级 ≈ 954.34%
  liberation: {
    name: '即刻·归无',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: lvl(4.80)
  },
  // 锯环·疾攻第三段：1级 8.04%×8 = 64.32% → 10级 ≈ 127.87%
  sawThree: {
    name: '锯环·疾攻第三段',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: lvl(0.0804 * 8)
  },
  // 锯环·终结：1级 25.92% + 103.68% = 129.60% → 10级 ≈ 257.66%
  sawFinish: {
    name: '锯环·终结',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: lvl(0.2592 + 1.0368)
  },
  // 闪避反击·解弦之眼·收弦：1级 90% → 10级 ≈ 178.94%
  dodgeXian: {
    name: '闪避反击·解弦之眼·收弦',
    type: 'normal',
    levelFrom: '普攻',
    levelMap: lvl(0.90)
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '湮灭伤害加成');
  if (skillType === 'liberation') {
    total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  }
  if (skillType === 'normal') {
    total += getPercentAttr(attrMap, '普攻伤害加成');
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
    source: '千咲·自身'
  };

  // S1：附加虚无绞痕时攻击 +30%
  if (chainCount >= 1) buff.attackPercent += 0.30;
  // S2：无视 10% 湮灭抗性，base=0.1 折算约 +11.1% damageBonus
  if (chainCount >= 2) buff.damageBonus += 0.10 / 0.9;
  // S3：锯环·疾攻/终结/闪反 倍率 +120%
  if (chainCount >= 3 && ['锯环·疾攻第三段','锯环·终结','闪避反击·解弦之眼·收弦'].includes(skillName)) {
    buff.multiplierBonus += 1.20;
  }
  // S5：即刻·归无 伤害加成 +100%
  if (chainCount >= 5 && skillName === '即刻·归无') buff.damageBonus += 1.00;
  // S6：受千咲伤害 +40%
  if (chainCount >= 6) buff.damageBonus += 0.40;

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const skill = CHISA_SKILLS[skillKey];
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

  const finalAttack = panel.attack * (1 + (mergedBuff.attackPercent || 0)) + (mergedBuff.flatAttack || 0);
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
  name: '千咲',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = ['liberation', 'sawThree', 'sawFinish', 'dodgeXian'].map(k =>
      calcOneSkill({ ...args, skillKey: k })
    );
    return { enemyName: enemy?.name || '无妄者', items };
  }
};
