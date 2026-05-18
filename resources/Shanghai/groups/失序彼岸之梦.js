export default {
  name: '失序彼岸之梦',

  // 数据来源：库街区 / mc.appfeng - 失序彼岸之梦（V2.5 新式 3 件套合鸣）
  //
  // 3 件套：角色共鸣能量为 0 时，自身暴击率提升 20%，声骸技能伤害加成提升 35%。
  //
  // 说明：本套是单层 3 件套结构，毕业 43311 通常 3 件本套 + 2 件其他。
  // groupCount 取决于命中数；通常 >=3 即可触发。
  //
  // 默认假设：弗洛洛爆发前共鸣能量为 0（释放共鸣解放后空能量），buff 全程在线。
  apply({ equipment, skillType }) {
    const cnt = Number(equipment?.groupCount || 0);
    const buff = {
      critRate: 0,
      damageBonus: 0,
      source: '失序彼岸之梦'
    };

    if (cnt >= 3) {
      buff.critRate += 0.20;
      if (skillType === 'echo') {
        buff.damageBonus += 0.35;
      }
    }

    return buff;
  }
};
