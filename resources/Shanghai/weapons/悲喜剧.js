// 悲喜剧（洛可可专属限定臂铠）
//
// 数据来源：库街区 Wiki entryId=1329161191058202624。
// 90 级面板：攻击 587、暴击 24.3%（副属性已进面板，不在此重复加）。
//
// 谐振「愚人欢歌」(R1/R2/R3/R4/R5)：
//   攻击提升 12%/15%/18%/21%/24%（无条件）。
//   施放普攻或变奏技能时，自身重击伤害加成提升 48%/60%/72%/84%/96%，持续 3 秒。
//
// 实现口径：
//   - 重击伤害加成只作用于重击类伤害（重击 / 普攻·幻想照进现实 / 构筑现实 / 共鸣解放）。
//     洛可可的重击类输出紧接普攻或变奏技能，故默认已触发，可用
//     options.weaponEffectActive=false 关闭。
//   - 暴击 24.3% 为武器副属性，已包含在角色最终面板中，模块不再重复提供。

const wiki = {
  "id": "1329161191058202624",
  "name": "悲喜剧",
  "star": "5",
  "weaponType": "臂铠",
  "currentVersion": "2.0",
  "effectText": "愚人欢歌\n\n谐振(1/2/3/4/5)阶\n\n攻击提升12%/15%/18%/21%/24%。施放普攻或变奏技能时，自身重击伤害加成提升48%/60%/72%/84%/96%，持续3秒。"
};

const ATK_BONUS = [0.12, 0.15, 0.18, 0.21, 0.24];
const HEAVY_BONUS = [0.48, 0.60, 0.72, 0.84, 0.96];

export default {
  name: "悲喜剧",
  wiki,

  apply({ panel, skillType, options }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));

    const buff = {
      attackPercent: ATK_BONUS[reson - 1],
      damageBonus: 0,
      source: "悲喜剧"
    };

    // 未触发普攻/变奏：只保留无条件攻击提升。
    if (options?.weaponEffectActive === false) {
      return buff;
    }

    if (skillType === 'heavy') {
      buff.damageBonus += HEAVY_BONUS[reson - 1];
    }

    return buff;
  }
};
