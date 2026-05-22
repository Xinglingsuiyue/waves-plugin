const wiki = {
  "id": "1452709101319970816",
  "name": "镭射切变",
  "star": "5",
  "lastUpdateTime": "2025-12-29",
  "currentVersion": "5.0",
  "effectText": "先觉者\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。对处于【集谐・干涉】状态的敌人造成伤害后，共鸣技能伤害加成提升(24%/27%/30%/33%/36%)，持续 3 秒，重复触发时刷新持续时间。\n\n深空联合「共生武装」系列，型号 - SCSA-LHRI-SWD201052-\n\n刀身采用隧者生物化构件与黑石复合工艺制造，实现「频率自适应」与「使用者绑定」两项核心特性。\n\n「共生武装」的性能上限取决于使用者的异能力，通过对异能力的训练与开发，可进一步提升武装的输出表现。\n\n刀面的光谱随使用者的频率而产生流变，每一击都映照着使用者独一无二的精准直觉，如同去繁求简的 “剃刀“，适合见微知著、擅于明辨的先觉者。\n\n获取途径：唤取"
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: { 1: 0.24, 2: 0.27, 3: 0.3, 4: 0.33, 5: 0.36 },
  normal: null,
  heavy: null,
  intro: null,
  damage: { 1: 0.24, 2: 0.27, 3: 0.3, 4: 0.33, 5: 0.36 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "镭射切变",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "镭射切变"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
