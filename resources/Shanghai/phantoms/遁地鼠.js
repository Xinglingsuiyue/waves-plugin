// 遁地鼠（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1226583774962204672），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "遁地鼠",
  catalogueName: "遁地鼠（声骸）",
  effectText: "技能描述\n使用声骸技能，幻形为遁地鼠向前移动，期间可调整方向，且不会受到伤害。\n|\n冷却时间：8秒\n|"
};

export default {
  name: "遁地鼠",
  wiki,

  apply() {
    return { source: "遁地鼠(主声骸)" };
  }
};
