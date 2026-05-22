const wiki = {
  "id": "1305717970844463104",
  "name": "心之锚",
  "star": "4",
  "lastUpdateTime": "2024-11-14",
  "currentVersion": "1.0",
  "effectText": "喵呜！\n\n谐振(1/2/3/4/5)阶\n\n在场造成伤害时获得1层【凶猛】，每1秒可获得1层。【凶猛】：每1层使自身攻击提升(2%/2.5%/3%/3.5%/4%) ，持续3秒，可叠加10层，角色离场时，清除所有层数。【凶猛】为10层时，自身暴击提升(6%/7.5%/9%/10.5%/12%) 。\n\n曾被白色守门人用于稳定心之集域的锚定装置。 在白色守门人被变化为了白猫的形态后，这个装置的外形也发生了一些变化&hellip;&hellip;\n\n获取途径：1.4版本活动获取"
};

const EFFECT = {
  attack: { 1: 0.02, 2: 0.025, 3: 0.03, 4: 0.035, 5: 0.04 },
  critRate: { 1: 0.06, 2: 0.075, 3: 0.09, 4: 0.105, 5: 0.12 },
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
  name: "心之锚",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "心之锚"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
