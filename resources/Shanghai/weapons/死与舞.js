export default {
  name: '死与舞',

  // 数据来源：百度百科 / wuthering.gg - 死与舞（5★ 佩枪 珂莱塔专武）
  // 90 级面板：攻击 500、暴击伤害 72%。
  //
  // 谐振「缄默悼词」 R1/R2/R3/R4/R5：
  //   攻击提升 12% / 15% / 18% / 21% / 24%
  //   施放变奏技能或共鸣解放时，自身共鸣技能伤害加成提升
  //     48% / 60% / 72% / 84% / 96%（持续 5s）
  //
  // 默认假设：珂莱塔爆发链先入场触发变奏，buff 在共鸣技能爆发期间在线。
  apply({ panel, skillType }) {
    const reson = Number(panel?.weaponResonLevel || 1);

    const attackMap = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };
    const skillMap  = { 1: 0.48, 2: 0.60, 3: 0.72, 4: 0.84, 5: 0.96 };

    const buff = {
      attackPercent: attackMap[reson] || attackMap[1],
      damageBonus: 0,
      source: '死与舞'
    };

    if (skillType === 'skill') {
      buff.damageBonus += skillMap[reson] || skillMap[1];
    }

    return buff;
  }
};
