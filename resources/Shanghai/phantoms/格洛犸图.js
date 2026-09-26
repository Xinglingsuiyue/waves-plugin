// 格洛犸图（声骸）
//
// 首位装配角色：洛瑟菈
//
// 数据来源：库街区角色面板 phantomProp.skillDescription。
// 游戏内技能描述：
//   使用声骸技能，召唤格洛犸图，践踏敌人造成273.60%的冷凝伤害。在此后15秒内，若自身施放延奏技能，使下一个变奏技能登场的角色冷凝伤害加成提升12.00%，持续15秒。技能冷却：20秒
//
// 声骸技能本体：践踏敌人造成 273.60% 的冷凝伤害。
// 后续增益为「使下一个变奏技能登场的角色冷凝伤害加成 +12%」——作用于队友，不给装配者本体增伤，
// 故本模块对自身伤害的贡献为 0；保留模块以便首位声骸可正常解析（否则会静默跳过）。
// （库街区 wiki 声骸目录暂未收录该词条，描述取自库街区角色面板 phantomProp.skillDescription。）

const EFFECTS = [];

function hasPanelValue(attrMap, key) {
  if (!key) return false;
  const value = attrMap?.[key];
  if (value == null || value === '') return false;
  if (typeof value === 'number') return value !== 0;
  const parsed = Number(String(value).replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(parsed) && parsed !== 0;
}

export default {
  name: "格洛犸图",
  apply({ panel, equipment, skillType, options }) {
    const roleName = String(panel?.roleName || '');
    const effectActive = options?.phantomEffectActive ?? true;
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      deepen: 0,
      multiplierBonus: 0,
      ignoreDefense: 0,
      healingBonus: 0,
      source: "格洛犸图(主声骸)"
    };

    for (const effect of EFFECTS) {
      if (effect.triggered && !effectActive) continue;
      if (effect.skillTypes?.length && !effect.skillTypes.includes(skillType)) continue;
      if (effect.roles?.length && !effect.roles.some(role => role === roleName || role.includes(roleName) || roleName.includes(role))) continue;
      if (effect.panelAware && hasPanelValue(panel?.attrMap, effect.attrKey)) continue;
      const configuredStacks = Number(options?.effectStacks ?? effect.maxStacks ?? 1);
      const stacks = Math.max(0, Math.min(Number(effect.maxStacks || 1), configuredStacks));
      if (effect.field in buff) buff[effect.field] += Number(effect.value || 0) * stacks;
    }
    return buff;
  }
};
