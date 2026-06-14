const wiki = {
  id: '1514988820060258304',
  name: '存帧',
  lastUpdateTime: '2026-06-12',
  currentVersion: '2.0',
  effectText: '光殉\n谐振(1/2/3/4/5)阶\n攻击提升(12%/15%/18%/21%/24%)。附加霜渐效应后，自身冷凝伤害加成提升(30%/37.5%/45%/52.5%/60%)，持续12秒；队伍中的角色攻击提升(24%/30%/36%/42%/48%)，持续30秒，同名效果之间不可叠加。'
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  coldDamage: { 1: 0.30, 2: 0.375, 3: 0.45, 4: 0.525, 5: 0.60 },
  teamAttack: { 1: 0.24, 2: 0.30, 3: 0.36, 4: 0.42, 5: 0.48 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: '存帧',
  wiki,

  apply({ panel, options }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const frostEffectActive = options?.cunzhenFrostEffect ?? true;
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: 0,
      source: '存帧'
    };

    if (frostEffectActive) {
      buff.damageBonus += pick(EFFECT.coldDamage, reson);
      buff.attackPercent += pick(EFFECT.teamAttack, reson);
    }

    return buff;
  }
};
