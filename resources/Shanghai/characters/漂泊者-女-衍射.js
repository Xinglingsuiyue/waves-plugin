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
// 漂泊者-女-衍射
// 数据来源：库街区 Wiki entryId=1242294789908504576
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1242294789908504576",
  "name": "漂泊者-女-衍射",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "36.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.2975, 0.3219, 0.3463, 0.3805, 0.4049, 0.4329, 0.472, 0.511, 0.55, 0.5915)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.3825, 0.4139, 0.4453, 0.4892, 0.5206, 0.5566, 0.6068, 0.657, 0.7072, 0.7605)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.3825, 0.414, 0.4455, 0.4895, 0.521, 0.557, 0.607, 0.657, 0.7075, 0.7605)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6545, 0.7082, 0.7619, 0.837, 0.8907, 0.9524, 1.0383, 1.1242, 1.21, 1.3013)
  },
  skill5: {
    name: "极限闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.9825, 1.0631, 1.1437, 1.2565, 1.337, 1.4297, 1.5586, 1.6875, 1.8164, 1.9534)
  },
  skill6: {
    name: "重击",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.4845, 0.5245, 0.564, 0.62, 0.6595, 0.705, 0.769, 0.8325, 0.896, 0.9635)
  },
  skill7: {
    name: "鸣奏",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.3825, 0.4139, 0.4453, 0.4892, 0.5206, 0.5566, 0.6068, 0.657, 0.7072, 0.7605)
  },
  skill8: {
    name: "余音",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6375, 0.6898, 0.7421, 0.8153, 0.8676, 0.9277, 1.0113, 1.095, 1.1786, 1.2675)
  },
  skill9: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.527, 0.5703, 0.6135, 0.674, 0.7172, 0.7669, 0.836, 0.9052, 0.9743, 1.0478)
  },
  skill10: {
    name: "技能",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(1.188, 1.2855, 1.3829, 1.5193, 1.6167, 1.7287, 1.8846, 2.0404, 2.1963, 2.3619)
  },
  skill11: {
    name: "浮声千斩·旋音",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.2986, 1.405, 1.5116, 1.6606, 1.767, 1.8896, 2.06, 2.2302, 2.4006, 2.5816)
  },
  skill12: {
    name: "浮声千斩·旋音飞轮",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.2, 0.2164, 0.2328, 0.2558, 0.2722, 0.2911, 0.3173, 0.3435, 0.3698, 0.3977)
  },
  skill13: {
    name: "浮声千斩·回声一段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953)
  },
  skill14: {
    name: "浮声千斩·回声二段",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(0.8, 0.8656, 0.9312, 1.0231, 1.0887, 1.1641, 1.2691, 1.374, 1.479, 1.5905)
  },
  skill15: {
    name: "技能",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(4.4, 4.7608, 5.1216, 5.6268, 5.9876, 6.4025, 6.9798, 7.557, 8.1343, 8.7477)
  },
  skill16: {
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
  name: "漂泊者-女-衍射",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill15",
      "skill10",
      "skill11"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1242294789908504576', items };
  }
};
