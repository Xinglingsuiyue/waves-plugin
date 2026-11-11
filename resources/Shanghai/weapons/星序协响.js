export default {
  name: '星序协响',

  // 守岸人专武。
  // 谐振 R1/R2/R3/R4/R5：
  //   生命提升 12% / 15% / 18% / 21% / 24%（固定属性，已计入面板）
  //   施放共鸣解放时回复协奏能量（不参与伤害结算）
  //   共鸣技能造成治疗时，附近队伍中所有角色攻击提升
  //     14% / 17.5% / 21% / 24.5% / 28%，持续 30 秒。
  // 守岸人的共鸣技能即治疗技能，按该效果已触发处理。
  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const teamAttackMap = { 1: 0.14, 2: 0.175, 3: 0.21, 4: 0.245, 5: 0.28 };

    return {
      attackPercent: teamAttackMap[reson] || teamAttackMap[1],
      healingBonus: 0,
      damageBonus: 0,
      source: '星序协响'
    };
  }
};
