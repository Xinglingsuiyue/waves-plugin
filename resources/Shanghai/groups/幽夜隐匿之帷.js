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
    if (count >= 2) {
      buff.damageBonus += Number(EFFECT.two || 0);
      buff.attackPercent += Number(EFFECT.attack || 0);
      buff.critRate += Number(EFFECT.critRate || 0);
      buff.critDamage += Number(EFFECT.critDamage || 0);
      buff.damageBonus += Number(EFFECT.damage || 0);
    }
    if (count >= 5) {
      buff.damageBonus += Number(EFFECT.five || 0);
      if (skillType === 'liberation') buff.damageBonus += Number(EFFECT.liberation || 0);
      if (skillType === 'skill') buff.damageBonus += Number(EFFECT.skill || 0);
      if (skillType === 'normal') buff.damageBonus += Number(EFFECT.normal || 0);
      if (skillType === 'heavy') buff.damageBonus += Number(EFFECT.heavy || 0);
    }
    return buff;
  }
};
