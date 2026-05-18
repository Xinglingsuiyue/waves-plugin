export default {
  name: '异构武装',

  // 数据来源：库街区 / wuthering.gg / genshin-builds - 异构武装（4cost 海啸级）
  // 声骸技能：使用声骸技能，幻形为异构武装，造成 405.00% 冷凝伤害（25s 冷却）；
  //          装配角色施放共鸣解放时持续提升「强袭功率」，满格时重置冷却并
  //          再次造成 405% 冷凝伤害并冻结目标。
  //
  // 首位装配该声骸技能时：
  //   自身冷凝伤害加成 +12%
  //   自身共鸣技能伤害加成 +12%
  apply({ panel, skillType }) {
    const attrMap = panel?.attrMap || {};
    const cold = attrMap['冷凝伤害加成'];
    const skillBonus = attrMap['共鸣技能伤害加成'];

    const buff = {
      damageBonus: 0,
      source: '异构武装(主声骸)'
    };

    if (!cold || cold === '0%' || cold === 0) {
      buff.damageBonus += 0.12;
    }

    if (skillType === 'skill') {
      if (!skillBonus || skillBonus === '0%' || skillBonus === 0) {
        buff.damageBonus += 0.12;
      }
    }

    return buff;
  }
};
