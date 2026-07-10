const wiki = {"id": "1524781636296249344", "name": "冥途夜行之灯", "catalogueName": "冥途夜行之灯", "lastUpdateTime": "2026-07-09", "currentVersion": "3.0", "effectText": "(2件套)\n生命提升10%\n\n(5件套)\n角色获得护盾时，自身暴击提升5%，该效果可叠加4层，持续5秒，每0.5秒可触发一次。叠至满层时，自身造成的热熔伤害提升15%。"};

const EFFECTS = [{"field": "critRate", "value": 0.05, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": null, "maxStacks": 4, "count": 5}, {"field": "damageBonus", "value": 0.15, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": "热熔伤害加成", "maxStacks": 1, "count": 5}];

function hasPanelValue(attrMap, key) {
  if (!key) return false;
  const value = attrMap?.[key];
  if (value == null || value === '') return false;
  if (typeof value === 'number') return value !== 0;
  const parsed = Number(String(value).replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(parsed) && parsed !== 0;
}

export default {
  name: "冥途夜行之灯",
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
      source: "冥途夜行之灯"
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
