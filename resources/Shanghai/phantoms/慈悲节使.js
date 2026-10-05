// 慈悲节使（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1352751463359488000），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "慈悲节使",
  catalogueName: "慈悲节使（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤慈悲节使，造成两次每次64.80%的气动伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "慈悲节使",
  wiki,

  apply() {
    return { source: "慈悲节使(主声骸)" };
  }
};
