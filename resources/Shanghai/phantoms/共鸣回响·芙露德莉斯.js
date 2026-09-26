// 共鸣回响·芙露德莉斯（声骸）
//
// 首位装配角色：卡提希娅、漂泊者·气动
//
// 数据来源：库街区 wiki 声骸词条（entryId=1352755169681383424）。
//
// 声骸技能本体：召唤【破空幻刃】，八段 27.36% + 一段 136.68% 的气动伤害。
// 在首位装配该声骸技能时：自身气动伤害加成 +10.00%；
//   当装配角色为漂泊者·气动或卡提希娅时，自身气动伤害加成额外 +10.00%（合计 +20%）。
// 基础 10% 属常驻装配属性，库街区面板已计入（卡提希娅面板气动 10%），故 panelAware 去重；
// 额外 10% 面板未计入，按角色条件补足。

const wiki = {"id": "1352755169681383424", "name": "共鸣回响·芙露德莉斯", "catalogueName": "共鸣回响·芙露德莉斯（声骸）", "lastUpdateTime": "2026-03-14", "currentVersion": "33.0", "effectText": "技能描述\n使用声骸技能，召唤【破空幻刃】，攻击目标，造成八段27.36%和一段136.680%的气动伤害。\n在首位装配该声骸技能时，自身气动伤害加成提升10.00%，当装配角色为漂泊者·气动和卡提希娅时，自身气动伤害加成额外提升10.00%。\n冷却时间：20秒"};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.10, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "气动伤害加成", "maxStacks": 1},
  {"field": "damageBonus", "value": 0.10, "skillTypes": [], "roles": ["卡提希娅", "漂泊者·气动"], "triggered": true, "panelAware": false, "attrKey": null, "maxStacks": 1}
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
  name: "共鸣回响·芙露德莉斯",
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
      source: "共鸣回响·芙露德莉斯(主声骸)"
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
