export default {
  name: '永远的启明星',

  // 数据来源：库街区 wiki - 永远的启明星 entryId=1467166360379940864
  // 90级面板：攻击 587、暴击率 24.3%（已包含在 panel/attrMap 中，不重复加）
  //
  // 谐振(R1/R2/R3/R4/R5)：
  //   全属性伤害加成提升 12% / 15% / 18% / 21% / 24%
  //   附加震谐·偏移或聚爆效应时，
  //     共鸣解放伤害无视目标 32% / 40% / 48% / 56% / 64% 防御，
  //     共鸣解放伤害无视目标 10% / 15% / 20% / 25% / 30% 热熔抗性，
  //     持续 8 秒。
  //
  // 默认假设：爱弥斯爆发链中己附加震谐·偏移/聚爆效应，触发态全程在线。
  //
  // 实现选择：
  //   - "全属性伤害加成"按通用 damageBonus 计入（所有 skillType 都吃）。
  //   - "无视防御"只在 skillType==='liberation' 时生效。
  //   - "无视热熔抗性"在引擎层用 enemy.resistance 单一字段表示，
  //     这里通过把"无视热熔抗"等价折算为伤害加成乘区注入：
  //         eq_bonus ≈ resIgnore × 1/(1-baseRes) - 1
  //     当默认 baseRes=0.1（无妄者标准抗性）时，10% 无视抗 ≈ +11.11% 增伤。
  //     这是一个保守近似，但热熔属性技能受益准确（仅在 liberation 时生效）。
  apply({ panel, enemy, skillType }) {
    const reson = Number(panel.weaponResonLevel || 1);

    // R1-R5 数值表
    const allDamageMap   = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };
    const ignoreDefMap   = { 1: 0.32, 2: 0.40, 3: 0.48, 4: 0.56, 5: 0.64 };
    const ignoreFireResMap = { 1: 0.10, 2: 0.15, 3: 0.20, 4: 0.25, 5: 0.30 };

    const allDmg = allDamageMap[reson] || allDamageMap[1];
    const ignoreDef = ignoreDefMap[reson] || ignoreDefMap[1];
    const ignoreFireRes = ignoreFireResMap[reson] || ignoreFireResMap[1];

    const buff = {
      // 「全属性伤害加成」：所有技能都吃
      damageBonus: allDmg,
      ignoreDefense: 0,
      source: '永远的启明星'
    };

    if (skillType === 'liberation') {
      // 共鸣解放伤害无视防御 — 严格按字段送入
      buff.ignoreDefense = ignoreDef;

      // 共鸣解放伤害无视热熔抗性 — 折算为额外增伤
      const baseRes = Math.min(0.95, Math.max(0, Number(enemy?.resistance ?? 0.1)));
      const equivBonus = ignoreFireRes / Math.max(0.05, 1 - baseRes);
      buff.damageBonus += equivBonus;
    }

    return buff;
  }
};
