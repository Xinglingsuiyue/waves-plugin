export default {
  name: '芬莱克',

  // 数据来源：库街区 / wuthering.gg / mc.appfeng - 共鸣回响·芬莱克（4cost 海啸级）
  // 声骸技能：召唤【教律龙爪】，造成 273.60% 气动伤害（20s 冷却）。
  //
  // 首位装配该声骸技能时：
  //   自身气动伤害加成 +12%
  //   自身重击伤害加成 +12%
  apply({ panel, skillType }) {
    const attrMap = panel?.attrMap || {};
    const aero = attrMap['气动伤害加成'];
    const heavy = attrMap['重击伤害加成'];

    const buff = {
      damageBonus: 0,
      source: '芬莱克(主声骸)'
    };

    if (!aero || aero === '0%' || aero === 0) {
      buff.damageBonus += 0.12;
    }

    if (skillType === 'normal') {
      if (!heavy || heavy === '0%' || heavy === 0) {
        buff.damageBonus += 0.12;
      }
    }

    return buff;
  }
};
