const wiki = {
  "id": "1237354288028385280",
  "name": "掣傀之手",
  "star": "5",
  "lastUpdateTime": "2025-09-29",
  "currentVersion": "9.0",
  "effectText": "密电增幅\n\n谐振(1/2/3/4/5)阶\n\n全属性伤害加成提升(12%/15%/18%/21%/24%)。造成共鸣技能伤害时，自身攻击提升(12%/15%/18%/21%/24%)，可叠加2层，效果持续5秒。自身不在场时，该效果攻击额外提升(12%/15%/18%/21%/24%)。\n\n金掌张开，绳索引动，凌空天象凝集其中，所向之敌会被无形的气势所压迫而无法动作，千束疾电造成的伤痕将永远无法愈合。\n\n获取途径：武器活动唤取"
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
  damage: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "掣傀之手",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "掣傀之手"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
