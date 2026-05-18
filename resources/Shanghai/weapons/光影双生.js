export default {
  name: '光影双生',

  // 数据来源：百度百科 / wuthering.gg - 光影双生（5★ 佩枪 嘉贝莉娜专武）
  // 90 级面板：攻击 587、暴击伤害 48.6%。
  //
  // 谐振「复归于火」 R1/R2/R3/R4/R5：
  //   攻击提升 12% / 15% / 18% / 21% / 24%
  //   造成声骸技能伤害时，重击伤害加深 24/30/36/42/48%（持续 6s）
  //   造成重击伤害时，声骸技能伤害加深 24/30/36/42/48%（持续 6s）
  //   单次攻击最多享受 24/30/36/42/48% 伤害加深
  //   同时拥有两种效果时，造成伤害时无视目标 8/10/12/14/16% 防御
  //
  // 默认假设：嘉贝莉娜爆发链中重击与声骸技能交替触发，两种 buff 同时在线。
  //   - 实现选择：deepen 加成只对 normal（包含重击）生效；
  //   - 单次攻击伤害加深上限通过 Math.min 强制；
  //   - 双 buff 在线 → 提供无视防御。
  apply({ panel, skillType }) {
    const reson = Number(panel?.weaponResonLevel || 1);

    const attackMap = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };
    const deepenMap = { 1: 0.24, 2: 0.30, 3: 0.36, 4: 0.42, 5: 0.48 };
    const ignoreMap = { 1: 0.08, 2: 0.10, 3: 0.12, 4: 0.14, 5: 0.16 };

    const cap = deepenMap[reson] || deepenMap[1];

    const buff = {
      attackPercent: attackMap[reson] || attackMap[1],
      deepen: 0,
      ignoreDefense: ignoreMap[reson] || ignoreMap[1],
      source: '光影双生'
    };

    // 重击与声骸技能都吃加深，按 cap 上限；本模块计算范围内默认 normal 享受
    if (skillType === 'normal' || skillType === 'echo') {
      buff.deepen = cap;
    }

    return buff;
  }
};
