const wiki = {
  "id": "1233106270208733184",
  "name": "隐世回光",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "15.0",
  "effectText": "隐世回光\n\n(2件套)\n\n治疗效果提升10%\n\n隐世回光\n\n(5件套)\n\n自身为友方提供治疗时，全队共鸣者攻击力提升15%，持续30秒。"
};

export default {
  name: "隐世回光",
  wiki,

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "隐世回光"
    };

    // (2件套) 治疗效果提升 10%：固定加成，已计入角色总面板，且非伤害属性，不计算。

    if (count >= 5) {
      // (5件套) 自身为友方提供治疗时，全队共鸣者攻击力 +15%（含自身）。
      buff.attackPercent += 0.15;
    }

    return buff;
  }
};
