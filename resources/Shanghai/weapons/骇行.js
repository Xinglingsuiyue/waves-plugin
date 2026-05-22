const wiki = {
  "id": "1236475489592733696",
  "name": "骇行",
  "star": "4",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "6.0",
  "effectText": "旋星相佑\n\n谐振(1/2/3/4/5)阶\n\n施放共鸣解放时，获得3层【铁甲】效果，每层使攻击和防御提升(3%/3.5%/4%/4.5%/5%)，可叠加3层，每次受到伤害时减少1层。\n\n因空中奇象而生的臂铠。锻造者将目睹异星的感受融于武器之中，使它看起来镂空轻盈、却能在保护使用者的同时挥出万钧气势。\n\n获取途径：唤取"
};

const EFFECT = {
  attack: null,
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
  name: "骇行",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "骇行"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
