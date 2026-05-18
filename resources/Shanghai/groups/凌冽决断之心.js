export default {
  name: '凌冽决断之心',

  // 数据来源：库街区 / mc.appfeng - 凌冽决断之心（2/5 件套合鸣，冷凝/共鸣技能系）
  //
  // 2 件套：共鸣技能伤害提升 12%
  // 5 件套：施放共鸣技能时，自身冷凝伤害提升 22.5%，持续 15 秒；
  //        施放共鸣解放时，自身共鸣技能伤害提升 18%，持续 5 秒，可叠加 2 层。
  //
  // 默认假设：珂莱塔爆发链中先放共鸣技能再放共鸣解放，2 层叠满，buff 全程在线。
  // 2 件套如果面板 attrMap 已包含共鸣技能伤害加成，则避免重复加。
  apply({ panel, equipment, skillType }) {
    const cnt = Number(equipment?.groupCount || 0);
    const attrMap = panel?.attrMap || {};
    const skillBonus = attrMap['共鸣技能伤害加成'];
    const cold = attrMap['冷凝伤害加成'];

    const buff = {
      damageBonus: 0,
      source: '凌冽决断之心'
    };

    if (cnt >= 2 && skillType === 'skill') {
      if (!skillBonus || skillBonus === '0%' || skillBonus === 0) {
        buff.damageBonus += 0.12;
      }
    }

    if (cnt >= 5) {
      // 冷凝伤害 +22.5%（默认面板未含 → 此 buff 是触发态）
      if (!cold || cold === '0%' || cold === 0) {
        buff.damageBonus += 0.225;
      }
      // 共鸣技能伤害 +18% × 2 层
      if (skillType === 'skill') {
        buff.damageBonus += 0.18 * 2;
      }
    }

    return buff;
  }
};
