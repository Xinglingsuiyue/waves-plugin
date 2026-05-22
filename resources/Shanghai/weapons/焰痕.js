const wiki = {
  "id": "1385353740506890240",
  "name": "焰痕",
  "star": "5",
  "lastUpdateTime": "2025-07-03",
  "currentVersion": "1.0",
  "effectText": "闪耀星火\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。施放变奏技能或共鸣解放时，共鸣解放伤害提升(24%/30%/36%/42%/48%)，持续6秒；造成重击伤害时，该效果延长4秒，最多可延长1次。成功延长效果时，使队伍中的角色热熔伤害加成提升(24%/30%/36%/42%/48%)，持续30秒，同名效果之间不可叠加。\n\n幼狼奔于山野，将那些困住自己的阴影尽数抛下；\n\n孤狼行于赛场，把那些阻挡自己的难题一一斩断。\n\n她夺得胜利；她摘得荣耀；她高举自己的一切；\n\n她属于赛场&mdash;&mdash;更属于自己！\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  critRate: null,
  critDamage: null,
  liberation: { 1: 0.24, 2: 0.3, 3: 0.36, 4: 0.42, 5: 0.48 },
  skill: null,
  normal: null,
  heavy: null,
  intro: null,
  damage: { 1: 0.24, 2: 0.3, 3: 0.36, 4: 0.42, 5: 0.48 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "焰痕",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "焰痕"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
