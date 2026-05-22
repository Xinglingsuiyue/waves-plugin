const wiki = {
  "id": "1467167453366157312",
  "name": "白昼之脊",
  "star": "5",
  "lastUpdateTime": "2026-02-26",
  "currentVersion": "2.0",
  "effectText": "缝合晨昏\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。\n\n造成普攻伤害后，衍射伤害加成提升(20%/25%/30%/35%/40%)，持续4秒。\n\n每次为敌方怪物附加【集谐·偏移】后，普攻伤害加深(20%/25%/30%/35%/40%)，且普攻伤害能无视目标(10%/12.5%/15%/17.5%/20%)防御，持续6秒。\n\n那不是山峦，是大地背负黑夜的脊骨。它撕开长夜的腹腔，天空在创口处淌出新生的光。\n你的影子被钉在昨夜，而肉身将于尖锐的破晓中重新浇筑。\n它会替你质问所有阖上的门。\n\n获取途径：武器活动唤取"
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
  damage: { 1: 0.2, 2: 0.25, 3: 0.3, 4: 0.35, 5: 0.4 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "白昼之脊",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "白昼之脊"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
