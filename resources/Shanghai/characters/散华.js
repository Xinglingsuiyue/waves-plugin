import { calcSingleDamage } from '../../../utils/damage/formula.js';
import { getPercentAttr, normalizeRoleDetailData } from '../../../utils/damage/parser.js';
import { mergeBuff } from '../../../utils/damage/buff.js';

const wiki = {
  id: 11300,
  name: '散华',
  title: '散华',
  entryId: '1233492733107564544',
  star: '4',
  skillAttr: '4',
  source: '库街区 Wiki'
};

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

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = value;
  return map;
}, {});

const SANHUA_SKILLS = {
  liberation: {
    name: '焦瞑冻土',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(4.0716, 4.4055, 4.7394, 5.2068, 5.5407, 5.9246, 6.4588, 6.9930, 7.5272, 8.0948)
  },
  skill: {
    name: '朔雪永冻',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(1.8100, 1.9585, 2.1069, 2.3147, 2.4631, 2.6338, 2.8713, 3.1087, 3.3462, 3.5985)
  },
  iceBurstTotal: {
    name: '冰绽合计',
    type: 'skill',
    levelFrom: '共鸣回路',
    levelMap: levelMap(
      0.7000 + 0.4000 + 0.3000,
      0.7574 + 0.4328 + 0.3246,
      0.8148 + 0.4656 + 0.3492,
      0.8952 + 0.5116 + 0.3837,
      0.9526 + 0.5444 + 0.4083,
      1.0186 + 0.5821 + 0.4366,
      1.1105 + 0.6346 + 0.4759,
      1.2023 + 0.6870 + 0.5153,
      1.2941 + 0.7395 + 0.5547,
      1.3917 + 0.7953 + 0.5965
    )
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '冷凝伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function getRoleSelfBuff({ skillName, chainCount }) {
  const buff = {
    attackPercent: 0,
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    source: '散华·自身'
  };

  if (skillName === SANHUA_SKILLS.iceBurstTotal.name) buff.damageBonus += 0.20;
  if (skillName === SANHUA_SKILLS.skill.name || skillName === SANHUA_SKILLS.iceBurstTotal.name) buff.damageBonus += 0.20;
  if (chainCount >= 1 && skillName === SANHUA_SKILLS.skill.name) buff.critRate += 0.15;
  if (chainCount >= 2 && skillName === SANHUA_SKILLS.iceBurstTotal.name) buff.multiplierBonus += 1.20;
  if (chainCount >= 5 && skillName === SANHUA_SKILLS.iceBurstTotal.name) buff.critDamage += 1.00;

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = SANHUA_SKILLS[skillKey];
  const chainCount = getChainUnlockedCount(roleDetailData);
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
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
  const extraCritRate = Number(roleBuff.critRate || 0) + Number(weaponBuff.critRate || 0)
                    + Number(phantomBuff.critRate || 0) + Number(groupBuff.critRate || 0);
  const extraCritDamage = Number(roleBuff.critDamage || 0) + Number(weaponBuff.critDamage || 0)
                       + Number(phantomBuff.critDamage || 0) + Number(groupBuff.critDamage || 0);
  const finalAttack = panel.attack * (1 + (mergedBuff.attackPercent || 0)) + (mergedBuff.flatAttack || 0);

  const result = calcSingleDamage({
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
  });

  return { name: skill.name, ...result };
}

export default {
  name: '散华',
  wiki,
  skills: SANHUA_SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = [
      calcOneSkill({ ...args, skillKey: 'liberation' }),
      calcOneSkill({ ...args, skillKey: 'skill' }),
      calcOneSkill({ ...args, skillKey: 'iceBurstTotal' })
    ];
    return {
      enemyName: enemy?.name || '无妄者',
      source: '库街区 Wiki entryId=1233492733107564544',
      wiki,
      items
    };
  }
};
