const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  skillDamage: { 1: 0.20, 2: 0.25, 3: 0.30, 4: 0.35, 5: 0.40 },
  heavyDeepen: { 1: 0.30, 2: 0.375, 3: 0.45, 4: 0.525, 5: 0.60 },
  heavyIgnoreDefense: { 1: 0.10, 2: 0.125, 3: 0.15, 4: 0.175, 5: 0.20 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: '蜃影',

  apply({ panel, skillType, options }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const skillStacks = Math.max(1, Math.min(2, Number(options?.skillStacks ?? 2)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: 0,
      deepen: 0,
      ignoreDefense: 0,
      source: '蜃影'
    };

    if (skillType === 'skill') {
      buff.damageBonus += pick(EFFECT.skillDamage, reson) * skillStacks;
    }
    if (skillType === 'heavy') {
      buff.deepen += pick(EFFECT.heavyDeepen, reson);
      buff.ignoreDefense += pick(EFFECT.heavyIgnoreDefense, reson);
    }

    return buff;
  }
};
