// 心傀·思（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1523976508214149120），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "心傀·思",
  catalogueName: "心傀·思（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤心傀·思，对敌人造成两段64.80%的导电伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "心傀·思",
  wiki,

  apply() {
    return { source: "心傀·思(主声骸)" };
  }
};
