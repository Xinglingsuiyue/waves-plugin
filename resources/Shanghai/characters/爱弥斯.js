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
// 爱弥斯（5★ 热熔 共鸣解放派系）
// 数据来源：库街区 wiki entryId=1457744312692867072（V3.1）
//
// 计算范围：4 段主动技能
//   1) 重击·爱弥斯·一段蓄力（按共鸣解放伤害结算）
//   2) 重击·爱弥斯·二段蓄力（按共鸣解放伤害结算）
//   3) 共鸣解放·星辉破界而来·过载
//   4) 共鸣解放·星辉破界而来·终结
//
// 核心机制要点（库街区原文整理）：
//
// [A] 重击·爱弥斯：
//     "该技能伤害为共鸣解放伤害"。
//     倍率随"普攻"技能等级成长。
//
// [B] 即刻响应（默认开启 — 爆发主轴前提）：
//     固有「于万籁之前」→ 重击·爱弥斯/机兵 伤害加深 +200%
//     S1「如金粉般洒落的初煦」→ 重击·爱弥斯/机兵 暴伤 +300%
//
// [C] 共鸣模态（必选其一，默认 震谐）：
//     ┌── 固有「星与星之间」(无 S3 时) ──
//     │   震谐：队伍附加震谐·偏移或造成震谐伤害时，
//     │         爱弥斯暴伤 +20% × 最多3层 = +60%；
//     │         满3层时 终结加深 +25%
//     │   聚爆：队伍附加聚爆效应时，
//     │         爱弥斯暴伤 +30% × 最多2层 = +60%；
//     │         满2层时 终结加深 +25%
//     └── S3 替换后 ──
//         震谐：任一触发即 爱弥斯暴伤 +60% + 终结加深 +25%
//         聚爆：任一触发即 爱弥斯暴伤 +60% + 终结加深 +25%
//     注：两形态对 4 段主动技能而言数值几乎一致，
//         差异主要体现在"额外震谐伤害"/"聚爆效应触发伤害"上
//         （本次不计算这些独立伤害项）。
//
// [D] 共鸣链：
//     S1：见 [B]
//     S2：作用于光翼共奏，不影响本次 4 段 → 跳过
//     S3：终结倍率 +100%、过载倍率 +40%；并替换 [C]
//     S4：施放变奏/合击/光翼共奏时，队伍全属性伤害 +20%/30s
//         （默认爆发链已挂上）
//     S5：纯生存（护盾）→ 跳过
//     S6：目标受到爱弥斯共鸣解放伤害 +40%
//         （4 段都按共鸣解放结算 → 都吃）
//         其余暴击改造仅作用于"震谐伤害/聚爆效应触发伤害"，
//         不影响 4 段主动技能。
// =============================================================
const AIMISI_SKILLS = {
  // 重击·爱弥斯·一段蓄力：9.34%+37.36% → 18.57%+74.26% (10级)
  // 该技能伤害为「共鸣解放伤害」（库街区原文）。
  // 倍率随「普攻」技能等级成长。
  chargeOne: {
    name: '重击·爱弥斯·一段蓄力',
    type: 'liberation',
    levelMap: {
      1:  0.0934 + 0.3736,
      2:  0.1011 + 0.4042,
      3:  0.1087 + 0.4348,
      4:  0.1195 + 0.4777,
      5:  0.1271 + 0.5083,
      6:  0.1359 + 0.5436,
      7:  0.1482 + 0.5926,
      8:  0.1604 + 0.6416,
      9:  0.1727 + 0.6906,
      10: 0.1857 + 0.7426
    }
  },
  // 重击·爱弥斯·二段蓄力：5.84%×4 + 93.36% → 11.60%×4 + 185.60% (10级)
  // 同样按共鸣解放伤害结算。
  chargeTwo: {
    name: '重击·爱弥斯·二段蓄力',
    type: 'liberation',
    levelMap: {
      1:  0.0584 * 4 + 0.9336,
      2:  0.0632 * 4 + 1.0101,
      3:  0.0680 * 4 + 1.0867,
      4:  0.0747 * 4 + 1.1938,
      5:  0.0794 * 4 + 1.2704,
      6:  0.0849 * 4 + 1.3584,
      7:  0.0926 * 4 + 1.4809,
      8:  0.1003 * 4 + 1.6034,
      9:  0.1079 * 4 + 1.7258,
      10: 0.1160 * 4 + 1.8560
    }
  },
  // 共鸣解放·星辉破界而来·过载：101.00% + 134.67%×3 → 200.80% + 267.74%×3 (10级)
  liberationOverload: {
    name: '星辉破界而来·过载',
    type: 'liberation',
    levelMap: {
      1:  1.0100 + 1.3467 * 3,
      2:  1.0929 + 1.4571 * 3,
      3:  1.1757 + 1.5676 * 3,
      4:  1.2916 + 1.7222 * 3,
      5:  1.3745 + 1.8326 * 3,
      6:  1.4697 + 1.9596 * 3,
      7:  1.6022 + 2.1363 * 3,
      8:  1.7347 + 2.3129 * 3,
      9:  1.8672 + 2.4896 * 3,
      10: 2.0080 + 2.6774 * 3
    }
  },
  // 共鸣解放·星辉破界而来·终结：900% → 1789.29% (10级)
  liberationFinal: {
    name: '星辉破界而来·终结',
    type: 'liberation',
    levelMap: {
      1:  9.0000,
      2:  9.7380,
      3:  10.4760,
      4:  11.5092,
      5:  12.2472,
      6:  13.0959,
      7:  14.2767,
      8:  15.4575,
      9:  16.6383,
      10: 17.8929
    }
  }
};

