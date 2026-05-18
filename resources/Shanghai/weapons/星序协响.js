export default {
  name: '星序协响',

  // 守岸人专武。常驻生命/共鸣效率通常已进入面板；这里仅保留治疗链路可扩展入口。
  apply({ skillType }) {
    const buff = {
      healingBonus: 0,
      damageBonus: 0,
      source: '星序协响'
    };

    if (skillType === 'heal') {
      // 面板已包含治疗效果加成时不重复补常驻；专武触发态主要为协奏/攻击辅助，当前治疗量不重复计算。
      buff.healingBonus += 0;
    }

    return buff;
  }
};
