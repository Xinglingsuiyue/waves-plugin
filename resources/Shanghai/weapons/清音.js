const wiki = {
  "id": "1237130153218080768",
  "name": "清音",
  "star": "4",
  "lastUpdateTime": "2024-05-21",
  "currentVersion": "9.0",
  "effectText": "刚柔并出\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣解放时，自身攻击提升(15%/23.25%/31.5%/39.75%/48%)，持续15秒。\n\n此音感仪是瑝珑一州令尹就任仪式上使用的典礼武器，黄金银杏叶花纹代表了瑝珑应如银杏一般，虽孑遗世上，却依旧繁荣长存。\n\n获取途径：先约电台"
};

const EFFECT = {
  attack: { 1: 0.15, 2: 0.2325, 3: 0.315, 4: 0.3975, 5: 0.48 },
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
  name: "清音",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "清音"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
