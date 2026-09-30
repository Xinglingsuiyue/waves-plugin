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

// 把 wiki 上的倍率表达式（如 "45.65%+11.42%*6+456.45%"）解析为小数倍率。
// "*" 之后的数字为命中段数，"+" 为多段相加。
function parseMultiplierExpr(expr) {
  if (typeof expr === 'number') return expr;

  const parts = String(expr)
    .replace(/\s+/g, '')
    .replace(/%/g, '')
    .split('+')
    .filter(Boolean);

  return parts.reduce((sum, part) => {
    const factors = part.split('*').filter(Boolean).map(Number);
    if (!factors.length) return sum;

    const head = Number(factors.shift() || 0) / 100;
    const tail = factors.reduce((acc, value) => acc * value, 1);
    return sum + head * tail;
  }, 0);
}

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = parseMultiplierExpr(value);
  return map;
}, {});

// =============================================================
// 心（5★ 导电 音感仪 / 共鸣技能倍率主 C）
// 数据来源：库街区 wiki entryId=1543050481616060416（共鸣者前瞻 → 角色养成/技能介绍）。
//
// 核心机制：
//   [1] 倍率基底：技能均以「攻击力」为基底，面板加成核心为攻击 / 暴击（分支强化亦为攻击提升、暴击提升）。
//   [2] 双相态：应世相 / 照世相，分别获得【应世心】(上限100) / 【照世心】(上限300)。
//       本次计算直接取各技能 10 级倍率，不还原能量获取过程。
//   [3] 伤害类型：重击·应世相·步红尘/镇红尘、重击·照世相·临寰宇/镇寰宇、
//       共鸣技能·照世相·万阙连衡、共鸣解放·万阙垂天、变奏技能·诸相同奏
//       原文均标注「此次伤害为共鸣技能伤害」，统一按共鸣技能伤害（type: 'skill'）计。
//       飞阙（敕令协同攻击）例外：直接按导电伤害结算（type: 'conductive'），
//       不吃共鸣技能/共鸣解放/普攻/重击任何技能类型加成，仅吃导电伤害加成。
//   [4] 共鸣模态·同奏 / 共鸣模态·电磁，二选一（默认同奏）。
//   [5] 固有「循流引兴替」：
//       同奏：施放诸相同奏时自身攻击 +50%，持续 8 秒。
//       电磁：队伍附加【电磁效应】后心导电伤害 +25%，最多 2 层（默认已叠满）。
//   [6] 同奏增益：每层使可响应同奏的角色最终伤害 +3%，基础上限 2 层；
//       固有「信步拾清欢」+1 层，S6 再 +1 层。
//
// 共鸣链：
//   S1：诸相同奏倍率 +15%，且每层同奏增益额外 +10%（至多 4 层）。
//   S2：重击·步红尘/镇红尘、重击·临寰宇/镇寰宇 倍率 +60%。
//   S3：共鸣解放·万阙垂天倍率 +70%；同奏下万阙垂天暴伤 +20%，
//       且每层同奏增益再 +15%（至多 4 层）。
//   S4：队伍附加电磁效应/爆发或获得同奏/响应同奏时，全队全属性伤害 +20%（默认已触发）。
//   S5：生存，不计伤害。
//   S6：目标受到心的共鸣技能伤害 +40%；心的共鸣技能伤害无视 20% 防御。
//
// 默认假设（可用 options 覆盖）：
//   mode='tongzou'（同奏）、tongzouStacks=2、dianciStacks=2（电磁满层）、
//   S4 队伍增伤已触发、诸相同奏攻击加成生效（xunliuActive）。
// =============================================================
const XIN_SKILLS = {
  skillYingshi: {
    name: '共鸣技能·应世相',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '12.60%+12.60%+12.60%+8.40%*2+29.40%',
      '13.64%+13.64%+13.64%+9.09%*2+31.82%',
      '14.67%+14.67%+14.67%+9.78%*2+34.23%',
      '16.12%+16.12%+16.12%+10.75%*2+37.60%',
      '17.15%+17.15%+17.15%+11.44%*2+40.01%',
      '18.34%+18.34%+18.34%+12.23%*2+42.78%',
      '19.99%+19.99%+19.99%+13.33%*2+46.64%',
      '21.65%+21.65%+21.65%+14.43%*2+50.50%',
      '23.30%+23.30%+23.30%+15.53%*2+54.36%',
      '25.06%+25.06%+25.06%+16.71%*2+58.46%'
    )
  },
  skillZhaoshi: {
    name: '共鸣技能·照世相',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '5.60%*4+89.60%',
      '6.06%*4+96.95%',
      '6.52%*4+104.30%',
      '7.17%*4+114.59%',
      '7.63%*4+121.93%',
      '8.15%*4+130.38%',
      '8.89%*4+142.14%',
      '9.62%*4+153.89%',
      '10.36%*4+165.65%',
      '11.14%*4+178.14%'
    )
  },
  heavyBuhongchen: {
    name: '重击·应世相·步红尘',
    type: 'skill',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '22.96%+5.74%*6+229.59%',
      '24.85%+6.22%*6+248.42%',
      '26.73%+6.69%*6+267.25%',
      '29.36%+7.34%*6+293.60%',
      '31.25%+7.82%*6+312.43%',
      '33.41%+8.36%*6+334.08%',
      '36.42%+9.11%*6+364.20%',
      '39.44%+9.86%*6+394.32%',
      '42.45%+10.62%*6+424.45%',
      '45.65%+11.42%*6+456.45%'
    ),
    isZhenHeavy: true
  },
  heavyZhenhongchen: {
    name: '重击·应世相·镇红尘',
    type: 'skill',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '49.96%+12.49%*6+499.55%',
      '54.06%+13.52%*6+540.51%',
      '58.15%+14.54%*6+581.48%',
      '63.89%+15.98%*6+638.83%',
      '67.98%+17.00%*6+679.79%',
      '72.69%+18.18%*6+726.90%',
      '79.25%+19.82%*6+792.44%',
      '85.80%+21.45%*6+857.98%',
      '92.36%+23.09%*6+923.52%',
      '99.32%+24.83%*6+993.15%'
    ),
    isZhenHeavy: true
  },
  heavyLinhuanyu: {
    name: '重击·照世相·临寰宇',
    type: 'skill',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '5.17%*4+185.96%',
      '5.59%*4+201.20%',
      '6.02%*4+216.45%',
      '6.61%*4+237.80%',
      '7.03%*4+253.05%',
      '7.52%*4+270.58%',
      '8.20%*4+294.98%',
      '8.88%*4+319.38%',
      '9.55%*4+343.77%',
      '10.27%*4+369.70%'
    ),
    isZhenHeavy: true
  },
  heavyZhenhuanyu: {
    name: '重击·照世相·镇寰宇',
    type: 'skill',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '13.61%*4+489.66%',
      '14.72%*4+529.81%',
      '15.84%*4+569.96%',
      '17.40%*4+626.18%',
      '18.51%*4+666.33%',
      '19.80%*4+712.50%',
      '21.58%*4+776.75%',
      '23.37%*4+840.99%',
      '25.15%*4+905.23%',
      '27.05%*4+973.49%'
    ),
    isZhenHeavy: true
  },
  skillWanqueLianheng: {
    name: '共鸣技能·照世相·万阙连衡',
    type: 'skill',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '90.26%*4+9.03%+18.06%*2+22.57%*2',
      '97.66%*4+9.77%+19.54%*2+24.42%*2',
      '105.06%*4+10.51%+21.02%*2+26.27%*2',
      '115.42%*4+11.55%+23.09%*2+28.86%*2',
      '122.82%*4+12.29%+24.57%*2+30.71%*2',
      '131.33%*4+13.14%+26.27%*2+32.84%*2',
      '143.17%*4+14.32%+28.64%*2+35.80%*2',
      '155.01%*4+15.51%+31.01%*2+38.76%*2',
      '166.85%*4+16.69%+33.37%*2+41.72%*2',
      '179.43%*4+17.95%+35.89%*2+44.86%*2'
    )
  },
  liberationWanqueChuitian: {
    name: '共鸣解放·万阙垂天',
    // 原文「此次伤害为共鸣技能伤害」，吃共鸣技能加成。
    type: 'skill',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '40.50%+45.56%+30.38%+50.62%+35.44%+809.88%',
      '43.82%+49.30%+32.87%+54.77%+38.34%+876.29%',
      '47.14%+53.03%+35.36%+58.92%+41.25%+942.70%',
      '51.79%+58.26%+38.84%+64.73%+45.32%+1035.67%',
      '55.11%+62.00%+41.33%+68.88%+48.22%+1102.08%',
      '58.93%+66.29%+44.20%+73.66%+51.56%+1178.45%',
      '64.24%+72.27%+48.18%+80.30%+56.21%+1284.71%',
      '69.55%+78.25%+52.17%+86.94%+60.86%+1390.97%',
      '74.87%+84.22%+56.15%+93.58%+65.51%+1497.22%',
      '80.51%+90.57%+60.38%+100.64%+70.45%+1610.12%'
    ),
    isWanqueChuitian: true
  },
  feique: {
    name: '飞阙（敕令协同攻击）',
    // 敕令由共鸣解放·转相提供，飞阙为消耗敕令时的协同攻击；
    // 按口径：飞阙直接按导电伤害结算，不算共鸣技能/共鸣解放，也不计普攻/重击，
    // 因此 type 记为 'conductive'，仅吃导电伤害加成。
    type: 'conductive',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '5.72%',
      '6.19%',
      '6.66%',
      '7.31%',
      '7.78%',
      '8.32%',
      '9.07%',
      '9.82%',
      '10.57%',
      '11.37%'
    )
  },
  introYingshiTongzou: {
    name: '变奏技能·应世相·诸相同奏',
    type: 'skill',
    levelFrom: '变奏技能',
    levelMap: levelMap(
      '30.48%+60.95%+30.48%+60.95%*3',
      '32.98%+65.95%+32.98%+65.95%*3',
      '35.48%+70.95%+35.48%+70.95%*3',
      '38.98%+77.95%+38.98%+77.95%*3',
      '41.47%+82.94%+41.47%+82.94%*3',
      '44.35%+88.69%+44.35%+88.69%*3',
      '48.35%+96.69%+48.35%+96.69%*3',
      '52.35%+104.69%+52.35%+104.69%*3',
      '56.34%+112.68%+56.34%+112.68%*3',
      '60.59%+121.18%+60.59%+121.18%*3'
    ),
    isZhuxiangTongzou: true
  },
  introZhaoshiTongzou: {
    name: '变奏技能·照世相·诸相同奏',
    type: 'skill',
    levelFrom: '变奏技能',
    levelMap: levelMap(
      '79.08%*4+7.91%+15.82%*2+19.77%*2',
      '85.57%*4+8.56%+17.12%*2+21.40%*2',
      '92.05%*4+9.21%+18.41%*2+23.02%*2',
      '101.13%*4+10.12%+20.23%*2+25.29%*2',
      '107.62%*4+10.77%+21.53%*2+26.91%*2',
      '115.07%*4+11.51%+23.02%*2+28.77%*2',
      '125.45%*4+12.55%+25.09%*2+31.37%*2',
      '135.82%*4+13.59%+27.17%*2+33.96%*2',
      '146.20%*4+14.62%+29.24%*2+36.55%*2',
      '157.22%*4+15.73%+31.45%*2+39.31%*2'
    ),
    isZhuxiangTongzou: true
  }
};

