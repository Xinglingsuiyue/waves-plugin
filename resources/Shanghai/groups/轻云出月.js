const wiki = {
  "id": "1233505120063127552",
  "name": "轻云出月",
  "lastUpdateTime": "2026-03-03",
  "currentVersion": "18.0",
  "effectText": "轻云出月\n\n(2件套)\n\n共鸣效率提升10%\n\n轻云出月\n\n(5件套)\n\n使用延奏技能后，下一个登场的共鸣者攻击力提升22.5%，持续15秒。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.225,
  "element": "",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0.225,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0
};

export default {
  name: "轻云出月",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "轻云出月" };
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 5) {
      // 使用延奏技能后，下一个登场的共鸣者攻击力 +22.5%，持续 15 秒（按当前角色受益处理）。
      buff.attackPercent += Number(EFFECT.attack || 0);
    }
    return buff;
  }
};
