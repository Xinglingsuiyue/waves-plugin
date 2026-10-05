const wiki = {
  "id": "1212037090995421184",
  "name": "凝夜白霜",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "20.0",
  "effectText": "凝夜白霜\n\n(2件套)\n\n冷凝伤害提升10%\n\n凝夜白霜\n\n(5件套)\n\n使用普攻或重击后，冷凝伤害提升10%，该效果可叠加3层，持续15秒。"
};

export default {
  name: "凝夜白霜",
  wiki,

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "凝夜白霜"
    };

    // (2件套) 冷凝伤害提升 10%：固定加成，已计入角色总面板，不再重复计算。

    if (count >= 5) {
      // (5件套) 使用普攻或重击后冷凝伤害 +10%，最多 3 层 → +30%。
      buff.damageBonus += 0.30;
    }

    return buff;
  }
};
