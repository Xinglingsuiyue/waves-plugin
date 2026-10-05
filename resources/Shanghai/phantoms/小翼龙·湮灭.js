// 小翼龙·湮灭（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1380247985867436032），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "小翼龙·湮灭",
  catalogueName: "小翼龙·湮灭（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤小翼龙·湮灭，造成129.60%的湮灭伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "小翼龙·湮灭",
  wiki,

  apply() {
    return { source: "小翼龙·湮灭(主声骸)" };
  }
};
