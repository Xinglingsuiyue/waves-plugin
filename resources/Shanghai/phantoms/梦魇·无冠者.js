// 梦魇·无冠者（声骸）
//
// 数据来源：库街区 wiki 声骸词条（entryId=1322614167397134336），技能描述取 5★。
// 声骸技能：使用声骸技能，幻形为梦魇·无冠者，对前方敌人造成264.60%的湮灭伤害。
//
// 说明：首位装配固定加成通常已计入角色总面板，此处仅做面板存在性判断，缺失时才补，避免双计。

const wiki = {
  name: "梦魇·无冠者",
  catalogueName: "梦魇·无冠者（声骸）",
  effectText: "技能描述\n使用声骸技能，幻形为梦魇·无冠者，对前方敌人造成264.60%的湮灭伤害。\n在首位装配该声骸技能时，自身湮灭伤害加成提升12.00%，普攻伤害加成提升12.00%。\n初始拥有3次可使用次数，每12秒可使用次数增加1次，可使用次数上限3次。\n梦魇·无冠者命中目标后，该声骸技能造成的伤害提升20.00%，持续2秒，不可叠加。\n|\n冷却时间：12秒\n|"
};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.12, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "湮灭伤害加成", "maxStacks": 1},
  {"field": "damageBonus", "value": 0.12, "skillTypes": ["normal"], "roles": [], "triggered": true, "panelAware": true, "attrKey": "普攻伤害加成", "maxStacks": 1}
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
  name: "梦魇·无冠者",
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
      source: "梦魇·无冠者(主声骸)"
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
