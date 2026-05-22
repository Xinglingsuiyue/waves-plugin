const wiki = {
  "id": "1405274897448968192",
  "name": "驭冕铸雷之权",
  "star": "5",
  "lastUpdateTime": "2025-10-09",
  "currentVersion": "10.0",
  "effectText": "炽烈权霆\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。施放变奏技能或共鸣技能时，重击伤害提升(20%/25%/30%/35%/40%)，持续15秒；自身获得护盾时，重击伤害无视目标(7.2%/8.4%/9.6%/10.8%/12%)防御，每0.5秒可生效1次，可叠加5层，持续7秒。\n\n雷霆会灼净她的沉疴与软弱，在那由血与砂铸成的熔炉中，她将不再是尘埃，而是辉煌夺目的太阳。\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: null,
  heavy: { 1: 0.2, 2: 0.25, 3: 0.3, 4: 0.35, 5: 0.4 },
  intro: null,
  damage: null
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "驭冕铸雷之权",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "驭冕铸雷之权"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
