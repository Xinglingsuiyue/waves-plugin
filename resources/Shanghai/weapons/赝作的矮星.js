export default {
  name: '赝作的矮星',

  // 数据来源：库街区 Wiki - 赝作的矮星。
  // R1-R5：攻击 +12/15/18/21/24%；附加聚爆效应或集谐·偏移后，
  // 共鸣解放伤害加成 +36/45/54/63/72%，5 秒；
  // 该效果期间队伍角色再次附加聚爆/集谐偏移时，该角色攻击 +24/30/36/42/48%，15 秒。
  // 默认假设：达妮娅爆发轴中聚爆/集谐偏移触发态在线。
  apply({ panel, skillType }) {
    const reson = Number(panel?.weaponResonLevel || 1);
    const attackMap = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };
    const liberationMap = { 1: 0.36, 2: 0.45, 3: 0.54, 4: 0.63, 5: 0.72 };
    const teamAttackMap = { 1: 0.24, 2: 0.30, 3: 0.36, 4: 0.42, 5: 0.48 };

    const buff = {
      attackPercent: (attackMap[reson] || attackMap[1]) + (teamAttackMap[reson] || teamAttackMap[1]),
      damageBonus: 0,
      source: '赝作的矮星'
    };

    if (skillType === 'liberation') {
      buff.damageBonus += liberationMap[reson] || liberationMap[1];
    }

    return buff;
  }
};

