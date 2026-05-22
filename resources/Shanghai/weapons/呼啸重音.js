const wiki = {
  "id": "1236470883560521728",
  "name": "呼啸重音",
  "star": "4",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "5.0",
  "effectText": "咏叹之音\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣技能时，回复(8/10/12/14/16)点协奏能量，每20秒可触发1次。\n\n以乐谱频率为灵感创作的臂铠。音阶下行，臂有此铠，以巨浪之音呼啸狂怒，锻造高昂交响。\n\n获取途径：唤取"
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
  name: "呼啸重音",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "呼啸重音"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
