// 梦魇·哀声鸷（声骸） 
//
// 数据来源：库街区 wiki 声骸词条（entryId=1322222871373139968），技能描述取 5★。
// 声骸技能：使用声骸技能，召唤梦魇·哀声鸷，对周围敌人造成273.60%的衍射伤害。
//
// 说明：首位装配固定加成通常已计入角色总面板，此处仅做面板存在性判断，缺失时才补，避免双计。

const wiki = {
  name: "梦魇·哀声鸷",
  catalogueName: "梦魇·哀声鸷（声骸） ",
  effectText: "技能描述\n使用声骸技能，召唤梦魇·哀声鸷，对周围敌人造成273.60%的衍射伤害。\n若敌人处于受「光噪效应」影响状态时，哀声鸷造成的伤害提升100.00%。\n在首位装配该声骸技能时，自身衍射伤害加成提升12.00%。\n|\n冷却时间：20秒\n|"
};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.12, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "衍射伤害加成", "maxStacks": 1}
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
  name: "梦魇·哀声鸷",
  wiki,

  apply({ panel, skillType, options }) {
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
      source: "梦魇·哀声鸷(主声骸)"
    };

    for (const effect of EFFECTS) {
      if (effect.triggered && !effectActive) continue;
      if (effect.skillTypes?.length && !effect.skillTypes.includes(skillType)) continue;
      if (effect.panelAware && hasPanelValue(panel?.attrMap, effect.attrKey)) continue;
      const configuredStacks = Number(options?.effectStacks ?? effect.maxStacks ?? 1);
      const stacks = Math.max(0, Math.min(Number(effect.maxStacks || 1), configuredStacks));
      if (effect.field in buff) buff[effect.field] += Number(effect.value || 0) * stacks;
    }
    return buff;
  }
};
