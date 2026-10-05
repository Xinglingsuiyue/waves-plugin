// 魔术先生（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1321611682368704512），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "魔术先生",
  catalogueName: "魔术先生（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤魔术先生攻击，造成3段43.20%的湮灭伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "魔术先生",
  wiki,

  apply() {
    return { source: "魔术先生(主声骸)" };
  }
};
