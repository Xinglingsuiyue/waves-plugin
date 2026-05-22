const wiki = {
  "id": "1237128153629786112",
  "name": "异度",
  "star": "4",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "5.0",
  "effectText": "重光护持\n\n谐振(1/2/3/4/5)阶\n\n造成普攻或重击伤害时，治疗效果加成提升(3%/3.5%/4%/4.5%/5%)，持续8秒，可叠加3层，每0.6秒可触发1次。\n\n因空中奇象而生的音感仪。锻造者将目睹异星的感受融于武器之中，使它看起来纤巧轻盈、却能沉稳恒定、应变有方。\n\n获取途径：唤取"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: null,
  heavy: null,
  intro: null,
  damage: null
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "异度",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "异度"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
