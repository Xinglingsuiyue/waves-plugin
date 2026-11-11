const wiki = {
  "id": "1321897948803911680",
  "name": "无惧浪涛之勇",
  "lastUpdateTime": "2025-08-23",
  "currentVersion": "8.0",
  "effectText": "无惧浪涛之勇\n\n(2件套)\n\n共鸣效率提升10%\n\n无惧浪涛之勇\n\n(5件套)\n\n角色攻击提升15%，共鸣效率达到250%后，当前角色全属性伤害提升30%。\n\n "
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
  "damage": 0.3
};

export default {
  name: "无惧浪涛之勇",
  wiki,

  apply({ panel, equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "无惧浪涛之勇" };
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 5) {
      // 角色攻击 +15%
      buff.attackPercent += Number(EFFECT.attack || 0);
      // 共鸣效率达到 250% 后，当前角色全属性伤害 +30%
      if (Number(panel?.resonanceEfficiency || 0) >= 2.5) {
        buff.damageBonus += Number(EFFECT.damage || 0);
      }
    }
    return buff;
  }
};
