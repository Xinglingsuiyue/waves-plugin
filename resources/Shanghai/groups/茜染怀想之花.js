const wiki = {"id": "1553889998205132800", "name": "茜染怀想之花", "catalogueName": "茜染怀想之花（合鸣）", "currentVersion": "3.7", "effectText": "茜染怀想之花\n\n(2件套)\n\n治疗效果提升10%。\n\n茜染怀想之花\n\n(5件套)\n\n为队伍中角色提供治疗时，队伍中角色攻击提升10%，持续30秒，同名效果之间不可叠加。上述效果持续期间，若角色获得同奏、响应同奏，攻击额外提升15%。"};

// 备注：
//   - 2 件套的治疗效果提升仅影响治疗量，伤害计算中不参与，保留字段以完整还原套装。
//   - 5 件套的「攻击提升10%」需触发者先为队伍提供治疗（默认按已触发计）；
//     其后续「同奏/响应同奏期间攻击额外提升15%」用 options.tongzouActive 控制
//     （默认开启，置为 false 可关闭）。
const EFFECTS = [
  {"field": "healingBonus", "value": 0.1, "skillTypes": [], "roles": [], "triggered": false, "panelAware": false, "attrKey": null, "maxStacks": 1, "count": 2},
  {"field": "attackPercent", "value": 0.1, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": null, "maxStacks": 1, "count": 5, "condition": null},
  {"field": "attackPercent", "value": 0.15, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": null, "maxStacks": 1, "count": 5, "condition": "tongzou"}
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
  name: "茜染怀想之花",
  wiki,

  apply({ panel, equipment, skillType, options }) {
    const count = Number(equipment?.groupCount || 0);
    const roleName = String(panel?.roleName || '');
    const effectActive = options?.groupEffectActive ?? true;
    const tongzouActive = options?.tongzouActive ?? true;
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      deepen: 0,
      multiplierBonus: 0,
      ignoreDefense: 0,
      healingBonus: 0,
      source: "茜染怀想之花"
    };

    for (const effect of EFFECTS) {
      if (count < Number(effect.count || 0)) continue;
      if (effect.triggered && !effectActive) continue;
      if (effect.condition === 'tongzou' && !tongzouActive) continue;
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
