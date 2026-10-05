// 工头布偶（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1321614434083786752），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "工头布偶",
  catalogueName: "工头布偶（声骸）",
  effectText: "技能描述\n使用声骸技能，幻形为工头布偶，旋转起跳并下砸，造成268.20%的物理伤害。\n|\n冷却时间：15秒\n|"
};

export default {
  name: "工头布偶",
  wiki,

  apply() {
    return { source: "工头布偶(主声骸)" };
  }
};
