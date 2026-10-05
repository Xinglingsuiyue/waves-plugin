const wiki = {
  "id": "1233505120063127552",
  "name": "轻云出月",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "18.0",
  "effectText": "轻云出月\n\n(2件套)\n\n共鸣效率提升10%\n\n轻云出月\n\n(5件套)\n\n使用延奏技能后，下一个登场的共鸣者攻击力提升22.5%，持续15秒。"
};

export default {
  name: "轻云出月",
  wiki,

  apply() {
    // (2件套) 共鸣效率提升 10%：固定加成，已计入角色总面板，不再重复计算。
    // (5件套) 使用延奏技能后，为「下一个登场」的共鸣者 +22.5% 攻击：
    //          该效果作用于下一位角色，不属于当前角色自身增益，因此自身伤害不计算。
    return {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "轻云出月(仅固定+队友效果，自身无动态增益)"
    };
  }
};
