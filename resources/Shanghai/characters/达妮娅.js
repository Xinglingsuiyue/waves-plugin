import { calcSingleDamage } from '../../../utils/damage/formula.js';
import { getPercentAttr, getNumberAttr, normalizeRoleDetailData } from '../../../utils/damage/parser.js';
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

const levelMap = (...values) => values.reduce((map, value, index) => {
  map[index + 1] = value;
  return map;
}, {});

// =============================================================
// 达妮娅（5★ 热熔 音感仪）
// 数据来源：库街区 Wiki entryId=1488852222116831232，抓取于 2026-05-22，倍率采用 Wiki Lv1-Lv10 精确表。
//
// 计算范围：按达妮娅常用输出轴展示普攻、共鸣技能、共鸣解放、回路代表伤害：
//   - 普攻：布景四段、满黯核布景四段、幻灭三/四段、幻灭闪避反击
//   - 共鸣技能：拟态泡泡、轻唤、放逐一段、放逐二段（按解放伤害）
//   - 共鸣解放：帷幕终景·布景之形、帷幕终景·幻灭之形
//   - 共鸣回路：蚀域每次伤害
//
// 默认假设：处于共鸣模态·聚爆，已附加聚爆效应；主位声骸不在本角色文件内处理。
// =============================================================
const DANIYA_CHAINS = [
  {
    level: 1,
    name: '薄明梦中的寂静光辉',
    description: [
      '暴击伤害提升30%。',
      '施放共鸣技能拟态泡泡·布景之形、共鸣技能放逐·幻灭之形、普攻·幻灭之形第3段、普攻·幻灭之形第4段、空中攻击·幻灭之形第3段、空中攻击·幻灭之形第4段期间，免疫打断。',
      '处于布景之形进入战斗时，获得熵变强化·布景之形，持续30秒。',
      '处于幻灭之形进入战斗时，获得熵变强化·幻灭之形，持续12秒。'
    ],
    bonus: { critDamage: 0.30 }
  },
  {
    level: 2,
    name: '坠入此世一片潮水',
    description: [
      '处于共鸣模态·聚爆，队伍中的角色施加【聚爆效应】后，该角色热熔伤害加成提升50%，持续15秒。登场角色附近的敌人触发【聚爆效应】引爆后，达妮娅获得1层简并虚质，持续15秒，上限10层。每层简并虚质使达妮娅造成伤害无视目标1%热熔伤害抗性。达妮娅切换模态时，该效果提前结束。',
      '处于共鸣模态·集谐，共鸣回路效果提升：队伍中的角色施加【集谐·偏移】后，该角色谐度破坏增幅提升20点，持续15秒，目标将积累偏谐值上限100%的【偏谐值】，积累【偏谐值】效果对同一目标300秒内只能触发1次。达妮娅切换模态时，该效果提前结束。',
      '共鸣技能放逐·幻灭之形伤害倍率提升40%。'
    ],
    bonus: { fireDamageBonus: 0.50, fireResistanceIgnorePerStack: 0.01, fireResistanceIgnoreMaxStacks: 10, harmonyBreakBonus: 20, exileIllusionMultiplierBonus: 0.40 }
  },
  {
    level: 3,
    name: '黑夜与风中奔驰着赤杨',
    description: [
      '共鸣解放帷幕终景·幻灭之形伤害倍率提升80%。',
      '【黯核】上限提升至5枚，处于熵变强化时，【黯核】的获取间隔缩短至6秒。',
      '熵变强化·布景之形效果获得强化：每秒获得【虚质粒子】提升至4点。',
      '熵变强化·幻灭之形效果获得强化：施放共鸣解放帷幕终景·幻灭之形时，额外回复30点协奏能量。',
      '固有技能伪物弥留效果强化：进入战斗时，【黯核】与【虚质粒子】回复至上限。该效果每12秒可触发1次。',
      '【黯核】数量达到上限时，施放普攻·布景之形第4段、共鸣技能拟态泡泡·布景之形消耗所有【黯核】，使本次技能伤害倍率增加1200%，本次伤害为共鸣解放伤害。'
    ],
    bonus: { liberationIllusionMultiplierBonus: 0.80, fullDarkCoreMultiplierBonus: 12.00, darkCoreLimit: 5 }
  },
  {
    level: 4,
    name: '从远方，回到远方',
    description: ['蚀域攻击间隔缩短至3秒。'],
    bonus: { erosionInterval: 3 }
  },
  {
    level: 5,
    name: '若能以谎言缝补心脏',
    description: ['共鸣解放帷幕终景·布景之形造成的伤害提升100%。'],
    bonus: { liberationSceneDamageBonus: 1.00 }
  },
  {
    level: 6,
    name: '祝愿你于静默中，得到太阳',
    description: [
      '处于熵变强化时，攻击提升60%，热熔伤害加成提升60%。',
      '处于共鸣模态·聚爆时，蚀域对目标造成伤害后，根据【聚爆效应】层数上限引爆【聚爆效应】，本次引爆对【聚爆效应】主目标的伤害倍率提升200%，且不移除【聚爆效应】层数。同一目标最多可受到1次该效果，目标受到共鸣解放帷幕终景·幻灭之形的伤害后，重置该次数，重置效果对同一目标2秒内只能触发1次。',
      '处于共鸣模态·集谐时，队伍中的角色对拥有【集谐·偏移】的【失谐】目标造成谐度破坏伤害时，将额外附加1层【集谐·干涉】，该效果对同一目标3秒内只能触发1次。'
    ],
    bonus: { attackPercent: 0.60, fireDamageBonus: 0.60, erosionDetonationMultiplierBonus: 2.00, harmonyInterferenceExtraStack: 1 }
  }
];

