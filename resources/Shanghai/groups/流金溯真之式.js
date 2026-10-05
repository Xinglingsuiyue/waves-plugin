const wiki = {
  "id": "1452395725424975872",
  "name": "流金溯真之式",
  "lastUpdateTime": "2026-01-17",
  "currentVersion": "4.0",
  "effectText": "流金溯真之式\n\n(2件套)\n\n衍射伤害提升10%\n\n流金溯真之式\n\n(5件套)\n\n角色造成普攻伤害时，自身衍射伤害提升10%，该效果可叠加3层，持续5秒。叠至3层时，施放共鸣解放时，普攻伤害加成提升40%。"
};

export default {
  name: "流金溯真之式",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "流金溯真之式"
    };

    // (2件套) 衍射伤害提升 10%：固定加成，已计入角色总面板，不再重复计算。

    if (count >= 5) {
      // (5件套) 造成普攻伤害时自身衍射伤害 +10%，最多 3 层 → +30%。
      buff.damageBonus += 0.30;
      // 叠满 3 层后施放共鸣解放时，普攻伤害加成 +40%（只作用于普攻伤害）。
      if (skillType === 'normal') buff.damageBonus += 0.40;
    }

    return buff;
  }
};
