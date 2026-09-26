const wiki = {
  "id": "1236035898198261760",
  "name": "源能佩枪·测叁",
  "star": "3",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "5.0",
  "effectText": "迅生\n谐振(1/2/3/4/5)阶\n施放闪避反击时，回复自身(1.6%/2%/2.4%/2.8%/3.2%) 生命值，每 6 秒可触发 1 次。\n为开发新型黑石武器，华胥研究院以技术验证为目的打造的测试型佩枪，除了不俗的武器性能，最大的特点是能通过攻击提高共鸣者身体活性治愈伤口。\n获取途径： 唤取"
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
  name: "源能佩枪·测叁",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "源能佩枪·测叁"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
