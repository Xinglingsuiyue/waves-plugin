const wiki = {
  "id": "1498480264495570944",
  "name": "剪心辑梦之影",
  "lastUpdateTime": "2026-04-30",
  "currentVersion": "4.0",
  "effectText": "剪心辑梦之影\n\n(2件套)\n\n攻击提升10%\n\n剪心辑梦之影\n\n(5件套)\n\n角色为敌人添加【震谐·偏移】或【集谐·偏移】时，队伍中角色谐度破坏增幅提升20点，持续30秒，同名效果之间不可叠加。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0,
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
  name: "剪心辑梦之影",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "剪心辑梦之影" };
    if (count >= 2) {
      buff.damageBonus += Number(EFFECT.two || 0);
      buff.attackPercent += Number(EFFECT.attack || 0);
      buff.critRate += Number(EFFECT.critRate || 0);
      buff.critDamage += Number(EFFECT.critDamage || 0);
      buff.damageBonus += Number(EFFECT.damage || 0);
    }
    if (count >= 5) {
      buff.damageBonus += Number(EFFECT.five || 0);
      if (skillType === 'liberation') buff.damageBonus += Number(EFFECT.liberation || 0);
      if (skillType === 'skill') buff.damageBonus += Number(EFFECT.skill || 0);
      if (skillType === 'normal') buff.damageBonus += Number(EFFECT.normal || 0);
      if (skillType === 'heavy') buff.damageBonus += Number(EFFECT.heavy || 0);
    }
    return buff;
  }
};
