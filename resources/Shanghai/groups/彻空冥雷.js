const wiki = {
  "id": "1233505002939936768",
  "name": "彻空冥雷",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "14.0",
  "effectText": "彻空冥雷\n\n(2件套)\n\n导电伤害提升10%\n\n彻空冥雷\n\n(5件套)\n\n使用重击或共鸣技能时，各获得一层导电伤害提升15%的效果，该效果可叠加两层，每层各持续15秒。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.15,
  "element": "导电",
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
  name: "彻空冥雷",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "彻空冥雷" };
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 5) {
      // 重击、共鸣技能各给 1 层导电伤害 +15%，按满 2 层计。
      buff.damageBonus += Number(EFFECT.five || 0) * 2;
    }
    return buff;
  }
};
