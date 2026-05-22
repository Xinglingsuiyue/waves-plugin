const wiki = {
  "id": "1452709596494942208",
  "name": "脉冲协臂",
  "star": "5",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "7.0",
  "effectText": "攻关者\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。对处于【集谐・干涉】状态的敌人造成伤害后，普攻伤害加成提升(6%/6.7%/7.5%/8.2%/9%)，持续 3 秒，可叠加 4 层，每 0.5 秒触发 1 次，重复触发时刷新持续时间。\n\n深空联合「共生武装」系列，型号 - SCSA-LHRI-GNTL522152-\n\n铠身采用隧者生物化构件与黑石复合工艺制造，实现「频率自适应」与「使用者绑定」的两项核心特性。\n\n「共生武装」的性能上限取决于使用者的异能力，通过对异能力的训练与开发，可进一步提升武装的输出表现。\n\n铠面的光谱随动能的回收而流变。脉冲协臂能预判使用者的架势，将存储的活性力矩迅速放大并回授至佩戴者，在瞬间给出决定性的助力，适合持重而处变不惊的攻关者。\n\n获取途径：唤取"
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: { 1: 0.06, 2: 0.067, 3: 0.075, 4: 0.08199999999999999, 5: 0.09 },
  heavy: null,
  intro: null,
  damage: { 1: 0.06, 2: 0.067, 3: 0.075, 4: 0.08199999999999999, 5: 0.09 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "脉冲协臂",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "脉冲协臂"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
