const wiki = {"id": "1553891276510232576", "name": "镜影流电之瞬", "catalogueName": "镜影流电之瞬（合鸣）", "currentVersion": "3.7", "effectText": "镜影流电之瞬\n\n(2件套)\n\n导电伤害提升10%\n\n镜影流电之瞬\n\n(5件套)\n\n角色为敌人添加【电磁效应】时，自身获得下述效果:导电伤害提升10%，持续15秒。持续期间内施放延奏技能后，下一个变奏技能登场的角色导电伤害提升25%，持续15秒。"};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.1, "skillTypes": [], "roles": [], "triggered": false, "panelAware": true, "attrKey": "导电伤害加成", "maxStacks": 1, "count": 2},
  {"field": "damageBonus", "value": 0.1, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": null, "maxStacks": 1, "count": 5}
];

// 备注：5 件套中「下一个变奏技能登场的角色导电伤害提升25%」作用于队友，
// 不给装配者本体增伤，故不计入本模块；仅为触发者自身保留 +10% 导电。

function hasPanelValue(attrMap, key) {
  if (!key) return false;
  const value = attrMap?.[key];
  if (value == null || value === '') return false;
  if (typeof value === 'number') return value !== 0;
  const parsed = Number(String(value).replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(parsed) && parsed !== 0;
}

export default {
  name: "镜影流电之瞬",
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
      source: "镜影流电之瞬"
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
