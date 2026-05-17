export default {
  name: '灼霜',

  apply({ panel, skillType }) {
    const reson = Number(panel.weaponResonLevel || 1);

    // 攻击力提升
    const attackBonusMap = {
      1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24
    };

    // 自身附加霜渐效应时，冷凝伤害加深
    const lengNingDeepenMap = {
      1: 0.28, 2: 0.35, 3: 0.42, 4: 0.49, 5: 0.56
    };

    // 共鸣解放伤害无视目标防御
    const ignoreDefMap = {
      1: 0.10, 2: 0.125, 3: 0.15, 4: 0.175, 5: 0.20
    };

    const buff = {
      attackPercent: attackBonusMap[reson] || 0.12,
      // 默认绯雪自身霜渐效应已挂上（其作为冷凝主C，普攻·常世身/预求身段全程附加霜渐）
      // "冷凝伤害加深"按"深化"乘区处理，因为它是属性伤害的"加深"
      deepen: lengNingDeepenMap[reson] || 0.28,
      ignoreDefense: 0,
      source: '灼霜'
    };

    // 共鸣解放伤害无视防御 — 三段技能都属于共鸣解放伤害
    if (skillType === 'liberation') {
      buff.ignoreDefense = ignoreDefMap[reson] || 0.10;
    }

    return buff;
  }
};
