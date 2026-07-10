const wiki = {"id": "1523658192970907648", "name": "天之苍苍", "lastUpdateTime": "2026-07-10", "currentVersion": "4.0", "effectText": "千仞无枝\n谐振(1/2/3/4/5)阶\n全属性伤害加成提升（12%/15%/18%/21%/24%）。附加【虚湮效应】后，重击伤害加深（36%/45%/54%/63%/72%），重击伤害无视目标（12%/15%/18%/21%/24%）防御，持续8秒。\n流风铸刃，苍天为鞘，剑锋既出，万籁俱寂。\n永不褪色的那抹青蓝，是她的决意、誓言与理想。\n获取途径：唤取"};

const EFFECT = {"attack": null, "damage": null, "triggerDamage": null, "teamAttack": null, "critRate": null, "critDamage": null, "skill": null, "liberation": null, "normal": null, "heavy": null};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "天之苍苍",
  wiki,

  apply({ panel, skillType, options }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const triggerActive = options?.weaponEffectActive ?? true;
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "天之苍苍"
    };

    if (triggerActive) {
      buff.attackPercent += pick(EFFECT.teamAttack, reson);
      buff.damageBonus += pick(EFFECT.triggerDamage, reson);
    }
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    return buff;
  }
};
