export default {
  name: '幽冥的忘忧章',

  // 数据来源：库街区 / wuthering.gg / 百度百科 - 幽冥的忘忧章（5★ 音感仪 弗洛洛专武）
  // 90 级面板：攻击 587、暴击 24.3%（已在角色面板中，不重复加）。
  //
  // 谐振「安魂曲」 R1/R2/R3/R4/R5：
  //   攻击提升 12% / 15% / 18% / 21% / 24%
  //   造成声骸技能伤害后 12 秒内：
  //     共鸣技能伤害加成提升 32% / 40% / 48% / 56% / 64%
  //     声骸技能伤害加深 32% / 40% / 48% / 56% / 64%
  //     造成伤害时无视目标 8% / 10% / 12% / 14% / 16% 防御
  //
  // 默认假设：弗洛洛输出主轴始终伴随声骸技能命中，触发态全程在线。
  apply({ panel, skillType }) {
    const reson = Number(panel?.weaponResonLevel || 1);

    const attackMap   = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };
    const skillBonusMap = { 1: 0.32, 2: 0.40, 3: 0.48, 4: 0.56, 5: 0.64 };
    const echoDeepenMap = { 1: 0.32, 2: 0.40, 3: 0.48, 4: 0.56, 5: 0.64 };
    const ignoreDefMap  = { 1: 0.08, 2: 0.10, 3: 0.12, 4: 0.14, 5: 0.16 };

    const buff = {
      attackPercent: attackMap[reson] || attackMap[1],
      damageBonus: 0,
      ignoreDefense: ignoreDefMap[reson] || ignoreDefMap[1],
      source: '幽冥的忘忧章'
    };

    if (skillType === 'skill') {
      buff.damageBonus += skillBonusMap[reson] || skillBonusMap[1];
    }
    // 声骸技能伤害加深仅作用于声骸技能本身（不在本模块计算范围内）
    if (skillType === 'echo') {
      buff.deepen = (buff.deepen || 0) + (echoDeepenMap[reson] || echoDeepenMap[1]);
    }

    return buff;
  }
};
