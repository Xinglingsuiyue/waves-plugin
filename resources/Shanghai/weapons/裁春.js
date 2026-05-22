const wiki = {
  "id": "1304884557002854400",
  "name": "裁春",
  "star": "5",
  "lastUpdateTime": "2025-09-29",
  "currentVersion": "8.0",
  "effectText": "终始之外\n\n谐振(1/2/3/4/5)阶\n\n攻击提升（12%/15%/18%/21%/24%）。造成普攻伤害时，自身普攻伤害加成提升（10%/12.5%/15%/17.5%/20%），持续14秒，每秒可触发1次，可叠加3层；\n\n自身的协奏能量消耗时，自身普攻伤害加成提升 （40%/50%/60%/70%/80%），持续10秒，每秒可触发1次，若切换至其他角色则该效果提前结束。\n\n静寂抽枝的椿花之种。\n她将如约绽放的无限世界盛在掌心，让细小的赤色藤蔓与指尖缠绕相连。\n恰似沙砾厮磨心脏的隐约痛楚，即是彼此相遇的证明。\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.12, 3: 0.12, 4: 0.12, 5: 0.12 },
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: { 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1 },
  heavy: null,
  intro: null,
  damage: { 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "裁春",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "裁春"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
