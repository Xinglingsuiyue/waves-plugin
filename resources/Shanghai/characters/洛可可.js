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

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = value;
  return map;
}, {});

// =============================================================
// 洛可可（5★ 湮灭 臂铠 / 重击倍率副C）
// 数据来源：库街区 Wiki entryId=1328404385305366528（技能倍率取 1~10 级）。
//
// 伤害类型（官方原文「此次伤害为重击伤害」）：
//   常态攻击（普攻 1~4 段 / 空中攻击 / 闪避反击）→ normal。
//   重击 → heavy。
//   共鸣技能·高难度设计 → skill。
//   共鸣回路·普攻幻想照进现实（1~3 段）→ heavy（原文「此次伤害为重击伤害」）。
//   共鸣解放·即兴喜剧，开场 → heavy（原文「此次伤害为重击伤害」）。
//   变奏技能·佩洛，来帮忙 → intro。
//   S6 追加的普攻·构筑现实 → heavy（原文「此次伤害为重击伤害」）。
//
// 增益来源：
//   固有「沉浸式演出」：施放共鸣技能或重击时自身攻击 +20%，持续 12 秒（默认已触发）。
//   S1：施放共鸣技能时额外回复想象力/协奏能量（无伤害增益）。
//   S2：施放普攻·幻想照进现实时，队伍（含自身）湮灭伤害加成 +10%×3，
//       满层额外 +10%（合计 +40%），持续 30 秒（默认已触发）。
//   S3：施放变奏技能时，自身暴击 +10%、暴击伤害 +30%，持续 15 秒（默认已触发）。
//   S4：施放共鸣技能时，普攻·幻想照进现实倍率 +60%，持续 12 秒（默认已触发）。
//   S5：共鸣解放倍率 +20%；重击类伤害倍率 +80%（默认已触发）。
//   S6：施放共鸣解放后 12 秒内，普攻·幻想照进现实无视 60% 防御，并解锁普攻·构筑现实。
//   共鸣解放本体：洛可可暴击高于 50% 时，每多出 0.1% 暴击，施放时使队伍攻击 +1，
//       最多 +200，持续 30 秒（默认已触发，可用 options.liberationAtkBuffActive 关闭）。
// =============================================================
const SKILLS = {
  // ---------- 常态攻击「佩洛，悠着点」 ----------
  normal1: {
    name: '普攻第一段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      0.3681, 0.3983, 0.4285, 0.4707, 0.5009, 0.5356, 0.5839, 0.6322, 0.6805, 0.7318
    )
  },
  normal2: {
    name: '普攻第二段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      0.5757, 0.6228, 0.6699, 0.7359, 0.7833, 0.8376, 0.9129, 0.9885, 1.0641, 1.1442
    )
  },
  normal3: {
    name: '普攻第三段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      0.85, 0.9199, 0.9895, 1.087, 1.1569, 1.237, 1.3485, 1.46, 1.5715, 1.69
    )
  },
  normal4: {
    name: '普攻第四段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      1.0482, 1.134, 1.22, 1.3404, 1.4262, 1.5252, 1.6626, 1.8002, 1.9376, 2.0838
    )
  },
  heavy: {
    name: '重击',
    type: 'heavy',
    levelFrom: '常态攻击',
    isHeavyAttack: true,
    levelMap: levelMap(
      0.85, 0.9197, 0.9894, 1.087, 1.1567, 1.2369, 1.3484, 1.4599, 1.5714, 1.6899
    )
  },
  aerial: {
    name: '空中攻击',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      0.527, 0.5703, 0.6135, 0.674, 0.7172, 0.7669, 0.836, 0.9052, 0.9743, 1.0478
    )
  },
  dodge: {
    name: '闪避反击',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      1.0398, 1.125, 1.2102, 1.3296, 1.4148, 1.5129, 1.6491, 1.7856, 1.9221, 2.067
    )
  },

  // ---------- 共鸣技能 ----------
  skill: {
    name: '共鸣技能·高难度设计',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      2.4736, 2.6768, 2.8792, 3.1632, 3.3656, 3.5992, 3.924, 4.248, 4.5728, 4.9176
    )
  },

  // ---------- 共鸣回路「道具师的自我修养」·普攻幻想照进现实（重击伤害） ----------
  fantasy1: {
    name: '普攻·幻想照进现实第一段',
    type: 'heavy',
    levelFrom: '共鸣回路',
    isFantasy: true,
    isHeavyAttack: true,
    levelMap: levelMap(
      1.62, 1.7529, 1.8857, 2.0717, 2.2045, 2.3573, 2.5699, 2.7824, 2.9949, 3.2208
    )
  },
  fantasy2: {
    name: '普攻·幻想照进现实第二段',
    type: 'heavy',
    levelFrom: '共鸣回路',
    isFantasy: true,
    isHeavyAttack: true,
    levelMap: levelMap(
      1.71, 1.8503, 1.9905, 2.1868, 2.327, 2.4883, 2.7126, 2.937, 3.1613, 3.3997
    )
  },
  fantasy3: {
    name: '普攻·幻想照进现实第三段',
    type: 'heavy',
    levelFrom: '共鸣回路',
    isFantasy: true,
    isHeavyAttack: true,
    levelMap: levelMap(
      1.8, 1.9476, 2.0952, 2.3019, 2.4495, 2.6192, 2.8554, 3.0915, 3.3277, 3.5786
    )
  },
  // S6 解锁：造成幻想照进现实第三段 100% 的伤害
  construct: {
    name: '普攻·构筑现实',
    type: 'heavy',
    levelFrom: '共鸣回路',
    isFantasy: true,
    isHeavyAttack: true,
    requiresChain: 6,
    levelMap: levelMap(
      1.8, 1.9476, 2.0952, 2.3019, 2.4495, 2.6192, 2.8554, 3.0915, 3.3277, 3.5786
    )
  },

  // ---------- 共鸣解放 ----------
  liberation: {
    name: '共鸣解放·即兴喜剧，开场',
    type: 'heavy',
    levelFrom: '共鸣解放',
    isLiberation: true,
    levelMap: levelMap(
      4.2, 4.5444, 4.8888, 5.3712, 5.7156, 6.1116, 6.6627, 7.2135, 7.7646, 8.3502
    )
  },

  // ---------- 变奏技能 ----------
  intro: {
    name: '变奏技能·佩洛，来帮忙',
    type: 'intro',
    levelFrom: '变奏技能',
    levelMap: levelMap(
      0.85, 0.9197, 0.9894, 1.087, 1.1567, 1.2369, 1.3484, 1.4599, 1.5714, 1.6899
    )
  }
};

