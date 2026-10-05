// 浮灵偶（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1321624742626258944），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "浮灵偶",
  catalogueName: "浮灵偶（声骸）",
  effectText: "技能描述\n使用声骸技能，召唤浮灵偶连续攻击，造成6段19.26%和1段77.04%的热熔伤害。\n|\n冷却时间： 15秒\n|"
};

export default {
  name: "浮灵偶",
  wiki,

  apply() {
    return { source: "浮灵偶(主声骸)" };
  }
};
