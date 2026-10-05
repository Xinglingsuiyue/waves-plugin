// 巨布偶（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1321626052675813376），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "巨布偶",
  catalogueName: "巨布偶（声骸）",
  effectText: "技能描述\n使用声骸技能，幻形为巨布偶连续攻击，造成4段46.98%和一段125.28%的物理伤害。\n|\n冷却时间： 20秒\n|"
};

export default {
  name: "巨布偶",
  wiki,

  apply() {
    return { source: "巨布偶(主声骸)" };
  }
};
