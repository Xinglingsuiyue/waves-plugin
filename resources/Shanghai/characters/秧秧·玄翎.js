import { calcSingleDamage } from '../../../utils/damage/formula.js';
import { getPercentAttr, normalizeRoleDetailData } from '../../../utils/damage/parser.js';
import { mergeBuff } from '../../../utils/damage/buff.js';

function getSkillLevel(roleDetailData, typeName) {
  const data = normalizeRoleDetailData(roleDetailData);
  const skillList = data?.skillList || [];
  const target = skillList.find(s => s?.skill?.type === typeName);
  return target?.level || 10;
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

const WIKI_DETAIL = {"id": "1519669180526559232", "name": "秧秧·玄翎", "orgFullName": "角色组 > 共鸣者", "lastUpdateTime": "2026-07-10", "currentVersion": "16.0"};

const SKILLS = {
  skill1: {
    name: "裁羽寂万音伤害",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(
      "1000.00%",
      "1082.00%",
      "1164.00%",
      "1278.80%",
      "1360.80%",
      "1455.10%",
      "1586.30%",
      "1717.50%",
      "1848.70%",
      "1988.10%"
    )
  },
  skill2: {
    name: "重击·苍剑式伤害",
    type: "heavy",
    levelFrom: "共鸣回路",
    levelMap: levelMap(
      "67.99%+67.99%+90.65%",
      "73.56%+73.56%+98.08%",
      "79.14%+79.14%+105.51%",
      "86.94%+86.94%+115.92%",
      "92.52%+92.52%+123.35%",
      "98.93%+98.93%+131.90%",
      "107.85%+107.85%+143.79%",
      "116.77%+116.77%+155.69%",
      "125.69%+125.69%+167.58%",
      "135.16%+135.16%+180.21%"
    )
  },
  skill3: {
    name: "普攻·湮象风华第三段伤害",
    type: "hack",
    levelFrom: "共鸣回路",
    levelMap: levelMap(
      "12.06%*5+140.68%",
      "13.05%*5+152.22%",
      "14.04%*5+163.76%",
      "15.43%*5+179.91%",
      "16.41%*5+191.44%",
      "17.55%*5+204.71%",
      "19.13%*5+223.16%",
      "20.71%*5+241.62%",
      "22.30%*5+260.08%",
      "23.98%*5+279.69%"
    )
  },
  skill4: {
    name: "闪避反击·湮象风华第三段伤害",
    type: "hack",
    levelFrom: "共鸣回路",
    levelMap: levelMap(
      "12.06%*5+140.68%",
      "13.05%*5+152.22%",
      "14.04%*5+163.76%",
      "15.43%*5+179.91%",
      "16.41%*5+191.44%",
      "17.55%*5+204.71%",
      "19.13%*5+223.16%",
      "20.71%*5+241.62%",
      "22.30%*5+260.08%",
      "23.98%*5+279.69%"
    )
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  const elementKeys = ['冷凝伤害加成', '热熔伤害加成', '导电伤害加成', '气动伤害加成', '衍射伤害加成', '湮灭伤害加成'];
  let total = elementKeys.reduce((sum, key) => sum + getPercentAttr(attrMap, key), 0);
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  return total;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options })
    : {};

  const mergedBuff = mergeBuff(weaponBuff, phantomBuff, groupBuff);
  const extraCritRate = Number(weaponBuff.critRate || 0) + Number(phantomBuff.critRate || 0) + Number(groupBuff.critRate || 0);
  const extraCritDamage = Number(weaponBuff.critDamage || 0) + Number(phantomBuff.critDamage || 0) + Number(groupBuff.critDamage || 0);
  const finalAttack = panel.attack * (1 + (mergedBuff.attackPercent || 0)) + (mergedBuff.flatAttack || 0);

  return {
    name: skill.name,
    ...calcSingleDamage({
      attack: finalAttack,
      skillMultiplier: skill.levelMap[level] || skill.levelMap[10],
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

function pickTopItems(items, count = 4) {
  return items
    .filter(Boolean)
    .sort((a, b) => (b?.detail?.skillMultiplier || 0) - (a?.detail?.skillMultiplier || 0))
    .slice(0, count);
}

export default {
  name: "秧秧·玄翎",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules = {}, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = pickTopItems(["skill1", "skill2", "skill3", "skill4"].map(skillKey => calcOneSkill({ ...args, skillKey })));
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1519669180526559232', items };
  }
};
