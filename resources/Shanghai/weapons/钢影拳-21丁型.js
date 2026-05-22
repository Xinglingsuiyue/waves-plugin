const wiki = {
  "id": "1236473086564171776",
  "name": "钢影拳-21丁型",
  "star": "4",
  "lastUpdateTime": "2024-05-21",
  "currentVersion": "5.0",
  "effectText": "谋定入微\n\n谐振(1/2/3/4/5)阶\n\n闪避或冲刺时，攻击提升(8%/10%/12%/14%/16%)，闪避反击造成的伤害提升(50%/62.5%/75%/87.5%/100%)，持续8秒。施放闪避反击时，回复角色(5%/6.25%/7.5%/8.75%/10%)生命，每6秒可触发1次。\n\n华胥研究院在此前源能武器的基础上进行自主改进、研发的第一套极具实用性的高性能臂铠，代表着研究院的关怀与温情，稳固持久。\n\n获取途径：印造"
};

const EFFECT = {
  attack: { 1: 0.08, 2: 0.1, 3: 0.12, 4: 0.14, 5: 0.16 },
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: null,
  heavy: null,
  intro: null,
  damage: { 1: 0.5, 2: 0.625, 3: 0.75, 4: 0.875, 5: 1 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "钢影拳-21丁型",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "钢影拳-21丁型"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
