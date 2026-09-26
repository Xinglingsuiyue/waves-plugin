const wiki = {
  "id": "1236468638647386112",
  "name": "源能臂铠·测肆",
  "star": "3",
  "lastUpdateTime": "2024-06-27",
  "currentVersion": "7.0",
  "effectText": "愈合\n谐振(1/2/3/4/5)阶\n造成普攻伤害时，回复自身(0.5%/0.65%/0.8%/0.95%/1.1%) 生命值，每 3 秒可触发 1 次。\n为开发新型黑石武器，华胥研究院以技术验证为目的打造的测试型臂铠，除了不俗的武器性能，最大的特点是能通过攻击提高共鸣者身体活性治愈伤口。\n获取途径： 唤取"
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
  name: "源能臂铠·测肆",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "源能臂铠·测肆"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
