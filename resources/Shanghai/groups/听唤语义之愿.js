const wiki = {
  "id": "1468619768316502016",
  "name": "听唤语义之愿",
  "lastUpdateTime": "2026-03-21",
  "currentVersion": "5.0",
  "effectText": "听唤语义之愿\n\n(2件套)\n\n气动伤害提升10%\n\n听唤语义之愿\n\n(5件套)\n\n角色造成声骸技能伤害时，声骸技能伤害的暴击提升20%，自身气动伤害提升15%，持续5秒。"
};

export default {
  name: "听唤语义之愿",
  wiki,

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "听唤语义之愿"
    };

    // (2件套) 气动伤害提升 10%：固定加成，已计入角色总面板，不再重复计算。

    if (count >= 5) {
      // (5件套) 造成声骸技能伤害时，自身气动伤害 +15%。
      buff.damageBonus += 0.15;
      // 「声骸技能暴击 +20%」只作用于声骸技能，本计算器不单独结算声骸技能，故不计。
    }

    return buff;
  }
};
