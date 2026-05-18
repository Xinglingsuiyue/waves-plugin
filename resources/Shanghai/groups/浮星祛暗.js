export default {
  name: '浮星祛暗',

  apply({ equipment }) {
    const count = Number(equipment?.groupCount || 0)

    // 2件套常驻不重复计算
    // 只计算5件套触发态
    if (count >= 5) {
      return {
        damageBonus: 0.30
      }
    }

    return {
      damageBonus: 0
    }
  }
}
