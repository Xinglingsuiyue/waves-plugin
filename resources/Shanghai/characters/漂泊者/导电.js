import { calcSingleDamage } from '../../../../utils/damage/formula.js';
import { getPercentAttr, normalizeRoleDetailData } from '../../../../utils/damage/parser.js';
import { mergeBuff } from '../../../../utils/damage/buff.js';

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

const WIKI_DETAIL = {"id": "1524702668029300736", "name": "漂泊者-导电", "orgFullName": "角色组 > 共鸣者", "lastUpdateTime": "2026-07-10", "currentVersion": "12.0"};

const SKILLS = {
  skill1: {
    name: "超负荷伤害",
    type: "hack",
    levelFrom: "共鸣回路",
    levelMap: levelMap(
      "40.60%*7+213.15%+213.15%",
      "43.93%*7+230.63%+230.63%",
      "47.26%*7+248.11%+248.11%",
      "51.92%*7+272.58%+272.58%",
      "55.25%*7+290.06%+290.06%",
      "59.08%*7+310.16%+310.16%",
      "64.41%*7+338.12%+338.12%",
      "69.74%*7+366.09%+366.09%",
      "75.06%*7+394.06%+394.06%",
      "80.72%*7+423.77%+423.77%"
    )
  },
  skill2: {
    name: "技能伤害",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(
      "600.00%",
      "649.20%",
      "698.40%",
      "767.28%",
      "816.48%",
      "873.06%",
      "951.78%",
      "1030.50%",
      "1109.22%",
      "1192.86%"
    )
  },
  skill3: {
    name: "千声翻涌·剑止万律伤害",
    type: "hack",
    levelFrom: "共鸣回路",
    levelMap: levelMap(
      "23.68%*5+118.37%",
      "25.62%*5+128.08%",
      "27.56%*5+137.79%",
      "30.28%*5+151.37%",
      "32.22%*5+161.08%",
      "34.45%*5+172.24%",
      "37.56%*5+187.77%",
      "40.66%*5+203.30%",
      "43.77%*5+218.83%",
      "47.07%*5+235.33%"
    )
  },
  skill4: {
    name: "千声翻涌·气动下落攻击伤害",
    type: "hack",
    levelFrom: "共鸣回路",
    levelMap: levelMap(
      "142.09%",
      "153.74%",
      "165.39%",
      "181.70%",
      "193.35%",
      "206.75%",
      "225.39%",
      "244.03%",
      "262.67%",
      "282.48%"
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
  name: "漂泊者-女-导电",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules = {}, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = pickTopItems(["skill1", "skill2", "skill3", "skill4"].map(skillKey => calcOneSkill({ ...args, skillKey })));
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1524702668029300736', items };
  }
};
