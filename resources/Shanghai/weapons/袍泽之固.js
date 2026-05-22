const wiki = {
  "id": "1236471541259497472",
  "name": "袍泽之固",
  "star": "4",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "6.0",
  "effectText": "无衣长歌\n\n谐振(1/2/3/4/5)阶\n\n施放变奏技能时，自身共鸣解放伤害加成提升(20%/25%/30%/35%/40%)，持续15秒。\n\n为纪念夜归战士的同袍之义而打造的臂铠。有诗赞曰“薄衣难抵霜晨月，铁甲能断星垂寒。“\n\n获取途径：唤取，公测发放自选箱"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: { 1: 0.2, 2: 0.25, 3: 0.3, 4: 0.35, 5: 0.4 },
  skill: null,
  normal: null,
  heavy: null,
  intro: null,
  damage: { 1: 0.2, 2: 0.25, 3: 0.3, 4: 0.35, 5: 0.4 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "袍泽之固",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "袍泽之固"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
