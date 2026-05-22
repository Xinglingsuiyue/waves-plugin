const wiki = {
  "id": "1321880032035258368",
  "name": "叙别的罗曼史",
  "star": "4",
  "lastUpdateTime": "2025-01-02",
  "currentVersion": "2.0",
  "effectText": "修辞\n\n谐振(1/2/3/4/5)阶\n\n对带有【异常效应】的怪物造成伤害时，自身攻击提升(4%/5%/6%/7%/8%)，持续10秒，每秒可触发1次，可叠加4层。\n\n武器的设计灵感取材自剧目&mdash;&mdash;《叙别的罗曼史》。\n\n手中紧握的佩枪，是争夺名利的承诺，是不得之爱的沉重，是未言的词句，颤抖中的沉默，更是永远无法实现的爱的阴影。\n\n终幕，它竟成了那最后的告别&mdash;&mdash;扳机声扣响，幕布落下时的轰然震动，徒留一片无法言说的哀伤，回荡在未亡人的心头。\n\n获取途径：印造"
};

const EFFECT = {
  attack: { 1: 0.04, 2: 0.05, 3: 0.06, 4: 0.07, 5: 0.08 },
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
  name: "叙别的罗曼史",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "叙别的罗曼史"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
