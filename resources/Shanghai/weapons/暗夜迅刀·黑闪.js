const wiki = {
  "id": "1235728896129564672",
  "name": "暗夜迅刀·黑闪",
  "star": "3",
  "lastUpdateTime": "2024-05-22",
  "currentVersion": "6.0",
  "effectText": "无归\n谐振(1/2/3/4/5)阶\n施放变奏技能时，攻击提升(8%/10%/12%/14%/16%) ，持续 10 秒。\n夜归常用迅刀，经过历代军士改进，如今是战场上最常见的武器。“穿越长夜，胜利归来”不仅是必胜的决心，更是守护的誓言。\n获取途径： 唤取"
};

const EFFECT = {
  attack: { 1: 0.08, 2: 0.1, 3: 0.12, 4: 0.14, 5: 0.16 },
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
  name: "暗夜迅刀·黑闪",
  wiki,

  apply({ panel, skillType }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const buff = {
      attackPercent: pick(EFFECT.attack, reson),
      damageBonus: pick(EFFECT.damage, reson),
      critRate: pick(EFFECT.critRate, reson),
      critDamage: pick(EFFECT.critDamage, reson),
      source: "暗夜迅刀·黑闪"
    };
    if (skillType === 'liberation') buff.damageBonus += pick(EFFECT.liberation, reson);
    if (skillType === 'skill') buff.damageBonus += pick(EFFECT.skill, reson);
    if (skillType === 'normal') buff.damageBonus += pick(EFFECT.normal, reson);
    if (skillType === 'heavy') buff.damageBonus += pick(EFFECT.heavy, reson);
    if (skillType === 'intro') buff.damageBonus += pick(EFFECT.intro, reson);
    return buff;
  }
};
