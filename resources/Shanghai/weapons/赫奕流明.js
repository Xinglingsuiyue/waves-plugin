const wiki = {
  "id": "1264219793924734976",
  "name": "赫奕流明",
  "star": "5",
  "lastUpdateTime": "2025-09-29",
  "currentVersion": "6.0",
  "effectText": "丹煌灼羽\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。造成伤害时获得1层【灼羽】，每0.5秒可获得1层。施放共鸣技能时额外获得5层。每层【灼羽】使共鸣技能伤害加成提升(4%/5%/6%/7%/8%)，可叠加14层。【灼羽】达到14层的12秒后，清空全部层数。\n\n据传由灵鸟的心血与飞翎化火凝铸。持纵横玄素，引万象流明，离火蔓延之处，锋芒赫奕，诸恶形消神灭，不留尘埃。\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: { 1: 0.04, 2: 0.05, 3: 0.06, 4: 0.07, 5: 0.08 },
  normal: null,
  heavy: null,
  intro: null,
  damage: { 1: 0.04, 2: 0.05, 3: 0.06, 4: 0.07, 5: 0.08 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "赫奕流明",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "赫奕流明"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
