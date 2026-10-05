const wiki = {
  "id": "1498480264495570944",
  "name": "剪心辑梦之影",
  "lastUpdateTime": "2026-04-30",
  "currentVersion": "4.0",
  "effectText": "剪心辑梦之影\n\n(2件套)\n\n攻击提升10%\n\n剪心辑梦之影\n\n(5件套)\n\n角色为敌人添加【震谐·偏移】或【集谐·偏移】时，队伍中角色谐度破坏增幅提升20点，持续30秒，同名效果之间不可叠加。"
};

export default {
  name: "剪心辑梦之影",
  wiki,

  apply() {
    // (2件套) 攻击提升 10%：固定加成，已计入角色总面板，不再重复计算。
    // (5件套) 提升的是「谐度破坏增幅」，属于谐度破坏相关属性，不属于本计算器的伤害乘区，故不计。
    return {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "剪心辑梦之影(仅固定效果，自身无动态伤害增益)"
    };
  }
};
