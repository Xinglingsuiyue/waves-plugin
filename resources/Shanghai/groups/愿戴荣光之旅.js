export default {
  name: '愿戴荣光之旅',

  // 数据来源：库街区/wiki 与 wuthering.gg - 愿戴荣光之旅
  // 2件套：气动伤害提升 10%。
  // 5件套：攻击命中存在【风蚀效应】的敌人时，
  //        自身暴击提升 10%，气动伤害提升 30%，持续 10 秒。
  //
  // 默认假设：卡提希娅输出目标存在风蚀效应，5件套触发态全程在线。
  // 2件套气动加成通常已进入面板 attrMap，仅缺失时补一份避免双计。
  apply({ panel, equipment }) {
    const attrMap = panel?.attrMap || {};
    const aeroBonus = attrMap['气动伤害加成'];
    const groupCount = Number(equipment?.groupCount || 0);
    const lacksAero = !aeroBonus || aeroBonus === '0%' || aeroBonus === 0;

    const buff = {
      damageBonus: 0,
      critRate: 0,
      source: '愿戴荣光之旅'
    };

    if (groupCount >= 2 && lacksAero) {
      buff.damageBonus += 0.10;
    }

    if (groupCount >= 5) {
      buff.damageBonus += 0.30;
      buff.critRate += 0.10;
    }

    return buff;
  }
};
