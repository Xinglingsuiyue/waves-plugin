export default {
  name: '斑驳粉饰之沫',

  // 数据来源：库街区 Wiki - 斑驳粉饰之沫。
  // 2 件套：热熔伤害 +10%。
  // 5 件套：施放共鸣解放时，队伍热熔伤害 +15%，自身共鸣解放伤害 +20%，持续 35 秒。
  // 默认假设：达妮娅面板若未含对应套装增益，则按爆发轴在线补入。
  apply({ panel, equipment, skillType }) {
    const count = Number(equipment?.groupCount || 0);
    const attrMap = panel?.attrMap || {};
    const fire = attrMap['热熔伤害加成'];
    const liberation = attrMap['共鸣解放伤害加成'];

    const buff = {
      damageBonus: 0,
      source: '斑驳粉饰之沫'
    };

    if (count >= 2 && (!fire || fire === '0%' || fire === 0)) {
      buff.damageBonus += 0.10;
    }
    if (count >= 5) {
      buff.damageBonus += 0.15;
      if (skillType === 'liberation' && (!liberation || liberation === '0%' || liberation === 0)) {
        buff.damageBonus += 0.20;
      }
    }

    return buff;
  }
};

