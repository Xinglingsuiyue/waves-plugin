const wiki = {
  "id": "1234529824660062208",
  "name": "远行者长刃·辟路",
  "star": "3",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "6.0",
  "effectText": "远涉\n谐振(1/2/3/4/5)阶\n施放共鸣技能时，回复(8/9/10/11/12) 点共鸣能量，每 20 秒可触发 1 次。\n先行公约为远行者提供的长刃，色泽鲜明，不易丢失，质地坚硬，能长期应对多种极端环境，在探险家群体中极受欢迎。\n获取途径： 唤取"
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
  name: "远行者长刃·辟路",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "远行者长刃·辟路"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