const DANIYA_SKILLS = {
  sceneNormal4: {
    name: '普攻·布景之形第四段',
    description: '进行最多4段的连续攻击，造成热熔伤害。',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(0.6438, 0.6966, 0.7494, 0.8233, 0.8761, 0.9368, 1.0213, 1.1058, 1.1902, 1.2800)
  },
  sceneCoreNormal4: {
    name: '满黯核·普攻·布景之形第四段',
    description: '3链后【黯核】数量达到上限时，普攻·布景之形第4段消耗所有【黯核】，本次技能伤害倍率增加1200%，并按共鸣解放伤害结算。',
    type: 'liberation',
    levelFrom: '常态攻击',
    flatMultiplier: 12.00,
    levelMap: levelMap(0.6438, 0.6966, 0.7494, 0.8233, 0.8761, 0.9368, 1.0213, 1.1058, 1.1902, 1.2800)
  },
  illusionNormal3: {
    name: '普攻·幻灭之形第三段',
    description: '进行最多4段的连续攻击，造成热熔伤害。',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(0.3138, 0.3396, 0.3653, 0.4013, 0.4271, 0.4567, 0.4978, 0.5390, 0.5802, 0.6239)
  },
  illusionNormal4: {
    name: '普攻·幻灭之形第四段',
    description: '进行最多4段的连续攻击，造成热熔伤害。',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(0.1788 + 0.4171, 0.1934 + 0.4513, 0.2081 + 0.4855, 0.2286 + 0.5334, 0.2433 + 0.5676, 0.2601 + 0.6069, 0.2836 + 0.6616, 0.3070 + 0.7164, 0.3305 + 0.7711, 0.3554 + 0.8292)
  },
  illusionDodge: {
    name: '闪避反击·幻灭之形',
    description: '成功闪避后短按普攻攻击目标，可在空中施放；施放后可衔接普攻·幻灭之形第4段/空中攻击·幻灭之形第4段。',
    type: 'normal',
    levelFrom: '常态攻击',
    levelMap: levelMap(0.5436, 0.5882, 0.6328, 0.6952, 0.7398, 0.7910, 0.8624, 0.9337, 1.0050, 1.0808)
  },
  mimicBubble: {
    name: '拟态泡泡·布景之形',
    description: '牵引周围的目标，造成热熔伤害。',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(0.0876 * 3 + 0.2628, 0.0948 * 3 + 0.2844, 0.1020 * 3 + 0.3059, 0.1121 * 3 + 0.3361, 0.1193 * 3 + 0.3577, 0.1275 * 3 + 0.3825, 0.1390 * 3 + 0.4169, 0.1505 * 3 + 0.4514, 0.1620 * 3 + 0.4859, 0.1742 * 3 + 0.5225)
  },
  callIllusion: {
    name: '轻唤·幻灭之形',
    description: '牵引周围的目标，造成热熔伤害；与放逐·幻灭之形共享冷却时间，可在空中施放。',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(0.1565 + 0.0730 * 5, 0.1693 + 0.0790 * 5, 0.1821 + 0.0850 * 5, 0.2001 + 0.0934 * 5, 0.2129 + 0.0994 * 5, 0.2277 + 0.1063 * 5, 0.2482 + 0.1158 * 5, 0.2687 + 0.1254 * 5, 0.2892 + 0.1350 * 5, 0.3110 + 0.1452 * 5)
  },
  exileFirst: {
    name: '放逐·幻灭之形第一段',
    description: '拥有【黯核】时，轻唤·幻灭之形替换为放逐·幻灭之形；第1段牵引周围目标并造成热熔伤害，随后可衔接第2段。',
    type: 'skill',
    levelFrom: '共鸣技能',
    levelMap: levelMap(0.1744 * 3, 0.1888 * 3, 0.2031 * 3, 0.2231 * 3, 0.2374 * 3, 0.2538 * 3, 0.2767 * 3, 0.2996 * 3, 0.3225 * 3, 0.3468 * 3)
  },
  exileSecond: {
    name: '放逐·幻灭之形第二段',
    description: '消耗所有【黯核】造成热熔伤害，每消耗1枚【黯核】，伤害倍率提升150%；该技能伤害为共鸣解放伤害。',
    type: 'liberation',
    levelFrom: '共鸣技能',
    levelMap: levelMap(0.5634, 0.6096, 0.6558, 0.7205, 0.7667, 0.8199, 0.8938, 0.9677, 1.0416, 1.1201)
  },
  liberationScene: {
    name: '帷幕终景·布景之形',
    description: '造成热熔伤害；施放时获得熵变强化·幻灭之形，持续12秒，随后切换至幻灭之形。',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(2.0000, 2.1640, 2.3280, 2.5576, 2.7216, 2.9102, 3.1726, 3.4350, 3.6974, 3.9762)
  },
  liberationIllusion: {
    name: '帷幕终景·幻灭之形',
    description: '【共形能量】满时，消耗所有【共形能量】与【虚质粒子】造成热熔伤害；施放后获得熵变强化·布景之形，持续30秒，随后切换至布景之形，可在空中施放。',
    type: 'liberation',
    levelFrom: '共鸣解放',
    levelMap: levelMap(1.0000 * 4, 1.0820 * 4, 1.1640 * 4, 1.2788 * 4, 1.3608 * 4, 1.4551 * 4, 1.5863 * 4, 1.7175 * 4, 1.8487 * 4, 1.9881 * 4)
  },
  erosion: {
    name: '蚀域每次伤害',
    description: '共鸣回路相关伤害；4链后蚀域攻击间隔缩短至3秒，6链聚爆模态下可引爆聚爆效应且主目标倍率提升200%。',
    type: 'liberation',
    levelFrom: '共鸣回路',
    levelMap: levelMap(0.6858, 0.7420, 0.7982, 0.8769, 0.9332, 0.9978, 1.0878, 1.1778, 1.2677, 1.3633)
  },
  introGreeting: {
    name: '久疏问候！',
    description: '处于布景之形时可施放该技能，造成热熔伤害；施放后一定时间内短按普攻，将会施放普攻·布景之形第4段。',
    type: 'intro',
    levelFrom: '变奏技能',
    levelMap: levelMap(0.5262, 0.5694, 0.6125, 0.6730, 0.7161, 0.7657, 0.8348, 0.9038, 0.9728, 1.0462)
  },
  introKnock: {
    name: '轻叩门扉',
    description: '处于幻灭之形时可施放该技能，造成热熔伤害；施放时获得熵变强化·幻灭之形，持续12秒。',
    type: 'intro',
    levelFrom: '变奏技能',
    levelMap: levelMap(0.2602 * 3, 0.2816 * 3, 0.3029 * 3, 0.3328 * 3, 0.3541 * 3, 0.3787 * 3, 0.4128 * 3, 0.4469 * 3, 0.4811 * 3, 0.5174 * 3)
  }
};

