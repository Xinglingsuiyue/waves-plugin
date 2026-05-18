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
// 赞妮（5★ 衍射 臂铠 重击主 C）
// 数据来源：库街区 wiki entryId=1309607355563974656。
//
// 计算范围（4 个代表输出）：
//   1) 重斩·破晓
//   2) 重斩·将明
//   3) 重斩·终夜 (主要爆发，吃【焰光】每点倍率)
//   4) 重斩·闪裂
//
// 共鸣链：
//   S1：集中压制/破袭反击触发时，衍射伤害加成 +50%（默认开启）
//   S2：暴击 +20%、集中压制/破袭反击倍率 +80%（本模块不计算这两个技能）
//   S3：处于灼焰形态每消耗 1 点【焰光】，使共鸣解放终绝将至之刻最后一段倍率 +8%（不在本模块）
//   S4：变奏即刻执行时，全队攻击 +20%（默认开启）
//   S5：共鸣解放重燃倍率 +120%（本模块不计算解放）
//   S6：重斩·破晓/将明/终夜/闪裂 倍率 +40%；重斩·终夜消耗每点【焰光】额外 +40%
// =============================================================
const ZANI_SKILLS = {
  // 重斩·破晓：100% → 198.81% (10级)
  poxiao: {
    name: '重斩·破晓',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 1.0000, 2: 1.0820, 3: 1.1640, 4: 1.2788, 5: 1.3608,
      6: 1.4551, 7: 1.5863, 8: 1.7175, 9: 1.8487, 10: 1.9881
    }
  },
  // 重斩·将明：213.3% → 424.07% (10级)
  jiangming: {
    name: '重斩·将明',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 2.1330, 2: 2.3080, 3: 2.4829, 4: 2.7277, 5: 2.9026,
      6: 3.1038, 7: 3.3836, 8: 3.6635, 9: 3.9433, 10: 4.2407
    }
  },
  // 重斩·终夜：68% + 132% → 135.20% + 262.43% (10级)
  // 每点【焰光】额外倍率（10级=9.95%）；默认 60 点焰光
  zhongye: {
    name: '重斩·终夜',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.6800 + 1.3200, 2: 0.7358 + 1.4283, 3: 0.7916 + 1.5365,
      4: 0.8696 + 1.6881, 5: 0.9254 + 1.7963, 6: 0.9895 + 1.9208,
      7: 1.0787 + 2.0940, 8: 1.1679 + 2.2671, 9: 1.2572 + 2.4403,
      10: 1.3520 + 2.6243
    },
    yanguangMap: {
      1: 0.0500, 2: 0.0541, 3: 0.0582, 4: 0.0640, 5: 0.0681,
      6: 0.0728, 7: 0.0794, 8: 0.0859, 9: 0.0925, 10: 0.0995
    }
  },
  // 重斩·闪裂：213.3% → 424.07% (10级)
  shanlie: {
    name: '重斩·闪裂',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 2.1330, 2: 2.3080, 3: 2.4829, 4: 2.7277, 5: 2.9026,
      6: 3.1038, 7: 3.3836, 8: 3.6635, 9: 3.9433, 10: 4.2407
    }
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '衍射伤害加成');
  if (skillType === 'normal') {
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
    source: '赞妮·自身'
  };

  // S1：衍射伤害 +50%
  if (chainCount >= 1) buff.damageBonus += 0.50;

  // S4：全队攻击 +20%
  if (chainCount >= 4) buff.attackPercent += 0.20;

  // S6：四段重斩倍率 +40%
  if (chainCount >= 6) {
    if (['重斩·破晓','重斩·将明','重斩·终夜','重斩·闪裂'].includes(skillName)) {
      buff.multiplierBonus += 0.40;
    }
  }

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const skill = ZANI_SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  let multiplier = skill.levelMap[level] || skill.levelMap[10];

  // 重斩·终夜：60 点【焰光】 × 每点倍率，S6 时该额外倍率再 +40%
  if (skillKey === 'zhongye') {
    const yan = Math.max(0, Math.min(60, Number(options?.yanguangPoints ?? 60)));
    const per = skill.yanguangMap[level] || skill.yanguangMap[10];
    let perFinal = per;
    if (chainCount >= 6) perFinal *= 1.40;
    multiplier += perFinal * yan;
  }

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
  name: '赞妮',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = ['poxiao', 'jiangming', 'zhongye', 'shanlie'].map(k =>
      calcOneSkill({ ...args, skillKey: k })
    );
    return { enemyName: enemy?.name || '无妄者', items };
  }
};
