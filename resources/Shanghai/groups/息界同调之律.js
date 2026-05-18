export default {
  name: '息界同调之律',

  // 数据来源：库街区 / mc.appfeng - 息界同调之律（V2.9 新式 3 件套合鸣，仇远队）
  //
  // 3 件套：
  //   - 角色施放声骸技能时，自身重击伤害加成提升 30%，持续 4 秒。
  //   - 队伍中角色声骸技能伤害加成提升 4%，可叠加 4 层，持续 30 秒，
  //     同名声骸仅可触发 1 次该效果，效果消失时重置同名声骸记录，
  //     4 层时施放声骸技能可刷新持续时间。
  //
  // 默认假设：仇远爆发链中已触发，重击 +30% 与声骸 +16%（4 层 ×4%）全程在线。
  apply({ equipment, skillType }) {
    const cnt = Number(equipment?.groupCount || 0);
    const buff = {
      damageBonus: 0,
      source: '息界同调之律'
    };

    if (cnt >= 3) {
      if (skillType === 'normal') buff.damageBonus += 0.30;
      if (skillType === 'echo')   buff.damageBonus += 0.04 * 4;
    }

    return buff;
  }
};
