const wiki = {
  "id": "1353855270166462464",
  "name": "流云逝尽之空",
  "lastUpdateTime": "2025-08-23",
  "currentVersion": "5.0",
  "effectText": "流云逝尽之空\n\n(2件套)\n\n气动伤害提升10%。\n\n流云逝尽之空\n\n(5件套)\n\n角色为敌人添加【风蚀效应】时，队伍中角色气动伤害提升15%，自身气动伤害额外提升15%，持续20秒。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.15,
  "element": "气动",
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
  name: "流云逝尽之空",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "流云逝尽之空" };
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
