const wiki = {
  "id": "1236476554553131008",
  "name": "擎渊怒涛",
  "star": "5",
  "lastUpdateTime": "2025-09-29",
  "currentVersion": "9.0",
  "effectText": "噬渊沦亡\n\n谐振(1/2/3/4/5)阶\n\n共鸣效率提升(12.8%/16%/19.2%/22.4%/25.6%)。造成共鸣技能伤害时，普攻伤害加成提升(10%/12.5%/15%/17.5%/20%)，持续8秒。造成普攻伤害时，共鸣技能伤害加成提升(10%/12.5%/15%/17.5%/20%)，持续8秒。\n\n感受它&mdash;&mdash;在暴烈的臂铠之上，仿佛能感受到来自湖底未知深潭的翻涌怒涛，不可名状，不可消解。咆哮着戴上此臂铠，向敌人宣泄无处可去的愤怒。\n\n获取途径：武器常驻唤取，活动“初醒之征程“"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: { 1: 0.1, 2: 0.125, 3: 0.15, 4: 0.175, 5: 0.2 },
  normal: { 1: 0.1, 2: 0.125, 3: 0.15, 4: 0.175, 5: 0.2 },
  heavy: null,
  intro: null,
  damage: { 1: 0.1, 2: 0.125, 3: 0.15, 4: 0.175, 5: 0.2 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "擎渊怒涛",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "擎渊怒涛"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