function buildOptions(options = {}) {
  return {
    chenjinshiActive: options.chenjinshiActive !== false,
    s2Active: options.s2Active !== false,
    s3Active: options.s3Active !== false,
    s4Active: options.s4Active !== false,
    s5Active: options.s5Active !== false,
    s6Active: options.s6Active !== false,
    weaponEffectActive: options.weaponEffectActive !== false,
    liberationAtkBuffActive: options.liberationAtkBuffActive !== false
  };
}

function getPanelDamageBonus(attrMap, skillType) {
  // 洛可可全伤害为湮灭伤害；此处兼容性汇总各元素加成（面板只会出现其一）。
  const elementKeys = ['湮灭伤害加成', '冷凝伤害加成', '热熔伤害加成', '导电伤害加成', '气动伤害加成', '衍射伤害加成'];
  let total = elementKeys.reduce((sum, key) => sum + getPercentAttr(attrMap, key), 0);
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
    source: '洛可可·自身'
  };

  // 固有「沉浸式演出」：施放共鸣技能或重击时，自身攻击 +20%（12 秒）。
  if (opts.chenjinshiActive) {
    buff.attackPercent += 0.20;
  }

  // S2：普攻·幻想照进现实命中后，队伍（含自身）湮灭伤害加成 +10%×3，满层额外 +10%。
  if (chainCount >= 2 && opts.s2Active) {
    buff.damageBonus += 0.40;
  }

  // S3：施放变奏技能后，自身暴击 +10%、暴击伤害 +30%（15 秒）。
  if (chainCount >= 3 && opts.s3Active) {
    buff.critRate += 0.10;
    buff.critDamage += 0.30;
  }

  // S4：施放共鸣技能后，普攻·幻想照进现实（含构筑现实）倍率 +60%（12 秒）。
  if (chainCount >= 4 && opts.s4Active && skill.isFantasy) {
    buff.multiplierBonus += 0.60;
  }

  // S5：共鸣解放倍率 +20%；重击类伤害（重击 / 幻想照进现实 / 构筑现实）倍率 +80%。
  if (chainCount >= 5 && opts.s5Active) {
    if (skill.isLiberation) {
      buff.multiplierBonus += 0.20;
    } else if (skill.isHeavyAttack) {
      buff.multiplierBonus += 0.80;
    }
  }

  // S6：普攻·幻想照进现实（含构筑现实）无视目标 60% 防御（12 秒）。
  if (chainCount >= 6 && opts.s6Active && skill.isFantasy) {
    buff.ignoreDefense += 0.60;
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

  // 共鸣解放·即兴喜剧，开场：暴击高于 50% 时，每多出 0.1% 暴击，
  // 施放该技能时使队伍（含自身）攻击 +1，最多 +200，持续 30 秒（默认已触发）。
  const totalCritRate = Number(panel.critRate || 0) + extraCritRate;
  if (opts.liberationAtkBuffActive && totalCritRate > 0.5) {
    roleBuff.flatAttack += Math.min(200, Math.floor((totalCritRate - 0.5) / 0.001));
  }

  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);

  // 洛可可为攻击倍率角色：攻击基底 = 面板攻击 ×(1+攻击%) + 固定攻击。
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
  name: '洛可可',
  wiki: {
    id: '1328404385305366528',
    name: '洛可可',
    source: '库街区 Wiki entryId=1328404385305366528',
    lastUpdateTime: '2025-12-29'
  },
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const chainCount = getChainUnlockedCount(roleDetailData);
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      'intro',
      'normal1',
      'normal2',
      'normal3',
      'normal4',
      'heavy',
      'aerial',
      'dodge',
      'skill',
      'fantasy1',
      'fantasy2',
      'fantasy3',
      'construct',
      'liberation'
    ];
    const items = displayKeys
      .map(key => SKILLS[key])
      .filter(skill => skill && (!skill.requiresChain || chainCount >= skill.requiresChain))
      .map(skill => calcOneSkill({ ...args, skill }));

    return {
      enemyName: enemy?.name || '无妄者',
      source: '库街区 Wiki entryId=1328404385305366528',
      items
    };
  }
};
