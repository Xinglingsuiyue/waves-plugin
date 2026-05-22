const wiki = {
  "id": "1364764186496806912",
  "name": "林间的咏叹调",
  "star": "5",
  "lastUpdateTime": "2025-05-22",
  "currentVersion": "2.0",
  "effectText": "长夏咏颂\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。为目标添加【风蚀效应】时，自身气动伤害加成提升(24%/30%/36%/42%/48%)，持续10秒。攻击命中带有【风蚀效应】的敌人时，降低对方 (10%/11.5%/13%/14.5%/16%)的气动抗性，持续20秒。同名效果之间不可叠加。\n\n万物皆于诗行之中，万物之声皆于音律之中。 林间的乐声攀着无形天梯螺旋向上。\n\n月光为旋律沐浴银辉，夜莺为和声伴唱。\n\n当最后一个音符坠入寂静的大地上，完美的回声在大地胸腔永恒回响。\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: null,
  heavy: null,
  intro: null,
  damage: { 1: 0.24, 2: 0.3, 3: 0.36, 4: 0.42, 5: 0.48 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "林间的咏叹调",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "林间的咏叹调"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
