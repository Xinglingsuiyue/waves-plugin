import { calcSingleDamage } from '../../../utils/damage/formula.js';
import {  getPercentAttr, normalizeRoleDetailData, calcFinalAttack  } from '../../../utils/damage/parser.js';
import { mergeBuff } from '../../../utils/damage/buff.js';

function getSkillLevel(roleDetailData, typeName) {
  const data = normalizeRoleDetailData(roleDetailData);
  const skillList = data?.skillList || [];
  const target = skillList.find(skill => skill?.skill?.type === typeName);
  return target?.level || 10;
}

function getChainUnlockedCount(roleDetailData) {
  const data = normalizeRoleDetailData(roleDetailData);
  const chainList = data?.chainList || [];
  return chainList.filter(chain => Boolean(chain?.unlocked)).length;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function parseMultiplierExpr(expr) {
  if (typeof expr === 'number') return expr;
  const clean = String(expr)
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .replace(/%/g, '');

  return clean.split('+').filter(Boolean).reduce((sum, part) => {
    const factors = part.split('*').filter(Boolean).map(Number);
    if (!factors.length || factors.some(Number.isNaN)) return sum;
    const head = Number(factors.shift() || 0) / 100;
    const tail = factors.reduce((acc, value) => acc * value, 1);
    return sum + head * tail;
  }, 0);
}

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = parseMultiplierExpr(value);
  return map;
}, {});

const WIKI_DETAIL = {
  id: '1536353668409655296',
  name: '清宵',
  orgFullName: '角色组 > 共鸣者',
  lastUpdateTime: '2026-08-20',
  currentVersion: '16.0'
};

const SKILLS = {
  liberation: {
    key: 'liberation',
    name: '共鸣解放·天光云影沧澜兴伤害',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(
      '16.80%*10+672.00%',
      '18.18%*10+727.11%',
      '19.56%*10+782.21%',
      '21.49%*10+859.36%',
      '22.87%*10+914.46%',
      '24.45%*10+977.83%',
      '26.65%*10+1066.00%',
      '28.86%*10+1154.16%',
      '31.06%*10+1242.33%',
      '33.41%*10+1336.01%'
    )
  },
  tianjun: {
    key: 'tianjun',
    name: '重击·天钧荡煞·昙体仙身伤害',
    type: 'heavy',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '14.00%*9+224.00%',
      '15.15%*9+242.37%',
      '16.30%*9+260.74%',
      '17.91%*9+286.46%',
      '19.06%*9+304.82%',
      '20.38%*9+325.95%',
      '22.21%*9+355.34%',
      '24.05%*9+384.72%',
      '25.89%*9+414.11%',
      '27.84%*9+445.34%'
    )
  },
  heavyCang: {
    key: 'heavyCang',
    name: '重击·弦剑伤害',
    type: 'heavy',
    levelFrom: '常态攻击',
    levelMap: levelMap(
      '7.35%*3+11.03%*6+132.30%',
      '7.96%*3+11.93%*6+143.15%',
      '8.56%*3+12.84%*6+154.00%',
      '9.40%*3+14.10%*6+169.19%',
      '10.01%*3+15.01%*6+180.04%',
      '10.70%*3+16.05%*6+192.51%',
      '11.66%*3+17.49%*6+209.87%',
      '12.63%*3+18.94%*6+227.23%',
      '13.59%*3+20.39%*6+244.59%',
      '14.62%*3+21.92%*6+263.03%'
    )
  },
  dodge: {
    key: 'dodge',
    name: '闪避反击·昙体仙身伤害',
    type: 'normal',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      '13.30%*4+79.80%',
      '14.40%*4+86.35%',
      '15.49%*4+92.89%',
      '17.01%*4+102.05%',
      '18.10%*4+108.60%',
      '19.36%*4+116.12%',
      '21.10%*4+126.59%',
      '22.85%*4+137.06%',
      '24.59%*4+147.53%',
      '26.45%*4+158.66%'
    )
  },
  xingfa: {
    key: 'xingfa',
    name: '共鸣技能·浮声一刹·行罚伤害',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(
      '10.50%*2+49.00%',
      '11.37%*2+53.02%',
      '12.23%*2+57.04%',
      '13.43%*2+62.67%',
      '14.29%*2+66.68%',
      '15.28%*2+71.30%',
      '16.66%*2+77.73%',
      '18.04%*2+84.16%',
      '19.42%*2+90.59%',
      '20.88%*2+97.42%'
    )
  },
  giant: {
    key: 'giant',
    name: '巨阙灭迹伤害',
    type: 'normal',
    minChain: 1,
    multiplier: 4.00
  }
};

const LOCK_DEEPEN_SKILLS = new Set(['liberation', 'tianjun', 'heavyCang', 'dodge']);
const C6_DAMAGE_SKILLS = new Set(['liberation', 'tianjun', 'heavyCang', 'giant']);

