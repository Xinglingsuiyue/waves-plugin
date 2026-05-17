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

// 绯雪技能倍率定义（数据来源：库街区 wiki）
// 三段技能在游戏内均归类为「共鸣解放伤害」
const FEIXUE_SKILLS = {
  // 普攻·居合：283.82% + 47.31% × 4 = 473.06%（10级）
  jiHe: {
    name: '普攻·居合',
    type: 'liberation',
    levelMap: {
      1:  1.4276 + 0.2380 * 4,              // 142.76% + 23.80%×4 = 237.96%
      2:  1.5447 + 0.2575 * 4,
      3:  1.6618 + 0.2770 * 4,
      4:  1.8256 + 0.3043 * 4,
      5:  1.9427 + 0.3238 * 4,
      6:  2.0773 + 0.3463 * 4,
      7:  2.2646 + 0.3775 * 4,
      8:  2.4519 + 0.4087 * 4,
      9:  2.6392 + 0.4399 * 4,
      10: 2.8382 + 0.4731 * 4               // = 4.7306（473.06%）
    }
  },
  // 重击·枯霜·预求身：15.41% × 8 + 493.05% = 616.33%（10级）
  kuShuang: {
    name: '重击·枯霜·预求身',
    type: 'liberation',
    levelMap: {
      1:  0.0775 * 8 + 2.4800,              // 7.75%×8 + 248.00% = 310.00%
      2:  0.0839 * 8 + 2.6834,
      3:  0.0903 * 8 + 2.8868,
      4:  0.0992 * 8 + 3.1715,
      5:  0.1055 * 8 + 3.3748,
      6:  0.1128 * 8 + 3.6087,
      7:  0.1230 * 8 + 3.9341,
      8:  0.1332 * 8 + 4.2594,
      9:  0.1433 * 8 + 4.5848,
      10: 0.1541 * 8 + 4.9305               // = 6.1633（616.33%）
    }
  },
  // 预求我身·归刃：基础 198.81% + 795.24% = 994.05%（10级），每点锻雪 +795.24%（10级）
  guiRen: {
    name: '预求我身·归刃(满锻雪3点)',
    type: 'liberation',
    baseLevelMap: {
      1:  1.0000 + 4.0000,                  // 100.00% + 400.00% = 500.00%
      2:  1.0820 + 4.3280,
      3:  1.1640 + 4.6560,
      4:  1.2788 + 5.1152,
      5:  1.3608 + 5.4432,
      6:  1.4551 + 5.8204,
      7:  1.5863 + 6.3452,
      8:  1.7175 + 6.8700,
      9:  1.8487 + 7.3948,
      10: 1.9881 + 7.9524                   // = 9.9405（994.05%）
    },
    perShaoXueMap: {                        // 每点【锻雪·归刃】增加倍率
      1:  4.0000,
      2:  4.3280,
      3:  4.6560,
      4:  5.1152,
      5:  5.4432,
      6:  5.8204,
      7:  6.3452,
      8:  6.8700,
      9:  7.3948,
      10: 7.9524                            // 10 级每点 +795.24%
    }
  }
};

// 计算预求我身·归刃总倍率（按 3 点锻雪满消耗）
function getGuiRenMultiplier(level = 10, shaoXuePoints = 3) {
  const base = FEIXUE_SKILLS.guiRen.baseLevelMap[level] || FEIXUE_SKILLS.guiRen.baseLevelMap[10];
  const per = FEIXUE_SKILLS.guiRen.perShaoXueMap[level] || FEIXUE_SKILLS.guiRen.perShaoXueMap[10];
  const points = Math.max(0, Math.min(3, Number(shaoXuePoints) || 0));
  return base + per * points;
}

// 面板伤害加成读取
// 三段技能均为冷凝属性 + 共鸣解放伤害
function getPanelDamageBonus(attrMap, skillType) {
  let total = 0;

  // 冷凝属性伤害加成
  total += getPercentAttr(attrMap, '冷凝伤害加成');

  // 三段都按共鸣解放结算
  if (skillType === 'liberation') {
    total += getPercentAttr(attrMap, '共鸣解放伤害加成');
  }

  return total;
}

// 角色自身命座 / 固有技能增益
function getRoleSelfBuff({ skillName, skillType, chainCount }) {
  const buff = {
    damageBonus: 0,
    deepen: 0,
    multiplierBonus: 0,
    ignoreDefense: 0,
    critDamage: 0
  };

  // 固有技能·细雪：1层【雪锈】常驻给「霜冻效应」深化 30% + 暴伤 +40%（默认 1 层）
  // 「霜冻效应」属于异常伤害，不直接进绯雪自身共鸣解放伤害区，所以这里只取暴伤 +40%
  buff.critDamage += 0.40;

  // 2链「于无声处冰冷燃烧」：普攻·居合伤害倍率 +125%
  if (chainCount >= 2 && skillName === '普攻·居合') {
    buff.multiplierBonus += 1.25;
  }

  // 3链「我身无我亦无穷」：重击·寒簇·常世身、重击·枯霜·预求身倍率 +160%
  if (chainCount >= 3 && skillName === '重击·枯霜·预求身') {
    buff.multiplierBonus += 1.60;
  }

  // 6链「纵使前路永夜无终」：预求我身·见心、预求我身·归刃暴伤 +500%
  if (chainCount >= 6 && skillName.includes('预求我身·归刃')) {
    buff.critDamage += 5.00;
  }

  // 4链「有如苇草浮沉」：施放共鸣技能·常世身、霜罚·白玉切、霜罚·落华时，
  //   附近队伍中所有角色造成的伤害 +20%，持续 30 秒。
  // 默认爆发链已挂上（共鸣技能/霜罚是绯雪起手常驻），三段技能都吃 +20%。
  if (chainCount >= 4) {
    buff.damageBonus += 0.20;
  }

  return buff;
}

