const wiki = {
  "id": "1233505098310021120",
  "name": "不绝余音",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "17.0",
  "effectText": "不绝余音\n\n(2件套)\n\n攻击力提升10%\n\n不绝余音\n\n(5件套)\n\n在场时，自身攻击力每1.5秒提升5%，该效果最多叠加四层。\n\n延奏技能伤害提升60%"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.05,
  "element": "",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0.1,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0
};

export default {
  name: "不绝余音",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "不绝余音" };
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 5) {
      // 在场时自身攻击力每 1.5 秒 +5%，最多 4 层，按满层计。
      buff.attackPercent += Number(EFFECT.five || 0) * 4;
      // 「延奏技能伤害提升60%」：引擎没有独立的延奏（Outro）技能类型，
      // 角色模块也不结算退场延奏伤害，因此不能折算成全技能增伤。
    }
    return buff;
  }
};
