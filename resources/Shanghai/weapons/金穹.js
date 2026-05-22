const wiki = {
  "id": "1407116510169145344",
  "name": "金穹",
  "star": "4",
  "lastUpdateTime": "2025-08-27",
  "currentVersion": "5.0",
  "effectText": "狩潮之誓\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣解放时，攻击提升(7.2%/11.1%/15.1%/19%/23%)，重击伤害加成提升(10.8%/16.7%/22.6%/28.6%/34.5%)，持续15秒。\n\n七丘授予杰出角斗士的长刃。武器上的雕纹以狩王鹫为原型设计。狩王鹫是天生的猎手，也是七丘人在这片土地上最初的伙伴。这份情谊无需用笔墨锚定，它永不蒙尘，永远如灼日般璀璨高洁。\n\n获取途径：先约电台寰宇频道"
};

const EFFECT = {
  attack: { 1: 0.07200000000000001, 2: 0.111, 3: 0.151, 4: 0.19, 5: 0.23 },
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: null,
  heavy: { 1: 0.10800000000000001, 2: 0.16699999999999998, 3: 0.226, 4: 0.28600000000000003, 5: 0.345 },
  intro: null,
  damage: { 1: 0.10800000000000001, 2: 0.16699999999999998, 3: 0.226, 4: 0.28600000000000003, 5: 0.345 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "金穹",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "金穹"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
