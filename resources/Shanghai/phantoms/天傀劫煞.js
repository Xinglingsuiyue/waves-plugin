const wiki = {"id": "1539278533590556672", "name": "天傀劫煞", "catalogueName": "天傀劫煞（声骸）", "lastUpdateTime": "2026-08-19", "currentVersion": "6.0", "effectText": "技能描述\n使用声骸技能，幻形为天傀劫煞，对敌人造成405.00%的气动伤害。\n在首位装配该声骸技能时，自身气动伤害加成提升10.00%；为目标附加【集谐·偏移】时，自身气动伤害加成额外提升10.00%，持续15秒。\n冷却时间：25秒"};

const SKILL_MULTIPLIER = {
  2: 2.70,
  3: 3.15,
  4: 3.60,
  5: 4.05
};

export default {
  name: "天傀劫煞",
  wiki,

  getSkill({ options = {} } = {}) {
    const rarity = Math.max(2, Math.min(5, Number(options.tiankuiJieshaRarity ?? 5)));
    return {
      name: '声骸技能·天傀劫煞',
      type: 'phantom',
      element: '气动',
      skillMultiplier: SKILL_MULTIPLIER[rarity],
      rarity
    };
  },

  apply({ panel, options = {} }) {
    const effectActive = options.tiankuiJieshaEffectActive
      ?? options.phantomEffectActive
      ?? true;
    const targetMarked = options.tiankuiJieshaTargetMarked ?? true;
    const attrMap = panel?.attrMap || {};
    const aero = attrMap['气动伤害加成'];
    const lacksAero = !aero || aero === '0%' || aero === 0;
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      deepen: 0,
      multiplierBonus: 0,
      ignoreDefense: 0,
      source: "天傀劫煞"
    };

    // 首位装配的固定加成（气动 +10%）已计入角色总面板，缺失时才补，避免双计。
    if (lacksAero) buff.damageBonus += 0.10;

    // 动态效果：为目标附加【集谐·偏移】时，自身气动伤害额外 +10%。
    if (effectActive && targetMarked) buff.damageBonus += 0.10;
    return buff;
  }
};
