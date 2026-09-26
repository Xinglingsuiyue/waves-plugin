const wiki = {
  "id": "1236035253667954688",
  "name": "戍关佩枪·平云",
  "star": "3",
  "lastUpdateTime": "2024-05-24",
  "currentVersion": "6.0",
  "effectText": "同心\n谐振(1/2/3/4/5)阶\n共鸣技能伤害加成提升(12%/15%/18%/21%/24%) 。\n初代今州令尹为纪念守住边关、帮助建城的神秘人，根据其指导打造出戍关系列。如今，它已成为新型武器研发绕不开的基石。\n获取途径： 世界探索"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  normal: null,
  heavy: null,
  intro: null,
  damage: null
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "戍关佩枪·平云",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "戍关佩枪·平云"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
