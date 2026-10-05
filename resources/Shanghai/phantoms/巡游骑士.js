// 巡游骑士（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1321617241310482432），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "巡游骑士",
  catalogueName: "巡游骑士（声骸）",
  effectText: "技能描述\n使用声骸技能，幻形为巡游骑士，下砸攻击周围敌人，造成268.20%的导电伤害。\n|\n冷却时间： 15秒\n|"
};

export default {
  name: "巡游骑士",
  wiki,

  apply() {
    return { source: "巡游骑士(主声骸)" };
  }
};
