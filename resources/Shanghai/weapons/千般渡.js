function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hasPanelValue(attrMap, key) {
  if (!key) return false;
  const value = attrMap?.[key];
  if (value == null || value === '') return false;
  if (typeof value === 'number') return value !== 0;
  const parsed = Number(String(value).replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(parsed) && parsed !== 0;
}

export default {
  name: '千般渡',

  // 数据来源：库街区 wiki entryId=1539728419079364608（长刃 · 召鬼呼星）。
  // 90 级面板：攻击 412、生命 72.2%（副属性一般已进面板，不在此重复加）。
  //
  // 谐振(R1/R2/R3/R4/R5)：
  //   全属性伤害加成提升 12%/15%/18%/21%/24%（无条件，通常已计入面板，见下方判重）。
  //   自身为登场角色施放变奏技能或获得护盾时，获得 1 层【承天】和 1 层【载物】，
  //     可叠加 6 层，持续 7 秒，切换角色提前结束。
  //   承天：暴击伤害 +4%/5%/6%/7%/8% 每层，最多 +24%/30%/36%/42%/48%；
  //     满 6 层时，重击伤害暴击提升 +12%/15%/18%/21%/24%。
  //   载物：施放重击时消耗最多 2 层，每层使重击无视目标 15%/17.5%/20%/22.5%/25% 防御，
  //     最多无视 30%/35%/40%/45%/50% 防御，持续 2 秒。
  //
  // 默认假设：输出流程中【承天】满 6 层、重击消耗满 2 层【载物】。
  //
  // 备注：仓库内景燃.json 的实测武器描述将承天写作「每层 12%/最多 72%」，
  //     与本 wiki 前瞻页（R5 每层 8%/最多 48%）不一致；此处按 wiki 前瞻数据实现，
  //     如需按实测口径可调整 CHENG_TIAN 数组。
  apply({ panel, skillType, options }) {
    const reson = clamp(Number(panel?.weaponResonLevel || 1), 1, 5);

    const ALL_DMG = [0.12, 0.15, 0.18, 0.21, 0.24];
    const CHENG_TIAN = [0.04, 0.05, 0.06, 0.07, 0.08];
    const HEAVY_CRIT = [0.12, 0.15, 0.18, 0.21, 0.24];
    const PEN_PER_STACK = [0.15, 0.175, 0.20, 0.225, 0.25];

    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      ignoreDefense: 0,
      source: '千般渡'
    };

    if (options?.weaponEffectActive === false) return buff;

    // 全属性伤害加成：无条件加成，通常已体现在面板「热熔伤害加成」等属性中，避免重复计入。
    if (!hasPanelValue(panel?.attrMap, '热熔伤害加成')) {
      buff.damageBonus += ALL_DMG[reson - 1];
    }

    // 承天：默认满 6 层
    const chengStacks = clamp(Number(options?.chengTianStacks ?? 6), 0, 6);
    buff.critDamage += CHENG_TIAN[reson - 1] * chengStacks;
    if (chengStacks >= 6 && skillType === 'heavy') {
      buff.critRate += HEAVY_CRIT[reson - 1];
    }

    // 载物：施放重击时消耗最多 2 层
    if (skillType === 'heavy') {
      const penStacks = clamp(Number(options?.zaiWuStacks ?? 2), 0, 2);
      buff.ignoreDefense += PEN_PER_STACK[reson - 1] * penStacks;
    }

    return buff;
  }
};
