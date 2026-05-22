const wiki = {
  "id": "1321879342078644224",
  "name": "容赦的沉思录",
  "star": "4",
  "lastUpdateTime": "2025-01-02",
  "currentVersion": "4.0",
  "effectText": "修辞\n\n谐振(1/2/3/4/5)阶\n\n对带有【异常效应】的怪物造成伤害时，自身攻击提升(4%/5%/6%/7%/8%)，持续10秒，每秒可触发1次，可叠加4层。\n\n武器的设计灵感取材自剧目&mdash;&mdash;《容赦的沉思录》。\n\n武夫挥击长刃的间隙，思忖着沉重的宽恕之责&mdash;&mdash;是终结他人罪恶的命运，抑或施予怜悯，将灵魂从深渊中解救？每一次挥剑的背后，皆隐藏着审判的痛苦，是愤怒与宽恕的搏斗。\n\n获取途径：印造"
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
  name: "容赦的沉思录",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "容赦的沉思录"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
