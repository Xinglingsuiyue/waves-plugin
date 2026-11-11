const wiki = {"id": "1523658192970907648", "name": "天之苍苍", "lastUpdateTime": "2026-07-10", "currentVersion": "4.0", "effectText": "千仞无枝\n谐振(1/2/3/4/5)阶\n全属性伤害加成提升（12%/15%/18%/21%/24%）。附加【虚湮效应】后，重击伤害加深（36%/45%/54%/63%/72%），重击伤害无视目标（12%/15%/18%/21%/24%）防御，持续8秒。\n流风铸刃，苍天为鞘，剑锋既出，万籁俱寂。\n永不褪色的那抹青蓝，是她的决意、誓言与理想。\n获取途径：唤取"};

// 谐振(R1/R2/R3/R4/R5)：
//   全属性伤害加成提升 12%/15%/18%/21%/24%（无条件，通常已进面板，见下方判重）。
//   附加【虚湮效应】后：重击伤害加深 36%/45%/54%/63%/72%，
//     重击伤害无视目标 12%/15%/18%/21%/24% 防御，持续 8 秒。
// 默认假设：秧秧·玄翎输出流程中已附加【虚湮效应】，触发态全程在线
//   （可用 options.weaponEffectActive === false 关闭触发态）。
const ALL_DMG = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };
const HEAVY_DEEPEN = { 1: 0.36, 2: 0.45, 3: 0.54, 4: 0.63, 5: 0.72 };
const HEAVY_IGNORE_DEF = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };

function hasPanelValue(attrMap, key) {
  if (!key) return false;
  const value = attrMap?.[key];
  if (value == null || value === '') return false;
  if (typeof value === 'number') return value !== 0;
  const parsed = Number(String(value).replace(/,/g, '').replace('%', '').trim());
  return Number.isFinite(parsed) && parsed !== 0;
}

export default {
  name: "天之苍苍",
  wiki,

  apply({ panel, skillType, options }) {
    const reson = Math.max(1, Math.min(5, Number(panel?.weaponResonLevel || 1)));
    const triggerActive = options?.weaponEffectActive ?? true;
    const buff = {
      damageBonus: 0,
      deepen: 0,
      ignoreDefense: 0,
      source: "天之苍苍"
    };

    // 全属性伤害加成：面板各属性伤害加成已计入时跳过。
    if (!hasPanelValue(panel?.attrMap, '导电伤害加成')) {
      buff.damageBonus += ALL_DMG[reson] || 0;
    }

    if (triggerActive && skillType === 'heavy') {
      buff.deepen += HEAVY_DEEPEN[reson] || 0;
      buff.ignoreDefense += HEAVY_IGNORE_DEF[reson] || 0;
    }

    return buff;
  }
};
