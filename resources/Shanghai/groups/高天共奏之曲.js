const wiki = {
  "id": "1321882647069708288",
  "name": "高天共奏之曲",
  "lastUpdateTime": "2026-05-22",
  "currentVersion": "8.0",
  "effectText": "高天共奏之曲\n\n(2件套)\n\n共鸣效率提升10%。\n\n高天共奏之曲\n\n(5件套)\n\n当前角色协同攻击造成的伤害提升80%；协同攻击命中敌人且暴击时，队伍中登场角色攻击力提升20%，持续4秒。\n\n "
};

export default {
  name: "高天共奏之曲",
  wiki,

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "高天共奏之曲"
    };

    // (2件套) 共鸣效率提升 10%：固定加成，已计入角色总面板，且非伤害属性，不计算。

    if (count >= 5) {
      // (5件套) 协同攻击命中且暴击时，队伍中登场角色攻击力 +20%（含自身）。
      buff.attackPercent += 0.20;
      // 「协同攻击造成的伤害 +80%」只作用于协同攻击本身，不是通用增伤；
      // 本计算器不单独结算协同攻击，故不计入。
    }

    return buff;
  }
};
