export default {
  name: '共鸣回响·鸣式·利维亚坦',

  // 数据来源：库街区 / wuthering.gg - 共鸣回响·鸣式·利维亚坦（4cost 海啸级）
  // 声骸技能：召唤【坍缩视界】，2 段 × 131.04% 湮灭伤害；坍缩核心存在 15s，
  //          队伍登场角色造成伤害时附加 24.57% 湮灭伤害，每 0.5s 触发一次最多 8 次。
  //
  // 首位装配该声骸技能时：
  //   自身湮灭伤害加成 +12%
  //   自身共鸣解放伤害加成 +12%
  apply({ panel, skillType }) {
    const attrMap = panel?.attrMap || {};
    const annihilation = attrMap['湮灭伤害加成'];
    const liberation = attrMap['共鸣解放伤害加成'];

    const buff = {
      damageBonus: 0,
      source: '共鸣回响·鸣式·利维亚坦(主声骸)'
    };

    if (!annihilation || annihilation === '0%' || annihilation === 0) {
      buff.damageBonus += 0.12;
    }

    if (skillType === 'liberation') {
      if (!liberation || liberation === '0%' || liberation === 0) {
        buff.damageBonus += 0.12;
      }
    }

    return buff;
  }
};
