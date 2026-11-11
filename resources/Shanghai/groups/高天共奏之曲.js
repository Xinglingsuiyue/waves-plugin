const wiki = {
  "id": "1321882647069708288",
  "name": "高天共奏之曲",
  "lastUpdateTime": "2026-05-22",
  "currentVersion": "8.0",
  "effectText": "高天共奏之曲\n\n(2件套)\n\n共鸣效率提升10%。\n\n高天共奏之曲\n\n(5件套)\n\n当前角色协同攻击造成的伤害提升80%；协同攻击命中敌人且暴击时，队伍中登场角色攻击力提升20%，持续4秒。\n\n "
};

const EFFECT = {
  "two": 0.1,
  "five": 0.8,
  "element": "",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0.2,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0
};

export default {
  name: "高天共奏之曲",
  wiki,

  apply({ equipment, skillType, skillName }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "高天共奏之曲" };
    // (2 件套) 固定属性加成已计入角色总面板，不再重复叠加，仅计算下方战斗触发的动态效果。
    if (count >= 5) {
      // 协同攻击造成的伤害 +80%：只作用于协同攻击，不能加成到普通技能。
      // 引擎用技能名标识协同攻击（如「墨鹤协同合计」「雷之楔协同攻击」）。
      if (/协同/.test(String(skillName || ''))) {
        buff.damageBonus += Number(EFFECT.five || 0);
      }
      // 协同攻击暴击时，队伍中登场角色攻击力 +20%，持续 4 秒。
      buff.attackPercent += Number(EFFECT.attack || 0);
    }
    return buff;
  }
};
