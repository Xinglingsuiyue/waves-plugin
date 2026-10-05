const wiki = {
  "id": "1353855270166462464",
  "name": "流云逝尽之空",
  "lastUpdateTime": "2025-08-23",
  "currentVersion": "5.0",
  "effectText": "流云逝尽之空\n\n(2件套)\n\n气动伤害提升10%。\n\n流云逝尽之空\n\n(5件套)\n\n角色为敌人添加【风蚀效应】时，队伍中角色气动伤害提升15%，自身气动伤害额外提升15%，持续20秒。"
};

export default {
  name: "流云逝尽之空",
  wiki,

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "流云逝尽之空"
    };

    // (2件套) 气动伤害提升 10%：固定加成，已计入角色总面板，不再重复计算。

    if (count >= 5) {
      // (5件套) 为敌人添加风蚀效应时，队伍中角色气动伤害 +15%，自身额外 +15% → 自身共 +30%。
      buff.damageBonus += 0.30;
    }

    return buff;
  }
};
