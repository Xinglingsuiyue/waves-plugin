const wiki = {
  "id": "1452385855040229376",
  "name": "星构寻辉之环",
  "lastUpdateTime": "2026-01-17",
  "currentVersion": "4.0",
  "effectText": "星构寻辉之环\n\n(2件套)\n\n治疗效果提升10%\n\n星构寻辉之环\n\n(5件套)\n\n为队伍中角色提供治疗时，自身每1%的偏谐值累积效率使队伍中角色攻击提升0.2%，上限25%，持续4秒，同名效果之间不可叠加。"
};

function parsePercent(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  if (str.endsWith('%')) return Number(str.replace('%', '')) / 100;
  return Number(str) || 0;
}

export default {
  name: "星构寻辉之环",
  wiki,

  apply({ panel, equipment }) {
    const count = Number(equipment?.groupCount || 0);
    const buff = {
      attackPercent: 0,
      damageBonus: 0,
      critRate: 0,
      critDamage: 0,
      source: "星构寻辉之环"
    };

    // (2件套) 治疗效果提升 10%：固定加成，已计入角色总面板，且非伤害属性，不计算。

    if (count >= 5) {
      // (5件套) 为队伍中角色提供治疗时，自身每 1% 偏谐值累积效率使队伍中角色攻击 +0.2%，上限 +25%。
      const attrMap = panel?.attrMap || {};
      const eff = parsePercent(attrMap['偏斜效率'] ?? attrMap['偏谐值累积效率'] ?? 0);
      buff.attackPercent += Math.min(0.25, eff * 0.2);
    }

    return buff;
  }
};
