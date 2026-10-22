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

// 把 wiki 上的倍率表达式（如 "30.63%*8+105.00%"）解析为小数倍率。
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
// 锁暝（5★ 导电 迅刀 / 普攻倍率主 C，附带同奏体系导电增伤）
// 数据来源：库街区 Wiki 角色页 id=1543075487722901504（官方），技能倍率取 1~10 级。
//
// 核心机制：
//   [1] 倍率基底：所有伤害均以「攻击力」为基底；分支强化为暴击提升 / 攻击提升。
//   [2] 念起 / 念深 / 念劫 三相态：念起普攻积攒【妄执】，满值→共鸣技能·拢伞形·锁妄念
//       进入念深；念深满值→共鸣技能·解伞形·无舍念，随后可施放普攻·暝伞形·刻心念
//       进入念劫，结束后回到念起。
//   [3] 伤害类型（决定吃哪个技能类型加成）：
//       共鸣技能·拢伞形·破隙 / 解伞形·赤芒瞬闪 → 共鸣技能伤害（skill）。
//       共鸣解放·暝伞形·重锁狱瘴 / 凄雨瘴雷 → 共鸣解放伤害（liberation）。
//       变奏技能·闪裂 / 碎霆 / 锁妄念·同奏 / 旋雷破·同奏 → 原文「本次伤害视为普攻伤害」→ normal。
//       共鸣技能·锁妄念 / 无舍念、普攻·暝伞形·刻心念 → 原文「本次伤害视为普攻伤害」→ normal。
//       常态攻击全体（普攻 / 解伞形 / 旋雷破 / 闪避反击 / 下落攻击）→ normal。
//   [4] 固有「雨浸旧契」：施放任一变奏技能后，自身导电伤害加成 +50%，持续 15 秒（默认已触发；
//       切换至其他角色提前结束，故退场后触发的共鸣解放·凄雨瘴雷不计入）。
//   [5] 固有「沉契凝锁」·禁锁契主：拥有同奏时施放共鸣技能·拢伞形·破隙，移除同奏并获得
//       【禁锁契主】：普攻·解伞形 / 普攻·解伞形·旋雷破 倍率 +100%；自身暴击伤害 +100%
//       （仅站场普攻类技能享受，变奏/共鸣解放先于禁锁契主施放故不计入），持续 12 秒
//       （默认已触发，可用 options.jinsuoActive 关闭）。
//   [6] 同奏增益：每层使可响应同奏的角色最终伤害 +3%，基础上限 2 层（S6 每层 +50%、上限 4 层）。
//       因默认走「禁锁契主」会消耗自身同奏增益，故默认 0 层，可用 options.tongzouStacks 指定。
//
// 共鸣链：
//   S1：变奏技能·闪裂/碎霆/锁妄念·同奏/旋雷破·同奏 倍率 +60%。
//   S2：自身暴击伤害 +40%。
//   S3：施放共鸣解放时，自身普攻伤害加深 +30%，持续 25 秒（默认已触发，普攻类别生效）。
//   S4：自身攻击 +20%。
//   S5：共鸣解放·暝伞形·重锁狱瘴 倍率 +40%。
//   S6：普攻·暝伞形·刻心念 倍率 +50%；同奏增益每层效果 +50%（至多 4 层）；
//       拥有禁锁契主时自身暴击伤害额外 +200%。
//
// 默认假设（可用 options 覆盖）：
//   yujinActive=true（雨浸旧契 +50% 导电加成）、jinsuoActive=true（禁锁契主）、
//   s3Active=true（S3 普攻加深）、tongzouStacks=0。
// =============================================================
const SUOMING_SKILLS = {
  // ---------- 常态攻击（普攻） ----------
  normal1: {
    name: '普攻第一段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '15.87%', '17.17%', '18.48%', '20.30%', '21.60%',
      '23.09%', '25.18%', '27.26%', '29.34%', '31.55%'
    )
  },
  normal2: {
    name: '普攻第二段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '7.92%*2+15.83%', '8.56%*2+17.12%', '9.21%*2+18.42%', '10.12%*2+20.24%', '10.77%*2+21.54%',
      '11.52%*2+23.03%', '12.55%*2+25.10%', '13.59%*2+27.18%', '14.63%*2+29.26%', '15.73%*2+31.46%'
    )
  },
  normal3: {
    name: '普攻第三段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '11.07%*3+22.14%', '11.98%*3+23.96%', '12.89%*3+25.77%', '14.16%*3+28.32%', '15.07%*3+30.13%',
      '16.11%*3+32.22%', '17.56%*3+35.12%', '19.02%*3+38.03%', '20.47%*3+40.93%', '22.01%*3+44.02%'
    )
  },
  jie1: {
    name: '普攻·解伞形第一段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '32.91%+16.46%*2', '35.61%+17.81%*2', '38.31%+19.16%*2', '42.08%+21.04%*2', '44.78%+22.39%*2',
      '47.89%+23.95%*2', '52.20%+26.10%*2', '56.52%+28.26%*2', '60.84%+30.42%*2', '65.42%+32.71%*2'
    ),
    isJie: true,
    isJinsuoScope: true
  },
  jie2: {
    name: '普攻·解伞形第二段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '57.54%+19.18%*3', '62.26%+20.76%*3', '66.98%+22.33%*3', '73.59%+24.53%*3', '78.31%+26.11%*3',
      '83.73%+27.91%*3', '91.28%+30.43%*3', '98.83%+32.95%*3', '106.38%+35.46%*3', '114.40%+38.14%*3'
    ),
    isJie: true,
    isJinsuoScope: true
  },
  jie3: {
    name: '普攻·解伞形第三段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '29.50%*2+29.50%*2', '31.92%*2+31.92%*2', '34.34%*2+34.34%*2', '37.72%*2+37.72%*2', '40.14%*2+40.14%*2',
      '42.92%*2+42.92%*2', '46.79%*2+46.79%*2', '50.66%*2+50.66%*2', '54.53%*2+54.53%*2', '58.64%*2+58.64%*2'
    ),
    isJie: true,
    isJinsuoScope: true
  },
  jie4: {
    name: '普攻·解伞形第四段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '53.95%+53.95%+23.98%*3', '58.37%+58.37%+25.95%*3', '62.80%+62.80%+27.91%*3', '68.99%+68.99%+30.66%*3', '73.41%+73.41%+32.63%*3',
      '78.50%+78.50%+34.89%*3', '85.58%+85.58%+38.04%*3', '92.65%+92.65%+41.18%*3', '99.73%+99.73%+44.33%*3', '107.25%+107.25%+47.67%*3'
    ),
    isJie: true,
    isJinsuoScope: true
  },
  xuan1: {
    name: '普攻·解伞形·旋雷破第一段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '36.88%+18.44%*2+36.88%+36.88%', '39.90%+19.95%*2+39.90%+39.90%', '42.93%+21.47%*2+42.93%+42.93%', '47.16%+23.58%*2+47.16%+47.16%', '50.18%+25.09%*2+50.18%+50.18%',
      '53.66%+26.83%*2+53.66%+53.66%', '58.50%+29.25%*2+58.50%+58.50%', '63.34%+31.67%*2+63.34%+63.34%', '68.18%+34.09%*2+68.18%+68.18%', '73.32%+36.66%*2+73.32%+73.32%'
    ),
    isJie: true,
    isJinsuoScope: true
  },
  xuan2: {
    name: '普攻·解伞形·旋雷破第二段',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '28.51%*5', '30.85%*5', '33.19%*5', '36.46%*5', '38.80%*5',
      '41.49%*5', '45.23%*5', '48.97%*5', '52.71%*5', '56.69%*5'
    ),
    isJie: true,
    isJinsuoScope: true
  },
  dodge: {
    name: '闪避反击',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '13.92%*2+27.83%', '15.06%*2+30.11%', '16.20%*2+32.39%', '17.79%*2+35.58%', '18.94%*2+37.87%',
      '20.25%*2+40.49%', '22.07%*2+44.14%', '23.90%*2+47.79%', '25.72%*2+51.44%', '27.66%*2+55.32%'
    )
  },
  dodgeJie: {
    name: '闪避反击·解伞形',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '87.54%+29.18%*3', '94.72%+31.58%*3', '101.90%+33.97%*3', '111.95%+37.32%*3', '119.13%+39.71%*3',
      '127.38%+42.46%*3', '138.87%+46.29%*3', '150.35%+50.12%*3', '161.84%+53.95%*3', '174.04%+58.02%*3'
    ),
    isJinsuoScope: true
  },
  plunge: {
    name: '下落攻击',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '42.35%', '45.83%', '49.30%', '54.16%', '57.63%',
      '61.63%', '67.18%', '72.74%', '78.29%', '84.20%'
    ),
    isJinsuoScope: true
  },

  // ---------- 共鸣技能 ----------
  poxi: {
    name: '共鸣技能·拢伞形·破隙',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '53.62%', '58.02%', '62.42%', '68.57%', '72.97%',
      '78.03%', '85.06%', '92.10%', '99.13%', '106.61%'
    ),
    isPoxi: true
  },
  chimang: {
    name: '共鸣技能·解伞形·赤芒瞬闪',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '23.77%+11.89%*2+31.69%', '25.72%+12.86%*2+34.29%', '27.67%+13.84%*2+36.89%', '30.40%+15.20%*2+40.53%', '32.34%+16.17%*2+43.12%',
      '34.59%+17.30%*2+46.11%', '37.70%+18.85%*2+50.27%', '40.82%+20.41%*2+54.43%', '43.94%+21.97%*2+58.58%', '47.25%+23.63%*2+63.00%'
    )
  },

  // ---------- 共鸣解放 ----------
  zhongsuo: {
    name: '共鸣解放·暝伞形·重锁狱瘴',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '30.63%*8+105.00%', '33.14%*8+113.61%', '35.65%*8+122.22%', '39.17%*8+134.28%', '41.68%*8+142.89%',
      '44.57%*8+152.79%', '48.59%*8+166.57%', '52.60%*8+180.34%', '56.62%*8+194.12%', '60.89%*8+208.76%'
    ),
    isZhongsuo: true
  },
  qiyu: {
    name: '共鸣解放·凄雨瘴雷',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '30.00%', '32.46%', '34.92%', '38.37%', '40.83%',
      '43.66%', '47.59%', '51.53%', '55.47%', '59.65%'
    ),
    // 雷痕协同攻击在「施放延奏技能」后由下一个登场角色触发，
    // 此时锁暝已退场，雨浸旧契 / 怅念等「切换角色提前结束」的效果均已失效。
    isSwitchOut: true
  },

  // ---------- 变奏技能（本次伤害视为普攻伤害） ----------
  shanlie: {
    name: '变奏技能·拢伞形·闪裂',
    type: 'normal',
    levelFrom: '变奏技能',
    levelMap: levelMap(
      '55.78%*2+18.60%*4', '60.35%*2+20.12%*4', '64.92%*2+21.64%*4', '71.33%*2+23.78%*4', '75.90%*2+25.30%*4',
      '81.16%*2+27.06%*4', '88.48%*2+29.50%*4', '95.80%*2+31.94%*4', '103.11%*2+34.37%*4', '110.89%*2+36.97%*4'
    ),
    isIntro: true
  },
  suitin: {
    name: '变奏技能·解伞形·碎霆',
    type: 'normal',
    levelFrom: '变奏技能',
    levelMap: levelMap(
      '66.11%+33.06%*2+66.11%+66.11%', '71.53%+35.77%*2+71.53%+71.53%', '76.95%+38.48%*2+76.95%+76.95%', '84.54%+42.27%*2+84.54%+84.54%', '89.96%+44.98%*2+89.96%+89.96%',
      '96.19%+48.10%*2+96.19%+96.19%', '104.87%+52.44%*2+104.87%+104.87%', '113.54%+56.77%*2+113.54%+113.54%', '122.21%+61.11%*2+122.21%+122.21%', '131.43%+65.72%*2+131.43%+131.43%'
    ),
    isIntro: true
  },
  suowangIntro: {
    name: '变奏技能·拢伞形·锁妄念·同奏',
    type: 'normal',
    levelFrom: '变奏技能',
    levelMap: levelMap(
      '55.78%*2+18.60%*4', '60.35%*2+20.12%*4', '64.92%*2+21.64%*4', '71.33%*2+23.78%*4', '75.90%*2+25.30%*4',
      '81.16%*2+27.06%*4', '88.48%*2+29.50%*4', '95.80%*2+31.94%*4', '103.11%*2+34.37%*4', '110.89%*2+36.97%*4'
    ),
    isIntro: true
  },
  xuanleiIntro: {
    name: '变奏技能·解伞形·旋雷破·同奏',
    type: 'normal',
    levelFrom: '变奏技能',
    levelMap: levelMap(
      '66.11%+33.06%*2+66.11%+66.11%', '71.53%+35.77%*2+71.53%+71.53%', '76.95%+38.48%*2+76.95%+76.95%', '84.54%+42.27%*2+84.54%+84.54%', '89.96%+44.98%*2+89.96%+89.96%',
      '96.19%+48.10%*2+96.19%+96.19%', '104.87%+52.44%*2+104.87%+104.87%', '113.54%+56.77%*2+113.54%+113.54%', '122.21%+61.11%*2+122.21%+122.21%', '131.43%+65.72%*2+131.43%+131.43%'
    ),
    isIntro: true
  },

  // ---------- 共鸣回路（本次伤害视为普攻伤害） ----------
  suowang: {
    name: '共鸣技能·拢伞形·锁妄念',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '31.58%*2+15.79%*4', '34.17%*2+17.09%*4', '36.76%*2+18.38%*4', '40.39%*2+20.20%*4', '42.97%*2+21.49%*4',
      '45.95%*2+22.98%*4', '50.10%*2+25.05%*4', '54.24%*2+27.12%*4', '58.38%*2+29.19%*4', '62.78%*2+31.39%*4'
    )
  },
  wushe: {
    name: '共鸣技能·解伞形·无舍念',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '76.79%', '83.09%', '89.39%', '98.20%', '104.50%',
      '111.74%', '121.82%', '131.89%', '141.97%', '152.67%'
    ),
    isJinsuoScope: true
  },
  kexin: {
    name: '普攻·暝伞形·刻心念',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '780.37%', '844.37%', '908.33%', '997.93%', '1061.92%',
      '1135.51%', '1237.90%', '1340.30%', '1442.62%', '1551.41%'
    ),
    isKexin: true,
    isJinsuoScope: true
  },
  kexinHold: {
    name: '普攻·暝伞形·刻心念长按',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '9.76%*10+12.20%*8', '10.56%*10+13.20%*8', '11.36%*10+14.20%*8', '12.48%*10+15.60%*8', '13.28%*10+16.60%*8',
      '14.20%*10+17.75%*8', '15.48%*10+19.35%*8', '16.76%*10+20.95%*8', '18.04%*10+22.55%*8', '19.40%*10+24.24%*8'
    ),
    isKexin: true,
    isJinsuoScope: true
  }
};

