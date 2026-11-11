const wiki = {
  "id": "1212037090995421184",
  "name": "凝夜白霜",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "20.0",
  "effectText": "凝夜白霜\n\n(2件套)\n\n冷凝伤害提升10%\n\n凝夜白霜\n\n(5件套)\n\n使用普攻或重击后，冷凝伤害提升10%，该效果可叠加3层，持续15秒。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.1,
  "element": "冷凝",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0
};

export default {
  name: "凝夜白霜",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "凝夜白霜" };
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 5) {
      // 使用普攻或重击后冷凝伤害 +10%，可叠 3 层；按满层计。
      buff.damageBonus += Number(EFFECT.five || 0) * 3;
      if (skillType === 'liberation') buff.damageBonus += Number(EFFECT.liberation || 0);
      if (skillType === 'skill') buff.damageBonus += Number(EFFECT.skill || 0);
      if (skillType === 'normal') buff.damageBonus += Number(EFFECT.normal || 0);
      if (skillType === 'heavy') buff.damageBonus += Number(EFFECT.heavy || 0);
    }
    return buff;
  }
};