function buildOptions(options = {}) {
  return {
    mode: options.mode === 'dianci' ? 'dianci' : 'tongzou',
    tongzouStacks: Math.max(0, Number(options.tongzouStacks ?? 2)),
    dianciStacks: Math.max(0, Number(options.dianciStacks ?? 2)),
    teamS4Buff: options.teamS4Buff !== false,
    xunliuActive: options.xunliuActive !== false
  };
}

function getPanelDamageBonus(attrMap, skillType) {
  // 导电伤害加成对所有伤害类型（含 conductive）都生效；
  // skillType === 'conductive'（飞阙）只吃这一项，不吃任何技能类型加成。
  let total = getPercentAttr(attrMap, '导电伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function getRoleSelfBuff({ skill, chainCount, opts }) {
  const buff = {
    attackPercent: 0,
    flatAttack: 0,
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    ignoreDefense: 0,
    source: '心·自身'
  };

  const isTongzouMode = opts.mode === 'tongzou';
  // 同奏增益层数上限：基础 2 层，固有「信步拾清欢」+1，S6 +1。
  const tongzouCap = 2 + 1 + (chainCount >= 6 ? 1 : 0);
  const tongzouStacks = Math.max(0, Math.min(opts.tongzouStacks, tongzouCap));

  if (isTongzouMode) {
    // 同奏增益：每层使可响应同奏的角色最终伤害 +3%。
    buff.deepen += 0.03 * tongzouStacks;

    // 固有「循流引兴替」：施放诸相同奏时自身攻击 +50%，持续 8 秒。
    if (skill.isZhuxiangTongzou && opts.xunliuActive) {
      buff.attackPercent += 0.50;
    }

    // S1：诸相同奏倍率 +15%，且每层同奏增益额外 +10%（至多 4 层）。
    if (chainCount >= 1 && skill.isZhuxiangTongzou) {
      buff.multiplierBonus += 0.15 + 0.10 * Math.min(tongzouStacks, 4);
    }
  } else {
    // 固有「循流引兴替」·电磁：队伍附加【电磁效应】后心导电伤害 +25%，最多 2 层。
    buff.damageBonus += 0.25 * Math.max(0, Math.min(opts.dianciStacks, 2));
  }

  // S2：重击·步红尘/镇红尘、重击·临寰宇/镇寰宇 倍率 +60%。
  if (chainCount >= 2 && skill.isZhenHeavy) {
    buff.multiplierBonus += 0.60;
  }

  // S3：共鸣解放·万阙垂天倍率 +70%；同奏下暴伤 +20% 且每层同奏增益再 +15%（至多 4 层）。
  if (chainCount >= 3 && skill.isWanqueChuitian) {
    buff.multiplierBonus += 0.70;
    if (isTongzouMode) {
      buff.critDamage += 0.20 + 0.15 * Math.min(tongzouStacks, 4);
    }
  }

  // S4：全队全属性伤害加成 +20%。
  if (chainCount >= 4 && opts.teamS4Buff) {
    buff.damageBonus += 0.20;
  }

  // S6：目标受到心的共鸣技能伤害 +40%；心的共鸣技能伤害无视目标 20% 防御。
  if (chainCount >= 6 && skill.type === 'skill') {
    buff.deepen += 0.40;
    buff.ignoreDefense += 0.20;
  }

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skill }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const opts = buildOptions(options);

  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options: opts })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options: opts })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options: opts })
    : {};

  // mergeBuff 不合并 critRate/critDamage，需手动汇总。
  const roleBuff = getRoleSelfBuff({ skill, chainCount, opts });
  const extraCritRate = Number(roleBuff.critRate || 0)
                      + Number(weaponBuff.critRate || 0)
                      + Number(phantomBuff.critRate || 0)
                      + Number(groupBuff.critRate || 0);
  const extraCritDamage = Number(roleBuff.critDamage || 0)
                        + Number(weaponBuff.critDamage || 0)
                        + Number(phantomBuff.critDamage || 0)
                        + Number(groupBuff.critDamage || 0);

  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);

  // 心为攻击倍率角色：攻击基底 = 面板攻击 ×(1+攻击%) + 固定攻击。
  const finalAttack = Number(panel.attack || 0) * (1 + (mergedBuff.attackPercent || 0))
                    + (mergedBuff.flatAttack || 0);

  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const skillMultiplier = skill.levelMap[level] || skill.levelMap[10];

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
  name: '心',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = [
      calcOneSkill({ ...args, skill: XIN_SKILLS.introYingshiTongzou }),
      calcOneSkill({ ...args, skill: XIN_SKILLS.skillYingshi }),
      calcOneSkill({ ...args, skill: XIN_SKILLS.heavyBuhongchen }),
      calcOneSkill({ ...args, skill: XIN_SKILLS.heavyZhenhongchen }),
      calcOneSkill({ ...args, skill: XIN_SKILLS.skillZhaoshi }),
      calcOneSkill({ ...args, skill: XIN_SKILLS.heavyLinhuanyu }),
      calcOneSkill({ ...args, skill: XIN_SKILLS.skillWanqueLianheng }),
      calcOneSkill({ ...args, skill: XIN_SKILLS.heavyZhenhuanyu }),
      calcOneSkill({ ...args, skill: XIN_SKILLS.introZhaoshiTongzou }),
      calcOneSkill({ ...args, skill: XIN_SKILLS.liberationWanqueChuitian }),
      calcOneSkill({ ...args, skill: XIN_SKILLS.feique })
    ];

    return {
      enemyName: enemy?.name || '无妄者',
      source: '库街区 Wiki entryId=1543050481616060416',
      items
    };
  }
};
