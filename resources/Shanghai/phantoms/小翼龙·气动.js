// 小翼龙·气动（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1352751453238632448），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "小翼龙·气动",
  catalogueName: "小翼龙·气动（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤小翼龙·气动，造成129.60%的气动伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "小翼龙·气动",
  wiki,

  apply() {
    return { source: "小翼龙·气动(主声骸)" };
  }
};
