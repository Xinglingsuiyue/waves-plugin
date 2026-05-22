const wiki = {
  "id": "1321877520540549120",
  "name": "渊海回声",
  "star": "4",
  "lastUpdateTime": "2025-01-03",
  "currentVersion": "4.0",
  "effectText": "天星瞭望\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣解放时，自身治疗效果加成提升(16%/20%/24%/28%/32%)，持续15秒。\n\n用于奴役宏伟造物的权柄，而看护它的人也曾手捧王冠，指点星河。 在黎那汐塔洋溢着管风琴声的漫长时光中，它早已遗失了原本的形貌。\n\n获取途径：印造"
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
  name: "渊海回声",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "渊海回声"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
