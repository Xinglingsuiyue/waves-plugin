// 叮咚咚（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1255587261296934912），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "叮咚咚",
  catalogueName: "叮咚咚（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤叮咚咚追踪敌人自爆，爆炸造成32.00%+64 冷凝伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "叮咚咚",
  wiki,

  apply() {
    return { source: "叮咚咚(主声骸)" };
  }
};
