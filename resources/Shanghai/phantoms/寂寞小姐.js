// 寂寞小姐（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1321613536621019136），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "寂寞小姐",
  catalogueName: "寂寞小姐（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤寂寞小姐攻击，造成115.20%的衍射伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "寂寞小姐",
  wiki,

  apply() {
    return { source: "寂寞小姐(主声骸)" };
  }
};
