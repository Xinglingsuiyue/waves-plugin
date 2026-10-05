const wiki = {
  "id": "1321897948803911680",
  "name": "无惧浪涛之勇",
  "lastUpdateTime": "2025-08-23",
  "currentVersion": "8.0",
  "effectText": "无惧浪涛之勇\n\n(2件套)\n\n共鸣效率提升10%\n\n无惧浪涛之勇\n\n(5件套)\n\n角色攻击提升15%，共鸣效率达到250%后，当前角色全属性伤害提升30%。\n\n "
};

export default {
  name: "无惧浪涛之勇",
  wiki,

  apply({ panel, equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "无惧浪涛之勇"
    };

    // (2件套) 共鸣效率提升 10%：固定加成，已计入角色总面板，且非伤害属性，不计算。

    if (count >= 5) {
      // (5件套) 角色攻击 +15%。
      buff.attackPercent += 0.15;
      // 共鸣效率达到 250% 后，当前角色全属性伤害 +30%。
      if (Number(panel?.resonanceEfficiency || 0) >= 2.5) {
        buff.damageBonus += 0.30;
      }
    }

    return buff;
  }
};
