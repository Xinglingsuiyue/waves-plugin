const wiki = {
  "id": "1452385855040229376",
  "name": "星构寻辉之环",
  "lastUpdateTime": "2026-01-17",
  "currentVersion": "4.0",
  "effectText": "星构寻辉之环\n\n(2件套)\n\n治疗效果提升10%\n\n星构寻辉之环\n\n(5件套)\n\n为队伍中角色提供治疗时，自身每1%的偏谐值累积效率使队伍中角色攻击提升0.2%，上限25%，持续4秒，同名效果之间不可叠加。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.01,
  "element": "",
  "liberation": 0,
  "skill": 0,
  "normal": 0,
  "heavy": 0,
  "attack": 0.002,
  "critRate": 0,
  "critDamage": 0,
  "damage": 0
};

export default {
  name: "星构寻辉之环",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "星构寻辉之环" };
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
