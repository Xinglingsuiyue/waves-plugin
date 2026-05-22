const wiki = {
  "id": "1407690589285724160",
  "name": "阳焰",
  "star": "4",
  "lastUpdateTime": "2025-08-27",
  "currentVersion": "5.0",
  "effectText": "狩潮之誓\n\n谐振(1/2/3/4/5)阶\n\n造成普攻或重击伤害时，攻击和重击伤害加成提升(2.2%/3.4%/4.7%/5.9%/7.2%)，可叠加4层，持续7秒，每1秒可触发1次。\n\n七丘授予杰出角斗士的佩枪。武器上的雕纹以狩王鹫为原型设计。狩王鹫是天生的猎手，也是七丘人在这片土地上最初的伙伴。这份情谊无需用笔墨锚定，它永不蒙尘，永远如灼日般璀璨高洁。\n\n获取途径：先约电台寰宇频道"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: null,
  heavy: { 1: 0.022000000000000002, 2: 0.034, 3: 0.047, 4: 0.059000000000000004, 5: 0.07200000000000001 },
  intro: null,
  damage: { 1: 0.022000000000000002, 2: 0.034, 3: 0.047, 4: 0.059000000000000004, 5: 0.07200000000000001 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "阳焰",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "阳焰"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
