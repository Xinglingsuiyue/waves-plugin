// 沉冥（锁暝专属限定迅刀）
//
// 90 级面板：攻击 587.5、暴击率 24.3%（副属性已进面板，不在此重复加）。
//
// 谐振「囚雷困雨」(R1/R2/R3/R4/R5)：
//   攻击提升 12%/15%/18%/21%/24%（无条件）。
//   获得同奏时：
//     自身导电伤害提升 30%/37.5%/45%/52.5%/60%，持续 30 秒；
//     队伍中角色获得【羁念】并移除【怅念】，导电伤害加成提升
//       24%/30%/36%/42%/48%，持续 30 秒（同名效果不可叠加）。
//   自身协奏能量消耗时：
//     获得【怅念】并移除队伍中角色的【羁念】，自身导电伤害额外提升
//       40%/50%/60%/70%/80%，持续 14 秒，切换至其他角色时提前结束。
//
// 实现口径：
//   - 锁暝全伤害为导电伤害，故「导电伤害提升」统一记入 damageBonus。
//   - 【羁念】作用于队伍（含装配者），与【怅念】互斥。默认走站场输出路线
//     （消耗协奏能量 → 怅念），可用 options.changnianActive=false 切到
//     副C辅助路线（持有羁念，取队伍向加成）。
//   - 是否已获得同奏可用 options.weaponEffectActive=false 关闭（关闭后
//     同时移除 30 秒的自身/队伍导电加成）。
//   - options.skipYearn=true 用于退场后触发的协同攻击（如凄雨瘴雷）：
//     【怅念】随切换提前结束，且不结算【羁念】。
//   - 队伍向的【羁念】加成另存 supportElectroBonus，供队伍口径使用，
//     不并入装配者本体 deepen。

const wiki = {
  "id": "21020107",
  "name": "沉冥",
  "star": "5",
  "weaponType": "迅刀",
  "currentVersion": "3.7",
  "effectText": "囚雷困雨\n\n谐振(1/2/3/4/5)阶\n\n攻击提升12%/15%/18%/21%/24%。获得同奏时，导电伤害提升30%/37.5%/45%/52.5%/60%，持续30秒；获得同奏时，队伍中角色获得【羁念】效果并移除【怅念】，导电伤害加成提升24%/30%/36%/42%/48%，持续30秒，同名效果之间不可叠加。自身的协奏能量消耗时，获得【怅念】效果并移除队伍中角色的【羁念】，自身导电伤害额外提升40%/50%/60%/70%/80%，持续14秒，切换至其他角色时，该效果提前结束。"
};

const ATK_BONUS = [0.12, 0.15, 0.18, 0.21, 0.24];
const UNISON_ELECTRO = [0.30, 0.375, 0.45, 0.525, 0.60];   // 获得同奏：自身导电提升
const BOND_TEAM = [0.24, 0.30, 0.36, 0.42, 0.48];           // 【羁念】队伍导电加成
const YEARN_SELF = [0.40, 0.50, 0.60, 0.70, 0.80];          // 【怅念】自身导电额外提升

export default {
  name: "沉冥",
  wiki,

  apply({ panel, enemy, skillType, options }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));

    const buff = {
      attackPercent: ATK_BONUS[reson - 1],
      damageBonus: 0,
      supportElectroBonus: 0,
      source: "沉冥"
    };

    // 未获得同奏：只保留无条件攻击提升。
    if (options?.weaponEffectActive === false) {
      return buff;
    }

    // 获得同奏：自身导电伤害提升（30 秒）。
    buff.damageBonus += UNISON_ELECTRO[reson - 1];

    // 退场后由延奏触发、已切换至其他角色时：【怅念】随切换提前结束，
    // 【羁念】也不会自动重新获得，两者均不结算（30 秒同奏导电加成仍保留）。
    if (options?.skipYearn) {
      return buff;
    }

    // 【羁念】与【怅念】互斥，默认站场输出路线（怅念）。
    const yearnActive = options?.changnianActive !== false;
    if (yearnActive) {
      buff.damageBonus += YEARN_SELF[reson - 1];
    } else {
      buff.damageBonus += BOND_TEAM[reson - 1];
      buff.supportElectroBonus = BOND_TEAM[reson - 1];
    }

    return buff;
  }
};
