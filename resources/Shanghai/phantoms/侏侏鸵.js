// 侏侏鸵（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1255590510678020096），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "侏侏鸵",
  catalogueName: "侏侏鸵（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤侏侏鸵追踪敌人进行攻击，造成3次38.40% 物理伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "侏侏鸵",
  wiki,

  apply() {
    return { source: "侏侏鸵(主声骸)" };
  }
};
