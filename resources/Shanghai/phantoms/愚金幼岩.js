// 愚金幼岩（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1338556526661824512），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "愚金幼岩",
  catalogueName: "愚金幼岩（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤愚金幼岩向前扑击，对路径上的敌人造成129.60%的衍射伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "愚金幼岩",
  wiki,

  apply() {
    return { source: "愚金幼岩(主声骸)" };
  }
};
