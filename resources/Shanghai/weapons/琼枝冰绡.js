const wiki = {
  "id": "1273093321734635520",
  "name": "琼枝冰绡",
  "star": "5",
  "lastUpdateTime": "2025-09-29",
  "currentVersion": "4.0",
  "effectText": "景外之景\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。施放共鸣技能时，自身在场时普攻伤害加成提升(12%/15%/18%/21%/24%)，可叠加3层，持续6秒。施放延奏技能时，若已累计3层效果，则移除全部层数，使自身不在场时普攻伤害加成提升(52%/65%/78%/91%/104%)，持续27秒。\n\n奇峰搜尽，遍览山林，\n玉印见证了无数胜景离跃纸上的生机，\n攀援而出的花枝指向即将新生的又一处深远画境。\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  heavy: null,
  intro: null,
  damage: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "琼枝冰绡",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "琼枝冰绡"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
