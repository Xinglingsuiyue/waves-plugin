export default {
  name: '辛吉勒姆',

  // 共鸣回响·辛吉勒姆（4cost 海啸级声骸）
  // entryId=1467229559221452800
  //
  // 5★ 主词条 - 装配角色为爱弥斯时：
  //   "在首位装配该声骸技能时，若装配角色为爱弥斯，
  //    则自身共鸣解放伤害加成提升 25.00%"
  //
  // 声骸技能本体伤害（68.40% + 205.20% 热熔，5★）作为外部召唤伤害，
  // 不计入爱弥斯本体技能列表。
  //
  // 与「虚造神型.js」一致：库街区面板的"共鸣解放伤害加成"通常已经把
  // 声骸主词条算进 attrMap，因此这里默认不重复加；只在 attrMap 缺失时
  // 才补一份 25%，避免双计。
  apply({ panel, skillType }) {
    const attrMap = panel?.attrMap || {};
    const liberation = attrMap['共鸣解放伤害加成'];

    const buff = {
      damageBonus: 0,
      source: '辛吉勒姆(主声骸)'
    };

    const lacksLiberation = !liberation || liberation === '0%' || liberation === 0;

    // 仅作用于爱弥斯的共鸣解放类伤害（含重击·爱弥斯，因为它在原文中
    // 也归类为共鸣解放伤害）
    if (lacksLiberation && skillType === 'liberation') {
      buff.damageBonus += 0.25;
    }

    return buff;
  }
};
