const wiki = {
  "id": "1236043792183128064",
  "name": "奔雷",
  "star": "4",
  "lastUpdateTime": "2024-05-21",
  "currentVersion": "9.0",
  "effectText": "锐不可当\n\n谐振(1/2/3/4/5)阶\n\n造成普攻或重击伤害时，自身共鸣技能伤害加成提升(7%/11%/15%/19%/23%)，可叠加3层，持续10秒。每1秒可触发1次。\n\n此佩枪是瑝珑一州令尹就任仪式上使用的典礼武器，黄金银杏叶花纹代表了瑝珑应如银杏一般，虽孑遗世上，却依旧繁荣长存。\n\n获取途径：先约电台"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: { 1: 0.07, 2: 0.11, 3: 0.15, 4: 0.19, 5: 0.23 },
  normal: null,
  heavy: null,
  intro: null,
  damage: { 1: 0.07, 2: 0.11, 3: 0.15, 4: 0.19, 5: 0.23 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "奔雷",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "奔雷"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