// 配置项：共鸣模态 / 即刻响应 / "星与星之间"层数
// 默认值采用爱弥斯爆发主轴的标准前提：
//   - 共鸣模态·震谐
//   - 即刻响应已开启
//   - "星与星之间"满层（震谐3层 / 聚爆2层）
function buildContextOptions(options = {}) {
  return {
    mode: options.mode || '震谐',                                   // '震谐' | '聚爆'
    immediateResponse: options.immediateResponse !== false,         // 即刻响应（默认开）
    starsStacks: options.starsStacks                                 // 自定义层数（可选）
  };
}

// 面板伤害加成读取
// 爱弥斯所有 4 段技能均为热熔属性 + 共鸣解放伤害结算
function getPanelDamageBonus(attrMap, skillType) {
  let total = 0;

  // 热熔属性伤害加成
  total += getPercentAttr(attrMap, '热熔伤害加成');

  // 共鸣解放伤害加成（4 段都吃）
  if (skillType === 'liberation') {
    total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  }

  return total;
}

// "星与星之间"满层加成的精确计算（按共鸣模态）
//   震谐：每层暴伤 +20%，最多 3 层
//   聚爆：每层暴伤 +30%，最多 2 层
// 满层时两种模态最终值都是 +60% 暴伤；
// 满层时终结额外加深 +25%（终结独享）。
function getStarsStackBuff({ mode, stacks }) {
  let perStack, maxStacks;
  if (mode === '聚爆') {
    perStack = 0.30;
    maxStacks = 2;
  } else {
    // 默认震谐
    perStack = 0.20;
    maxStacks = 3;
  }
  const s = Math.min(maxStacks, Math.max(0, Number(stacks ?? maxStacks)));
  return {
    critDamage: perStack * s,                  // 4 段都吃
    finalDeepen: s >= maxStacks ? 0.25 : 0     // 仅终结吃，且必须满层
  };
}

// 角色自身命座 / 固有技能 增益
function getRoleSelfBuff({ skillName, chainCount, opts }) {
  const buff = {
    damageBonus: 0,
    deepen: 0,
    multiplierBonus: 0,
    ignoreDefense: 0,
    critRate: 0,
    critDamage: 0,
    source: '爱弥斯·自身'
  };

  const isCharge = skillName.includes('重击·爱弥斯');
  const isOverload = skillName === AIMISI_SKILLS.liberationOverload.name;
  const isFinal = skillName === AIMISI_SKILLS.liberationFinal.name;

  // -----------------------------------------------------------------
  // [B] 即刻响应下：固有「于万籁之前」+ S1「如金粉般洒落的初煦」
  if (opts.immediateResponse) {
    if (isCharge) {
      buff.deepen += 2.00;            // 固有：重击伤害加深 +200%
      if (chainCount >= 1) {
        buff.critDamage += 3.00;      // S1：重击暴伤 +300%
      }
    }
  }

  // -----------------------------------------------------------------
  // [C] "星与星之间"按共鸣模态计算
  //   - 无论是否点 S3，满层数值最终都是 +60% 暴伤 / 满层时 +25% 终结加深
  //   - S3 仅放宽触发条件（实战更易满层），数值表现一致
  const stars = getStarsStackBuff({ mode: opts.mode, stacks: opts.starsStacks });
  buff.critDamage += stars.critDamage;
  if (isFinal) buff.deepen += stars.finalDeepen;

  // -----------------------------------------------------------------
  // [D] 共鸣链
  // S3「炽烈在静默间延展如初」：终结倍率 +100%、过载倍率 +40%
  if (chainCount >= 3) {
    if (isFinal) buff.multiplierBonus += 1.00;
    if (isOverload) buff.multiplierBonus += 0.40;
  }

  // S4「于无垠电子海间轻舞」：施放变奏/合击/光翼共奏时，队伍全属性伤害 +20%/30s
  // 默认爆发链中已挂上，4 段都吃
  if (chainCount >= 4) {
    buff.damageBonus += 0.20;
  }

  // S6「春风祝颂你的旅途」：目标受到爱弥斯共鸣解放伤害 +40%
  // 4 段全部按共鸣解放结算，全部吃
  if (chainCount >= 6) {
    buff.damageBonus += 0.40;
  }

  return buff;
}

