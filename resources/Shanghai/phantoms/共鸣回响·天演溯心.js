// 共鸣回响·天演溯心（声骸）
//
// 首位装配角色：心
//
// 数据来源：库街区 wiki 声骸词条（entryId=1554443108309405696）。
//
// 声骸技能本体：四段 27.36% + 一段 164.16% 的导电伤害；
//   若装配角色为心，则为至多五段 8.20% + 一段 232.56% 的导电伤害
//   （属声骸技能本体伤害，不计入角色技能列表）。
// 在首位装配该声骸技能时：
//   自身导电伤害加成 +10.00%；
//   自身为目标附加【电磁效应】后，或自身获得同奏、响应同奏时，
//   自身导电伤害加成额外 +10.00%，持续 30 秒。
//
// 默认假设：心输出流程中已触发附加电磁效应/同奏/响应同奏，触发态在线
//   （可用 options.phantomEffectActive === false 关闭）。

const wiki = {"id": "1554443108309405696", "name": "共鸣回响·天演溯心", "catalogueName": "共鸣回响·天演溯心（声骸）", "currentVersion": "3.7", "effectText": "技能描述\n使用声骸技能，对敌人造成四段27.36%和一段164.16%的导电伤害。\n若装配角色为心，则声骸技能将变为对更大范围内的敌人造成至多五段8.20%和一段232.56%的导电伤害。\n在首位装配该声骸技能时，自身导电伤害加成提升10.00%；自身为目标附加【电磁效应】后，或自身获得同奏、响应同奏时，自身导电伤害加成额外提升10.00%，持续30秒。\n冷却时间：20秒"};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.10, "skillTypes": [], "roles": [], "triggered": false, "panelAware": true, "attrKey": "导电伤害加成", "maxStacks": 1},
  {"field": "damageBonus", "value": 0.10, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": null, "maxStacks": 1}
];

function hasPanelValue(attrMap, key) {
  if (!key) return false;
  const value = attrMap?.[key];
  if (value == null || value === '') return false;
  if (typeof value === 'number') return value !== 0;
  const parsed = Number(String(value).replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(parsed) && parsed !== 0;
}

export default {
  name: "共鸣回响·天演溯心",
  wiki,

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
      source: "共鸣回响·天演溯心(主声骸)"
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
