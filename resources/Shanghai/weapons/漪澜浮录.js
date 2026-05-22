const wiki = {
  "id": "1237352221406724096",
  "name": "漪澜浮录",
  "star": "5",
  "lastUpdateTime": "2025-09-29",
  "currentVersion": "10.0",
  "effectText": "浮波万顷\n\n谐振(1/2/3/4/5)阶\n\n共鸣效率提升(12.8%/16%/19.2%/22.4%/25.6%)。造成普攻伤害时，普攻伤害加成提升(3.2%/4%/4.8%/5.6%/6.4%)，可叠加5层，持续8秒，每0.5秒可触发1次。\n\n触碰它&mdash;&mdash;在冰寒的矩阵之间，仿佛能触碰到围绕在天地之间的那片湖，它将指引你找到一切答案。怀抱此音感仪，消灭所有阻挡在你与真理之间的敌人。\n\n获取途径：武器常驻唤取，活动“初醒之征程“"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: { 1: 0.032, 2: 0.04, 3: 0.048, 4: 0.055999999999999994, 5: 0.064 },
  heavy: null,
  intro: null,
  damage: { 1: 0.032, 2: 0.04, 3: 0.048, 4: 0.055999999999999994, 5: 0.064 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "漪澜浮录",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "漪澜浮录"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
