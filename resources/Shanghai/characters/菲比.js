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
// 菲比（5★ 衍射 音感仪 共鸣回路型 / 重击星辉主输出）
// 数据来源：库街区 wiki entryId=1309523456688947200。
//
// 计算范围（默认 3 个核心输出）：
//   1) 夏弥尔之星·闪避反击（10级 43.84%×6）
//   2) 夏弥尔之星第三段（10级 28.93%×6）
//   3) 重击伤害（重击星辉前置；本模块取主页"重击伤害"段，10级 41.35%×4）
//
// 共鸣链：
//   S1：赦罪状态共鸣解放伤害倍率提升 480%；告解状态共鸣解放 +90%（本模块不计算解放）
//   S3：赦罪状态重击星辉倍率 +91%；告解状态 +249%
//   S4：普攻/普攻夏弥尔之星/闪反/夏弥尔之星闪反 命中目标时，
//       目标衍射伤害抗性 -10%（持续 30s）→ 按抗性区近似 +damageBonus
//   S5：施放变奏技能时，菲比衍射伤害加成 +12%
//   S6：召唤镜之环时，攻击 +10%（持续 20s）；重击星辉额外触发一次
// =============================================================
const PHOEBE_SKILLS = {
  // 普攻第三段：7.17%*8 → 14.24%*8 (10级)
  normalThree: {
    name: '普攻第三段',
    type: 'normal',
    levelFrom: '普攻',
    levelMap: {
      1: 0.0717 * 8, 2: 0.0775 * 8, 3: 0.0834 * 8, 4: 0.0916 * 8,
      5: 0.0975 * 8, 6: 0.1043 * 8, 7: 0.1137 * 8, 8: 0.1231 * 8,
      9: 0.1325 * 8, 10: 0.1424 * 8
    }
  },
  // 重击伤害：20.80%*4 → 41.35%*4 (10级)
  heavy: {
    name: '重击伤害',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.2080 * 4, 2: 0.2250 * 4, 3: 0.2421 * 4, 4: 0.2660 * 4,
      5: 0.2830 * 4, 6: 0.3026 * 4, 7: 0.3299 * 4, 8: 0.3572 * 4,
      9: 0.3845 * 4, 10: 0.4135 * 4
    }
  },
  // 夏弥尔之星第三段：14.55%*6 → 28.93%*6 (10级)
  chamuelStarThree: {
    name: '夏弥尔之星第三段',
    type: 'normal',
    levelFrom: '共鸣技能',
    levelMap: {
      1: 0.1455 * 6, 2: 0.1574 * 6, 3: 0.1694 * 6, 4: 0.1861 * 6,
      5: 0.1980 * 6, 6: 0.2117 * 6, 7: 0.2308 * 6, 8: 0.2499 * 6,
      9: 0.2690 * 6, 10: 0.2893 * 6
    }
  },
  // 夏弥尔之星·闪避反击：22.05%*6 → 43.84%*6 (10级)
  starDodge: {
    name: '夏弥尔之星·闪避反击',
    type: 'normal',
    levelFrom: '普攻',
    levelMap: {
      1: 0.2205 * 6, 2: 0.2386 * 6, 3: 0.2567 * 6, 4: 0.2820 * 6,
      5: 0.3001 * 6, 6: 0.3209 * 6, 7: 0.3498 * 6, 8: 0.3788 * 6,
      9: 0.4077 * 6, 10: 0.4384 * 6
    }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '衍射伤害加成');
  if (skillType === 'normal') {
    total += getPercentAttr(attrMap, '普攻伤害加成');
    total += getPercentAttr(attrMap, '重击伤害加成');
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
    source: '菲比·自身'
  };

  // S4：目标衍射抗性 -10%，按 baseRes=0.1 近似折算为 +11.1% damageBonus
  if (chainCount >= 4) {
    buff.damageBonus += 0.10 / 0.9;
  }
  // S5：变奏技能后，菲比衍射伤害加成 +12%
  if (chainCount >= 5) {
    buff.damageBonus += 0.12;
  }
  // S6：召唤镜之环时，攻击 +10%
  if (chainCount >= 6) {
    buff.attackPercent += 0.10;
  }

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const skill = PHOEBE_SKILLS[skillKey];
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
  name: '菲比',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = ['starDodge', 'chamuelStarThree', 'heavy'].map(k =>
      calcOneSkill({ ...args, skillKey: k })
    );
    return { enemyName: enemy?.name || '无妄者', items };
  }
};
