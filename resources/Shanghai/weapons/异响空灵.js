const wiki = {
  "id": "1234655249734369280",
  "name": "异响空灵",
  "star": "4",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "7.0",
  "effectText": "咏叹之音\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣技能时，回复（8/10/12/14/16）点协奏能量，每20秒可触发1次。\n\n以乐谱频率为灵感创作的长刃。音阶下行，手持此刃，将以异响之力引领战局，佳作永不落幕。\n\n获取途径：唤取"
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
  name: "异响空灵",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "异响空灵"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
