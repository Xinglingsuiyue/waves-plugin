// 海之女（声骸）
//
// 首位装配角色：尤诺
//
// 数据来源：库街区 wiki 声骸词条（entryId=1408506704801832960）。
//
// 声骸技能本体：召唤【潮涌之漩】，至多十段 13.68% + 一段 164.16% 的气动伤害。
// 在首位装配该声骸技能时：自身气动伤害加成 +12.00%、共鸣解放伤害加成 +12.00%。

const wiki = {"id": "1408506704801832960", "name": "海之女", "catalogueName": "海之女（声骸）", "lastUpdateTime": "2026-01-17", "currentVersion": "19.0", "effectText": "技能描述\n使用声骸技能，召唤【潮涌之漩】，对敌人造成至多十段13.68%的气动伤害和一段164.16%的气动伤害。\n在首位装配该声骸技能时，自身气动伤害加成提升12.00%，共鸣解放伤害加成提升12.00%。\n冷却时间：20秒"};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.12, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "气动伤害加成", "maxStacks": 1},
  {"field": "damageBonus", "value": 0.12, "skillTypes": ["liberation"], "roles": [], "triggered": true, "panelAware": true, "attrKey": "共鸣解放伤害加成", "maxStacks": 1}
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
  name: "海之女",
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
      source: "海之女(主声骸)"
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
