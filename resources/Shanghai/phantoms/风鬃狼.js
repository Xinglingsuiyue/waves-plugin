// 风鬃狼（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1322215976494059520），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "风鬃狼",
  catalogueName: "风鬃狼（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤风鬃狼，为附近队伍的角色回复2.70%生命上限的生命值，最多可治疗3次。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "风鬃狼",
  wiki,

  apply() {
    return { source: "风鬃狼(主声骸)" };
  }
};
