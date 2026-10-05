const wiki = {
  "id": "1380240498098720768",
  "name": "奔狼燎原之焰",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "8.0",
  "effectText": "奔狼燎原之焰\n\n(2件套)\n\n热熔伤害提升10%\n\n奔狼燎原之焰\n\n(5件套)\n\n施放共鸣解放时，队伍中角色热熔伤害提升15%，自身共鸣解放伤害提升20%，持续35秒。"
};

export default {
  name: "奔狼燎原之焰",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "奔狼燎原之焰"
    };

    // (2件套) 热熔伤害提升 10%：固定加成，已计入角色总面板，不再重复计算。

    if (count >= 5) {
      // (5件套) 施放共鸣解放时，队伍中角色热熔伤害 +15%（含自身）。
      buff.damageBonus += 0.15;
      // 自身共鸣解放伤害 +20%（只作用于共鸣解放）。
      if (skillType === 'liberation') buff.damageBonus += 0.20;
    }

    return buff;
  }
};
