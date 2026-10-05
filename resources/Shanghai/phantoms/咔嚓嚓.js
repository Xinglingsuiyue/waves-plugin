// 咔嚓嚓（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1226485748633518080），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "咔嚓嚓",
  catalogueName: "咔嚓嚓（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤咔嚓嚓对敌人投掷火球，命中时造成32.00%+64热熔伤害。\n|\n冷却时间： 8秒\n|"
};

export default {
  name: "咔嚓嚓",
  wiki,

  apply() {
    return { source: "咔嚓嚓(主声骸)" };
  }
};
