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

// 把 wiki 上的倍率表达式（如 "16.40%*2+21.09%*3+138.22%"）解析为小数倍率。
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
// 景燃（5★ 热熔 长刃 / 攻击倍率重击主 C）
// 数据来源：库街区 wiki entryId=1536352499213860864（共鸣者前瞻 → 角色养成/技能介绍）。
//
// 核心机制：
//   [1] 攻击倍率：技能倍率以「攻击力」为基底（延奏技能「收山出煞」原文即「795%攻击」）。
//       景燃自身基础攻击很低，主要靠固有「阳变阴合 / 阴阳相生」把堆叠的生命上限
//       转化为额外攻击，因此公式里的 baseArea 使用 finalAttack（含生命转化的固定攻击）。
//   [2] 伤害类型：普攻·摄召第3/4段、普攻·灭煞第3/4段、闪避反击、黄泉渡、往生送、
//       重击·劫魄/踏罡、万鬼同葬、魑魅魍魉均为「重击伤害」，吃重击加成。
//   [3] 固有「幽而复明」：每 1000 生命上限 +1.5% 热熔伤害加成，上限 75%（50000 生命封顶）。
//   [4] 固有「阳变阴合」：每 1000 生命上限 +36 攻击，上限 1800；
//       S3 施放共鸣解放后替换为「阴阳相生」：每 1000 生命上限 +50 攻击，上限 2500。
//       该加成作用于攻击力，是本模块攻击基底的一部分。
//   [5] 变奏「挑灯问冢」祸兮福兮：每层每 1000 生命上限 +0.05% 热熔伤害加成，每层上限 2.5%，
//       最多 50 层。
//   [6] 命火重击：荧惑状态且持有命火时，施放重击消耗 25 点命火，使其倍率按生命上限增加：
//       生命上限 >25000 后每超过 1000 点增加一档倍率，最多计入 25000 点（即 25 档）。
//
// 共鸣链：
//   S1：共鸣技能·阴蚀骨/黄泉渡/阳焚身/往生送 倍率 +80%。
//   S2：重击·劫魄/踏罡 倍率 +46%；命火对其倍率增加效果再 +46%；「通幽」使重击伤害加深 180%。
//   S3：重击获得鬼护；阳变阴合替换为阴阳相生（+50 攻击/1000 生命，上限 2500）。
//   S4：队伍角色获得护盾时全队全属性伤害加成 +20%（默认已触发）。
//   S5：生存，不计伤害。
//   S6：目标受到景燃的重击伤害 +40%；魑魅魍魉倍率 +80%；万鬼同行额外召唤（不单独计入）。
//
// 默认假设（可用 options 覆盖）：
//   荧惑状态开启、命火可用、祸兮福兮 50 层、S4 队伍增伤已触发、承天/载物满层、
//   S3 阴阳相生生效（yinYangActive）。
// =============================================================
const JINGRAN_SKILLS = {
  heavyJiepo: {
    name: '重击·劫魄',
    type: 'heavy',
    levelFrom: '共鸣回路',
    // 重击·劫魄伤害
    levelMap: levelMap(
      '8.25%*2+10.61%*3+69.53%',
      '8.93%*2+11.48%*3+75.23%',
      '9.61%*2+12.35%*3+80.93%',
      '10.55%*2+13.57%*3+88.91%',
      '11.23%*2+14.44%*3+94.61%',
      '12.01%*2+15.44%*3+101.16%',
      '13.09%*2+16.83%*3+110.29%',
      '14.17%*2+18.22%*3+119.41%',
      '15.25%*2+19.61%*3+128.53%',
      '16.40%*2+21.09%*3+138.22%'
    ),
    // 每 1000 最大生命增加重击·劫魄伤害
    fireMap: levelMap(
      '0.75%*2+0.96%*3+6.26%',
      '0.81%*2+1.04%*3+6.77%',
      '0.87%*2+1.12%*3+7.29%',
      '0.95%*2+1.23%*3+8.01%',
      '1.02%*2+1.30%*3+8.52%',
      '1.09%*2+1.39%*3+9.11%',
      '1.18%*2+1.52%*3+9.93%',
      '1.28%*2+1.64%*3+10.75%',
      '1.38%*2+1.77%*3+11.57%',
      '1.48%*2+1.90%*3+12.44%'
    ),
    s2Heavy: true
  },
  heavyTagang: {
    name: '重击·踏罡',
    type: 'heavy',
    levelFrom: '共鸣回路',
    // 重击·踏罡伤害
    levelMap: levelMap(
      '12.09%+12.09%+24.18%+72.54%',
      '13.09%+13.09%+26.17%+78.49%',
      '14.08%+14.08%+28.15%+84.44%',
      '15.47%+15.47%+30.93%+92.77%',
      '16.46%+16.46%+32.91%+98.72%',
      '17.60%+17.60%+35.19%+105.56%',
      '19.18%+19.18%+38.36%+115.08%',
      '20.77%+20.77%+41.53%+124.59%',
      '22.36%+22.36%+44.71%+134.11%',
      '24.04%+24.04%+48.08%+144.22%'
    ),
    // 每 1000 最大生命增加重击·踏罡伤害
    fireMap: levelMap(
      '1.09%+1.09%+2.18%+6.53%',
      '1.18%+1.18%+2.36%+7.07%',
      '1.27%+1.27%+2.54%+7.60%',
      '1.40%+1.40%+2.79%+8.35%',
      '1.49%+1.49%+2.97%+8.89%',
      '1.59%+1.59%+3.17%+9.50%',
      '1.73%+1.73%+3.46%+10.36%',
      '1.87%+1.87%+3.74%+11.22%',
      '2.02%+2.02%+4.03%+12.07%',
      '2.17%+2.17%+4.33%+12.98%'
    ),
    s2Heavy: true
  },
  skillYinshiggu: {
    name: '共鸣技能·阴蚀骨',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '33.00%+16.50%*3',
      '35.71%+17.86%*3',
      '38.42%+19.21%*3',
      '42.21%+21.11%*3',
      '44.91%+22.46%*3',
      '48.02%+24.01%*3',
      '52.35%+26.18%*3',
      '56.68%+28.34%*3',
      '61.01%+30.51%*3',
      '65.61%+32.81%*3'
    ),
    s1Skill: true
  },
  skillHuangquan: {
    name: '共鸣技能·黄泉渡',
    type: 'heavy',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '26.00%+13.00%*2+19.50%*4',
      '28.13%+14.07%*2+21.10%*4',
      '30.26%+15.13%*2+22.70%*4',
      '33.25%+16.63%*2+24.94%*4',
      '35.38%+17.69%*2+26.54%*4',
      '37.83%+18.92%*2+28.37%*4',
      '41.24%+20.62%*2+30.93%*4',
      '44.65%+22.33%*2+33.49%*4',
      '48.06%+24.03%*2+36.05%*4',
      '51.69%+25.85%*2+38.77%*4'
    ),
    s1Skill: true
  },
  skillWangshengsong: {
    name: '共鸣技能·往生送',
    type: 'heavy',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '33.14%+33.14%+66.27%',
      '35.85%+35.85%+71.70%',
      '38.57%+38.57%+77.13%',
      '42.37%+42.37%+84.74%',
      '45.09%+45.09%+90.18%',
      '48.21%+48.21%+96.42%',
      '52.56%+52.56%+105.12%',
      '56.91%+56.91%+113.81%',
      '61.25%+61.25%+122.50%',
      '65.87%+65.87%+131.74%'
    ),
    s1Skill: true
  },
  liberation: {
    name: '共鸣解放·万鬼同葬',
    type: 'heavy',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '46.86%*8',
      '50.70%*8',
      '54.54%*8',
      '59.92%*8',
      '63.76%*8',
      '68.18%*8',
      '74.33%*8',
      '80.47%*8',
      '86.62%*8',
      '93.15%*8'
    )
  },
  phantomAttack: {
    name: '魑魅魍魉',
    type: 'heavy',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '42.00%',
      '45.45%',
      '48.89%',
      '53.71%',
      '57.16%',
      '61.12%',
      '66.63%',
      '72.14%',
      '77.65%',
      '83.51%'
    ),
    s6Phantom: true
  },
  intro: {
    name: '变奏技能·挑灯问冢',
    type: 'intro',
    levelFrom: '变奏技能',
    levelMap: levelMap(
      '100.00%',
      '108.20%',
      '116.40%',
      '127.88%',
      '136.08%',
      '145.51%',
      '158.63%',
      '171.75%',
      '184.87%',
      '198.81%'
    )
  }
};

