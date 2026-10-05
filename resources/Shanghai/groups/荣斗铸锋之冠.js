const wiki = {
  "id": "1408881479672999936",
  "name": "荣斗铸锋之冠",
  "lastUpdateTime": "2025-08-26",
  "currentVersion": "7.0",
  "effectText": "荣斗铸锋之冠\n\n(3件套)\n\n角色获得护盾时，自身攻击提升6%，暴击伤害提升4%，该效果可叠加5层，持续4秒，每0.5秒可触发一次。"
};

export default {
  name: "荣斗铸锋之冠",
  wiki,

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "荣斗铸锋之冠"
    };

    // 本套装只有 (3件套) 一档，且是战斗触发效果，需满 3 件才触发。
    if (count >= 3) {
      // (3件套) 角色获得护盾时，自身攻击 +6%、暴击伤害 +4%，最多 5 层 → +30% 攻击、+20% 暴击伤害。
      buff.attackPercent += 0.30;
      buff.critDamage += 0.20;
    }

    return buff;
  }
};