function calcOneSkill({
  roleDetailData,
  panel,
  equipment,
  enemy,
  modules,
  skillName,
  skillType,
  skillMultiplier
}) {
  const chainCount = getChainUnlockedCount(roleDetailData);

  const roleBuff = getRoleSelfBuff({ skillName, skillType, chainCount });
  const weaponBuff = modules.weapon?.apply
    ? modules.weapon.apply({ roleDetailData, panel, equipment, enemy, skillType, skillName })
    : {};
  const phantomBuff = modules.phantom?.apply
    ? modules.phantom.apply({ roleDetailData, panel, equipment, enemy, skillType, skillName })
    : {};
  const groupBuff = modules.group?.apply
    ? modules.group.apply({ roleDetailData, panel, equipment, enemy, skillType, skillName })
    : {};

  const mergedBuff = mergeBuff(roleBuff, weaponBuff, phantomBuff, groupBuff);

  // 注意：通用 mergeBuff 不合并 critDamage/critRate，这里手动汇总
  let extraCritDamage = Number(roleBuff.critDamage || 0)
                      + Number(weaponBuff.critDamage || 0)
                      + Number(phantomBuff.critDamage || 0)
                      + Number(groupBuff.critDamage || 0);
  let extraCritRate   = Number(roleBuff.critRate || 0)
                      + Number(weaponBuff.critRate || 0)
                      + Number(phantomBuff.critRate || 0)
                      + Number(groupBuff.critRate || 0);

  // 攻击力 = 面板攻击 × (1 + attackPercent) + flatAttack
  const attackPercent = mergedBuff.attackPercent || 0;
  const flatAttack = mergedBuff.flatAttack || 0;
  const finalAttack = panel.attack * (1 + attackPercent) + flatAttack;

  const attrMap = panel.attrMap || {};
  const panelBonus = getPanelDamageBonus(attrMap, skillType);

  // 自身有霜渐效应时，灼霜的"冷凝伤害深化"才生效；这里默认霜渐已挂上
  const result = calcSingleDamage({
    attack: finalAttack,
    skillMultiplier,
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

  return {
    name: skillName,
    ...result
  };
}

export default {
  name: '绯雪',

  async calc({ roleDetailData, panel, equipment, enemy, modules }) {
    const chainCount = getChainUnlockedCount(roleDetailData);

    // 普攻·居合 -> "共鸣回路" 等级（居合属于回路分支）
    // 但库街区面板里普攻·居合倍率写在「共鸣回路」技能数据中，level 取共鸣回路等级
    const circuitLevel = getSkillLevel(roleDetailData, '共鸣回路');
    // 重击·枯霜·预求身 -> "普攻" 等级
    const normalLevel = getSkillLevel(roleDetailData, '普攻');
    // 预求我身·归刃 -> "共鸣解放" 等级
    const liberationLevel = getSkillLevel(roleDetailData, '共鸣解放');

    const jiHeMul = FEIXUE_SKILLS.jiHe.levelMap[circuitLevel] || FEIXUE_SKILLS.jiHe.levelMap[10];
    const kuShuangMul = FEIXUE_SKILLS.kuShuang.levelMap[normalLevel] || FEIXUE_SKILLS.kuShuang.levelMap[10];
    const guiRenMul = getGuiRenMultiplier(liberationLevel, 3);

    const jiHe = calcOneSkill({
      roleDetailData,
      panel,
      equipment,
      enemy,
      modules,
      skillName: FEIXUE_SKILLS.jiHe.name,
      skillType: FEIXUE_SKILLS.jiHe.type,
      skillMultiplier: jiHeMul
    });

    const kuShuang = calcOneSkill({
      roleDetailData,
      panel,
      equipment,
      enemy,
      modules,
      skillName: FEIXUE_SKILLS.kuShuang.name,
      skillType: FEIXUE_SKILLS.kuShuang.type,
      skillMultiplier: kuShuangMul
    });

    const guiRen = calcOneSkill({
      roleDetailData,
      panel,
      equipment,
      enemy,
      modules,
      skillName: FEIXUE_SKILLS.guiRen.name,
      skillType: FEIXUE_SKILLS.guiRen.type,
      skillMultiplier: guiRenMul
    });

    return {
      enemyName: enemy?.name || '无妄者',
      items: [jiHe, kuShuang, guiRen]
    };
  }
};
