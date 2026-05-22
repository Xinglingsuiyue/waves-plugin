const wiki = {
  "id": "1234660319850987520",
  "name": "浩境粼光",
  "star": "5",
  "lastUpdateTime": "2025-09-29",
  "currentVersion": "12.0",
  "effectText": "扬波无止\n\n谐振(1/2/3/4/5)阶\n\n共鸣效率提升（12.8%/16%/19.2%/22.4%/25.6%）。施放共鸣技能时，共鸣解放伤害加成提升（7%/8.75%/10.5%/12.25%/14%），可叠加3层，持续12秒。\n\n凝视它&mdash;&mdash;在凛冽的刃锋之中，仿佛能看到微风骤起，那片无止尽的湖水泛起阵阵冰寒粼光。忘我地挥舞这把长刃，便能感觉到如水般清澈的刀身中积蓄的能量。\n\n获取途径：武器常驻唤取，活动“初醒之征程“"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: { 1: 0.07, 2: 0.07, 3: 0.07, 4: 0.07, 5: 0.07 },
  skill: null,
  normal: null,
  heavy: null,
  intro: null,
  damage: { 1: 0.07, 2: 0.07, 3: 0.07, 4: 0.07, 5: 0.07 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "浩境粼光",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "浩境粼光"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
