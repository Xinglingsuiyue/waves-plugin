const wiki = {"id": "1553888649630220288", "name": "衔梦照世之心", "catalogueName": "衔梦照世之心（合鸣）", "currentVersion": "3.7", "effectText": "衔梦照世之心\n\n(2件套)\n\n导电伤害提升10%。\n\n衔梦照世之心\n\n(5件套)\n\n角色为敌人添加【电磁效应】时，或自身获得同奏、响应同奏时，自身暴击提升15%，导电伤害提升22.5%，持续30秒。"};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.1, "skillTypes": [], "roles": [], "triggered": false, "panelAware": true, "attrKey": "导电伤害加成", "maxStacks": 1, "count": 2},
  {"field": "critRate", "value": 0.15, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": null, "maxStacks": 1, "count": 5},
  {"field": "damageBonus", "value": 0.225, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": null, "maxStacks": 1, "count": 5}
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
  name: "衔梦照世之心",
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
      source: "衔梦照世之心"
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
