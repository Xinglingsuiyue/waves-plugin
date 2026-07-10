const wiki = {"id": "1524765410731888640", "name": "羽落空尘之歌", "catalogueName": "羽落空尘之歌", "lastUpdateTime": "2026-07-09", "currentVersion": "2.0", "effectText": "(2件套)\n共鸣效率提升10%\n\n(5件套)\n角色为敌人添加【虚湮效应】时，获得【玄翎之羽】：自身暴击提升20%，重击伤害加成提升35%，持续15秒。\n角色为敌人添加【霜渐效应】时，获得【重明之羽】：自身每1%的共鸣效率使队伍中角色攻击提升0.1%，上限25%，持续10秒。"};

const EFFECTS = [{"field": "critRate", "value": 0.25, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": null, "maxStacks": 1, "count": 5}, {"field": "damageBonus", "value": 0.25, "skillTypes": ["heavy"], "roles": [], "triggered": true, "panelAware": false, "attrKey": "重击伤害加成", "maxStacks": 1, "count": 5}, {"field": "attackPercent", "value": 0.25, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": "攻击", "maxStacks": 1, "count": 5}];

function hasPanelValue(attrMap, key) {
  if (!key) return false;
  const value = attrMap?.[key];
  if (value == null || value === '') return false;
  if (typeof value === 'number') return value !== 0;
  const parsed = Number(String(value).replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(parsed) && parsed !== 0;
}

export default {
  name: "羽落空尘之歌",
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
      source: "羽落空尘之歌"
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
