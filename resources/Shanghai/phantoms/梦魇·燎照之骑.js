// 梦魇·燎照之骑（声骸）
//
// 首位装配角色：长离
//
// 数据来源：库街区 wiki 声骸词条（entryId=1322615036410580992）。
//
// 声骸技能本体：跃起对前方敌人造成 405.00% 的热熔伤害；
// 长按可持续幻形骑行，结束时再造成一次 283.50% 的热熔伤害。
// 在首位装配该声骸技能时：自身热熔伤害加成 +12.00%、共鸣技能伤害加成 +12.00%。

const wiki = {"id": "1322615036410580992", "name": "梦魇·燎照之骑", "catalogueName": "梦魇·燎照之骑（声骸）", "lastUpdateTime": "2026-05-03", "currentVersion": "25.0", "effectText": "技能描述\n使用声骸技能，幻形为梦魇·燎照之骑，跃起对前方敌人造成405.00%的热熔伤害。\n在首位装配该声骸技能时，自身热熔伤害加成提升12.00%，共鸣技能伤害加成提升12.00%。\n长按声骸技能，持续幻形为燎照之骑并进入骑行状态，结束时对前方的目标造成一次283.50%的热熔伤害。\n冷却时间：25秒"};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.12, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "热熔伤害加成", "maxStacks": 1},
  {"field": "damageBonus", "value": 0.12, "skillTypes": ["skill"], "roles": [], "triggered": true, "panelAware": true, "attrKey": "共鸣技能伤害加成", "maxStacks": 1}
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
  name: "梦魇·燎照之骑",
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
      source: "梦魇·燎照之骑(主声骸)"
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
