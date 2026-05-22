const wiki = {
  "id": "1235740456805793792",
  "name": "飞景",
  "star": "4",
  "lastUpdateTime": "2024-05-21",
  "currentVersion": "9.0",
  "effectText": "白刃疾风\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣技能时，自身普攻和重击伤害加成提升(20%/31%/42%/53%/64%)，可叠加1层，持续10秒。每秒可触发1次。\n\n此迅刀是瑝珑一州令尹就任仪式上使用的典礼武器，黄金银杏叶花纹代表了瑝珑应如银杏一般，虽孑遗世上，却依旧繁荣长存。\n\n获取途径：先约电台"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: null,
  heavy: { 1: 0.2, 2: 0.31, 3: 0.42, 4: 0.53, 5: 0.64 },
  intro: null,
  damage: { 1: 0.2, 2: 0.31, 3: 0.42, 4: 0.53, 5: 0.64 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "飞景",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "飞景"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
