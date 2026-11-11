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
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 5) {
      // 普攻触发衍射伤害 +10%，按满 3 层计。
      buff.damageBonus += Number(EFFECT.five || 0) * 3;
      // 满层后施放共鸣解放，使后续普攻伤害 +40%（按普攻结算）。
      if (skillType === 'normal') buff.damageBonus += Number(EFFECT.damage || 0);
    }
    return buff;
  }
};
