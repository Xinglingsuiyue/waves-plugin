// 霜鬃狼（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1322219959930777600），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "霜鬃狼",
  catalogueName: "霜鬃狼（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤霜鬃狼攻击，造成129.60%的冷凝伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "霜鬃狼",
  wiki,

  apply() {
    return { source: "霜鬃狼(主声骸)" };
  }
};
