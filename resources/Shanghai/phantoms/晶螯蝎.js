// 晶螯蝎（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1226638667651563520），技能描述取 5★。
// // 该声骸无「首位装配」固定加成，模块仅用于首位装配识别。

const wiki = {
  name: "晶螯蝎",
  catalogueName: "晶螯蝎（声骸）",
  effectText: "技能描述\n使用声骸技能，幻形为晶鳌蝎进入防御状态，解除防御时可进行反击，造成48.00%+96 物理伤害。\n|\n冷却时间： 8秒\n|"
};

export default {
  name: "晶螯蝎",
  wiki,

  apply() {
    return { source: "晶螯蝎(主声骸)" };
  }
};
