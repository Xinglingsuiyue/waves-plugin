const wiki = {
  "id": "1321882647069708288",
  "name": "高天共奏之曲",
  "lastUpdateTime": "2026-05-22",
  "currentVersion": "8.0",
  "effectText": "高天共奏之曲\n\n(2件套)\n\n共鸣效率提升10%。\n\n高天共奏之曲\n\n(5件套)\n\n当前角色协同攻击造成的伤害提升80%；协同攻击命中敌人且暴击时，队伍中登场角色攻击力提升20%，持续4秒。\n\n "
};

const EFFECT = {
  "two": 0.1,
  "five": 0.8,
  "element": "",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0.2,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0
};

export default {
  name: "高天共奏之曲",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "高天共奏之曲" };
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
