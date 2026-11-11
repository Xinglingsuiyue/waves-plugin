const wiki = {
  "id": "1321878127726972928",
  "name": "幽夜隐匿之帷",
  "lastUpdateTime": "2025-08-23",
  "currentVersion": "9.0",
  "effectText": "幽夜隐匿之帷\n\n(2件套)\n\n湮灭伤害提升10%\n\n幽夜隐匿之帷\n\n(5件套)\n\n角色触发延奏技能离场时，额外对周围敌人造成480%的湮灭伤害，该伤害为延奏技能伤害，并使下一个登场角色湮灭属性伤害加成提升15%，持续15秒。"
};

const EFFECT = {
  "two": 0.1,
  "five": 4.8,
  "element": "湮灭",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0.15
};

export default {
  name: "幽夜隐匿之帷",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "幽夜隐匿之帷" };
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 5) {
      // 延奏离场时额外造成 480% 湮灭伤害（独立伤害段，不是增伤乘区，不能计入 damageBonus）；
      // 下一个登场角色湮灭属性伤害加成 +15%，持续 15 秒（按当前角色受益处理）。
      buff.damageBonus += Number(EFFECT.damage || 0);
    }
    return buff;
  }
};
