// 欺诈奇藏（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1321616145343041536），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "欺诈奇藏",
  catalogueName: "欺诈奇藏（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤欺诈奇藏连续攻击，造成3段64.19%的衍射伤害。\n|\n冷却时间：15秒\n|"
};

export default {
  name: "欺诈奇藏",
  wiki,

  apply() {
    return { source: "欺诈奇藏(主声骸)" };
  }
};
