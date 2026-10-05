// 暗夜骑士（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1321619059508559872），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "暗夜骑士",
  catalogueName: "暗夜骑士（声骸）",
  effectText: "技能描述\n使用声骸技能，幻形为暗夜骑士，跃起后前刺攻击敌人，造成268.20%的湮灭伤害。\n|\n冷却时间： 15秒\n|"
};

export default {
  name: "暗夜骑士",
  wiki,

  apply() {
    return { source: "暗夜骑士(主声骸)" };
  }
};
