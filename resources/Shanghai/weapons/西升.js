const wiki = {
  "id": "1235738854938181632",
  "name": "西升",
  "star": "4",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "5.0",
  "effectText": "天时引动\n\n谐振(1/2/3/4/5)阶\n\n角色登场后获得6层【守誓】效果，每层使攻击提升(2%/2.5%/3%/3.5%/4%)，可叠加6层，每12秒可触发1次。每2秒该状态减少1层，击败目标时，额外获得6层【守誓】效果。\n\n因空中奇象而生的迅刀。锻造者将目睹异星的感受融于武器之中，使它看起来轻快锋利，却能发挥出利破长空、削铁如泥的能量。\n\n获取途径：唤取"
};

const EFFECT = {
  attack: { 1: 0.02, 2: 0.025, 3: 0.03, 4: 0.035, 5: 0.04 },
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
  name: "西升",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "西升"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
