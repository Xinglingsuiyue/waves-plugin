const wiki = {
  "id": "1234546642669862912",
  "name": "原初长刃·朴石",
  "star": "2",
  "lastUpdateTime": "2024-07-01",
  "currentVersion": "5.0",
  "effectText": "启程\n谐振(1/2/3/4/5)阶\n攻击提升(5%/6.25%/7.5%/8.75%/10%)。\n专为新手共鸣者特制的长刃，低调朴实的外表下，蕴含着不容小觑的战斗力。\n获取途径： 世界探索，任务奖励"
};

const EFFECT = {
  attack: { 1: 0.05, 2: 0.0625, 3: 0.075, 4: 0.0875, 5: 0.1 },
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
  name: "原初长刃·朴石",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "原初长刃·朴石"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
