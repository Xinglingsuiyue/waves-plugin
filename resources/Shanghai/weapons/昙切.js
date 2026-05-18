export default {
  name: '昙切',

  // 数据来源：百度百科 / wuthering.gg - 昙切（5★ 长刃 千咲专武）
  // 90 级面板：攻击 500、暴击 36%。
  //
  // 谐振「命弦」 R1/R2/R3/R4/R5：
  //   攻击提升 12% / 15% / 18% / 21% / 24%
  //   施放变奏技能或附加【异常效应】时：
  //     共鸣解放伤害加成提升 8% / 10% / 12% / 14% / 16%（每层，最多 3 层，持续 15s）
  //   叠加至 3 层时，队伍中角色附加【异常效应】时：
  //     全属性伤害加成提升 24% / 30% / 36% / 42% / 48%（持续 15s，同名不可叠加）
  //
  // 默认假设：千咲爆发链中持续给目标挂【虚湮效应】，3 层 + 全属性加成全程在线。
  apply({ panel }) {
    const reson = Number(panel?.weaponResonLevel || 1);

    const attackMap   = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };
    const liberMap    = { 1: 0.08, 2: 0.10, 3: 0.12, 4: 0.14, 5: 0.16 };
    const teamBuffMap = { 1: 0.24, 2: 0.30, 3: 0.36, 4: 0.42, 5: 0.48 };

    return {
      attackPercent: attackMap[reson] || attackMap[1],
      // 自身共鸣解放伤害加成 × 3 层 + 全属性加成
      damageBonus: (liberMap[reson] || liberMap[1]) * 3 + (teamBuffMap[reson] || teamBuffMap[1]),
      source: '昙切'
    };
  }
};
