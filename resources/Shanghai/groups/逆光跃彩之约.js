const wiki = {
  "id": "1452391375529074688",
  "name": "逆光跃彩之约",
  "lastUpdateTime": "2026-01-17",
  "currentVersion": "4.0",
  "effectText": "逆光跃彩之约\n\n(2件套)\n\n衍射伤害提升10%\n\n逆光跃彩之约\n\n(5件套)\n\n角色施放延奏技能后，下一个变奏技能登场的角色攻击提升15%，其每点谐度破坏增幅还会使攻击额外提升0.3%，上限15%，持续15秒，若切换至其他角色则该效果提前结束。"
};

const EFFECT = {
  "two": 0.1,
  "five": 0.15,
  "element": "衍射",
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
  name: "逆光跃彩之约",
  wiki,

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "逆光跃彩之约" };
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
