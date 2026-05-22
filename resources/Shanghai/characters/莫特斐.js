import { calcSingleDamage } from '../../../utils/damage/formula.js';
import { getPercentAttr, normalizeRoleDetailData } from '../../../utils/damage/parser.js';
import { mergeBuff } from '../../../utils/damage/buff.js';

function getSkillLevel(roleDetailData, typeName) {
  const data = normalizeRoleDetailData(roleDetailData);
  const skillList = data?.skillList || [];
  const target = skillList.find(s => s?.skill?.type === typeName);
  return target?.level || 10;
}

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = value;
  return map;
}, {});

// =============================================================
// 莫特斐
// 数据来源：库街区 Wiki entryId=1240157802556833792
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1240157802556833792",
  "name": "莫特斐",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "46.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2429, 0.2629, 0.2828, 0.3107, 0.3306, 0.3535, 0.3854, 0.4172, 0.4491, 0.483)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4102, 0.444, 0.4776, 0.5246, 0.5584, 0.597, 0.6508, 0.7046, 0.7584, 0.8156)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.5397, 0.584, 0.6283, 0.6902, 0.7345, 0.7854, 0.8562, 0.927, 0.9978, 1.073)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.0612, 1.1484, 1.2355, 1.3572, 1.4444, 1.5446, 1.6835, 1.8229, 1.9623, 2.1101)
  },
  skill5: {
    name: "瞄准",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4914, 0.5317, 0.572, 0.6285, 0.6687, 0.7151, 0.7796, 0.844, 0.9085, 0.977)
  },
  skill6: {
    name: "瞄准完全蓄力",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.84, 0.9089, 0.9778, 1.0742, 1.1431, 1.2223, 1.3325, 1.4427, 1.553, 1.6701)
  },
  skill7: {
    name: "空中攻击第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.1169, 0.1265, 0.1361, 0.1495, 0.1591, 0.1702, 0.1855, 0.2008, 0.2162, 0.2325)
  },
  skill8: {
    name: "空中攻击第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.1169, 0.1265, 0.1361, 0.1495, 0.1591, 0.1702, 0.1855, 0.2008, 0.2162, 0.2325)
  },
  skill9: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.9807, 1.06, 1.1416, 1.2542, 1.3346, 1.4271, 1.5557, 1.6844, 1.8131, 1.9498)
  },
  skill10: {
    name: "技能",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.05, 1.1361, 1.2222, 1.3428, 1.4289, 1.5279, 1.6657, 1.8034, 1.9412, 2.0876)
  },
  skill11: {
    name: "怒火赋格",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.64, 1.7745, 1.909, 2.0973, 2.2318, 2.3864, 2.6016, 2.8167, 3.0319, 3.2605)
  },
  skill12: {
    name: "暴烈终曲技能",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(0.8, 0.8656, 0.9312, 1.0231, 1.0887, 1.1641, 1.2691, 1.374, 1.479, 1.5905)
  },
  skill13: {
    name: "加强音",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(0.16, 0.1732, 0.1863, 0.2047, 0.2178, 0.2329, 0.2539, 0.2748, 0.2958, 0.3181)
  },
  skill14: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(0.85, 0.9197, 0.9894, 1.087, 1.1567, 1.2369, 1.3484, 1.4599, 1.5714, 1.6899)
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  const elementKeys = ['冷凝伤害加成', '热熔伤害加成', '导电伤害加成', '气动伤害加成', '衍射伤害加成', '湮灭伤害加成'];
  let total = elementKeys.reduce((sum, key) => sum + getPercentAttr(attrMap, key), 0);
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const weaponBuff = modules.weapon?.apply ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const phantomBuff = modules.phantom?.apply ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const groupBuff = modules.group?.apply ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const mergedBuff = mergeBuff(weaponBuff, phantomBuff, groupBuff);
  const finalAttack = panel.attack * (1 + (mergedBuff.attackPercent || 0)) + (mergedBuff.flatAttack || 0);
  const result = calcSingleDamage({
    attack: finalAttack,
    skillMultiplier: skill.levelMap[level] || skill.levelMap[10],
    multiplierBonus: mergedBuff.multiplierBonus || 0,
    damageBonus: getPanelDamageBonus(panel.attrMap || {}, skill.type) + (mergedBuff.damageBonus || 0),
    deepen: mergedBuff.deepen || 0,
    critRate: panel.critRate,
    critDamage: panel.critDamage,
    attackerLevel: panel.level || 90,
    enemyLevel: enemy?.level || 90,
    resistance: enemy?.resistance ?? 0.1,
    ignoreDefense: mergedBuff.ignoreDefense || enemy?.ignoreDefense || 0,
    sourceDetail: mergedBuff.sources
  });
  return { name: skill.name, ...result };
}

export default {
  name: "莫特斐",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill12",
      "skill11",
      "skill10"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1240157802556833792', items };
  }
};
