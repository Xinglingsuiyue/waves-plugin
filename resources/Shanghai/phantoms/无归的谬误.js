// 无归的谬误（声骸）
//
// 首位装配角色：卜灵、守岸人
//
// 数据来源：库街区 wiki 声骸词条（entryId=1287797218668396544）。
//
// 声骸技能本体（长按可续）：基于生命上限 15.86% / 1.58% / 19.82% 的衍射伤害。
// 使用声骸技能后：自身共鸣效率 +10%、全队角色攻击 +10%，持续 20 秒。
// （无「在首位装配」条款，故以下增益为「使用声骸技能后」的触发态，
//   库街区面板不会包含，触发期间默认开启，可用 options.phantomEffectActive=false 关闭。
//   共鸣效率不影响伤害乘区，未计入。）

const wiki = {"id": "1287797218668396544", "name": "无归的谬误", "catalogueName": "无归的谬误（声骸）", "lastUpdateTime": "2026-05-03", "currentVersion": "29.0", "effectText": "技能描述\n使用声骸技能，召唤无归的谬误一部分的权能，对周围的敌人造成1次基于自身生命上限15.86%的衍射伤害，使自身共鸣效率提升10%，全队角色攻击提升10%，持续20秒。\n长按声骸技能，可在震击结束后，消耗耐力持续进行攻击，每次造成基于生命上限1.58%的衍射伤害；结束长按时，触发最后一击，造成基于生命上限19.82%的衍射伤害。\n冷却时间：20秒"};

const EFFECTS = [
  {"field": "attackPercent", "value": 0.10, "skillTypes": [], "roles": [], "triggered": true, "panelAware": false, "attrKey": null, "maxStacks": 1}
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
  name: "无归的谬误",
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
      source: "无归的谬误(主声骸)"
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
