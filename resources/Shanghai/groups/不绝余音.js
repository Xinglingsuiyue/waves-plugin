const wiki = {
  "id": "1233505098310021120",
  "name": "不绝余音",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "17.0",
  "effectText": "不绝余音\n\n(2件套)\n\n攻击力提升10%\n\n不绝余音\n\n(5件套)\n\n在场时，自身攻击力每1.5秒提升5%，该效果最多叠加四层。\n\n延奏技能伤害提升60%"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.05,
  "element": "",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0.1,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0
};

export default {
  name: "不绝余音",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "不绝余音" };
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