function buildOptions(options = {}) {
  const jinsuoActive = options.jinsuoActive !== false;
  return {
    yujinActive: options.yujinActive !== false,
    jinsuoActive,
    s3Active: options.s3Active !== false,
    tongzouStacks: Math.max(0, Number(options.tongzouStacks ?? 0)),
    weaponEffectActive: options.weaponEffectActive !== false,
    // 【怅念】由「消耗协奏能量（20 点）」触发，仅走禁锁契主路线时成立；
    // 未显式指定时跟随禁锁契主开关，避免关闭禁锁契主后仍白吃 +80% 导电加成。
    changnianActive: options.changnianActive ?? jinsuoActive,
    phantomEffectActive: options.phantomEffectActive !== false,
    groupEffectActive: options.groupEffectActive !== false
  };
}

function getPanelDamageBonus(attrMap, skillType) {
  // 锁暝全伤害为导电伤害，故始终吃「导电伤害加成」。
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
    source: '锁暝·自身'
  };

  // 固有「雨浸旧契」：施放变奏技能后自身导电伤害加成 +50%（15 秒）。
  // 切换至其他角色时提前结束，故延奏后触发的凄雨瘴雷不吃此加成。
  if (opts.yujinActive && !skill.isSwitchOut) {
    buff.damageBonus += 0.50;
  }

  // 固有「沉契凝锁」·禁锁契主。
  // 该效果需在念深状态下持同奏施放破隙获得，随后 12 秒内的站场输出为
  // 念深/念劫技能（解伞形、旋雷破、闪避反击·解伞形、无舍念、刻心念、下落攻击）。
  // 念起专属的普攻 1~3 段、闪避反击、锁妄念在念深中已被替换，无法与禁锁契主共存，
  // 故暴伤加成只作用于 isJinsuoScope 标记的技能，避免这些条目虚高。
  const jinsuoCritScope = opts.jinsuoActive && skill.isJinsuoScope === true;
  if (opts.jinsuoActive) {
    if (skill.isJie) buff.multiplierBonus += 1.00;   // 普攻·解伞形 / 旋雷破 倍率 +100%
    if (jinsuoCritScope) buff.critDamage += 1.00;    // 自身暴击伤害 +100%
  }

  // 同奏增益：每层最终伤害 +3%；S6 每层效果 +50%，且至多 4 层。
  // 禁锁契主会移除同奏及自身【同奏增益】，故两者不可能同时存在。
  const tongzouCap = chainCount >= 6 ? 4 : 2;
  const tongzouStacks = opts.jinsuoActive
    ? 0
    : Math.max(0, Math.min(opts.tongzouStacks, tongzouCap));
  const perStack = 0.03 * (chainCount >= 6 ? 1.5 : 1);
  buff.deepen += perStack * tongzouStacks;

  // S1：变奏技能·闪裂/碎霆/锁妄念·同奏/旋雷破·同奏 倍率 +60%。
  if (chainCount >= 1 && skill.isIntro) {
    buff.multiplierBonus += 0.60;
  }

  // S2：自身暴击伤害 +40%。
  if (chainCount >= 2) {
    buff.critDamage += 0.40;
  }

  // S3：施放共鸣解放后自身普攻伤害加深 +30%（普攻类别含「视为普攻伤害」的技能）。
  if (chainCount >= 3 && opts.s3Active && skill.type === 'normal') {
    buff.deepen += 0.30;
  }

  // S4：自身攻击 +20%。
  if (chainCount >= 4) {
    buff.attackPercent += 0.20;
  }

  // S5：共鸣解放·暝伞形·重锁狱瘴 倍率 +40%。
  if (chainCount >= 5 && skill.isZhongsuo) {
    buff.multiplierBonus += 0.40;
  }

  // S6：普攻·暝伞形·刻心念 倍率 +50%；禁锁契主期间暴击伤害额外 +200%。
  if (chainCount >= 6) {
    if (skill.isKexin) buff.multiplierBonus += 0.50;
    if (opts.jinsuoActive && jinsuoCritScope) buff.critDamage += 2.00;
  }

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skill }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const opts = buildOptions(options);

  // 退场后触发的技能：专武【怅念】已在切换时提前结束，且不会重新获得【羁念】。
  const weaponOptions = skill.isSwitchOut ? { ...opts, skipYearn: true } : opts;
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options: weaponOptions })
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

  // 锁暝为攻击倍率角色：攻击基底 = 面板攻击 ×(1+攻击%) + 固定攻击。
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
  name: '锁暝',
  wiki: { id: '1543075487722901504', name: '锁暝', source: '库街区 Wiki 角色页' },
  skills: SUOMING_SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      'shanlie',
      'normal1',
      'normal2',
      'normal3',
      'suowang',
      'jie1',
      'jie2',
      'jie3',
      'jie4',
      'xuan1',
      'xuan2',
      'dodge',
      'dodgeJie',
      'plunge',
      'wushe',
      'kexin',
      'kexinHold',
      'poxi',
      'chimang',
      'zhongsuo',
      'qiyu'
    ];
    const items = displayKeys
      .map(key => SUOMING_SKILLS[key])
      .filter(Boolean)
      .map(skill => calcOneSkill({ ...args, skill }));

    return {
      enemyName: enemy?.name || '无妄者',
      source: '库街区 Wiki 角色页 id=1543075487722901504',
      items
    };
  }
};
