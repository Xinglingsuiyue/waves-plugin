// 幽翎火（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1321609575371526144），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "幽翎火",
  catalogueName: "幽翎火（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤幽翎火攻击，造成129.60%的湮灭伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "幽翎火",
  wiki,

  apply() {
    return { source: "幽翎火(主声骸)" };
  }
};
