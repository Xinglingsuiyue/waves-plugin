// 雷鬃狼（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1322219114540089344），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "雷鬃狼",
  catalogueName: "雷鬃狼（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤雷鬃狼攻击，造成3段43.20%的导电伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "雷鬃狼",
  wiki,

  apply() {
    return { source: "雷鬃狼(主声骸)" };
  }
};
