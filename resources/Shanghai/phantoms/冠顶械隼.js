// 冠顶械隼（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1467274151748788224），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "冠顶械隼",
  catalogueName: "冠顶械隼（声骸）",
  effectText: "技能描述\n使用声骸技能，幻形为冠顶械隼，飞向高空并跃下对敌人造成268.20%的导电伤害。\n|\n冷却时间：15秒\n|"
};

export default {
  name: "冠顶械隼",
  wiki,

  apply() {
    return { source: "冠顶械隼(主声骸)" };
  }
};
