const wiki = {
  "id": "1233106270208733184",
  "name": "隐世回光",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "15.0",
  "effectText": "隐世回光\n\n(2件套)\n\n治疗效果提升10%\n\n隐世回光\n\n(5件套)\n\n自身为友方提供治疗时，全队共鸣者攻击力提升15%，持续30秒。"
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
  "damage": 0
};

export default {
  name: "隐世回光",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "隐世回光" };
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
