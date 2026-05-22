const wiki = {
  "id": "1350972171197784064",
  "name": "海的呢喃",
  "star": "5",
  "lastUpdateTime": "2025-04-06",
  "currentVersion": "4.0",
  "effectText": "在海中\n\n谐振(1/2/3/4/5)阶\n\n攻击提升(12%/15%/18%/21%/24%)。施放变奏技能或普攻后10秒内，施放声骸技能时，获得1层【柔软的梦】，同名声骸只可触发一次，最多可叠加2层，持续10秒，叠加至2层后施放声骸技能不刷新持续时间。该效果10秒内最多生效1次，若切换至其他角色则该效果提前结束。第1层：普攻伤害加成提升(40%/50%/60%/70%/80%)； 第2层：无视目标(12%/15%/18%/21%/24%)湮灭属性抗性。\n\n在海中，有人看到星星，有人捞到月亮，也有人听到无数细语和呢喃。\n\n那些呢喃沁入她的毒里，流淌过每一条蜿蜒的河流。\n\n最后，那些呢喃将她包裹，像水母的伞，像海。\n\n获取途径：武器活动唤取"
};

const EFFECT = {
  attack: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: null,
  normal: { 1: 0.4, 2: 0.5, 3: 0.6, 4: 0.7, 5: 0.8 },
  heavy: null,
  intro: null,
  damage: { 1: 0.4, 2: 0.5, 3: 0.6, 4: 0.7, 5: 0.8 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "海的呢喃",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "海的呢喃"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
