const wiki = {
  "id": "1234556940667650048",
  "name": "纹秋",
  "star": "4",
  "lastUpdateTime": "2024-05-29",
  "currentVersion": "11.0",
  "effectText": "锋芒所向\n\n谐振(1/2/3/4/5)阶\n\n造成普攻或重击伤害时，攻击提升(4%/6.2%/8.4%/10.6%/12.8%)，可叠加5层，持续7秒，每秒可触发1次。\n\n此长刃是瑝珑一州令尹就任仪式上使用的典礼武器，黄金银杏叶花纹代表了瑝珑应如银杏一般，虽孑遗世上，却依旧繁荣长存。\n\n获取途径：先约电台"
};

const EFFECT = {
  attack: { 1: 0.04, 2: 0.062, 3: 0.084, 4: 0.106, 5: 0.128 },
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
  name: "纹秋",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "纹秋"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
