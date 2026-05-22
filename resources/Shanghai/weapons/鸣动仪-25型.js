const wiki = {
  "id": "1237126664622505984",
  "name": "鸣动仪-25型",
  "star": "4",
  "lastUpdateTime": "2024-05-21",
  "currentVersion": "5.0",
  "effectText": "创制开先\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣技能时，若角色生命低于60%，回复角色(5%/6.25%/7.5%/8.75%/10%)生命值，每8秒可触发1次；若角色生命高于60%，则攻击提升(12%/15%/18%/21%/24%)，持续10秒。\n\n华胥研究院在此前源能武器的基础上进行自主改进、研发的第一个极具实用性的高性能音感仪，代表着研究院的多元与创新，瞬息万状。\n\n获取途径：印造"
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
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
  name: "鸣动仪-25型",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "鸣动仪-25型"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
