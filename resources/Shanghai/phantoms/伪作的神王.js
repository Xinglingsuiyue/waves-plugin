// 伪作的神王（声骸）
//
// 首位装配角色：奥古斯塔
//
// 数据来源：库街区 wiki 声骸词条（entryId=1408502906778177536）。
//
// 声骸技能本体：旋转突进，四段 55.35% 的导电伤害（初始 2 次，8 秒回复 1 次）。
// 在首位装配该声骸技能时：自身导电伤害加成 +12.00%、重击伤害加成 +12.00%；
//   此外使用变奏技能登场时可召唤伪作的神王，造成 405.00% 的导电伤害（属召唤伤害，不计入本体技能列表）。

const wiki = {"id": "1408502906778177536", "name": "伪作的神王", "catalogueName": "伪作的神王（声骸）", "lastUpdateTime": "2026-05-03", "currentVersion": "27.0", "effectText": "技能描述\n使用声骸技能，幻形为伪作的神王，发动旋转突进对敌人造成四段55.35%的导电伤害。\n在首位装配该声骸技能时，自身导电伤害加成提升12.00%，重击伤害加成提升12.00%；使用变奏技能登场时可召唤伪作的神王，对敌人造成405.00%的导电伤害。初始拥有2次可使用次数，每8秒可使用次数增加1次，可使用次数上限2次。\n冷却时间：8秒"};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.12, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "导电伤害加成", "maxStacks": 1},
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
  name: "伪作的神王",
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
      source: "伪作的神王(主声骸)"
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
