const wiki = {"id": "1531031469563863040", "name": "栖霞饮露", "lastUpdateTime": "2026-07-30", "currentVersion": "4.0", "effectText": "簪春\n谐振(1/2/3/4/5)阶\n生命提升(12%/15%/18%/21%/24%)。施放共鸣解放时，回复自身(8/10/12/14/16)点协奏能量，每20秒可触发1次。每次附加霜渐效应时，获得【染雪色】，持续6秒；每次造成治疗时，获得【生漪】，持续6秒。若自身为队伍中登场角色时附加过霜渐效应且造成过治疗，则下次施放延奏技能时获得6秒的【染雪色】与【生漪】。自身同时持有【染雪色】和【生漪】时，附近队伍中所有角色攻击提升(20%/25%/30%/35%/40%)。同名效果之间不可叠加。\n朝霞作纸，晨露为墨，既已执笔，总该铺一卷山河。\n传闻神鸟垂眸时，群山静默，江流止息；\n待它再度引颈长鸣时，沉寂的日轮将自云海尽头升起。\n获取途径：唤取"};

const EFFECT = {
  hp: { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 },
  teamAttack: { 1: 0.20, 2: 0.25, 3: 0.30, 4: 0.35, 5: 0.40 }
};

function pick(map, reson) {
  return map ? Number(map[reson] ?? map[1] ?? 0) : 0;
}

export default {
  name: "栖霞饮露",
  wiki,

  apply({ panel, options }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const bothStatesActive = options?.qixiayinluBothStates
      ?? options?.weaponEffectActive
      ?? true;

    return {
      hpPercent: pick(EFFECT.hp, reson),
      attackPercent: bothStatesActive ? pick(EFFECT.teamAttack, reson) : 0,
      damageBonus: 0,
      source: "栖霞饮露"
    };
  }
};
