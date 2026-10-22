// 绝息魄（声骸）
//
// 首位装配角色：锁暝
//
// 数据来源：wuwa.wiki 3.7 声骸词条（编号 R74，id=60002245）。
//
// 声骸技能本体：召唤绝息魄，对敌人造成三段 91.18% 的导电伤害
//   （属声骸技能本体伤害，不计入角色技能列表）。
// 触发效果：施放声骸技能后 15 秒内，若自身施放延奏技能，使下一个变奏技能
//   登场的角色导电伤害加成 +12.00%，持续 15 秒。
//
// 说明：该声骸不给装配者本体任何增伤，其价值在于「延奏→下一位角色导电加成」
//   的辅助向团队增益，正好契合锁暝在心月狐同奏队中的副 C 定位。
//   因此本模块对装配者自身返回 0 增益，团队向加成另存 teamElectroBonus，
//   供队伍口径使用（可用 options.phantomEffectActive === false 关闭触发态）。

const wiki = {"id": "60002245", "name": "绝息魄", "catalogueName": "绝息魄（声骸）", "cost": 3, "currentVersion": "3.7", "effectText": "技能描述\n使用声骸技能，召唤绝息魄，对敌人造成三段91.18%的导电伤害。\n在此后15秒内，若自身施放延奏技能，使下一个变奏技能登场的角色导电伤害加成提升12.00%，持续15秒。\n冷却时间：20秒"};

const NEXT_ELECTRO_BONUS = 0.12;

export default {
  name: "绝息魄",
  wiki,

  apply({ panel, equipment, skillType, options }) {
    const effectActive = options?.phantomEffectActive ?? true;

    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      deepen: 0,
      multiplierBonus: 0,
      ignoreDefense: 0,
      // 延奏后给下一位变奏登场角色的导电伤害加成（作用于队友，不属自身增伤）
      teamElectroBonus: effectActive ? NEXT_ELECTRO_BONUS : 0,
      source: "绝息魄(主声骸)"
    };

    return buff;
  }
};
