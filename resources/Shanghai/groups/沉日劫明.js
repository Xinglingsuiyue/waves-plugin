const wiki = {
  "id": "1233504904249409536",
  "name": "沉日劫明",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "15.0",
  "effectText": "沉日劫明\n\n(2件套)\n\n湮灭伤害提升10%\n\n沉日劫明\n\n(5件套)\n\n使用普攻或重击时，湮灭伤害提升7.5%，该效果可叠加4层，持续15秒。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.075,
  "element": "湮灭",
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
  name: "沉日劫明",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "沉日劫明" };
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 5) {
      // 普攻/重击触发湮灭伤害 +7.5%，按满 4 层计。
      buff.damageBonus += Number(EFFECT.five || 0) * 4;
    }
    return buff;
  }
};
