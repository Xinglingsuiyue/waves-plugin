export default {
  name: '梦魇·赫卡忒',

  // 数据来源：库街区 / wuthering.gg / mc.appfeng - 梦魇·赫卡忒（4cost 海啸级）
  // 声骸技能：三段攻击共 152.39% × 3 = 457.17% 湮灭伤害（25s 冷却）。
  //
  // 首位装配该声骸技能时：
  //   自身湮灭伤害加成提升 12%
  //   自身声骸技能伤害加成提升 20%
  //
  // 与其他声骸模块一致：若 attrMap 已包含「湮灭伤害加成」，避免重复加。
  apply({ panel, skillType }) {
    const attrMap = panel?.attrMap || {};
    const annihilation = attrMap['湮灭伤害加成'];
    const lacks = !annihilation || annihilation === '0%' || annihilation === 0;

    const buff = {
      damageBonus: lacks ? 0.12 : 0,
      source: '梦魇·赫卡忒(主声骸)'
    };

    // 声骸技能伤害加成：仅作用于声骸技能本身（本模块未单独计算声骸伤害项）
    if (skillType === 'echo') {
      buff.damageBonus += 0.20;
    }

    return buff;
  }
};
