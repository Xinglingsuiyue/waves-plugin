// 炉芯机骸（声骸）
//
// 首位装配角色：莫宁
//
// 数据来源：库街区 wiki 声骸词条（entryId=1452352508734234624）。
//
// 声骸技能本体：幻形为炉芯机骸，重斩造成 351.00% 的热熔伤害。
// 在首位装配该声骸技能时：自身共鸣效率 +10.00%。
// 共鸣效率不影响伤害乘区，故本模块对自身伤害的贡献为 0；保留模块以便首位声骸可正常解析。

const wiki = {"id": "1452352508734234624", "name": "炉芯机骸", "catalogueName": "炉芯机骸（声骸）", "lastUpdateTime": "2026-05-03", "currentVersion": "11.0", "effectText": "技能描述\n使用声骸技能，幻形为炉芯机骸，跃向空中施放重斩对敌人造成351.00%的热熔伤害。\n在首位装配该声骸技能时，自身共鸣效率提升10.00%。\n冷却时间：20秒"};

const EFFECTS = [];

function hasPanelValue(attrMap, key) {
  if (!key) return false;
  const value = attrMap?.[key];
  if (value == null || value === '') return false;
  if (typeof value === 'number') return value !== 0;
  const parsed = Number(String(value).replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(parsed) && parsed !== 0;
}

export default {
  name: "炉芯机骸",
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
      source: "炉芯机骸(主声骸)"
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
