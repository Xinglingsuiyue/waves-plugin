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
// 卡提希娅（5★ 气动 生命倍率 / 风蚀主 C）
// 数据来源：库街区 wiki entryId=1370471621924728832；
//         BWiki 原始页面用于补充倍率/共鸣链文本。
//
// 核心机制要点：
// [A] 卡提希娅是生命倍率角色。库街区/BWiki 倍率数值均以生命值为基底，
//     因此本模块用 panel.hp 作为公式中的 baseArea，而不是 panel.attack。
//
// [B] 伤害类型：
//     - 重击·卡提希娅、共鸣技能·卡提希娅、芙露德莉斯重击/强化重击
//       原文明确“此次伤害为普攻伤害”，归 type='normal'。
//     - 芙露德莉斯两段共鸣技能归 type='skill'。
//     - 看潮怒风哮之刃归 type='liberation'，且每层风蚀使其加深 20%，最多 5 层。
//     - 空中攻击·卡提希娅回收三剑原文只明确“视为风蚀效应伤害”，
//       本模块将其作为独立 windErosion 类型，仅吃气动与通用增伤，不吃普攻加成。
//
// [C] 固有「以风刻痕留蚀」：
//     目标有 1-3 层风蚀时，自身造成伤害 +30%；
//     超过 3 层后每层额外 +10%，最多额外 3 层。默认按 5 层风蚀 = +50%。
//
// [D] 共鸣链：
//     S1：芙露德莉斯每 30/60/90/120 决意获得暴伤 +25%，最多 +100%。
//         默认满决意输出，芙露德莉斯形态技能吃；终结大招施放后清除，
//         这里按伤害结算前仍享受该暴伤处理。
//     S2：卡提希娅形态普攻/重击/闪避反击/变奏倍率 +50%，空中攻击倍率 +200%。
//     S3：看潮怒风哮之刃倍率 +100%。
//     S4：队伍附加任一异常后，全队全属性伤害 +20%。默认风蚀已触发。
//     S5：生存/扣血，不影响伤害。
//     S6：目标受到芙露德莉斯伤害 +40%；风蚀额外结算不纳入本体直伤列表。
// =============================================================
const KATIXIYA_SKILLS = {
  katAerialThreeSwords: {
    name: '空中攻击·卡提希娅(回收三剑)',
    type: 'windErosion',
    form: 'katixiya',
    levelFrom: '普攻',
    levelMap: {
      1: 0.0568 * 3,
      2: 0.0615 * 3,
      3: 0.0661 * 3,
      4: 0.0727 * 3,
      5: 0.0773 * 3,
      6: 0.0827 * 3,
      7: 0.0901 * 3,
      8: 0.0976 * 3,
      9: 0.1050 * 3,
      10: 0.1129 * 3
    }
  },
  katSkill: {
    name: '共鸣技能·卡提希娅',
    type: 'normal',
    form: 'katixiya',
    levelFrom: '共鸣技能',
    levelMap: {
      1: 0.0347 * 3 + 0.0446,
      2: 0.0375 * 3 + 0.0483,
      3: 0.0404 * 3 + 0.0519,
      4: 0.0444 * 3 + 0.0570,
      5: 0.0472 * 3 + 0.0607,
      6: 0.0505 * 3 + 0.0649,
      7: 0.0550 * 3 + 0.0707,
      8: 0.0596 * 3 + 0.0766,
      9: 0.0641 * 3 + 0.0824,
      10: 0.0689 * 3 + 0.0886
    }
  },
  fuluNormalFive: {
    name: '普攻·芙露德莉斯第五段',
    type: 'normal',
    form: 'fuludelisi',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.0363 + 0.1449,
      2: 0.0392 + 0.1567,
      3: 0.0422 + 0.1686,
      4: 0.0463 + 0.1852,
      5: 0.0493 + 0.1971,
      6: 0.0527 + 0.2108,
      7: 0.0575 + 0.2298,
      8: 0.0622 + 0.2488,
      9: 0.0670 + 0.2678,
      10: 0.0720 + 0.2880
    }
  },
  fuluHeavyEnhanced: {
    name: '强化重击·芙露德莉斯',
    type: 'normal',
    form: 'fuludelisi',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.0391 * 2 + 0.0196,
      2: 0.0423 * 2 + 0.0212,
      3: 0.0455 * 2 + 0.0228,
      4: 0.0500 * 2 + 0.0250,
      5: 0.0532 * 2 + 0.0266,
      6: 0.0569 * 2 + 0.0285,
      7: 0.0621 * 2 + 0.0311,
      8: 0.0672 * 2 + 0.0336,
      9: 0.0723 * 2 + 0.0362,
      10: 0.0778 * 2 + 0.0389
    }
  },
  fuluSkillOne: {
    name: '共鸣技能·此剑为潮浪之意',
    type: 'skill',
    form: 'fuludelisi',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.0094 * 4 + 0.0873,
      2: 0.0102 * 4 + 0.0945,
      3: 0.0109 * 4 + 0.1017,
      4: 0.0120 * 4 + 0.1117,
      5: 0.0128 * 4 + 0.1188,
      6: 0.0137 * 4 + 0.1271,
      7: 0.0149 * 4 + 0.1385,
      8: 0.0161 * 4 + 0.1500,
      9: 0.0173 * 4 + 0.1614,
      10: 0.0186 * 4 + 0.1736
    }
  },
  fuluSkillTwo: {
    name: '共鸣技能·凭风斩浪破敌',
    type: 'skill',
    form: 'fuludelisi',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.0094 * 2 + 0.0354 * 3,
      2: 0.0102 * 2 + 0.0383 * 3,
      3: 0.0109 * 2 + 0.0412 * 3,
      4: 0.0120 * 2 + 0.0452 * 3,
      5: 0.0128 * 2 + 0.0481 * 3,
      6: 0.0137 * 2 + 0.0515 * 3,
      7: 0.0149 * 2 + 0.0561 * 3,
      8: 0.0161 * 2 + 0.0607 * 3,
      9: 0.0173 * 2 + 0.0654 * 3,
      10: 0.0186 * 2 + 0.0703 * 3
    }
  },
  liberationBlade: {
    name: '看潮怒风哮之刃',
    type: 'liberation',
    form: 'fuludelisi',
    levelFrom: '共鸣解放',
    levelMap: {
      1: 0.0660 * 7,
      2: 0.0714 * 7,
      3: 0.0768 * 7,
      4: 0.0844 * 7,
      5: 0.0898 * 7,
      6: 0.0961 * 7,
      7: 0.1047 * 7,
      8: 0.1134 * 7,
      9: 0.1220 * 7,
      10: 0.1312 * 7
    }
  }
};

