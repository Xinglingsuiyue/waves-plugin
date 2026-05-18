export default {
  name: '和光回唱',

  // 数据来源：百度百科 / wuthering.gg - 和光回唱（5★ 音感仪 菲比专武）
  // 90 级面板：攻击 500、暴击率 36%。
  //
  // 谐振「衔枝者赞诗」 R1/R2/R3/R4/R5：
  //   攻击提升 12% / 15% / 18% / 21% / 24%
  //   对附加【光噪效应】的目标造成伤害时：
  //     自身普攻、重击伤害加成提升 14% / 17.5% / 21% / 24.5% / 28%
  //     可叠加 3 层，持续 6s
  //   施放延奏技能时，使队伍中登场角色周围的敌人受到
  //     【光噪效应】伤害加深 30% / 37.5% / 45% / 52.5% / 60%
  //     持续 30s，同名不可叠加
  //
  // 默认假设：目标已挂【光噪效应】，前一段叠满 3 层。
  apply({ panel, skillType }) {
    const reson = Number(panel?.weaponResonLevel || 1);

    const attackMap = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };
    const naHvyMap  = { 1: 0.14, 2: 0.175, 3: 0.21, 4: 0.245, 5: 0.28 };
    const noiseDeepMap = { 1: 0.30, 2: 0.375, 3: 0.45, 4: 0.525, 5: 0.60 };

    const buff = {
      attackPercent: attackMap[reson] || attackMap[1],
      damageBonus: 0,
      lightNoiseDeepen: noiseDeepMap[reson] || noiseDeepMap[1],
      source: '和光回唱'
    };

    if (skillType === 'normal') {
      buff.damageBonus += (naHvyMap[reson] || naHvyMap[1]) * 3;
    }

    return buff;
  }
};
