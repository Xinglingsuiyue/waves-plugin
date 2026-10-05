const wiki = {
  "id": "1233504904249409536",
  "name": "沉日劫明",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "15.0",
  "effectText": "沉日劫明\n\n(2件套)\n\n湮灭伤害提升10%\n\n沉日劫明\n\n(5件套)\n\n使用普攻或重击时，湮灭伤害提升7.5%，该效果可叠加4层，持续15秒。"
};

export default {
  name: "沉日劫明",
  wiki,

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "沉日劫明"
    };

    // (2件套) 湮灭伤害提升 10%：固定加成，已计入角色总面板，不再重复计算。

    if (count >= 5) {
      // (5件套) 使用普攻或重击时湮灭伤害 +7.5%，最多 4 层 → +30%。
      buff.damageBonus += 0.30;
    }

    return buff;
  }
};
