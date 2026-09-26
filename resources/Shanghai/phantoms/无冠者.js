// 无冠者（声骸）
//
// 首位装配角色：椿
//
// 数据来源：库街区 wiki 声骸词条（entryId=1226644317286776832）。
//
// 声骸技能本体：幻形为无冠者，最多连续 4 次，合计 134.08%*2 + 100.56%*2 + 67.04%*3 的湮灭伤害。
// 幻形后：自身湮灭伤害加成 +12.00%、共鸣技能伤害加成 +12.00%，持续 15 秒。
// （原文为「幻形后」的触发态而非「在首位装配」条款，本模块按与其它首位声骸一致的口径处理：
//   库街区面板已计入时去重，未计入时按技能类型补足。）

const wiki = {"id": "1226644317286776832", "name": "无冠者", "catalogueName": "无冠者（声骸）", "lastUpdateTime": "2026-01-17", "currentVersion": "31.0", "effectText": "技能描述\n使用声骸技能，幻形为无冠者，可连续使用最多4次，前2次均造成一段134.08%的湮灭伤害，第3次造成两段100.56%的湮灭伤害，第4次造成三段67.04%的湮灭伤害\n幻形后，自身湮灭伤害加成提升12.00%，共鸣技能伤害加成提升12.00%，持续15秒。\n冷却时间：20秒"};

const EFFECTS = [
  {"field": "damageBonus", "value": 0.12, "skillTypes": [], "roles": [], "triggered": true, "panelAware": true, "attrKey": "湮灭伤害加成", "maxStacks": 1},
  {"field": "damageBonus", "value": 0.12, "skillTypes": ["skill"], "roles": [], "triggered": true, "panelAware": true, "attrKey": "共鸣技能伤害加成", "maxStacks": 1}
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
  name: "无冠者",
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
      source: "无冠者(主声骸)"
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