function getPanelDamageBonus(attrMap, skillType) {
  let total = getPercentAttr(attrMap, '热熔伤害加成');
  if (skillType === 'liberation') total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  if (skillType === 'skill') total += getPercentAttr(attrMap, '共鸣技能伤害加成');
  if (skillType === 'intro') total += getPercentAttr(attrMap, '变奏技能伤害加成');
  if (skillType === 'normal') total += getPercentAttr(attrMap, '普攻伤害加成');
  if (skillType === 'heavy') total += getPercentAttr(attrMap, '重击伤害加成');
  return total;
}

function getHarmonyInterferenceBonus(panel, chainCount) {
  const attrMap = panel?.attrMap || {};
  let harmonyBreak = getNumberAttr(attrMap, '谐度破坏增幅');
  if (chainCount >= 2) harmonyBreak += 20;
  if (!harmonyBreak) return 0;

  // 集谐模态：目标每有 1 层集谐·干涉，每点谐度破坏增幅使最终伤害 +0.12%。
  // 达妮娅在编队时层数上限 +1；S6 可额外附加 1 层。默认按 2 层 / S6 3 层满层估算。
  const stacks = chainCount >= 6 ? 3 : 2;
  return harmonyBreak * stacks * 0.0012;
}

function getFireResistanceIgnoreBonus(enemy, chainCount) {
  if (chainCount < 2) return 0;
  // S2：简并虚质上限 10 层，每层无视 1% 热熔抗性。按默认满层折算为增伤。
  const baseRes = Math.min(0.95, Math.max(0, Number(enemy?.resistance ?? 0.1)));
  return 0.10 / Math.max(0.05, 1 - baseRes);
}