function calcOneSkill({
  roleDetailData,
  panel,
  equipment,
  enemy,
  modules,
  options,
  skillName,
  skillType,
  skillMultiplier
}) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const opts = buildContextOptions(options);

  const roleBuff = getRoleSelfBuff({ skillName, chainCount, opts });
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType, skillName, options: opts })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType, skillName, options: opts })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType, skillName, options: opts })
    : {};

  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);

  // 通用 mergeBuff 不合并 critRate/critDamage，这里手动汇总
  const extraCritDamage = Number(roleBuff.critDamage || 0)
                        + Number(weaponBuff.critDamage || 0)
                        + Number(phantomBuff.critDamage || 0)
                        + Number(groupBuff.critDamage || 0);
  const extraCritRate   = Number(roleBuff.critRate || 0)
                        + Number(weaponBuff.critRate || 0)
                        + Number(phantomBuff.critRate || 0)
                        + Number(groupBuff.critRate || 0);

  // 攻击力 = 面板攻击 × (1 + attackPercent) + flatAttack
  const attackPercent = mergedBuff.attackPercent || 0;
  const flatAttack = mergedBuff.flatAttack || 0;
  const finalAttack = panel.attack * (1 + attackPercent) + flatAttack;

  const attrMap = panel.attrMap || {};
  const panelBonus = getPanelDamageBonus(attrMap, skillType);

  const result = calcSingleDamage({
    attack: finalAttack,
    skillMultiplier,
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

  return {
    name: skillName,
    ...result
  };
}

export default {
  name: '爱弥斯',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    // 重击·爱弥斯 倍率随「普攻」技能等级成长
    // 过载/终结 随「共鸣解放」等级成长
    const normalLevel = getSkillLevel(roleDetailData, '普攻');
    const liberationLevel = getSkillLevel(roleDetailData, '共鸣解放');

    const chargeOneMul = AIMISI_SKILLS.chargeOne.levelMap[normalLevel] || AIMISI_SKILLS.chargeOne.levelMap[10];
    const chargeTwoMul = AIMISI_SKILLS.chargeTwo.levelMap[normalLevel] || AIMISI_SKILLS.chargeTwo.levelMap[10];
    const overloadMul = AIMISI_SKILLS.liberationOverload.levelMap[liberationLevel] || AIMISI_SKILLS.liberationOverload.levelMap[10];
    const finalMul = AIMISI_SKILLS.liberationFinal.levelMap[liberationLevel] || AIMISI_SKILLS.liberationFinal.levelMap[10];

    const args = { roleDetailData, panel, equipment, enemy, modules, options };

    const chargeOne = calcOneSkill({
      ...args,
      skillName: AIMISI_SKILLS.chargeOne.name,
      skillType: AIMISI_SKILLS.chargeOne.type,
      skillMultiplier: chargeOneMul
    });

    const chargeTwo = calcOneSkill({
      ...args,
      skillName: AIMISI_SKILLS.chargeTwo.name,
      skillType: AIMISI_SKILLS.chargeTwo.type,
      skillMultiplier: chargeTwoMul
    });

    const overload = calcOneSkill({
      ...args,
      skillName: AIMISI_SKILLS.liberationOverload.name,
      skillType: AIMISI_SKILLS.liberationOverload.type,
      skillMultiplier: overloadMul
    });

    const finalSkill = calcOneSkill({
      ...args,
      skillName: AIMISI_SKILLS.liberationFinal.name,
      skillType: AIMISI_SKILLS.liberationFinal.type,
      skillMultiplier: finalMul
    });

    return {
      enemyName: enemy?.name || '无妄者',
      items: [chargeOne, chargeTwo, overload, finalSkill]
    };
  }
};
