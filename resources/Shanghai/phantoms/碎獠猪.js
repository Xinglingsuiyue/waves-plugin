// 碎獠猪（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1226582425977569280），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "碎獠猪",
  catalogueName: "碎獠猪（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤碎獠猪，进行一段击飞效果卓越的上撩攻击，造成32.00%+64 物理伤害。\n|\n冷却时间： 8秒\n|"
};

export default {
  name: "碎獠猪",
  wiki,

  apply() {
    return { source: "碎獠猪(主声骸)" };
  }
};
