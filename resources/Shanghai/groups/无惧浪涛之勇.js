const wiki = {
  "id": "1321897948803911680",
  "name": "无惧浪涛之勇",
  "lastUpdateTime": "2025-08-23",
  "currentVersion": "8.0",
  "effectText": "无惧浪涛之勇\n\n(2件套)\n\n共鸣效率提升10%\n\n无惧浪涛之勇\n\n(5件套)\n\n角色攻击提升15%，共鸣效率达到250%后，当前角色全属性伤害提升30%。\n\n "
};

const EFFECT = {
  "two": 0.1,
  "five": 0.15,
  "element": "",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0.15,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0.3
};

export default {
  name: "无惧浪涛之勇",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "无惧浪涛之勇" };
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