function getLockDeepen(stacks) {
  const count = Math.max(0, Number(stacks) || 0);
  return count * 0.02 + Math.min(count, 7) * 0.05;
}

function getState({ chainCount, options }) {
  const maxLockStacks = chainCount >= 2 ? 25 : 15;
  const lockStacks = clamp(
    options?.qingxiaoHeartLockStacks ?? maxLockStacks,
    0,
    maxLockStacks
  );
  const swordStacks = chainCount >= 1
    ? clamp(options?.qingxiaoQingxieSwordStacks ?? 25, 0, 25)
    : 0;

  return {
    lockStacks,
    swordStacks,
    targetMarked: options?.qingxiaoTargetMarked ?? true
  };
}

function getRoleSelfBuff({ skill, chainCount, options }) {
  const state = getState({ chainCount, options });
  const buff = {
    attackPercent: 0,
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    ignoreDefense: 0,
    source: '清宵·自身'
  };

  if (LOCK_DEEPEN_SKILLS.has(skill.key)) {
    buff.deepen += getLockDeepen(state.lockStacks);
  }

  if (chainCount >= 1) {
    buff.critRate += 0.16;
    if (skill.key === 'giant') {
      // 每移除 1 层清邪剑诀使目标受到巨阙灭迹伤害 +4%，持续 2 秒；
      // 巨阙灭迹每秒最多触发 1 次，故最多同时叠 2 层。
      buff.deepen += Math.min(2, state.swordStacks) * 0.04;
    }
  }

  if (chainCount >= 2 && skill.key === 'heavyCang') {
    buff.multiplierBonus += 0.40;
  }

  if (chainCount >= 3) {
    if (skill.key === 'liberation') {
      buff.critDamage += 1.00;
    }
    if (skill.key === 'tianjun') {
      buff.multiplierBonus += state.lockStacks * 0.03;
    }
  }

  if (chainCount >= 4 && state.targetMarked) {
    buff.attackPercent += 0.20;
  }

  if (chainCount >= 5 && skill.key === 'xingfa') {
    buff.multiplierBonus += 1.00;
  }

  if (chainCount >= 6 && options?.qingxiaoC6DamageActive !== false && C6_DAMAGE_SKILLS.has(skill.key)) {
    // S6：目标受到清宵上述 4 个技能伤害 +40%（承伤提升走深化区）
    buff.deepen += 0.40;
  }

  if (chainCount >= 6 && skill.key === 'giant') {
    buff.deepen += getLockDeepen(state.lockStacks);
  }

  return buff;
}

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '气动伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  return total;
}

function calcOneSkill({ roleDetailData, panel, enemy, modules, options, skill }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  if (chainCount < Number(skill.minChain || 0)) return null;

  const level = skill.levelFrom
    ? getSkillLevel(roleDetailData, skill.levelFrom)
    : 10;
  const roleBuff = getRoleSelfBuff({ skill, chainCount, options });
  const moduleArgs = {
    roleDetailData,
    panel,
    enemy,
    skillType: skill.type,
    skillName: skill.name,
    element: '气动',
    options
  };
  const weaponBuff = modules.weapon?.apply ? modules.weapon.apply(moduleArgs) : {};
  const phantomBuff = modules.phantom?.apply ? modules.phantom.apply(moduleArgs) : {};
  const groupBuff = modules.group?.apply ? modules.group.apply(moduleArgs) : {};
  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);

  const extraCritRate = Number(roleBuff.critRate || 0)
    + Number(weaponBuff.critRate || 0)
    + Number(phantomBuff.critRate || 0)
    + Number(groupBuff.critRate || 0);
  const extraCritDamage = Number(roleBuff.critDamage || 0)
    + Number(weaponBuff.critDamage || 0)
    + Number(phantomBuff.critDamage || 0)
    + Number(groupBuff.critDamage || 0);
  const finalAttack = calcFinalAttack(panel, mergedBuff, roleDetailData);
  const skillMultiplier = skill.multiplier
    ?? skill.levelMap[level]
    ?? skill.levelMap[10];

  return {
    name: skill.name,
    ...calcSingleDamage({
      attack: finalAttack,
      skillMultiplier,
      multiplierBonus: mergedBuff.multiplierBonus || 0,
      damageBonus: getPanelDamageBonus(panel.attrMap || {}, skill.type)
        + (mergedBuff.damageBonus || 0),
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

function pickTopItems(items, count = 4) {
  return items
    .filter(Boolean)
    .sort((left, right) => right.expected - left.expected)
    .slice(0, count);
}

export default {
  name: '清宵',
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, enemy, modules = {}, options = {} }) {
    const items = pickTopItems(
      Object.values(SKILLS).map(skill => calcOneSkill({
        roleDetailData,
        panel,
        enemy,
        modules,
        options,
        skill
      }))
    );

    return {
      enemyName: enemy?.name || '无妄者',
      source: '库街区 Wiki entryId=1536353668409655296',
      items
    };
  }
};
