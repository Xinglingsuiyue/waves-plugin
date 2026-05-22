const wiki = {
  "id": "1235737480380874752",
  "name": "不归孤军",
  "star": "4",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "6.0",
  "effectText": "一往无前\n\n谐振(1/2/3/4/5)阶\n\n施放变奏技能时，自身攻击提升(15%/18.75%/22.5%/26.25%/30%)。持续15秒。\n\n为纪念夜归战士的一往无前而打造的迅刀。有诗赞曰：“千音万阙传惊鼓，百兵一心出云陵。“\n\n获取途径：唤取，公测发放自选箱"
};

const EFFECT = {
  attack: { 1: 0.15, 2: 0.1875, 3: 0.225, 4: 0.2625, 5: 0.3 },
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
  name: "不归孤军",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "不归孤军"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