function buildOptions(options = {}) {
  return {
    windErosionStacks: Math.max(0, Number(options.windErosionStacks ?? 5)),
    s1ResolveStacks: Math.max(0, Math.min(4, Number(options.s1ResolveStacks ?? 4))),
    includeS4TeamBuff: options.includeS4TeamBuff !== false
  };
}

function getPanelDamageBonus(attrMap, skillType) {
  let total = 0;
  total += getPercentAttr(attrMap, '气动伤害加成');

  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');

  return total;
}

function getWindErosionSelfBuff(stacks) {
  const s = Math.max(0, Number(stacks || 0));
  if (s <= 0) return 0;
  if (s <= 3) return 0.30;
  return 0.30 + Math.min(3, s - 3) * 0.10;
}

function getRoleSelfBuff({ skill, chainCount, opts }) {
  const buff = {
    damageBonus: 0,
    deepen: 0,
    multiplierBonus: 0,
    ignoreDefense: 0,
    critRate: 0,
    critDamage: 0,
    hpPercent: 0,
    source: '卡提希娅·自身'
  };

  const isKatixiya = skill.form === 'katixiya';
  const isFuludelisi = skill.form === 'fuludelisi';
  const isLiberationBlade = skill.name === KATIXIYA_SKILLS.liberationBlade.name;

  // 固有：目标带风蚀时自身造成伤害提升
  buff.damageBonus += getWindErosionSelfBuff(opts.windErosionStacks);

  // S1：芙露德莉斯满决意暴伤，默认 4 层
  if (chainCount >= 1 && isFuludelisi) {
    buff.critDamage += 0.25 * opts.s1ResolveStacks;
  }

  // S2：小卡倍率提升；空中攻击 +200%，其他列明技能 +50%
  if (chainCount >= 2 && isKatixiya) {
    if (skill.name === KATIXIYA_SKILLS.katAerialThreeSwords.name) {
      buff.multiplierBonus += 2.00;
    } else if (skill.type === 'normal' || skill.type === 'intro') {
      buff.multiplierBonus += 0.50;
    }
  }

  // S3：终结大招倍率 +100%
  if (chainCount >= 3 && isLiberationBlade) {
    buff.multiplierBonus += 1.00;
  }

  // S4：附加异常后全队全属性 +20%，默认风蚀已触发
  if (chainCount >= 4 && opts.includeS4TeamBuff) {
    buff.damageBonus += 0.20;
  }

  // S6：目标受到芙露德莉斯伤害 +40%
  if (chainCount >= 6 && isFuludelisi) {
    buff.damageBonus += 0.40;
  }

  // 看潮怒风哮之刃：每层风蚀加深 20%，最多 5 层
  if (isLiberationBlade) {
    buff.deepen += 0.20 * Math.min(5, opts.windErosionStacks);
  }

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skill, skillMultiplier }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const opts = buildOptions(options);

  const roleBuff = getRoleSelfBuff({ skill, chainCount, opts });
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options: opts })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options: opts })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options: opts })
    : {};

  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);

  // mergeBuff 不合并 critRate/critDamage，也没有 hpPercent 字段，这里手动汇总。
  const extraCritDamage = Number(roleBuff.critDamage || 0)
                        + Number(weaponBuff.critDamage || 0)
                        + Number(phantomBuff.critDamage || 0)
                        + Number(groupBuff.critDamage || 0);
  const extraCritRate = Number(roleBuff.critRate || 0)
                      + Number(weaponBuff.critRate || 0)
                      + Number(phantomBuff.critRate || 0)
                      + Number(groupBuff.critRate || 0);
  const hpPercent = Number(roleBuff.hpPercent || 0)
                  + Number(weaponBuff.hpPercent || 0)
                  + Number(phantomBuff.hpPercent || 0)
                  + Number(groupBuff.hpPercent || 0);
  const flatHp = Number(roleBuff.flatHp || 0)
               + Number(weaponBuff.flatHp || 0)
               + Number(phantomBuff.flatHp || 0)
               + Number(groupBuff.flatHp || 0);

  const finalHp = panel.hp * (1 + hpPercent) + flatHp;
  const attrMap = panel.attrMap || {};
  const panelBonus = getPanelDamageBonus(attrMap, skill.type);

  const result = calcSingleDamage({
    attack: finalHp,
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
    name: skill.name,
    ...result
  };
}

export default {
  name: '卡提希娅',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const levels = {
      '普攻': getSkillLevel(roleDetailData, '普攻'),
      '共鸣技能': getSkillLevel(roleDetailData, '共鸣技能'),
      '共鸣回路': getSkillLevel(roleDetailData, '共鸣回路'),
      '共鸣解放': getSkillLevel(roleDetailData, '共鸣解放'),
      '变奏技能': getSkillLevel(roleDetailData, '变奏技能')
    };

    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = Object.values(KATIXIYA_SKILLS).map(skill => {
      const level = levels[skill.levelFrom] || 10;
      const skillMultiplier = skill.levelMap[level] || skill.levelMap[10];
      return calcOneSkill({ ...args, skill, skillMultiplier });
    });

    return {
      enemyName: enemy?.name || '无妄者',
      items
    };
  }
};
