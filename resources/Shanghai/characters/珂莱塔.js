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
// 珂莱塔（5★ 冷凝 佩枪 共鸣技能主 C）
// 数据来源：库街区 wiki entryId=1321977849344999424。
//
// 计算范围（默认 3 个代表输出）：
//   1) 致死以终
//   2) 示我璀璨
//   3) 重击限制性策略
//
// 共鸣链：
//   S1：解离效果目标暴击 +12.5%（默认开启）
//   S2：共鸣解放致死以终倍率 +126%
//   S3：共鸣技能暴力美学/示我璀璨 倍率 +93%
//   S4：施放重击/限制性策略/末路见行时，全队共鸣技能伤害 +25%
//   S5：重击末路见行倍率 +47%（本模块不计算末路见行）
//   S6：共鸣解放死兆倍率 +186.6%（不在本模块计算范围）
// =============================================================
const CARLOTTA_SKILLS = {
  // 必要性手段第三段：70.38% + 11.73%×4 → 139.93% + 23.33%×4 (10级)
  necessityThree: {
    name: '必要性手段第三段',
    type: 'skill',
    levelFrom: '普攻',
    levelMap: {
      1: 0.7038 + 0.1173 * 4, 2: 0.7616 + 0.1270 * 4, 3: 0.8193 + 0.1366 * 4,
      4: 0.9001 + 0.1501 * 4, 5: 0.9578 + 0.1597 * 4, 6: 1.0241 + 0.1707 * 4,
      7: 1.1165 + 0.1861 * 4, 8: 1.2088 + 0.2015 * 4, 9: 1.3012 + 0.2169 * 4,
      10: 1.3993 + 0.2333 * 4
    }
  },
  // 致死以终：324.09% → 644.33% (10级)
  fatalFinale: {
    name: '致死以终',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: {
      1: 3.2409, 2: 3.5067, 3: 3.7724, 4: 4.1445, 5: 4.4103,
      6: 4.7159, 7: 5.1411, 8: 5.5663, 9: 5.9915, 10: 6.4433
    }
  },
  // 示我璀璨：56.70% + 56.70% + 170.10% → 112.73% + 112.73% + 338.18% (10级)
  showMeBrilliance: {
    name: '示我璀璨',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: {
      1: 0.5670 + 0.5670 + 1.7010,
      2: 0.6135 + 0.6135 + 1.8405,
      3: 0.6600 + 0.6600 + 1.9800,
      4: 0.7251 + 0.7251 + 2.1753,
      5: 0.7716 + 0.7716 + 2.3148,
      6: 0.8251 + 0.8251 + 2.4752,
      7: 0.8995 + 0.8995 + 2.6983,
      8: 0.9739 + 0.9739 + 2.9215,
      9: 1.0483 + 1.0483 + 3.1447,
      10: 1.1273 + 1.1273 + 3.3818
    }
  },
  // 重击伤害：11.48%*2 + 11.48%*2 + 30.60% → 22.82%*2 + 22.82%*2 + 60.84% (10级)
  heavy: {
    name: '重击伤害',
    type: 'skill',
    levelFrom: '普攻',
    levelMap: {
      1: 0.1148 * 4 + 0.3060, 2: 0.1242 * 4 + 0.3311, 3: 0.1336 * 4 + 0.3562,
      4: 0.1468 * 4 + 0.3914, 5: 0.1562 * 4 + 0.4165, 6: 0.1670 * 4 + 0.4453,
      7: 0.1821 * 4 + 0.4855, 8: 0.1971 * 4 + 0.5256, 9: 0.2122 * 4 + 0.5658,
      10: 0.2282 * 4 + 0.6084
    }
  },
  // 限制性策略：17.22%*2 + 17.22%*2 + 45.90% → 34.23%*2 + 34.23%*2 + 91.26% (10级)
  restriction: {
    name: '重击限制性策略',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: {
      1: 0.1722 * 4 + 0.4590, 2: 0.1863 * 4 + 0.4967, 3: 0.2004 * 4 + 0.5343,
      4: 0.2202 * 4 + 0.5870, 5: 0.2343 * 4 + 0.6247, 6: 0.2505 * 4 + 0.6679,
      7: 0.2731 * 4 + 0.7282, 8: 0.2957 * 4 + 0.7884, 9: 0.3183 * 4 + 0.8486,
      10: 0.3423 * 4 + 0.9126
    }
  },
  // 礼节性问候：54.32% + 66.39% → 107.99% + 131.99% (10级)
  greeting: {
    name: '礼节性问候',
    type: 'skill',
    levelFrom: '普攻',
    levelMap: {
      1: 0.5432 + 0.6639, 2: 0.5877 + 0.7183, 3: 0.6323 + 0.7728,
      4: 0.6946 + 0.8490, 5: 0.7392 + 0.9034, 6: 0.7904 + 0.9660,
      7: 0.8616 + 1.0531, 8: 0.9329 + 1.1402, 9: 1.0042 + 1.2273,
      10: 1.0799 + 1.3199
    }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '冷凝伤害加成');
  if (skillType === 'skill') {
    total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  }
  if (skillType === 'liberation') {
    total += getPercentAttr(attrMap, '共鸣解放伤害加成');
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
    source: '珂莱塔·自身'
  };

  // 目标默认处于解离状态：攻击造成伤害时忽视目标 18% 防御
  buff.ignoreDefense = 0.18;
  // S1：解离效果目标 暴击 +12.5%（默认目标处于解离状态）
  if (chainCount >= 1) buff.critRate += 0.125;
  // S2：共鸣解放致死以终倍率 +126%
  if (chainCount >= 2 && skillName === '致死以终') {
    buff.multiplierBonus += 1.26;
  }
  // S3：共鸣技能暴力美学/示我璀璨 倍率 +93%
  if (chainCount >= 3 && skillName === '示我璀璨') {
    buff.multiplierBonus += 0.93;
  }
  // S4：施放重击/重击限制性策略时，全队共鸣技能伤害 +25%
  if (chainCount >= 4) buff.damageBonus += 0.25;

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const skill = CARLOTTA_SKILLS[skillKey];
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
  name: '珂莱塔',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = ['fatalFinale', 'showMeBrilliance', 'restriction'].map(k =>
      calcOneSkill({ ...args, skillKey: k })
    );
    return { enemyName: enemy?.name || '无妄者', items };
  }
};
