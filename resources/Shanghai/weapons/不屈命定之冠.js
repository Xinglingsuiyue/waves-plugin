export default {
  name: '不屈命定之冠',

  // 数据来源：库街区/BWiki/鸣潮助手 - 不屈命定之冠（迅刀）
  // 90级面板：攻击 412.5、生命 72.2%（生命副属性通常已进面板，不在这里重复加）
  //
  // 谐振(R1/R2/R3/R4/R5)：
  //   生命提升 12% / 15% / 18% / 21% / 24%
  //   施放变奏技能或普攻后 15 秒内，自身造成伤害无视目标
  //     8% / 10% / 12% / 14% / 16% 防御；
  //   当目标的风蚀效应不少于 1 层时，对目标造成的伤害加深
  //     20% / 25% / 30% / 35% / 40%。
  //
  // 默认假设：卡提希娅输出流程中已经施放过普攻/变奏，且目标带有风蚀效应。
  apply({ panel }) {
    const reson = Number(panel?.weaponResonLevel || 1);

    const hpMap = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };
    const ignoreDefMap = { 1: 0.08, 2: 0.10, 3: 0.12, 4: 0.14, 5: 0.16 };
    const deepenMap = { 1: 0.20, 2: 0.25, 3: 0.30, 4: 0.35, 5: 0.40 };

    return {
      hpPercent: hpMap[reson] || hpMap[1],
      ignoreDefense: ignoreDefMap[reson] || ignoreDefMap[1],
      deepen: deepenMap[reson] || deepenMap[1],
      source: '不屈命定之冠'
    };
  }
};
