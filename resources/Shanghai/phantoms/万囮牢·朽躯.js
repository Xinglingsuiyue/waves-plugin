const wiki = {"id": "1523971994745991168", "name": "万囮牢·朽躯", "catalogueName": "万囮牢·朽躯（声骸）", "lastUpdateTime": "2026-07-09", "currentVersion": "4.0", "effectText": "技能描述\n使用声骸技能，召唤万囤牢·朽躯，首次对敌人造成10.20%生命上限的热熔伤害，期间多次碾压路径上的敌人，至多19次，每次造成0.37%生命上限的热熔伤害。在首位装配该声骸技能时，自身热熔伤害加成提升12.00%，重击伤害加成提升12.00%。\n冷却时间：20秒"};

const EFFECTS = [{"field": "damageBonus", "value": 0.12, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "热熔伤害加成", "maxStacks": 1}, {"field": "damageBonus", "value": 0.12, "skillTypes": ["heavy"], "roles": [], "triggered": true, "panelAware": true, "attrKey": "重击伤害加成", "maxStacks": 1}];

function hasPanelValue(attrMap, key) {
  if (!key) return false;
  const value = attrMap?.[key];
  if (value == null || value === '') return false;
  if (typeof value === 'number') return value !== 0;
  const parsed = Number(String(value).replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(parsed) && parsed !== 0;
}

export default {
  name: "万囮牢·朽躯",
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
      source: "万囮牢·朽躯"
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
