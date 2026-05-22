const wiki = {
  "id": "1408881479672999936",
  "name": "荣斗铸锋之冠",
  "lastUpdateTime": "2025-08-26",
  "currentVersion": "7.0",
  "effectText": "荣斗铸锋之冠\n\n(3件套)\n\n角色获得护盾时，自身攻击提升6%，暴击伤害提升4%，该效果可叠加5层，持续4秒，每0.5秒可触发一次。"
};

const EFFECT = {
  "two": 0,
  "five": 0,
  "element": "",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0.06,
  "critRate": 0,
  "critDamage": 0.04,
  "damage": 0
};

export default {
  name: "荣斗铸锋之冠",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "荣斗铸锋之冠" };
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
