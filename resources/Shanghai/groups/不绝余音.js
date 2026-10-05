const wiki = {
  "id": "1233505098310021120",
  "name": "不绝余音",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "17.0",
  "effectText": "不绝余音\n\n(2件套)\n\n攻击力提升10%\n\n不绝余音\n\n(5件套)\n\n在场时，自身攻击力每1.5秒提升5%，该效果最多叠加四层。\n\n延奏技能伤害提升60%"
};

export default {
  name: "不绝余音",
  wiki,

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "不绝余音"
    };

    // (2件套) 攻击力提升 10%：固定加成，已计入角色总面板，不再重复计算。

    if (count >= 5) {
      // (5件套) 在场时自身攻击力每 1.5 秒 +5%，最多 4 层 → +20% 攻击。
      // 「延奏技能伤害 +60%」属于离场延奏技能的一段独立伤害，本计算器不单独结算延奏伤害，故不计。
      buff.attackPercent += 0.20;
    }

    return buff;
  }
};
