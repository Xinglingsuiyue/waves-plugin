const wiki = {
  "id": "1289338258391371776",
  "name": "永续坍缩",
  "star": "4",
  "lastUpdateTime": "2024-10-15",
  "currentVersion": "3.0",
  "effectText": "彼岸眼瞳\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣技能时，获得(6/7/8/9/10)点共鸣能量，且攻击提升(10%/12.5%/15%/17.5%/20%)，持续16秒。该效果每20秒可触发1次。\n\n黑海岸为资深战斗人员研发的实验型武器，以耀变体的心脏为名的迅刀。“耀变“是特殊类星体的名字，它们迸发的光辉仅仅投向此处&mdash;&mdash;即使相隔百亿光年，也能观测到它们的痕迹。\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: { 1: 0.1, 2: 0.125, 3: 0.15, 4: 0.175, 5: 0.2 },
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
  name: "永续坍缩",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "永续坍缩"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
