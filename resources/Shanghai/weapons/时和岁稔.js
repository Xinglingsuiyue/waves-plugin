export default {
  name: '时和岁稔',

  apply({ panel, skillType }) {
    const reson = Number(panel.weaponResonLevel || 1)

    const skillDamageMap = {
      1: 0.24,
      2: 0.30,
      3: 0.36,
      4: 0.42,
      5: 0.48
    }

    // 常驻全属性伤害加成不在这里重复计算
    // 第一版按已触发态展示：
    // 今汐通常以变奏进场后打共鸣技能，因此默认岁蕴 + 福泽都生效
    if (skillType === 'skill' || skillType === '共鸣技能') {
      const value = skillDamageMap[reson] || 0.24
      return {
        damageBonus: value + value
      }
    }

    return {
      damageBonus: 0
    }
  }
}
