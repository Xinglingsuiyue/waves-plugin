export default {
  name: '蚀脊龙',

  // 数据来源：库街区 / wuthering.gg / mc.appfeng - 蚀脊龙（3cost 海啸级）
  // 声骸技能：召唤蚀脊龙，造成 273.60% 热熔伤害（20s 冷却）。
  //
  // 首位装配该声骸技能时：
  //   自身热熔伤害加成 +12%
  //   自身声骸技能伤害加成 +20%
  apply({ panel, skillType }) {
    const attrMap = panel?.attrMap || {};
    const fire = attrMap['热熔伤害加成'];

    const buff = {
      damageBonus: 0,
      source: '蚀脊龙(主声骸)'
    };

    if (!fire || fire === '0%' || fire === 0) {
      buff.damageBonus += 0.12;
    }

    if (skillType === 'echo') {
      buff.damageBonus += 0.20;
    }

    return buff;
  }
};
