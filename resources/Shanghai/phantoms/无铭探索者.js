// 无铭探索者（声骸）
//
// 首位装配角色：西格莉卡
//
// 数据来源：库街区角色面板 phantomProp.skillDescription。
// 游戏内技能描述：
//   使用声骸技能，召唤无铭探索者，攻击贯穿路径上的敌人造成273.60%的气动伤害。在首位装配该声骸技能时，自身气动伤害加成提升12.00%，声骸技能伤害加成提升20.00%。技能冷却：20秒
//
// 声骸技能本体：攻击贯穿路径上的敌人，造成 273.60% 的气动伤害。
// 在首位装配该声骸技能时：自身气动伤害加成 +12.00%、声骸技能伤害加成 +20.00%。
// 声骸技能伤害加成仅作用于声骸技能本身，本模块未单独计算声骸伤害项，故只在 skillType==='echo' 时生效。
// （库街区 wiki 声骸目录暂未收录该词条，描述取自库街区角色面板 phantomProp.skillDescription。）

const EFFECTS = [
  {"field": "damageBonus", "value": 0.12, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "气动伤害加成", "maxStacks": 1},
  {"field": "damageBonus", "value": 0.20, "skillTypes": ["echo"], "roles": [], "triggered": true, "panelAware": true, "attrKey": "声骸技能伤害加成", "maxStacks": 1}
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
  name: "无铭探索者",
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
      source: "无铭探索者(主声骸)"
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
