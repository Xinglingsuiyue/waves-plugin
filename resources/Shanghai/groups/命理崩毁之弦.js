export default {
  name: '命理崩毁之弦',

  // 数据来源：库街区 / mc.appfeng - 命理崩毁之弦（V2.8 新式 3 件套合鸣）
  //
  // 3 件套：角色为敌人添加【虚湮效应】时，自身攻击提升 20%，
  //        共鸣解放伤害加成提升 30%，持续 5 秒。
  //
  // 默认假设：千咲爆发链中持续给目标挂【虚湮效应】，触发态全程在线。
  apply({ equipment, skillType }) {
    const cnt = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      source: '命理崩毁之弦'
    };

    if (cnt >= 3) {
      buff.attackPercent += 0.20;
      if (skillType === 'liberation') {
        buff.damageBonus += 0.30;
      }
    }

    return buff;
  }
};
