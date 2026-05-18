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
// 嘉贝莉娜（5★ 热熔 佩枪 重击主 C）
// 数据来源：库街区 wiki entryId=1415137052791296000。
//
// 计算范围（默认 3 个强化形态核心输出）：
//   1) 普攻·炽天猎杀第三段
//   2) 普攻·炽天猎杀第四段
//   3) 重击·炼羽裁决第三段
//
// 共鸣链：
//   S1：恶翼扬升时，每点【余火】给上述技能 +2% 暴伤，至多 +80%。默认满层。
//   S2：内燃烧攻击 +350%（本模块按攻击百分比 +350% 实现）
//   S3：共鸣解放倍率 +130%（本模块不计算解放）
//   S4：声骸技能触发，全队全属性 +20%/20s
//   S5：共鸣技能·迫近/恶翼扬升/掠袭 倍率 +150%（本模块按重击/共鸣技能不直接对应，给重击额外 50% 近似）
//   S6：永恒位格期间普攻/重击/空中/闪反 倍率 +60% 与每点余火 +0.875% 热熔加深（至多 +35%）
// =============================================================
const GALBRENA_SKILLS = {
  // 普攻·炽天猎杀第三段：12.24%*3 + 85.61% → 24.32%*3 + 170.21% (10级)
  blazingHuntThree: {
    name: '普攻·炽天猎杀第三段',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.1224 * 3 + 0.8561, 2: 0.1324 * 3 + 0.9263, 3: 0.1425 * 3 + 0.9965,
      4: 0.1565 * 3 + 1.0948, 5: 0.1665 * 3 + 1.1650, 6: 0.1781 * 3 + 1.2457,
      7: 0.1941 * 3 + 1.3580, 8: 0.2101 * 3 + 1.4702, 9: 0.2262 * 3 + 1.5825,
      10: 0.2432 * 3 + 1.7021
    }
  },
  // 普攻·炽天猎杀第四段：9.13%*3 + 63.89% → 18.15%*3 + 127.02% (10级)
  blazingHuntFour: {
    name: '普攻·炽天猎杀第四段',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.0913 * 3 + 0.6389, 2: 0.0988 * 3 + 0.6913, 3: 0.1063 * 3 + 0.7437,
      4: 0.1168 * 3 + 0.8171, 5: 0.1243 * 3 + 0.8695, 6: 0.1329 * 3 + 0.9298,
      7: 0.1449 * 3 + 1.0136, 8: 0.1568 * 3 + 1.0974, 9: 0.1688 * 3 + 1.1812,
      10: 0.1815 * 3 + 1.2702
    }
  },
  // 重击·炼羽裁决第三段：8.90%*3 + 62.27% → 17.69%*3 + 123.77% (10级)
  featherJudgementThree: {
    name: '重击·炼羽裁决第三段',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.0890 * 3 + 0.6227, 2: 0.0963 * 3 + 0.6738, 3: 0.1036 * 3 + 0.7248,
      4: 0.1139 * 3 + 0.7963, 5: 0.1211 * 3 + 0.8473, 6: 0.1295 * 3 + 0.9061,
      7: 0.1412 * 3 + 0.9878, 8: 0.1529 * 3 + 1.0694, 9: 0.1645 * 3 + 1.1511,
      10: 0.1769 * 3 + 1.2377
    }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = 0;
  total += getPercentAttr(attrMap, '热熔伤害加成');
  if (skillType === 'normal') {
    total += getPercentAttr(attrMap, '普攻伤害加成');
    total += getPercentAttr(attrMap, '重击伤害加成');
  }
  return total;
}

function getRoleSelfBuff({ skillName, chainCount, opts }) {
  const buff = {
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    attackPercent: 0,
    source: '嘉贝莉娜·自身'
  };

  // S1：恶翼扬升时，每点【余火】+2% 暴伤，至多 80%（默认满层）
  if (chainCount >= 1) {
    const yhuoMax = Math.max(0, Math.min(40, Number(opts?.yhuoStacks ?? 40)));
    buff.critDamage += 0.02 * yhuoMax;
  }

  // S2：内燃烧攻击 +350%（默认开启）
  if (chainCount >= 2) {
    buff.attackPercent += 3.50;
  }

  // S4：声骸技能触发后，全队全属性 +20%（默认开启）
  if (chainCount >= 4) {
    buff.damageBonus += 0.20;
  }

  // S6：永恒位格期间，普攻/重击/空中/闪反 倍率 +60%
  if (chainCount >= 6) {
    buff.multiplierBonus += 0.60;
    // 每点余火 +0.875% 热熔加深，至多 +35%（默认满）
    buff.deepen += 0.35;
  }

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const skill = GALBRENA_SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const multiplier = skill.levelMap[level] || skill.levelMap[10];

  const roleBuff = getRoleSelfBuff({ skillName: skill.name, chainCount, opts: options || {} });
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
  name: '嘉贝莉娜',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = ['blazingHuntThree', 'blazingHuntFour', 'featherJudgementThree'].map(k =>
      calcOneSkill({ ...args, skillKey: k })
    );
    return { enemyName: enemy?.name || '无妄者', items };
  }
};
