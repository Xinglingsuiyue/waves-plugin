const wiki = {"id": "1524779774465699840", "name": "清邪荡煞之心", "catalogueName": "清邪荡煞之心", "lastUpdateTime": "2026-07-09", "currentVersion": "3.0", "effectText": "(2件套)\n气动伤害提升10%\n\n(5件套)\n角色为敌人添加【集谐·偏移】时，自身暴击伤害提升20%，气动伤害提升30%，持续15秒。"};

const EFFECTS = [{"field": "damageBonus", "value": 0.1, "skillTypes": [], "roles": [], "triggered": false, "panelAware": true, "attrKey": "气动伤害加成", "maxStacks": 1, "count": 2}, {"field": "critDamage", "value": 0.2, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": null, "maxStacks": 1, "count": 5}, {"field": "damageBonus", "value": 0.3, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": "气动伤害加成", "maxStacks": 1, "count": 5}];

function hasPanelValue(attrMap, key) {
  if (!key) return false;
  const value = attrMap?.[key];
  if (value == null || value === '') return false;
  if (typeof value === 'number') return value !== 0;
  const parsed = Number(String(value).replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(parsed) && parsed !== 0;
}

export default {
  name: "清邪荡煞之心",
  wiki,

  apply({ panel, equipment, skillType, options }) {
    const count = Number(equipment?.groupCount || 0);
    const roleName = String(panel?.roleName || '');
    const effectActive = options?.groupEffectActive ?? true;
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      deepen: 0,
      multiplierBonus: 0,
      ignoreDefense: 0,
      source: "清邪荡煞之心"
    };

    for (const effect of EFFECTS) {
      if (count < Number(effect.count || 0)) continue;
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
