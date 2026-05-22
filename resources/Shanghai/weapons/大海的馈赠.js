const wiki = {
  "id": "1338188138869518336",
  "name": "大海的馈赠",
  "star": "4",
  "lastUpdateTime": "2025-09-29",
  "currentVersion": "5.0",
  "effectText": "渔获\n\n谐振(1/2/3/4/5)阶\n\n对带有【光噪效应】的敌人造成伤害时获得效果：自身衍射伤害提升(6%/7%/8%/9%/10%)，每1秒可获得1层，持续6秒，可叠加4层。\n\n大海是渔民的麦田，收获和希望等同。\n\n获取途径：2.1版本活动获取"
};

const EFFECT = {
  attack: null,
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
  name: "大海的馈赠",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "大海的馈赠"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
