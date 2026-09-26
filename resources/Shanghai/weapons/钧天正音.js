const wiki = {
  "id": "1255842461463085056",
  "name": "钧天正音",
  "star": "3",
  "lastUpdateTime": "2024-06-28",
  "currentVersion": "3.0",
  "effectText": "轻拢慢捻\n谐振(1/2/3/4/5)阶\n施放变奏技能时，回复(4/5/6/7/8) 点协奏能量；施放延奏技能时，回复(4/5/6/7/8) 点共鸣能量。\n据说是由角褪下的龙鳞打造而成的礼器，比起刀剑，更像是一把乐器。\n获取途径： 纪闻任务“跃动吧，龟舞团”获取"
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
  name: "钧天正音",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "钧天正音"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
