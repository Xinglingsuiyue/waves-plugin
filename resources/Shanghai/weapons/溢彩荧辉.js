const wiki = {
  "id": "1449160684043419648",
  "name": "溢彩荧辉",
  "star": "5",
  "lastUpdateTime": "2025-12-25",
  "currentVersion": "5.0",
  "effectText": "考勤豁免协议\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。施放变奏技能或普攻伤害命中时，使自身普攻伤害提高(36%/45%/54%/63%/72%)，持续4秒。每次自身施放普攻技能期间为目标附加【震谐·偏移】或【集谐·偏移】时，使全队角色造成的全伤害提高(8%/10%/12%/14%/16%)，最多叠加3层，持续30秒。\n\n斑斓荧辉在指间跃动，虹色划过炫目的光迹。\n所有奔流的颜色最终于此瞄准，她终于抵达一片无需再远望的晴空。\n\n获取途径：武器活动唤取"
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
  damage: null
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "溢彩荧辉",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "溢彩荧辉"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
