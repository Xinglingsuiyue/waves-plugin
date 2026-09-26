// 梦魇·飞廉之猩（声骸）
//
// 首位装配角色：忌炎
//
// 数据来源：库街区 wiki 声骸词条（entryId=1322221665262129152）。
//
// 声骸技能本体：造成 164.16% 的气动伤害；留存「风旋榕木」至多 5 段，每段 21.89% 的气动伤害。
// 在首位装配该声骸技能时：自身气动伤害加成 +12.00%、重击伤害加成 +12.00%。

const wiki = {"id": "1322221665262129152", "name": "梦魇·飞廉之猩", "catalogueName": "梦魇·飞廉之猩（声骸）", "lastUpdateTime": "2026-01-17", "currentVersion": "23.0", "effectText": "技能描述\n使用声骸技能，召唤梦魇·飞廉之猩攻击敌人，造成164.16%的气动伤害；\n留存的「风旋榕木」将持续攻击周围敌人，造成最多5段，每段21.89%的气动伤害。\n在首位装配该声骸技能时，自身气动伤害加成提升12.00%，重击伤害加成提升12.00%。\n冷却时间：20秒"};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.12, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "气动伤害加成", "maxStacks": 1},
  {"field": "damageBonus", "value": 0.12, "skillTypes": ["heavy"], "roles": [], "triggered": true, "panelAware": true, "attrKey": "重击伤害加成", "maxStacks": 1}
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
  name: "梦魇·飞廉之猩",
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
      source: "梦魇·飞廉之猩(主声骸)"
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
