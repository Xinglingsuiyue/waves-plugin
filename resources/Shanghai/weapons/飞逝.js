const wiki = {
  "id": "1236041531165310976",
  "name": "飞逝",
  "star": "4",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "6.0",
  "effectText": "一息万变\n\n谐振(1/2/3/4/5)阶\n\n角色冲刺或闪避时，攻击提升(4%/5%/6%/7%/8%)，持续8秒，可叠加3层。\n\n因空中奇象而生的佩枪。锻造者将目睹异星的感受融于武器之中，使它看起来镂空轻盈、却稳定性极强，出枪弹雨有雷霆威力。\n\n获取途径：唤取"
};

const EFFECT = {
  attack: { 1: 0.04, 2: 0.05, 3: 0.06, 4: 0.07, 5: 0.08 },
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
  name: "飞逝",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "飞逝"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
