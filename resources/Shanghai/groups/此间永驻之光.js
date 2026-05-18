export default {
  name: '此间永驻之光',

  // 数据来源：库街区 / mc.appfeng - 此间永驻之光（2/5 件套合鸣，光噪/衍射系）
  //
  // 2 件套：衍射伤害提升 10%
  // 5 件套：角色为敌人添加【光噪效应】时，自身暴击提升 20%，持续 15 秒；
  //        攻击存在 10 层【光噪效应】的敌人时，自身衍射伤害加成提升 15%，持续 15 秒。
  //
  // 默认假设：赞妮/菲比爆发链中目标已挂满【光噪效应】，触发态全程在线。
  // 2 件套如果面板 attrMap 已包含衍射伤害，则避免重复加。
  apply({ panel, equipment }) {
    const cnt = Number(equipment?.groupCount || 0);
    const attrMap = panel?.attrMap || {};
    const diff = attrMap['衍射伤害加成'];
    const lacks = !diff || diff === '0%' || diff === 0;

    const buff = {
      damageBonus: 0,
      critRate: 0,
      source: '此间永驻之光'
    };

    if (cnt >= 2 && lacks) {
      buff.damageBonus += 0.10;
    }

    if (cnt >= 5) {
      buff.critRate += 0.20;
      buff.damageBonus += 0.15;
    }

    return buff;
  }
};