function buildOptions(options = {}) {
  return {
    phoenixState: options.phoenixState !== false,
    fireActive: options.fireActive !== false,
    treasureStacks: Math.max(0, Math.min(50, Number(options.treasureStacks ?? 50))),
    includeS4TeamBuff: options.includeS4TeamBuff !== false,
    yinYangActive: options.yinYangActive !== false,
    fireHpThreshold: Number(options.fireHpThreshold ?? 25000),
    fireHpCapTiers: Math.max(0, Number(options.fireHpCapTiers ?? 25))
  };
}

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '热熔伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  return total;
}

const hpTiers = (hp) => Math.floor(Math.max(0, Number(hp) || 0) / 1000);

// 「幽而复明」：每 1000 生命上限 +1.5% 热熔伤害加成，上限 75%
function getInherentElementBonus(finalHp) {
  return Math.min(hpTiers(finalHp) * 0.015, 0.75);
}

// 固有「阳变阴合」/ S3「阴阳相生」：基于生命上限获得额外攻击
// 阳变阴合：每 1000 生命上限 +36 攻击，上限 1800
// 阴阳相生（S3 且施放共鸣解放·万鬼同葬后 15 秒内）：每 1000 生命上限 +50 攻击，上限 2500
function getInherentAttackBonus(finalHp, chainCount, opts) {
  const tiers = hpTiers(finalHp);
  if (chainCount >= 3 && opts.yinYangActive) {
    return Math.min(tiers * 50, 2500);
  }
  return Math.min(tiers * 36, 1800);
}

