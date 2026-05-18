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
// 弗洛洛（5★ 湮灭 音感仪 共鸣技能主 C）
// 数据来源：库街区 wiki entryId=1386685588185022464。
//
// 计算范围（默认 3 个核心输出）：
//   1) 谱曲终末（共鸣技能伤害，主爆发；吃 S2 +75% 与 14 层余响）
//   2) 永不消逝的梦呓（共鸣回路强化技能，吃 S1 +80%）
//   3) 亡与死的乐章（共鸣回路强化技能，吃 S1 +80%）
//
// 关键机制：
//   - 谱曲终末、亡与死的乐章、永不消逝的梦呓均为「共鸣技能伤害」。
//   - S1「钥匙」：亡与死的乐章 / 永不消逝的梦呓 倍率 +80%。
//   - S2「绳索」：谱曲终末倍率 +75%，余响对终末倍率增加效果 +75%，
//     施放谱曲终末时获得 14 层余响。
//   - S3「匕首」：声骸技能伤害加深 +80%（本模块不计算声骸伤害项）。
//   - S4「火炬」：施放声骸技能时，全队全属性 +20%/30s。
//   - S5：生存型，不影响伤害。
//   - S6「深夜」：强化攻击·赫卡忒 +24%；指挥状态时若弗洛洛为登场角色，
//     湮灭伤害加成 +60%。
// =============================================================
const PHROLOVA_SKILLS = {
  // 谱曲终末伤害：16.61%*2 + 6.23%*8 + 249.03% → 33.01%*2 + 12.38%*8 + 495.10% (10级)
  // 「每层余响增加倍率」10 级 = 82.55%；本模块默认 S2 后获得 14 层余响。
  finale: {
    name: '谱曲终末',
    type: 'skill',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.1661 * 2 + 0.0623 * 8 + 2.4903,
      2: 0.1797 * 2 + 0.0674 * 8 + 2.6946,
      3: 0.1933 * 2 + 0.0725 * 8 + 2.8988,
      4: 0.2124 * 2 + 0.0797 * 8 + 3.1846,
      5: 0.2260 * 2 + 0.0848 * 8 + 3.3889,
      6: 0.2416 * 2 + 0.0906 * 8 + 3.6237,
      7: 0.2634 * 2 + 0.0988 * 8 + 3.9504,
      8: 0.2852 * 2 + 0.1070 * 8 + 4.2771,
      9: 0.3070 * 2 + 0.1151 * 8 + 4.6039,
      10: 0.3301 * 2 + 0.1238 * 8 + 4.9510
    },
    echoStackMap: {
      1: 0.4153, 2: 0.4490, 3: 0.4836, 4: 0.5313,
      5: 0.5650, 6: 0.6038, 7: 0.6558, 8: 0.7132,
      9: 0.7675, 10: 0.8255
    }
  },
  // 永不消逝的梦呓伤害：11.67%*4 + 23.34% + 163.38% → 23.21%*4 + 46.41% + 324.82% (10级)
  endlessDream: {
    name: '永不消逝的梦呓',
    type: 'skill',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.1167 * 4 + 0.2334 + 1.6338,
      2: 0.1263 * 4 + 0.2526 + 1.7678,
      3: 0.1359 * 4 + 0.2717 + 1.9018,
      4: 0.1493 * 4 + 0.2985 + 2.0894,
      5: 0.1589 * 4 + 0.3177 + 2.2233,
      6: 0.1699 * 4 + 0.3397 + 2.3774,
      7: 0.1852 * 4 + 0.3703 + 2.5917,
      8: 0.2005 * 4 + 0.4009 + 2.8061,
      9: 0.2158 * 4 + 0.4315 + 3.0205,
      10: 0.2321 * 4 + 0.4641 + 3.2482
    }
  },
  // 亡与死的乐章伤害：19.05%*4 + 59.27%*3 → 37.88%*4 + 117.83%*3 (10级)
  deathMovement: {
    name: '亡与死的乐章',
    type: 'skill',
    levelFrom: '共鸣回路',
    levelMap: {
      1: 0.1905 * 4 + 0.5927 * 3,
      2: 0.2062 * 4 + 0.6413 * 3,
      3: 0.2218 * 4 + 0.6899 * 3,
      4: 0.2437 * 4 + 0.7580 * 3,
      5: 0.2593 * 4 + 0.8066 * 3,
      6: 0.2772 * 4 + 0.8624 * 3,
      7: 0.3022 * 4 + 0.9402 * 3,
      8: 0.3272 * 4 + 1.0180 * 3,
      9: 0.3522 * 4 + 1.0957 * 3,
      10: 0.3788 * 4 + 1.1783 * 3
    }
  }
};

function getPanelDamageBonus(attrMap) {
  // 弗洛洛主输出技能均为湮灭属性 + 共鸣技能判定
  return getPercentAttr(attrMap, '湮灭伤害加成')
       + getPercentAttr(attrMap, '共鸣技能伤害加成');
}

function getRoleSelfBuff({ skillName, chainCount }) {
  const buff = {
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    source: '弗洛洛·自身'
  };

  // S1：亡与死的乐章/永不消逝的梦呓 倍率 +80%
  if (chainCount >= 1 && (skillName === '亡与死的乐章' || skillName === '永不消逝的梦呓')) {
    buff.multiplierBonus += 0.80;
  }

  // S2：谱曲终末倍率 +75%
  if (chainCount >= 2 && skillName === '谱曲终末') {
    buff.multiplierBonus += 0.75;
  }

  // S4：施放声骸技能时全队全属性 +20%，默认弗洛洛输出主轴中已触发
  if (chainCount >= 4) {
    buff.damageBonus += 0.20;
  }

  // S6：指挥状态弗洛洛为登场角色，湮灭伤害加成 +60%
  if (chainCount >= 6) {
    buff.damageBonus += 0.60;
  }

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const chainCount = getChainUnlockedCount(roleDetailData);
  const skill = PHROLOVA_SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);

  // 基础倍率（10 级表）
  let multiplier = skill.levelMap[level] || skill.levelMap[10];

  // 谱曲终末：默认 14 层余响（S2 后）；每层增加倍率（10级=82.55%）
  if (skillKey === 'finale') {
    const echoStacks = Math.max(0, Math.min(14, Number(options?.echoStacks ?? 14)));
    const perStack = skill.echoStackMap[level] || skill.echoStackMap[10];
    let perStackBonus = perStack;
    // S2 同时让"余响对终末倍率增加效果 +75%"
    if (chainCount >= 2) {
      perStackBonus *= (1 + 0.75);
    }
    multiplier += perStackBonus * echoStacks;
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
  const attackPercent = mergedBuff.attackPercent || 0;
  const flatAttack = mergedBuff.flatAttack || 0;
  const finalAttack = panel.attack * (1 + attackPercent) + flatAttack;

  const attrMap = panel.attrMap || {};
  const panelBonus = getPanelDamageBonus(attrMap);

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
  name: '弗洛洛',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = ['finale', 'endlessDream', 'deathMovement'].map(k =>
      calcOneSkill({ ...args, skillKey: k })
    );
    return { enemyName: enemy?.name || '无妄者', items };
  }
};
