const wiki = {
  "id": "1406657702170992640",
  "name": "万物持存的注释",
  "star": "5",
  "lastUpdateTime": "2025-09-17",
  "currentVersion": "5.0",
  "effectText": "昼月缀界\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。施放变奏技能或共鸣解放时，共鸣解放伤害提升(20%/25%/30%/35%/40%)，持续15秒。自身获得护盾时：共鸣解放伤害无视目标(7.2%/8.4%/9.6%/10.8%/12%)防御，每0.5秒可生效1次，可叠加5层，持续7秒；施放变奏技能时，无视目标防御的效果视为满层，持续3秒。\n\n万物以何持存？\n\n以光热、以实质、以言语，以推演偶合的运作，以破碎沉没的轻吻，以仿佛永续的瞬间&hellip;&hellip;\n\n万物往复更迭，均有各自的注解，而她的，就在此处，就握在自己手中。\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  critRate: null,
  critDamage: null,
  liberation: { 1: 0.2, 2: 0.25, 3: 0.3, 4: 0.35, 5: 0.4 },
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
  name: "万物持存的注释",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "万物持存的注释"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
