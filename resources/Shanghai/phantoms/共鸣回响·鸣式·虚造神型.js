export default {
  name: '虚造神型',

  // 共鸣回响·鸣式·虚造神型（4cost 海啸级声骸）
  // 5★ 主词条：在首位装配该声骸技能时，自身冷凝伤害加成 +12%、共鸣解放伤害加成 +12%
  // 注：库街区角色面板里"冷凝伤害加成"和"共鸣解放伤害加成"通常已经把
  //    主词条算进 attrMap，所以这里默认不重复加；若发现面板未包含，再启用 fallback。
  apply({ panel, skillType }) {
    const attrMap = panel?.attrMap || {};
    const lengNing = attrMap['冷凝伤害加成'];
    const liberation = attrMap['共鸣解放伤害加成'];

    const buff = {
      damageBonus: 0,
      source: '虚造神型(主声骸)'
    };

    // 仅当面板里两个加成都为 0 / 未读到时，才把主词条作为补充加进来
    // 这样能避免与 parsePanel 提供的 attrMap 重复计算
    const lacksLengNing = !lengNing || lengNing === '0%' || lengNing === 0;
    const lacksLiberation = !liberation || liberation === '0%' || liberation === 0;

    if (lacksLengNing) {
      buff.damageBonus += 0.12;             // 冷凝伤害加成 12%（仅冷凝技能受益）
    }
    if (lacksLiberation && skillType === 'liberation') {
      buff.damageBonus += 0.12;             // 共鸣解放伤害加成 12%
    }

    return buff;
  }
};
