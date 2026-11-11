const wiki = {
  "id": "1408881479672999936",
  "name": "荣斗铸锋之冠",
  "lastUpdateTime": "2025-08-26",
  "currentVersion": "7.0",
  "effectText": "荣斗铸锋之冠\n\n(3件套)\n\n角色获得护盾时，自身攻击提升6%，暴击伤害提升4%，该效果可叠加5层，持续4秒，每0.5秒可触发一次。"
};

const EFFECT = {
  "two": 0,
  "five": 0,
  "element": "",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0.06,
  "critRate": 0,
  "critDamage": 0.04,
  "damage": 0
};

export default {
  name: "荣斗铸锋之冠",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "荣斗铸锋之冠" };
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 3) {
      // 获得护盾时攻击 +6%、暴伤 +4%，按满 5 层计。
      buff.attackPercent += Number(EFFECT.attack || 0) * 5;
      buff.critDamage += Number(EFFECT.critDamage || 0) * 5;
    }
    return buff;
  }
};
