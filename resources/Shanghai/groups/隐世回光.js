const wiki = {
  "id": "1233106270208733184",
  "name": "隐世回光",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "15.0",
  "effectText": "隐世回光\n\n(2件套)\n\n治疗效果提升10%\n\n隐世回光\n\n(5件套)\n\n自身为友方提供治疗时，全队共鸣者攻击力提升15%，持续30秒。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.15,
  "element": "",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0.15,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0
};

export default {
  name: "隐世回光",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "隐世回光" };
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 5) {
      // 为友方提供治疗时，全队共鸣者攻击力 +15%，持续 30 秒。
      buff.attackPercent += Number(EFFECT.attack || 0);
    }
    return buff;
  }
};
