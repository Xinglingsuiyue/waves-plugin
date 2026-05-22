const wiki = {
  "id": "1234657707445518336",
  "name": "东落",
  "star": "4",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "6.0",
  "effectText": "潜能蕴蓄\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣技能后12秒内，每2秒攻击提升（3%/3.75%/4.5%/5.25%/6%），可叠加4层。每12秒可触发1次。当层数达到4层后，6秒内重置全部层数。\n\n因空中奇象而生的长刃。锻造者将目睹异星的感受融于武器之中，使它看起来镂空轻盈、却能发挥出星陨时那般无敌重力。\n\n获取途径：唤取"
};

const EFFECT = {
  attack: { 1: 0.03, 2: 0.03, 3: 0.03, 4: 0.03, 5: 0.03 },
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
  name: "东落",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "东落"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
