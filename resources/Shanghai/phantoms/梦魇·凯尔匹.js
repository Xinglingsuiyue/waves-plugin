export default {
  name: '梦魇·凯尔匹',

  // 数据来源：库街区/wiki 与 wuthering.gg - 梦魇·凯尔匹
  // 声骸技能：405.00% 冷凝伤害；延奏离场召唤造成 405.00% 气动伤害。
  // 首位装配该声骸技能时：自身冷凝伤害 +12.00%，气动伤害 +12.00%。
  //
  // 本模块只处理首位装配给卡提希娅本体输出带来的气动伤害加成。
  // 如果面板 attrMap 已包含“气动伤害加成”，则避免重复加。
  apply({ panel }) {
    const attrMap = panel?.attrMap || {};
    const aeroBonus = attrMap['气动伤害加成'];
    const lacksAero = !aeroBonus || aeroBonus === '0%' || aeroBonus === 0;

    return {
      damageBonus: lacksAero ? 0.12 : 0,
      source: '梦魇·凯尔匹(主声骸)'
    };
  }
};