function getRoleSelfBuff({ skillName, panel, enemy, chainCount }) {
  const buff = {
    attackPercent: 0,
    damageBonus: 0,
    multiplierBonus: 0,
    deepen: 0,
    critRate: 0,
    critDamage: 0,
    source: '达妮娅·自身'
  };

  const isSceneCore = skillName === DANIYA_SKILLS.sceneCoreNormal4.name;
  const isExileSecond = skillName === DANIYA_SKILLS.exileSecond.name;
  const isLiberationScene = skillName === DANIYA_SKILLS.liberationScene.name;
  const isLiberationIllusion = skillName === DANIYA_SKILLS.liberationIllusion.name;
  const isErosion = skillName === DANIYA_SKILLS.erosion.name;
  const isIllusion = skillName.includes('幻灭之形');

  // 固有技能·蚀刻繁彩：聚爆模态下队伍热熔伤害 +30%。
  buff.damageBonus += 0.30;

  // 熵变强化·幻灭之形：攻击 +30%。S6：处于熵变强化时攻击 +60%、热熔 +60%。
  if (isIllusion) {
    buff.attackPercent += chainCount >= 6 ? 0.60 : 0.30;
  } else if (chainCount >= 6) {
    buff.attackPercent += 0.60;
  }
  if (chainCount >= 6) {
    buff.damageBonus += 0.60;
  }

  // 集谐·干涉与 S2 简并虚质按常用满层估算。
  buff.deepen += getHarmonyInterferenceBonus(panel, chainCount);
  buff.damageBonus += getFireResistanceIgnoreBonus(enemy, chainCount);

  // S1：暴击伤害 +30%。
  if (chainCount >= 1) {
    buff.critDamage += 0.30;
  }

  // S2：聚爆模态下热熔伤害 +50%；放逐·幻灭之形伤害倍率 +40%。
  if (chainCount >= 2) {
    buff.damageBonus += 0.50;
    if (isExileSecond) buff.multiplierBonus += 0.40;
  }

  // S3：满黯核普攻·布景第四段倍率 +1200%，并按共鸣解放伤害结算；
  //     帷幕终景·幻灭之形倍率 +80%；黯核上限提升至 5 枚。
  if (isSceneCore && chainCount < 3) {
    buff.skip = true;
  }
  if (chainCount >= 3 && isLiberationIllusion) {
    buff.multiplierBonus += 0.80;
  }
  if (isExileSecond) {
    buff.multiplierBonus += chainCount >= 3 ? 7.50 : 4.50;
  }

  // S5：帷幕终景·布景之形伤害 +100%。
  if (chainCount >= 5 && isLiberationScene) {
    buff.damageBonus += 1.00;
  }

  // S6：聚爆模态下蚀域引爆聚爆效应主目标倍率 +200%。
  if (chainCount >= 6 && isErosion) {
    buff.multiplierBonus += 2.00;
  }

  return buff;
}

function calcOneSkill({ roleDetailData, panel, equipment, enemy, modules, options, skillKey }) {
  const skill = DANIYA_SKILLS[skillKey];
  const chainCount = getChainUnlockedCount(roleDetailData);
  const level = getSkillLevel(roleDetailData, skill.levelFrom);
  const roleBuff = getRoleSelfBuff({ skillName: skill.name, panel, enemy, chainCount });
  if (roleBuff.skip) return null;

  const baseMultiplier = (skill.levelMap[level] || skill.levelMap[10]) + Number(skill.flatMultiplier || 0);
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
    skillMultiplier: baseMultiplier,
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
  name: '达妮娅',

  async calc({ roleDetailData, panel, equipment, enemy, modules, options }) {
    const args = { roleDetailData, panel, equipment, enemy, modules, options };
    const items = [
      calcOneSkill({ ...args, skillKey: 'erosion' }),
      calcOneSkill({ ...args, skillKey: 'liberationIllusion' }),
      calcOneSkill({ ...args, skillKey: 'exileSecond' })
    ].filter(Boolean);
    return {
      enemyName: enemy?.name || '无妄者',
      source: '库街区 Wiki entryId=1488852222116831232',
      chains: DANIYA_CHAINS,
      skills: DANIYA_SKILLS,
      items
    };
  }
};




