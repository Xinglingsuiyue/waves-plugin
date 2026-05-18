export default {
  name: '荣光节使',

  // 数据来源：库街区 / mc.appfeng / wuthering.wiki - 荣光节使（4cost 巨浪级）
  // 声骸技能：召唤荣光节使向目标跳砸，造成 118.80% 衍射伤害，并生成额外的 4 道
  //          【凛冽裁决】，每道 59.40% 衍射伤害，总计 118.80% + 59.40% × 4 = 356.40%。
  //
  // 首位装配该声骸技能时：
  //   自身衍射伤害加成 +12%
  //   自身重击伤害加成 +12%
  apply({ panel, skillType }) {
    const attrMap = panel?.attrMap || {};
    const diff = attrMap['衍射伤害加成'];
    const heavy = attrMap['重击伤害加成'];

    const buff = {
      damageBonus: 0,
      source: '荣光节使(主声骸)'
    };

    if (!diff || diff === '0%' || diff === 0) {
      buff.damageBonus += 0.12;
    }

    if (skillType === 'normal') {
      if (!heavy || heavy === '0%' || heavy === 0) {
        buff.damageBonus += 0.12;
      }
    }

    return buff;
  }
};
