// 双极·星升辉铳（声骸）
//
// 首位装配角色：陆·赫斯
//
// 数据来源：库街区 wiki 声骸词条（entryId=1452378218664689664）。
//
// 声骸技能本体：两段斩击，每段 80.51% 的衍射伤害（初始 2 次，8 秒回复 1 次）。
// 在首位装配该声骸技能时：自身衍射伤害加成 +12.00%、普攻伤害加成 +12.00%。
// 同时装配双极·渊陨重锋时：声骸技能两武器交替更变但视为同名，
//   【双极律动】每层使该声骸技能造成的伤害提升 10%（仅作用于声骸技能本体，未计入本体技能列表）。

const wiki = {"id": "1452378218664689664", "name": "双极·星升辉铳", "catalogueName": "双极·星升辉铳（声骸）", "lastUpdateTime": "2026-02-04", "currentVersion": "11.0", "effectText": "技能描述\n使用声骸技能，幻形为双极·星升辉铳，发动两段斩击，每段攻击造成80.51%的衍射伤害。\n在首位装配该声骸技能时，自身衍射伤害加成提升12.00%，普攻伤害加成提升12.00%。\n自身同时装配双极·渊陨重锋时：\n·使用声骸技能后，声骸技能在双极·星升辉铳、双极·渊陨重锋中交替更变，但视为同名声骸技能，且装配首位声骸获得的伤害加成不变。\n·双极·渊陨重锋的伤害类型将变为衍射伤害。\n·施放普攻时获得1层【双极律动】，施放共鸣技能时获得3层【双极律动】，可叠加6层，持续8秒，每层可以使该声骸技能造成的伤害提升10%，该声骸技能效果结束后清除全部层数。\n·可使用次数上限变为2次，初始拥有2次可使用次数，每8秒可使用次数增加1次。\n冷却时间：8秒"};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.12, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "衍射伤害加成", "maxStacks": 1},
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
  name: "双极·星升辉铳",
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
      source: "双极·星升辉铳(主声骸)"
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
