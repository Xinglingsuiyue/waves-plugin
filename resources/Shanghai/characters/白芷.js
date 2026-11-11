import { calcSingleDamage, calcSingleHeal } from '../../../utils/damage/formula.js';
import { getPercentAttr, normalizeRoleDetailData, calcFinalAttack, calcFinalHp } from '../../../utils/damage/parser.js';
import { mergeBuff } from '../../../utils/damage/buff.js';

function getChainUnlockedCount(roleDetailData) {
  const data = normalizeRoleDetailData(roleDetailData);
  const chainList = data?.chainList || [];
  return chainList.filter(c => c?.unlocked).length;
}

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

const WIKI_DETAIL = {
  id: '1233429754977792000',
  name: '白芷',
  lastUpdateTime: '2025-12-29',
  currentVersion: '65.0'
};

const BAIZHI_SKILLS = {
  normal1: { name: '第一段', type: 'normal', levelFrom: '常态攻击', levelMap: levelMap(0.3294, 0.3564, 0.3834, 0.4212, 0.4482, 0.4793, 0.5225, 0.5657, 0.6089, 0.6548) },
  normal2: { name: '第二段', type: 'normal', levelFrom: '常态攻击', levelMap: levelMap(0.3952, 0.4276, 0.4601, 0.5054, 0.5378, 0.5751, 0.6269, 0.6788, 0.7306, 0.7857) },
  normal3: { name: '第三段', type: 'normal', levelFrom: '常态攻击', levelMap: levelMap(0.4613, 0.4991, 0.5369, 0.5901, 0.6279, 0.6713, 0.7315, 0.7924, 0.8526, 0.917) },
  normal4: { name: '第四段', type: 'normal', levelFrom: '常态攻击', levelMap: levelMap(0.3952, 0.4276, 0.4601, 0.5054, 0.5378, 0.5751, 0.6269, 0.6788, 0.7306, 0.7857) },
  heavy: { name: '重击', type: 'heavy', levelFrom: '常态攻击', levelMap: levelMap(0.2458, 0.266, 0.2861, 0.3143, 0.3345, 0.3577, 0.3899, 0.4221, 0.4544, 0.4886) },
  air: { name: '空中攻击', type: 'normal', levelFrom: '常态攻击', levelMap: levelMap(0.3968, 0.4294, 0.4619, 0.5075, 0.54, 0.5774, 0.6295, 0.6816, 0.7336, 0.7889) },
  dodge: { name: '闪避反击', type: 'normal', levelFrom: '常态攻击', levelMap: levelMap(0.8986, 0.9723, 1.046, 1.1491, 1.2228, 1.3075, 1.4254, 1.5433, 1.6612, 1.7865) },
  skillDamage: { name: '应急预案伤害', type: 'skill', base: 'hp', levelFrom: '共鸣技能', levelMap: levelMap(0.0802, 0.0868, 0.0934, 0.1026, 0.1091, 0.1167, 0.1272, 0.1377, 0.1482, 0.1594) },
  skillHeal: { name: '应急预案治疗量', type: 'skill', base: 'hp', heal: true, levelFrom: '共鸣技能', levelMap: levelMap(0.029, 0.0314, 0.0337, 0.0371, 0.0394, 0.0422, 0.046, 0.0498, 0.0536, 0.0576), flatMap: levelMap(575, 622, 669, 735, 782, 836, 911, 987, 1062, 1144) },
  mindHeal: { name: '念意治疗量', type: 'skill', base: 'hp', heal: true, levelFrom: '共鸣回路', levelMap: levelMap(0.0016, 0.0017, 0.0018, 0.002, 0.0021, 0.0023, 0.0025, 0.0027, 0.0029, 0.0031), flatMap: levelMap(32, 34, 37, 40, 43, 46, 50, 54, 58, 63) },
  echoDamage: { name: '频隙回响伤害', type: 'liberation', base: 'hp', levelFrom: '共鸣解放', levelMap: levelMap(0.0205, 0.0222, 0.0239, 0.0262, 0.0279, 0.0298, 0.0325, 0.0352, 0.0379, 0.0407) },
  echoHeal: { name: '频隙回响治疗量', type: 'liberation', base: 'hp', heal: true, levelFrom: '共鸣解放', levelMap: levelMap(0.0142, 0.0153, 0.0165, 0.0181, 0.0193, 0.0206, 0.0225, 0.0243, 0.0262, 0.0282), flatMap: levelMap(349, 377, 406, 446, 475, 507, 553, 599, 644, 694) },
  instantHeal: { name: '刹那合弥治疗量', type: 'liberation', base: 'hp', heal: true, levelFrom: '共鸣解放', levelMap: levelMap(0.0126, 0.0136, 0.0147, 0.0161, 0.0171, 0.0183, 0.02, 0.0216, 0.0233, 0.0251), flatMap: levelMap(310, 335, 361, 396, 421, 451, 491, 532, 573, 617) },
  introDamage: { name: '覆雪流盈伤害', type: 'intro', levelFrom: '变奏技能', levelMap: levelMap(0.4, 0.4328, 0.4656, 0.5116, 0.5444, 0.5821, 0.6346, 0.687, 0.7395, 0.7953) },
  introHeal: { name: '覆雪流盈治疗量', type: 'intro', base: 'hp', heal: true, levelFrom: '变奏技能', levelMap: levelMap(0.0038, 0.0041, 0.0044, 0.0048, 0.0051, 0.0055, 0.006, 0.0065, 0.007, 0.0075), flatMap: levelMap(75, 81, 87, 96, 102, 109, 119, 129, 139, 150) }
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

function getPanelHealingBonus(attrMap) {
  return getPercentAttr(attrMap, '治疗效果加成') + getPercentAttr(attrMap, '治疗加成');
}

function getFinalAttack(panel, mergedBuff, roleDetailData) {
  return calcFinalAttack(panel, mergedBuff, roleDetailData);
}

function getFinalHp(panel, mergedBuff, roleDetailData) {
  return calcFinalHp(panel, mergedBuff, roleDetailData);
}

// 白芷自身增益（固有 + 共鸣链）：
//   固有「泛音区间」拾取天籁的角色攻击提升 15%，持续 20 秒；
//   S2「沉默的冰原」施放应急预案时若有 4 点念意，冷凝伤害加成 +15%、治疗效果加成 +15%，持续 12 秒；
//   S3「真理的崇奉」施放覆雪流盈时生命上限 +12%，持续 10 秒；
//   S4「被追溯的本源」频隙回响数量 +2（4→6，等效 ×1.5）、治疗倍率 +20%，
//      并额外造成生命上限 1.2% 的冷凝伤害；
//   S6「闻道者的觉悟」拾取天籁时队伍冷凝伤害加成 +12%，持续 12 秒。
function getRoleSelfBuff({ skillKey, chainCount }) {
  const buff = {
    attackPercent: 0,
    hpPercent: 0,
    damageBonus: 0,
    healingBonus: 0,
    critRate: 0,
    critDamage: 0,
    deepen: 0,
    multiplierBonus: 0,
    ignoreDefense: 0,
    source: '白芷·自身'
  };

  // 固有「泛音区间」：拾取天籁的角色攻击提升 15%。
  buff.attackPercent += 0.15;

  // S2：冷凝伤害加成与治疗效果加成各提升 15%。
  if (chainCount >= 2) {
    buff.damageBonus += 0.15;
    buff.healingBonus += 0.15;
  }

  // S3：生命上限提升 12%。
  if (chainCount >= 3) buff.hpPercent += 0.12;

  // S4：频隙回响数量 +2（4→6），治疗倍率 +20%。
  if (chainCount >= 4) {
    if (skillKey === 'echoDamage') buff.multiplierBonus += 0.50;
    if (skillKey === 'echoHeal') buff.multiplierBonus += 0.20;
  }

  // S6：队伍冷凝伤害加成提升 12%。
  if (chainCount >= 6) buff.damageBonus += 0.12;

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = BAIZHI_SKILLS[skillKey];
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const chainCount = getChainUnlockedCount(roleDetailData);
  const roleBuff = getRoleSelfBuff({ skillKey, chainCount });
  const weaponBuff = modules.weapon?.apply ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const phantomBuff = modules.phantom?.apply ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const groupBuff = modules.group?.apply ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType: skill.type, skillName: skill.name, options }) : {};
  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);
  const base = skill.base === 'hp' ? getFinalHp(panel, mergedBuff, roleDetailData) : getFinalAttack(panel, mergedBuff, roleDetailData);
  // S4：频隙回响额外造成生命上限 1.2% 的冷凝伤害（6 段）。
  const extraMultiplier = chainCount >= 4 && skillKey === 'echoDamage' ? 0.012 * 1.5 : 0;
  const skillMultiplier = (skill.levelMap[level] || skill.levelMap[10]) + extraMultiplier;
  const flatHeal = skill.flatMap?.[level] || skill.flatMap?.[10] || 0;

  const result = skill.heal
    ? calcSingleHeal({
        base,
        skillMultiplier,
        flatHeal,
        multiplierBonus: mergedBuff.multiplierBonus || 0,
        healingBonus: getPanelHealingBonus(panel.attrMap || {}) + (mergedBuff.healingBonus || 0),
        deepen: mergedBuff.deepen || 0,
        sourceDetail: mergedBuff.sources
      })
    : calcSingleDamage({
        attack: base,
        skillMultiplier,
        multiplierBonus: mergedBuff.multiplierBonus || 0,
        damageBonus: getPanelDamageBonus(panel.attrMap || {}, skill.type) + (mergedBuff.damageBonus || 0),
        deepen: mergedBuff.deepen || 0,
        critRate: panel.critRate + Number(mergedBuff.critRate || 0),
        critDamage: panel.critDamage + Number(mergedBuff.critDamage || 0),
        attackerLevel: panel.level || 90,
        enemyLevel: enemy?.level || 90,
        resistance: enemy?.resistance ?? 0.1,
        ignoreDefense: Math.max(Number(mergedBuff.ignoreDefense || 0), Number(enemy?.ignoreDefense || 0)),
        sourceDetail: mergedBuff.sources
      });

  return { name: skill.name, ...result };
}

export default {
  name: '白芷',
  wiki: WIKI_DETAIL,
  skills: BAIZHI_SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const displayKeys = ['skillHeal', 'instantHeal', 'echoDamage'];
    const items = displayKeys.map(skillKey => calcOneSkill({ ...args, skillKey })).filter(Boolean);
    return { enemyName: enemy?.name || '无妄者', source: '库街区 Wiki entryId=1233429754977792000', items };
  }
};
