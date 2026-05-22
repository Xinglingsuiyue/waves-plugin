const wiki = {
  "id": "1212075560371568640",
  "name": "苍鳞千嶂",
  "star": "5",
  "lastUpdateTime": "2025-09-29",
  "currentVersion": "23.0",
  "effectText": "金戈铁马\n\n谐振(1/2/3/4/5)阶\n\n全属性伤害提升(12%/15%/18%/21%/24%)。每次施放变奏技能或共鸣解放时，自身重击伤害提升(24%/30%/36%/42%/48%)，可叠加2层，效果持续14秒。\n\n千年高山为脊，万载江水为刃，天地自化，凝成此器。利刃出鞘，龙吟破空，顷刻间白波若山，海水震荡，声侔电神，惮赫千里。\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: null,
  heavy: { 1: 0.24, 2: 0.3, 3: 0.36, 4: 0.42, 5: 0.48 },
  intro: null,
  damage: null
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "苍鳞千嶂",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "苍鳞千嶂"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
