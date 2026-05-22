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
// 奥古斯塔
// 数据来源：库街区 Wiki entryId=1400451112145264640
// 自动从「角色养成 / 技能介绍」倍率表生成，展示倍率最高的 3 个代表输出项。
// =============================================================
const WIKI_DETAIL = {
  "id": "1400451112145264640",
  "name": "奥古斯塔",
  "orgFullName": "角色组 > 共鸣者",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "27.0"
};

const SKILLS = {
  skill1: {
    name: "第一段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.289, 0.3127, 0.3364, 0.3696, 0.3933, 0.4206, 0.4585, 0.4964, 0.5343, 0.5746)
  },
  skill2: {
    name: "第二段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.674, 0.7294, 0.7846, 0.862, 0.9172, 0.9808, 1.0692, 1.1576, 1.2462, 1.34)
  },
  skill3: {
    name: "第三段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.99, 1.0713, 1.1526, 1.2663, 1.3473, 1.4406, 1.5705, 1.7004, 1.8303, 1.9683)
  },
  skill4: {
    name: "第四段",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.9753, 1.0554, 1.1352, 1.2471, 1.3272, 1.419, 1.5471, 1.6749, 1.803, 1.9389)
  },
  skill5: {
    name: "重击·鸣铁",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7002, 0.7575, 0.8148, 0.8952, 0.9528, 1.0188, 1.1106, 1.2024, 1.2942, 1.3917)
  },
  skill6: {
    name: "空中攻击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6, 0.6492, 0.6984, 0.7674, 0.8166, 0.8732, 0.9518, 1.0306, 1.1094, 1.193)
  },
  skill7: {
    name: "闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.674, 0.7294, 0.7846, 0.862, 0.9172, 0.9808, 1.0692, 1.1576, 1.2462, 1.34)
  },
  skill8: {
    name: "空中闪避反击",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.6, 0.6492, 0.6984, 0.7674, 0.8166, 0.8732, 0.9518, 1.0306, 1.1094, 1.193)
  },
  skill9: {
    name: "重击·烁雷·后撤",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.27, 0.2922, 0.3143, 0.3453, 0.3675, 0.3929, 0.4284, 0.4638, 0.4992, 0.5368)
  },
  skill10: {
    name: "重击·烁雷·旋切",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(2.1384, 2.3139, 2.4891, 2.7348, 2.91, 3.1116, 3.3924, 3.6729, 3.9534, 4.2516)
  },
  skill11: {
    name: "重击·烁雷·升拳",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(1.8, 1.9476, 2.0952, 2.302, 2.4496, 2.6192, 2.8554, 3.0916, 3.3278, 3.5786)
  },
  skill12: {
    name: "闪避反击·重击·鸣铁",
    type: "heavy",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.7002, 0.7575, 0.8148, 0.8952, 0.9528, 1.0188, 1.1106, 1.2024, 1.2942, 1.3917)
  },
  skill13: {
    name: "闪避反击·烁雷·后撤",
    type: "normal",
    levelFrom: "常态攻击",
    levelMap: levelMap(0.27, 0.2922, 0.3143, 0.3453, 0.3675, 0.3929, 0.4284, 0.4638, 0.4992, 0.5368)
  },
  skill14: {
    name: "技能",
    type: "skill",
    levelFrom: "共鸣技能",
    levelMap: levelMap(3.3, 3.5706, 3.8412, 4.2201, 4.4907, 4.8021, 5.235, 5.6679, 6.1008, 6.561)
  },
  skill15: {
    name: "共鸣技能·不败恒阳·迅击",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.4, 1.5148, 1.6296, 1.7904, 1.9052, 2.0372, 2.221, 2.4046, 2.5882, 2.7834)
  },
  skill16: {
    name: "共鸣技能·不败恒阳·跃空",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.4, 1.5149, 1.6297, 1.7905, 1.9053, 2.0374, 2.2209, 2.4046, 2.5884, 2.7835)
  },
  skill17: {
    name: "共鸣技能·不败恒阳·落袭",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(4.3551, 4.7123, 5.0693, 5.5693, 5.9265, 6.3371, 6.9086, 7.4798, 8.0512, 8.6584)
  },
  skill18: {
    name: "空中闪避反击·不败恒阳·迅击",
    type: "skill",
    levelFrom: "共鸣回路",
    levelMap: levelMap(1.4, 1.5148, 1.6296, 1.7904, 1.9052, 2.0372, 2.221, 2.4046, 2.5882, 2.7834)
  },
  skill19: {
    name: "共鸣解放·誓锋不殒",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(5.53, 5.9841, 6.4375, 7.0723, 7.5257, 8.0474, 8.7725, 9.4983, 10.2234, 10.9948)
  },
  skill20: {
    name: "赫日威临·烈阳",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(0.6, 0.6492, 0.6984, 0.7673, 0.8165, 0.8731, 0.9518, 1.0305, 1.1093, 1.1929)
  },
  skill21: {
    name: "赫日威临·不朽者之肃",
    type: "liberation",
    levelFrom: "共鸣解放",
    levelMap: levelMap(6, 6.4924, 6.9848, 7.6732, 8.1656, 8.7312, 9.518, 10.3058, 11.0927, 11.9293)
  },
  skill22: {
    name: "技能",
    type: "intro",
    levelFrom: "变奏技能",
    levelMap: levelMap(1, 1.082, 1.164, 1.2788, 1.3608, 1.4552, 1.5864, 1.7176, 1.8488, 1.9882)
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
  name: "奥古斯塔",
  wiki: WIKI_DETAIL,
  skills: SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = [
      "skill19",
      "skill21",
      "skill17"
    ];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1400451112145264640', items };
  }
};
