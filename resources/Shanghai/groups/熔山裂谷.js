const wiki = {
  "id": "1233505199486468096",
  "name": "熔山裂谷",
  "lastUpdateTime": "2025-08-23",
  "currentVersion": "11.0",
  "effectText": "熔山裂谷\n\n(2件套)\n\n热熔伤害提升10%\n\n熔山裂谷\n\n(5件套)\n\n使用共鸣技能时，热熔伤害提升30%，持续15秒。"
};

export default {
  name: "熔山裂谷",
  wiki,

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "熔山裂谷"
    };

    // (2件套) 热熔伤害提升 10%：固定加成，已计入角色总面板，不再重复计算。

    if (count >= 5) {
      // (5件套) 使用共鸣技能时，热熔伤害 +30%。
      buff.damageBonus += 0.30;
    }

    return buff;
  }
};
