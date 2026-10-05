// 冷凝棱镜（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1226489560878366720），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "冷凝棱镜",
  catalogueName: "冷凝棱镜（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤冷凝棱镜连续发射3枚晶片，每一枚造成38.40% 冷凝伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "冷凝棱镜",
  wiki,

  apply() {
    return { source: "冷凝棱镜(主声骸)" };
  }
};
