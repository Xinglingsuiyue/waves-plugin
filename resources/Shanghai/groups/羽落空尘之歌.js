const wiki = {"id": "1524765410731888640", "name": "羽落空尘之歌", "catalogueName": "羽落空尘之歌", "lastUpdateTime": "2026-07-09", "currentVersion": "2.0", "effectText": "(2件套)\n共鸣效率提升10%\n\n(5件套)\n角色为敌人添加【虚湮效应】时，获得【玄翎之羽】：自身暴击提升20%，重击伤害加成提升35%，持续15秒。\n角色为敌人添加【霜渐效应】时，获得【重明之羽】：自身每1%的共鸣效率使队伍中角色攻击提升0.1%，上限25%，持续10秒。"};

// 备注：
//   - 5 件套有两条独立触发线：【虚湮效应】给【玄翎之羽】（自身暴击 +20%、重击伤害加成 +35%），
//     【霜渐效应】给【重明之羽】（按共鸣效率换算队伍攻击，上限 25%）。
//   - 默认按两路均已触发处理；可用 options.groupEffectActive=false 关闭。

export default {
  name: "羽落空尘之歌",
  wiki,

  apply({ panel, equipment, skillType, options }) {
    const count = Number(equipment?.groupCount || 0);
    const effectActive = options?.groupEffectActive ?? true;
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      deepen: 0,
      multiplierBonus: 0,
      ignoreDefense: 0,
      source: "羽落空尘之歌"
    };

    if (count < 5 || !effectActive) return buff;

    // 【玄翎之羽】：自身暴击 +20%，重击伤害加成 +35%（仅重击）。
    buff.critRate += 0.20;
    if (skillType === 'heavy') buff.damageBonus += 0.35;

    // 【重明之羽】：每 1% 共鸣效率使队伍角色攻击 +0.1%，上限 25%。
    // panel.resonanceEfficiency 为小数（100% → 1），换算成百分比点数后乘 0.001。
    const efficiencyPercent = Number(panel?.resonanceEfficiency || 0) * 100;
    buff.attackPercent += Math.min(0.25, efficiencyPercent * 0.001);

    return buff;
  }
};
