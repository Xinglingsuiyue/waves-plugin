const wiki = {
  "id": "1236042844271869952",
  "name": "穿击枪-26型",
  "star": "4",
  "lastUpdateTime": "2024-05-21",
  "currentVersion": "6.0",
  "effectText": "穷理洞彻\n\n谐振(1/2/3/4/5)阶\n\n角色没有受到伤害时，每5秒攻击提升(6%/7.5%/9%/10.5%/12%)，可叠加2层，持续8秒。受到伤害时，消耗1层状态，并回复角色(5%/6.25%/7.5%/8.75%/10%)生命。\n\n华胥研究院在此前源能武器的基础上进行自主改进、研发的第一把极具实用性的高性能佩枪，代表着研究院的精研与缜密，直指深邃。\n\n获取途径：印造"
};

const EFFECT = {
  attack: { 1: 0.06, 2: 0.075, 3: 0.09, 4: 0.105, 5: 0.12 },
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
  name: "穿击枪-26型",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "穿击枪-26型"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
