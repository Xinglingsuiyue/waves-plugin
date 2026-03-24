import { calcDamage } from './damage/engine.js'

export default class Zhinengshanghai {
  static async calc(roleDetailData, options = {}) {
    try {
      const finalOptions = {
        enemyName: '无妄者',
        enemyLevel: 90,
        resistance: 0.1,
        ignoreDefense: 0,
        ...options
      }

      return await calcDamage(roleDetailData, finalOptions)
    } catch (err) {
      logger?.error?.('[智能伤害] 计算失败', err)
      return {
        target: options.enemyName || '无妄者',
        list: [],
        message: '暂无伤害数据'
      }
    }
  }
}
