const wiki = {
  "id": "1321882356887633920",
  "name": "酩酊的英雄志",
  "star": "4",
  "lastUpdateTime": "2025-01-02",
  "currentVersion": "2.0",
  "effectText": "修辞\n\n谐振(1/2/3/4/5)阶\n\n对带有【异常效应】的怪物造成伤害时，自身攻击提升(4%/5%/6%/7%/8%)，持续10秒，每秒可触发1次，可叠加4层。\n\n武器的设计灵感取材自剧目&mdash;&mdash;《酩酊的英雄志》。\n\n那杯中之物，鼓舞灵魂，赐予勇气，以臂铠之膂力逆转命运与战局；或是那同样的祸酿&mdash;&mdash;醉意迷离之时，英雄失去警惕，敌人则趁虚而入。\n\n如此，胜利与毁灭常被书写在那酒渍斑驳的传奇篇章中。\n\n获取途径：印造"
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
  name: "酩酊的英雄志",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "酩酊的英雄志"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
