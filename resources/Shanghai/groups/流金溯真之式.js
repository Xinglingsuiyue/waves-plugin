const wiki = {
  "id": "1452395725424975872",
  "name": "流金溯真之式",
  "lastUpdateTime": "2026-01-17",
  "currentVersion": "4.0",
  "effectText": "流金溯真之式\n\n(2件套)\n\n衍射伤害提升10%\n\n流金溯真之式\n\n(5件套)\n\n角色造成普攻伤害时，自身衍射伤害提升10%，该效果可叠加3层，持续5秒。叠至3层时，施放共鸣解放时，普攻伤害加成提升40%。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.1,
  "element": "衍射",
  "liberation": 0,
  "skill": 0,
  "normal": 0.1,
  "heavy": 0,
  "attack": 0,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0.4
};

export default {
  name: "流金溯真之式",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "流金溯真之式" };
    if (count >= 2) {
      buff.damageBonus += Number(EFFECT.two || 0);
      buff.attackPercent += Number(EFFECT.attack || 0);
      buff.critRate += Number(EFFECT.critRate || 0);
      buff.critDamage += Number(EFFECT.critDamage || 0);
      buff.damageBonus += Number(EFFECT.damage || 0);
    }
    if (count >= 5) {
      buff.damageBonus += Number(EFFECT.five || 0);
      if (skillType === 'liberation') buff.damageBonus += Number(EFFECT.liberation || 0);
      if (skillType === 'skill') buff.damageBonus += Number(EFFECT.skill || 0);
      if (skillType === 'normal') buff.damageBonus += Number(EFFECT.normal || 0);
      if (skillType === 'heavy') buff.damageBonus += Number(EFFECT.heavy || 0);
    }
    return buff;
  }
};
