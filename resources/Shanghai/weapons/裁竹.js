export default {
  name: '裁竹',

  // 数据来源：百度百科 / wuthering.gg - 裁竹（5★ 迅刀 仇远专武）
  // 90 级面板：攻击 587、暴击率 24.3%。
  //
  // 谐振「人定」 R1/R2/R3/R4/R5：
  //   攻击提升 12% / 15% / 18% / 21% / 24%
  //   施放声骸技能时获得 1 层【解竹】：
  //     自身重击伤害加成提升 30% / 37.5% / 45% / 52.5% / 60%
  //     最多 2 层，持续 30s，同名声骸只可触发 1 次
  //     满层时施放声骸技能可刷新持续时间
  //   施放变奏技能时，队伍声骸技能伤害加成提升 20/25/30/35/40%（持续 30s）
  //
  // 默认假设：仇远爆发链中已触发 2 层【解竹】，重击全程吃满。
  apply({ panel, skillType }) {
    const reson = Number(panel?.weaponResonLevel || 1);

    const attackMap = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };
    const heavyPerStackMap = { 1: 0.30, 2: 0.375, 3: 0.45, 4: 0.525, 5: 0.60 };
    const echoTeamMap = { 1: 0.20, 2: 0.25, 3: 0.30, 4: 0.35, 5: 0.40 };

    const buff = {
      attackPercent: attackMap[reson] || attackMap[1],
      damageBonus: 0,
      source: '裁竹'
    };

    // 默认 2 层【解竹】，作用于重击（normal-加重击）
    if (skillType === 'normal') {
      buff.damageBonus += (heavyPerStackMap[reson] || heavyPerStackMap[1]) * 2;
    }

    // 全队声骸技能伤害加成，本模块计算范围内对仇远自身的声骸技能也算
    if (skillType === 'echo') {
      buff.damageBonus += echoTeamMap[reson] || echoTeamMap[1];
    }

    return buff;
  }
};
