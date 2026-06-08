const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  introNormal: { 1: 0.24, 2: 0.30, 3: 0.36, 4: 0.42, 5: 0.48 },
  offsetNormal: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  teamAttack: { 1: 0.24, 2: 0.30, 3: 0.36, 4: 0.42, 5: 0.48 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: '碎骨',

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson) + pick(EFFECT.teamAttack, reson),
      damageBonus: 0,
      source: '碎骨'
    };

    if (skillType === 'normal') {
      buff.damageBonus += pick(EFFECT.introNormal, reson);
      buff.damageBonus += pick(EFFECT.offsetNormal, reson);
    }

    return buff;
  }
};
