const wiki = {
  "id": "1236474584931692544",
  "name": "金掌",
  "star": "4",
  "lastUpdateTime": "2025-09-17",
  "currentVersion": "7.0.1",
  "effectText": "破壁攻坚\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣技能时，自身共鸣解放伤害加成提升(18%/27%/36%/45%/54%)，效果持续15秒。\n\n此臂铠是瑝珑一州令尹就任仪式上使用的典礼武器，黄金银杏叶花纹代表了瑝珑应如银杏一般，虽孑遗世上，却依旧繁荣长存。\n\n获取途径：先约电台"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: { 1: 0.18, 2: 0.27, 3: 0.36, 4: 0.45, 5: 0.54 },
  skill: null,
  normal: null,
  heavy: null,
  intro: null,
  damage: { 1: 0.18, 2: 0.27, 3: 0.36, 4: 0.45, 5: 0.54 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "金掌",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "金掌"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
