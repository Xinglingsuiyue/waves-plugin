const wiki = {
  "id": "1449157687111086080",
  "name": "宙算仪轨",
  "star": "5",
  "lastUpdateTime": "2026-01-15",
  "currentVersion": "5.0",
  "effectText": "定解\n\n谐振(1/2/3/4/5)阶\n\n防御提升(16%/20%/24%/28%/32%)。施放共鸣技能时，回复自身(8/10/12/14/16)点协奏能量，每20秒可触发1次。造成治疗时，使附近队伍中所有角色的暴击伤害提升(20%/25%/30%/35%/40%)，持续4秒，同名效果之间不可叠加。\n\n一切规律皆可被观测，一切现象皆可被析解。\n正如理想远在光年之外，抵达的方法却在双手咫尺之间。\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: { 1: 0.2, 2: 0.25, 3: 0.3, 4: 0.35, 5: 0.4 },
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
  name: "宙算仪轨",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "宙算仪轨"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
