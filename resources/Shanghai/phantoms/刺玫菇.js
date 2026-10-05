// 刺玫菇（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1226588387643834368），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "刺玫菇",
  catalogueName: "刺玫菇（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤刺玫菇，发射一道激光，最多造成3次57.07%的湮灭伤害。\n|\n冷却时间： 15秒\n|"
};

export default {
  name: "刺玫菇",
  wiki,

  apply() {
    return { source: "刺玫菇(主声骸)" };
  }
};
