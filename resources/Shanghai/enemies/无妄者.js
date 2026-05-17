export default {
  name: '无妄者',

  build({ options = {} } = {}) {
    return {
      name: '无妄者',
      level: Number(options.enemyLevel ?? 90),
      resistance: Number(options.resistance ?? 0.1),
      ignoreDefense: Number(options.ignoreDefense ?? 0)
    }
  }
}
