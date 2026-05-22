const wiki = {
  "id": "1236044731675115520",
  "name": "停驻之烟",
  "star": "5",
  "lastUpdateTime": "2026-03-05",
  "currentVersion": "9.0",
  "effectText": "削肉蚀骨\n\n谐振(1/2/3/4/5)阶\n\n共鸣效率提升(12.8%/16%/19.2%/22.4%/25.6%)。施放延奏技能后，入场角色攻击提升(10%/12.5%/15%/17.5%/20%)，可叠加1层，持续14秒。\n\n抓住它&mdash;&mdash;在凄清的枪身之中，仿佛能抓住那宛若静止的万里湖烟，瞬间冻结的冰砾停于指缝。握住这佩枪的扳机，让喷吐出的浓厚湖烟，蔓延在战场的每一个角落。\n\n获取途径：武器常驻唤取，活动“初醒之征程“"
};

const EFFECT = {
  attack: { 1: 0.1, 2: 0.125, 3: 0.15, 4: 0.175, 5: 0.2 },
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
  name: "停驻之烟",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "停驻之烟"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
