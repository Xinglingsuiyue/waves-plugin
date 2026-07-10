const wiki = {"id": "1523823921709346816", "name": "千傀重楼", "catalogueName": "千傀重楼（声骸）", "lastUpdateTime": "2026-07-10", "currentVersion": "9.0", "effectText": "技能描述\n使用声骸技能，对周围敌人造成109.44%的湮灭伤害，并召唤四把【千忆剑声】，持续15秒。【千忆剑声】存在期间，自身为目标附加「虚湮效应」时，将消耗一把【千忆剑声】对目标造成一次41.04%的湮灭伤害，每1秒可触发一次。在首位装配该声骸技能时，自身湮灭伤害加成提升12.00%，重击伤害加成提升12.00%。\n冷却时间：20秒"};

const EFFECTS = [{"field": "damageBonus", "value": 0.12, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "湮灭伤害加成", "maxStacks": 1}, {"field": "damageBonus", "value": 0.12, "skillTypes": ["heavy"], "roles": [], "triggered": true, "panelAware": true, "attrKey": "重击伤害加成", "maxStacks": 1}];

function hasPanelValue(attrMap, key) {
  if (!key) return false;
  const value = attrMap?.[key];
  if (value == null || value === '') return false;
  if (typeof value === 'number') return value !== 0;
  const parsed = Number(String(value).replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(parsed) && parsed !== 0;
}

export default {
  name: "千傀重楼",
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
      source: "千傀重楼"
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
