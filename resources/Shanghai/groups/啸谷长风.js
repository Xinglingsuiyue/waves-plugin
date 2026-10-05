const wiki = {
  "id": "1233504762221887488",
  "name": "啸谷长风",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "15.0",
  "effectText": "啸谷长风\n\n(2件套)\n\n气动伤害提升10%\n\n啸谷长风\n\n(5件套)\n\n使用变奏技能登场时，气动伤害提升30%，持续15秒。"
};

export default {
  name: "啸谷长风",
  wiki,

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "啸谷长风"
    };

    // (2件套) 气动伤害提升 10%：固定加成，已计入角色总面板，不再重复计算。

    if (count >= 5) {
      // (5件套) 使用变奏技能登场时，气动伤害 +30%。
      buff.damageBonus += 0.30;
    }

    return buff;
  }
};
