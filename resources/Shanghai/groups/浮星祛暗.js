export default {
  name: '浮星祛暗',

  apply({ equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0)

    // 2件套常驻衍射伤害提升10%
    if (count < 5) {
      return {
        elementDamageBonus: 0,
        source: 'group:浮星祛暗(未满5件)'
      }
    }

    if (skillType === 'intro' || skillType === '变奏技能') {
      return {
        elementDamageBonus: 0,
        source: 'group:浮星祛暗(5件套触发)'
      }
    }

    return {
      elementDamageBonus: 0.30,
      source: 'group:浮星祛暗(5件套触发)'
    }
  }
}
