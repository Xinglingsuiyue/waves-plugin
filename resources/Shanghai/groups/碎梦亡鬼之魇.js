export default {
  name: '碎梦亡鬼之魇',

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      damageBonus: 0,
      source: '碎梦亡鬼之魇'
    };

    if (count >= 1 && (skillType === 'normal' || skillType === 'heavy')) {
      buff.damageBonus += 0.35;
    }

    return buff;
  }
};
