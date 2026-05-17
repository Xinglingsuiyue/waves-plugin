export default {
  name: '时和岁稔',

  apply({ panel, skillType }) {
    const reson = Number(panel?.weaponResonLevel || 1)

    const skillDamageMap = {
      1: 0.24,
      2: 0.30,
      3: 0.36,
      4: 0.42,
      5: 0.48
    }

    // 常驻全属性伤害加成 12% 不在这里重复计算
    // 第一版按“已触发态展示”：
    // 共鸣技能默认视为 岁蕴 + 福泽 同时生效
    if (skillType === 'skill' || skillType === '共鸣技能') {
      const value = skillDamageMap[reson] || 0.24
      const total = value + value

      return {
        skillDamageBonus: total,
        source: 'weapon:时和岁稔(岁蕴+福泽)'
      }
    }

    return {
      skillDamageBonus: 0,
      source: 'weapon:时和岁稔(无效)'
    }
  }
}
