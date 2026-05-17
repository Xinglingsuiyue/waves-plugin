export default {
  name: '长路启航之星',

  // 数据来源：库街区 wiki - 长路启航之星（合鸣）entryId=1468619743799422976
  //
  // 2件套：热熔伤害提升 10%
  // 5件套：角色为敌人添加【聚爆效应】或【震谐·偏移】时，
  //        自身暴击提升 20%、热熔伤害提升 20%，持续 8 秒。
  //
  // 默认假设：爱弥斯爆发链中持续触发震谐·偏移/聚爆效应，
  //          5 件套效果全程在线。
  //
  // 与「雪落无声之愿.js」/「虚造神型.js」一致：库街区面板的
  // "热熔伤害加成"通常已经把 2 件套效果算进 attrMap，
  // 因此 2 件套部分仅在 attrMap 缺失时补，避免双计；
  // 5 件套是触发态 buff，不进入面板，需要显式补上。
  apply({ panel, equipment, skillType }) {
    const attrMap = panel?.attrMap || {};
    const fireBonus = attrMap['热熔伤害加成'];

    const buff = {
      damageBonus: 0,
      critRate: 0,
      source: '长路启航之星'
    };

    const groupCount = Number(equipment?.groupCount || 0);

    const lacksFire = !fireBonus || fireBonus === '0%' || fireBonus === 0;

    // 2 件套：热熔伤害 +10%
    if (groupCount >= 2 && lacksFire) {
      buff.damageBonus += 0.10;
    }

    // 5 件套：触发态 buff（默认开启）
    if (groupCount >= 5) {
      buff.damageBonus += 0.20;       // 自身热熔伤害 +20%
      buff.critRate    += 0.20;       // 自身暴击 +20%
    }

    return buff;
  }
};
