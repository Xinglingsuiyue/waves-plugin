const wiki = {
  "id": "1351371642859593728",
  "name": "血誓盟约",
  "star": "5",
  "lastUpdateTime": "2025-09-29",
  "currentVersion": "4.0",
  "effectText": "和鸣谐振\n\n谐振(1/2/3/4/5)阶\n\n造成治疗时，自身共鸣技能伤害提升（10%/14%/18%/22%/26%），持续6秒。漂泊者·气动施放共鸣技能·缥缈无相时，附近队伍中登场角色气动伤害加深（10%/14%/18%/22%/26%），持续30秒。\n\n此即为血盟之证&mdash;&mdash;永不背叛，永不放弃，直至最后一滴血流尽。\n\n获取途径：完成潮汐任务「圣者，忤逆者，告死者」后免费获取"
};

const EFFECT = {
  attack: null,
  critRate: null,
  critDamage: null,
  liberation: null,
  skill: { 1: 0.1, 2: 0.1, 3: 0.1, 4: 0.1, 5: 0.1 },
  normal: null,
  heavy: null,
  intro: null,
  damage: null
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "血誓盟约",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "血誓盟约"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
