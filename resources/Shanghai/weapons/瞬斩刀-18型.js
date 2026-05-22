const wiki = {
  "id": "1235736228783783936",
  "name": "瞬斩刀-18型",
  "star": "4",
  "lastUpdateTime": "2024-05-21",
  "currentVersion": "7.0",
  "effectText": "踔时之进\n\n谐振(1/2/3/4/5)阶\n\n生命低于(40%/50%/60%/70%/80%)时，重击伤害加成提升(18%/22.5%/27%/31.5%/36%)，造成重击伤害时回复当前角色 (5%/6.25%/7.5%/8.75%/10%)生命值，每8秒可触发1次。\n\n华胥研究院在此前源能武器的基础上进行自主改进、研发的第一把极具实用性的高性能迅刀，代表着研究院的过往与发展，历久弥新。\n\n获取途径：印造"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: null,
  heavy: { 1: 0.18, 2: 0.225, 3: 0.27, 4: 0.315, 5: 0.36 },
  intro: null,
  damage: { 1: 0.18, 2: 0.225, 3: 0.27, 4: 0.315, 5: 0.36 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "瞬斩刀-18型",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "瞬斩刀-18型"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
