// 莳植机麋（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1452368647644643328），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "莳植机麋",
  catalogueName: "莳植机麋（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤莳植机麋，对大范围内的敌人造成192.60%的气动伤害。\n|\n冷却时间：15秒\n|"
};

export default {
  name: "莳植机麋",
  wiki,

  apply() {
    return { source: "莳植机麋(主声骸)" };
  }
};
