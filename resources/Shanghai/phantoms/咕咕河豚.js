// 咕咕河豚（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1226583048462614528），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "咕咕河豚",
  catalogueName: "咕咕河豚（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤咕咕河豚，向面前吹吐泡泡5次，每次造成23.04% 冷凝伤害。\n|\n冷却时间： 8秒\n|"
};

export default {
  name: "咕咕河豚",
  wiki,

  apply() {
    return { source: "咕咕河豚(主声骸)" };
  }
};
