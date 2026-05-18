export default {
  name: '焚羽猎魔之影',

  // 数据来源：库街区 / mc.appfeng - 焚羽猎魔之影（V2.7 新式 3 件套合鸣，热熔系）
  //
  // 3 件套：角色造成声骸技能伤害时，重击伤害的暴击提升 20%，持续 6 秒；
  //        造成重击伤害时，声骸技能伤害的暴击提升 20%，持续 6 秒。
  //        同时拥有两种效果时，自身热熔伤害提升 16%。
  //
  // 默认假设：嘉贝莉娜爆发链中声骸技能与重击交替触发，两种 buff 同时在线。
  //   - 对重击：暴击 +20%
  //   - 对声骸技能：暴击 +20%
  //   - 同时在线 → 自身热熔伤害 +16%
  apply({ panel, equipment, skillType }) {
    const cnt = Number(equipment?.groupCount || 0);
    const attrMap = panel?.attrMap || {};
    const fire = attrMap['热熔伤害加成'];

    const buff = {
      critRate: 0,
      damageBonus: 0,
      source: '焚羽猎魔之影'
    };

    if (cnt >= 3) {
      // 仅重击吃暴击 / 声骸技能吃暴击；本模块计算范围内 normal=重击主输出
      if (skillType === 'normal' || skillType === 'echo') {
        buff.critRate += 0.20;
      }
      // 双 buff 在线 → 热熔伤害 +16%；面板若已含热熔加成则避免重复加
      if (!fire || fire === '0%' || fire === 0) {
        buff.damageBonus += 0.16;
      }
    }

    return buff;
  }
};
