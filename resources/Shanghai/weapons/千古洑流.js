const wiki = {
  "id": "1235741466408321024",
  "name": "千古洑流",
  "star": "5",
  "lastUpdateTime": "2025-09-29",
  "currentVersion": "11.0",
  "effectText": "流涡无垠\n\n谐振(1/2/3/4/5)阶\n\n共鸣效率提升（12.8%/16%/19.2%/22.4%/25.6%）。施放共鸣技能时，攻击提升（6%/7.5%/9%/10.5%/12%），可叠加2层，持续10秒。\n\n倾听它&mdash;&mdash;在冷峭的刀刃之下，仿佛能听见极寒冰流暗涌的声音，思想渐渐如水般聚流成涡。跟随此流向翻飞，手中的迅刀将吞噬一切落入其中的敌人。\n\n获取途径：武器常驻唤取，活动“初醒之征程“"
};

const EFFECT = {
  attack: { 1: 0.06, 2: 0.06, 3: 0.06, 4: 0.06, 5: 0.06 },
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
  name: "千古洑流",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "千古洑流"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
