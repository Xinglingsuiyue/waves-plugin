const wiki = {
  "id": "1452708158811205632",
  "name": "相位涟漪",
  "star": "5",
  "lastUpdateTime": "2025-12-25",
  "currentVersion": "3.0",
  "effectText": "洞见者\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。队伍中角色触发【谐度破坏技】后，自身全属性伤害加成提升(20%/22.5%/25%/27.5%/30%)，持续 14 秒。\n\n深空联合「共生武装」系列，型号 - SCSA-LHRI-PSTL325052-\n\n铳身采用隧者生物化构件与黑石复合工艺制造，实现「频率自适应」与「使用者绑定」的两项核心特性。\n\n「共生武装」的性能上限取决于使用者的异能力，通过对异能力的训练与开发，可进一步提升武装的输出表现。\n\n弹体与膛线经光谱调谐，击发时能产生强大的频率扰流，暴露并破坏目标的弱点 &mdash;&mdash; 既成领挈靶心的基线，亦是一发破的之杀器，适合审慎而独具慧眼的洞见者。\n\n获取途径：唤取"
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
  damage: { 1: 0.2, 2: 0.225, 3: 0.25, 4: 0.275, 5: 0.3 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "相位涟漪",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "相位涟漪"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
