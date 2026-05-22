const wiki = {
  "id": "1233505199486468096",
  "name": "熔山裂谷",
  "lastUpdateTime": "2025-08-23",
  "currentVersion": "11.0",
  "effectText": "熔山裂谷\n\n(2件套)\n\n热熔伤害提升10%\n\n熔山裂谷\n\n(5件套)\n\n使用共鸣技能时，热熔伤害提升30%，持续15秒。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.3,
  "element": "热熔",
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
  name: "熔山裂谷",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "熔山裂谷" };
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
