const wiki = {
  "id": "1237120942685880320",
  "name": "源能音感仪·测五",
  "star": "3",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "6.0",
  "effectText": "扶助\n谐振(1/2/3/4/5)阶\n施放变奏技能时，回复自身(5%/6.25%/7.5%/8.75%/10%) 生命值，每 20 秒可触发 1 次。\n为开发新型黑石武器，华胥研究院以技术验证为目的打造的测试型音感仪，除了不俗的武器性能，最大的特点是能通过攻击提高共鸣者身体活性治愈伤口。\n获取途径： 唤取"
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
  name: "源能音感仪·测五",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "源能音感仪·测五"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