// 祸兮福兮：每层每 1000 生命上限 +0.05% 热熔伤害加成，每层上限 2.5%
function getTreasureBonus(finalHp, stacks) {
  const perStack = Math.min(hpTiers(finalHp) * 0.0005, 0.025);
  return perStack * Math.max(0, stacks);
}

// 命火对重击·劫魄/踏罡的倍率增加：生命上限超过阈值后每 1000 点增加一档
function getFireMultiplierBonus({ skill, chainCount, finalHp, opts }) {
  if (!skill.fireMap || !opts.fireActive || !opts.phoenixState) return 0;

  const level = skill.__level ?? 10;
  const perTier = skill.fireMap[level] || skill.fireMap[10];
  const tiers = Math.max(
    0,
    Math.min(hpTiers(finalHp - opts.fireHpThreshold), opts.fireHpCapTiers)
  );

  const bonus = perTier * tiers;
  // S2：荧惑状态下命火对重击的倍率增加效果提升 46%
  return chainCount >= 2 ? bonus * 1.46 : bonus;
}

function getRoleSelfBuff({ skill, chainCount, finalHp, opts }) {
  const buff = {
    attackPercent: 0,
    flatAttack: 0,
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    ignoreDefense: 0,
    source: '景燃·自身'
  };

  // 固有「阳变阴合 / 阴阳相生」：生命上限转化为额外攻击（攻击基底的一部分）
  buff.flatAttack += getInherentAttackBonus(finalHp, chainCount, opts);

  // 固有「幽而复明」
  buff.damageBonus += getInherentElementBonus(finalHp);
  // 变奏「挑灯问冢」祸兮福兮
  buff.damageBonus += getTreasureBonus(finalHp, opts.treasureStacks);

  // S1：共鸣技能·阴蚀骨/黄泉渡/阳焚身/往生送 倍率 +80%
  if (chainCount >= 1 && skill.s1Skill) {
    buff.multiplierBonus += 0.80;
  }

  // S2：重击·劫魄/踏罡 倍率 +46%，通幽使其伤害加深 180%
  if (chainCount >= 2 && skill.s2Heavy) {
    buff.multiplierBonus += 0.46;
    buff.deepen += 1.80;
  }

  // S4：队伍角色获得护盾时全队全属性伤害加成 +20%
  if (chainCount >= 4 && opts.includeS4TeamBuff) {
    buff.damageBonus += 0.20;
  }

  // S6：目标受到景燃的重击伤害 +40%；魑魅魍魉倍率 +80%
  if (chainCount >= 6) {
    if (skill.type === 'heavy') buff.deepen += 0.40;
    if (skill.s6Phantom) buff.multiplierBonus += 0.80;
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

  // mergeBuff 不合并 critRate/critDamage，需手动汇总；生命上限用于 HP 相关的固有/命火加成换算。
  const extraCritRate = Number(weaponBuff.critRate || 0)
                      + Number(phantomBuff.critRate || 0)
                      + Number(groupBuff.critRate || 0);
  const extraCritDamage = Number(weaponBuff.critDamage || 0)
                        + Number(phantomBuff.critDamage || 0)
                        + Number(groupBuff.critDamage || 0);
  const hpPercent = Number(weaponBuff.hpPercent || 0)
                  + Number(phantomBuff.hpPercent || 0)
                  + Number(groupBuff.hpPercent || 0);
  const flatHp = Number(weaponBuff.flatHp || 0)
               + Number(phantomBuff.flatHp || 0)
               + Number(groupBuff.flatHp || 0);

  const finalHp = panel.hp * (1 + hpPercent) + flatHp;

  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const roleBuff = getRoleSelfBuff({ skill: { ...skill, __level: level }, chainCount, finalHp, opts });
  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);

  // 景燃为攻击倍率角色：攻击基底 = 面板攻击 ×(1+攻击%) + 固定攻击（含生命上限转化）。
  const finalAttack = Number(panel.attack || 0) * (1 + (mergedBuff.attackPercent || 0))
                    + (mergedBuff.flatAttack || 0);

  let skillMultiplier = skill.levelMap[level] || skill.levelMap[10];
  skillMultiplier += getFireMultiplierBonus({ skill: { ...skill, __level: level }, chainCount, finalHp, opts });

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
  name: '景燃',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = [
      calcOneSkill({ ...args, skill: JINGRAN_SKILLS.heavyJiepo }),
      calcOneSkill({ ...args, skill: JINGRAN_SKILLS.heavyTagang }),
      calcOneSkill({ ...args, skill: JINGRAN_SKILLS.skillYinshiggu }),
      calcOneSkill({ ...args, skill: JINGRAN_SKILLS.skillHuangquan }),
      calcOneSkill({ ...args, skill: JINGRAN_SKILLS.skillWangshengsong }),
      calcOneSkill({ ...args, skill: JINGRAN_SKILLS.liberation }),
      calcOneSkill({ ...args, skill: JINGRAN_SKILLS.phantomAttack }),
      calcOneSkill({ ...args, skill: JINGRAN_SKILLS.intro })
    ];

    return {
      enemyName: enemy?.name || '无妄者',
      source: '库街区 Wiki entryId=1536352499213860864',
      items
    };
  }
};
