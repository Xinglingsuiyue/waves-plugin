export default {
  name: '玉阙玄华',

  // 数据来源：库街区 wiki entryId=1553149741704716288（音感仪 · 百巧琢锋）。
  // 90 级面板：攻击 587、暴击率 24.3%（副属性已进面板，不在此重复加）。
  //
  // 谐振(R1/R2/R3/R4/R5)：
  //   全属性伤害加成提升 12%/15%/18%/21%/24%（无条件，所有技能类型都吃）。
  //   附加电磁效应后或响应同奏时（持续 30 秒，每 0.1 秒可触发 1 次，同名取最高）：
  //     共鸣技能伤害加深 36%/45%/54%/63%/72%；
  //     共鸣技能伤害无视目标 10%/13.5%/17%/20.5%/24% 导电伤害抗性；
  //     自身为队伍中登场角色时，一定范围内目标受到电磁效应伤害加深 30%/37.5%/45%/52.5%/60%。
  //
  // 默认假设：心输出流程中已附加电磁效应/响应同奏，触发态全程在线
  //   （可用 options.weaponEffectActive === false 关闭触发态）。
  //
  // 实现选择：
  //   - "共鸣技能伤害加深 / 无视导电抗性" 只在 skillType==='skill' 时生效；
  //     飞阙为导电伤害（conductive）而非共鸣技能，不吃这两条。
  //   - 引擎抗性为单一字段，"无视导电抗性"按 永远的启明星 的做法折算为等效增伤：
  //       eq_bonus ≈ resIgnore / (1 - baseRes)，baseRes 默认 0.1。
  //   - "电磁效应伤害加深" 属异常伤害区间，不并入本模块的 deepen，
  //     另存 electromagneticDeepen，供异常伤害口径使用。
  apply({ panel, enemy, skillType, options }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));

    const ALL_DMG = [0.12, 0.15, 0.18, 0.21, 0.24];
    const SKILL_DEEPEN = [0.36, 0.45, 0.54, 0.63, 0.72];
    const SKILL_RES_IGNORE = [0.10, 0.135, 0.17, 0.205, 0.24];
    const ELECTRO_DEEPEN = [0.30, 0.375, 0.45, 0.525, 0.60];

    const buff = {
      damageBonus: ALL_DMG[reson - 1],
      deepen: 0,
      electromagneticDeepen: ELECTRO_DEEPEN[reson - 1],
      source: '玉阙玄华'
    };

    // 触发态（附加电磁效应 / 响应同奏）可关闭
    if (options?.weaponEffectActive === false) {
      buff.electromagneticDeepen = 0;
      return buff;
    }

    if (skillType === 'skill') {
      buff.deepen += SKILL_DEEPEN[reson - 1];
      const baseRes = Math.min(0.95, Math.max(0, Number(enemy?.resistance ?? 0.1)));
      buff.damageBonus += SKILL_RES_IGNORE[reson - 1] / Math.max(0.05, 1 - baseRes);
    }

    return buff;
  }
};
