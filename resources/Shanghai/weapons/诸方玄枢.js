const wiki = {
  "id": "1280813703350870016",
  "name": "诸方玄枢",
  "star": "5",
  "lastUpdateTime": "2025-10-09",
  "currentVersion": "10.0",
  "effectText": "探源逐本\n\n谐振(1/2/3/4/5)阶\n\n全属性伤害加成提升(12%/15%/18%/21%/24%)。施放共鸣解放时，自身共鸣解放伤害加成提升(48%/60%/72%/84%/96%)，持续8秒；施放共鸣技能时，该效果延长5秒，最多可延长3次。\n\n以稷廷孤学为锻制要理，虽是轻械相衔，却密无罅缝，坚如金石。铸成之器，不为耀武、侵伐，但为破坼万难、钩深索隐。\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: { 1: 0.48, 2: 0.6, 3: 0.72, 4: 0.84, 5: 0.96 },
  skill: null,
  normal: null,
  heavy: null,
  intro: null,
  damage: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "诸方玄枢",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "诸方玄枢"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
