const wiki = {
  "id": "1468619768316502016",
  "name": "听唤语义之愿",
  "lastUpdateTime": "2026-03-21",
  "currentVersion": "5.0",
  "effectText": "听唤语义之愿\n\n(2件套)\n\n气动伤害提升10%\n\n听唤语义之愿\n\n(5件套)\n\n角色造成声骸技能伤害时，声骸技能伤害的暴击提升20%，自身气动伤害提升15%，持续5秒。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.2,
  "element": "气动",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0,
  "critRate": 0.2,
  "critDamage": 0,
  "damage": 0
};

export default {
  name: "听唤语义之愿",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "听唤语义之愿" };
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 5) {
      // 造成声骸技能伤害时：声骸技能暴击 +20%（引擎不结算声骸技能伤害，无法落到具体技能），
      // 自身气动伤害 +15%，持续 5 秒，按已触发处理。
      buff.damageBonus += 0.15;
    }
    return buff;
  }
};
