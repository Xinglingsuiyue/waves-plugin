export default {
  name: '角',

  apply({ skillType }) {
    // 常驻不算，只算触发后的“光阴之祝”
    // 光阴之祝：共鸣技能伤害加成提升16%
    if (skillType === 'skill' || skillType === '共鸣技能') {
      return {
        damageBonus: 0.16
      }
    }

    return {
      damageBonus: 0
    }
  }
}
