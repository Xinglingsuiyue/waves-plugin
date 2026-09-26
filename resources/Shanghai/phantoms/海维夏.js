// 海维夏（声骸）
//
// 首位装配角色：琳奈
//
// 数据来源：库街区 wiki 声骸词条（entryId=1452356724912001024）。
//
// 声骸技能本体：召唤海维夏，十段 27.36% 的衍射伤害。
// 后续增益为「此后 15 秒内，若自身施放延奏技能，使下一个变奏技能登场的角色全属性伤害加成 +10%」——
// 作用于队友，不给装配者本体增伤，故本模块对自身伤害的贡献为 0；保留模块以便首位声骸可正常解析。

const wiki = {"id": "1452356724912001024", "name": "海维夏", "catalogueName": "海维夏（声骸）", "lastUpdateTime": "2026-01-17", "currentVersion": "6.0", "effectText": "技能描述\n使用声骸技能，召唤海维夏，在空中发射激光对敌人造成十段27.36%的衍射伤害。\n在此后15秒内，若自身施放延奏技能，使下一个变奏技能登场的角色全属性伤害加成提升10.00%，持续15秒。\n冷却时间：20秒"};

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
  name: "海维夏",
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
      source: "海维夏(主声骸)"
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
