const wiki = {
  "id": "1407694189462368256",
  "name": "曜光",
  "star": "4",
  "lastUpdateTime": "2025-08-27",
  "currentVersion": "5.0",
  "effectText": "狩潮之誓\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣技能时，攻击和普攻伤害加成提升(9%/13.9%/18.9%/23.8%/28.8%)，持续10秒。\n\n七丘授予杰出角斗士的音感仪。武器上的雕纹以狩王鹫为原型设计。狩王鹫是天生的猎手，也是七丘人在这片土地上最初的伙伴。这份情谊无需用笔墨锚定，它永不蒙尘，永远如灼日般璀璨高洁。\n\n获取途径：先约电台寰宇频道"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: { 1: 0.09, 2: 0.139, 3: 0.18899999999999997, 4: 0.23800000000000002, 5: 0.28800000000000003 },
  heavy: null,
  intro: null,
  damage: { 1: 0.09, 2: 0.139, 3: 0.18899999999999997, 4: 0.23800000000000002, 5: 0.28800000000000003 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "曜光",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "曜光"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
