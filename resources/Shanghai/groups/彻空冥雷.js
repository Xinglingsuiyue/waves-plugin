const wiki = {
  "id": "1233505002939936768",
  "name": "彻空冥雷",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "14.0",
  "effectText": "彻空冥雷\n\n(2件套)\n\n导电伤害提升10%\n\n彻空冥雷\n\n(5件套)\n\n使用重击或共鸣技能时，各获得一层导电伤害提升15%的效果，该效果可叠加两层，每层各持续15秒。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.15,
  "element": "导电",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0
};

export default {
  name: "彻空冥雷",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "彻空冥雷" };
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
