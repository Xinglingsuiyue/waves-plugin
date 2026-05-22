const wiki = {
  "id": "1234520763155677184",
  "name": "永夜长明",
  "star": "4",
  "lastUpdateTime": "2024-09-27",
  "currentVersion": "9.0.2",
  "effectText": "枕戈待旦\n\n谐振(1/2/3/4/5)阶\n\n施放变奏技能时，自身攻击提升(8%/10%/12%/14%/16%)，防御提升(15%/18.75%/22.5%/26.25%/30%)，持续15秒。\n\n为纪念夜归战士的常备不懈而打造的长刃。有诗赞曰：“漫漫长夜秋萧瑟，点点星光负长缨。“\n\n获取途径：唤取，公测发放自选箱，焚焰海废墟最高层"
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
  name: "永夜长明",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "永夜长明"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
