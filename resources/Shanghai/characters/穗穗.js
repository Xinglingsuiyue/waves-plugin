import { calcSingleDamage, calcSingleHeal } from '../../../utils/damage/formula.js';
import { getPercentAttr, normalizeRoleDetailData } from '../../../utils/damage/parser.js';
import { mergeBuff } from '../../../utils/damage/buff.js';

function getSkillLevel(roleDetailData, typeName) {
  const data = normalizeRoleDetailData(roleDetailData);
  const skillList = data?.skillList || [];
  const target = skillList.find(item => item?.skill?.type === typeName);
  return target?.level || 10;
}

function getChainUnlockedCount(roleDetailData) {
  const data = normalizeRoleDetailData(roleDetailData);
  const chainList = data?.chainList || [];
  return chainList.filter(chain => chain?.unlocked).length;
}

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = value;
  return map;
}, {});

const WIKI_DETAIL = {
  id: '1519669262123954176',
  name: '穗穗',
  orgFullName: '角色组 > 共鸣者',
  lastUpdateTime: '2026-07-30',
  currentVersion: '15.0'
};

const SUISUI_SKILLS = {
  wake: {
    key: 'wake',
    name: '共鸣技能·醒春潮伤害',
    kind: 'damage',
    type: 'skill',
    base: 'hp',
    levelFrom: '共鸣技能',
    levelMap: levelMap(0.1440, 0.1559, 0.1677, 0.1842, 0.1960, 0.2096, 0.2285, 0.2474, 0.2663, 0.2863)
  },
  intro: {
    key: 'intro',
    name: '变奏技能·泠泠漱玉声伤害',
    kind: 'damage',
    type: 'intro',
    base: 'hp',
    levelFrom: '变奏技能',
    levelMap: levelMap(0.1440, 0.1559, 0.1677, 0.1842, 0.1960, 0.2096, 0.2285, 0.2474, 0.2663, 0.2863)
  },
  heavyRain: {
    key: 'heavyRain',
    name: '重击·濯雨时伤害',
    kind: 'damage',
    type: 'heavy',
    base: 'attack',
    levelFrom: '共鸣回路',
    levelMap: levelMap(1.20, 1.2992, 1.3984, 1.5353, 1.6335, 1.7471, 1.9038, 2.0615, 2.2193, 2.3859)
  },
  rainHeal: {
    key: 'rainHeal',
    name: '共鸣技能·润物治疗量',
    kind: 'heal',
    type: 'heal',
    base: 'hp',
    levelFrom: '共鸣技能',
    levelMap: levelMap(0.0162, 0.0169, 0.0175, 0.0185, 0.0198, 0.0211, 0.0236, 0.0263, 0.0293, 0.0342),
    flatMap: levelMap(330, 369, 412, 462, 521, 577, 587, 600, 610, 627)
  },
  danceHeal: {
    key: 'danceHeal',
    name: '共鸣解放·每次翾舞治疗量',
    kind: 'heal',
    type: 'heal',
    base: 'hp',
    levelFrom: '共鸣解放',
    levelMap: levelMap(0.0271, 0.0282, 0.0293, 0.0309, 0.0331, 0.0353, 0.0393, 0.0439, 0.0488, 0.0570),
    flatMap: levelMap(550, 616, 687, 770, 869, 962, 979, 1001, 1017, 1045)
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '冷凝伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function getPanelHealingBonus(attrMap) {
  return getPercentAttr(attrMap, '治疗效果加成') + getPercentAttr(attrMap, '治疗加成');
}

function getRoleSelfBuff({ skill, chainCount, options }) {
  const buff = {
    attackPercent: 0,
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    healingBonus: 0,
    critRate: 0,
    critDamage: 0,
    source: '穗穗·自身'
  };

  const isBurst = skill.key === 'wake' || skill.key === 'intro';
  if (isBurst && (options?.suisuiBurstPassiveActive ?? true)) {
    buff.critRate += 0.80;
    buff.damageBonus += 2.40;
  }
  if (chainCount >= 2 && skill.kind === 'damage' && (options?.suisuiC2CritDamageActive ?? true)) {
    buff.critDamage += 0.50;
  }
  if (chainCount >= 4 && skill.key === 'rainHeal') {
    buff.healingBonus += 0.50;
  }
  if (chainCount >= 5 && skill.key === 'heavyRain') {
    buff.multiplierBonus += 1.00;
  }
  if (chainCount >= 6 && isBurst) {
    buff.critDamage += 5.00;
  }

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skill }) {
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const chainCount = getChainUnlockedCount(roleDetailData);
  const roleBuff = getRoleSelfBuff({ skill, chainCount, options });
  const applyArgs = {
    roleDetailData,
    panel,
    equipment,
    enemy,
    skillType: skill.kind === 'heal' ? 'heal' : skill.type,
    skillName: skill.name,
    options
  };
  const weaponBuff = modules.weapon?.apply ? modules.weapon.apply(applyArgs) : {};
  const phantomBuff = modules.phantom?.apply ? modules.phantom.apply(applyArgs) : {};
  const groupBuff = modules.group?.apply ? modules.group.apply(applyArgs) : {};
  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);
  const finalHp = (panel.hp || 0) * (1 + (mergedBuff.hpPercent || 0)) + (mergedBuff.flatHp || 0);
  const finalAttack = (panel.attack || 0) * (1 + (mergedBuff.attackPercent || 0)) + (mergedBuff.flatAttack || 0);
  const base = skill.base === 'hp' ? finalHp : finalAttack;
  const skillMultiplier = skill.levelMap[level] ?? skill.levelMap[10];

  if (skill.kind === 'heal') {
    const healingBonus = getPanelHealingBonus(panel.attrMap || {})
      + Number(roleBuff.healingBonus || 0)
      + Number(weaponBuff.healingBonus || 0)
      + Number(phantomBuff.healingBonus || 0)
      + Number(groupBuff.healingBonus || 0);
    return {
      name: skill.name,
      ...calcSingleHeal({
        base,
        skillMultiplier,
        multiplierBonus: mergedBuff.multiplierBonus || 0,
        flatHeal: skill.flatMap?.[level] ?? skill.flatMap?.[10] ?? 0,
        healingBonus,
        deepen: mergedBuff.deepen || 0,
        sourceDetail: mergedBuff.sources
      })
    };
  }

  const extraCritRate = Number(roleBuff.critRate || 0) + Number(weaponBuff.critRate || 0)
    + Number(phantomBuff.critRate || 0) + Number(groupBuff.critRate || 0);
  const extraCritDamage = Number(roleBuff.critDamage || 0) + Number(weaponBuff.critDamage || 0)
    + Number(phantomBuff.critDamage || 0) + Number(groupBuff.critDamage || 0);
  return {
    name: skill.name,
    ...calcSingleDamage({
      attack: base,
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
  name: '穗穗',
  wiki: WIKI_DETAIL,
  skills: SUISUI_SKILLS,

  async calc({ roleDetailData, panel, equipment, enemy, modules = {}, options = {} }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const heals = [SUISUI_SKILLS.rainHeal, SUISUI_SKILLS.danceHeal]
      .map(skill => calcOneSkill({ ...args, skill }));
    const damages = [SUISUI_SKILLS.wake, SUISUI_SKILLS.intro, SUISUI_SKILLS.heavyRain]
      .map(skill => calcOneSkill({ ...args, skill }))
      .sort((left, right) => right.expected - left.expected)
      .slice(0, 2);

    return {
      enemyName: enemy?.name || '无妄者',
      source: '库街区 Wiki entryId=1519669262123954176',
      items: [...heals, ...damages]
    };
  }
};
