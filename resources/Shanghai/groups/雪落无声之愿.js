export default {
  name: '雪落无声之愿',

  // 数据来源：库街区 wiki - 雪落无声之愿（合鸣）entryId=1498475770147909632
  //
  // 2件套：冷凝伤害提升 10%
  //
  // 5件套（两路触发，本次只关心 a 路）：
  //   a. 角色为敌人添加【霜渐效应】时，冷凝伤害提升 10%，持续 15 秒。
  //      自身获得【落雪】效果，持续 15 秒，每 25 秒可触发 1 次。
  //      拥有【落雪】时：
  //         角色造成共鸣解放伤害时，清除【落雪】使自身暴击提升 25%，
  //         持续 6 秒；持续期间再次造成共鸣解放伤害时延长 4 秒，
  //         每 0.5 秒可触发 1 次，每次清除最多 6 次。
  //   b. 延奏路（给下一登场角色 冷凝+25%）→ 单角色爆发计算不涉及。
  //
  // 默认假设（绯雪/冷凝主 C 爆发主轴）：
  //   - 自身常驻附加霜渐效应   → "冷凝+10%" 持续生效
  //   - 角色三段技能都按共鸣解放结算 → 触发"暴击+25%"
  //   - 持续刷新延长 → 6 秒暴击 buff 全程在线
  //
  // 实现选择：
  //   - 2 件套"冷凝+10%"通常已在面板 attrMap 中，仅 attrMap 缺失时补一次。
  //   - 5 件套"冷凝+10%"是触发态，不进入面板，需要显式补上。
  //   - 5 件套"暴击+25%"是触发态，仅在 skillType==='liberation' 时给。
  apply({ panel, equipment, skillType }) {
    const attrMap = panel?.attrMap || {};
    const fireBonus = attrMap['冷凝伤害加成'];

    const buff = {
      damageBonus: 0,
      critRate: 0,
      source: '雪落无声之愿'
    };

    const groupCount = Number(equipment?.groupCount || 0);
    const lacksLengNing = !fireBonus || fireBonus === '0%' || fireBonus === 0;

    // 2 件套：冷凝伤害 +10%
    if (groupCount >= 2 && lacksLengNing) {
      buff.damageBonus += 0.10;
    }

    // 5 件套（触发态，默认开启）
    if (groupCount >= 5) {
      // 添加霜渐效应时 冷凝伤害 +10%
      buff.damageBonus += 0.10;

      // 角色造成共鸣解放伤害时 自身暴击 +25%
      if (skillType === 'liberation') {
        buff.critRate += 0.25;
      }
    }

    return buff;
  }
};
