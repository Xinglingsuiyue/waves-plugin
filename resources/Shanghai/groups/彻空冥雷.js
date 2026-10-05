const wiki = {
  "id": "1233505002939936768",
  "name": "彻空冥雷",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "14.0",
  "effectText": "彻空冥雷\n\n(2件套)\n\n导电伤害提升10%\n\n彻空冥雷\n\n(5件套)\n\n使用重击或共鸣技能时，各获得一层导电伤害提升15%的效果，该效果可叠加两层，每层各持续15秒。"
};

export default {
  name: "彻空冥雷",
  wiki,

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "彻空冥雷"
    };

    // (2件套) 导电伤害提升 10%：固定加成，已计入角色总面板，不再重复计算。

    if (count >= 5) {
      // (5件套) 使用重击或共鸣技能时各获得一层导电伤害 +15%，最多 2 层 → +30%。
      buff.damageBonus += 0.30;
    }

    return buff;
  }
};
