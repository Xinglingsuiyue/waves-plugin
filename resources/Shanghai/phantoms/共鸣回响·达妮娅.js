export default {
  name: '共鸣回响·达妮娅',

  // 数据来源：wuthering.gg - 共鸣回响·达妮娅（5 阶）。
  // 声骸技能：82.08% + 191.52% 热熔伤害；主位装配时热熔 +12%，共鸣解放 +12%。
  // 本模块只提供主位常驻增益；声骸技能本体暂不作为独立伤害项展示。
  apply({ panel, skillType }) {
    const attrMap = panel?.attrMap || {};
    const fire = attrMap['热熔伤害加成'];
    const liberation = attrMap['共鸣解放伤害加成'];

    const buff = {
      damageBonus: 0,
      source: '共鸣回响·达妮娅(主声骸)'
    };

    if (!fire || fire === '0%' || fire === 0) {
      buff.damageBonus += 0.12;
    }
    if (skillType === 'liberation' && (!liberation || liberation === '0%' || liberation === 0)) {
      buff.damageBonus += 0.12;
    }

    return buff;
  }
};
