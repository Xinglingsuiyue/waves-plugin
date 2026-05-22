const wiki = {
  "id": "1237127161969045504",
  "name": "今州守望",
  "star": "4",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "7.0",
  "effectText": "忠诚卫士\n\n谐振(1/2/3/4/5)阶\n\n施放变奏技能时，自身攻击提升(8%/10%/12%/14%/16%)，生命提升(10%/12.5%/15%/17.5%/20%)，持续15秒。\n\n为纪念夜归战士对今州的守护而打造的音感仪。有诗赞曰：“湖城北望荒石岭，氤氲暗雨遮朔关。“\n\n获取途径：唤取，公测发放自选箱"
};

const EFFECT = {
  attack: { 1: 0.08, 2: 0.1, 3: 0.12, 4: 0.14, 5: 0.16 },
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
  name: "今州守望",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "今州守望"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
