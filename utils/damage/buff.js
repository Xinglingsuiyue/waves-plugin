export function createEmptyBuff() {
  return {
    attackPercent: 0,
    flatAttack: 0,

    // 通用伤害加成
    damageBonus: 0,

    // 元素伤害加成（如衍射伤害加成）
    elementDamageBonus: 0,

    // 技能类型伤害加成（如共鸣技能伤害加成 / 共鸣解放伤害加成 / 变奏技能伤害加成）
    skillDamageBonus: 0,

    deepen: 0,
    multiplierBonus: 0,
    ignoreDefense: 0,

    // 调试来源
    sources: []
  };
}

export function mergeBuff(...buffs) {
  const result = createEmptyBuff();

  for (const buff of buffs) {
    if (!buff) continue;

    result.attackPercent += Number(buff.attackPercent || 0);
    result.flatAttack += Number(buff.flatAttack || 0);
    result.damageBonus += Number(buff.damageBonus || 0);
    result.elementDamageBonus += Number(buff.elementDamageBonus || 0);
    result.skillDamageBonus += Number(buff.skillDamageBonus || 0);
    result.deepen += Number(buff.deepen || 0);
    result.multiplierBonus += Number(buff.multiplierBonus || 0);
    result.ignoreDefense += Number(buff.ignoreDefense || 0);

    if (Array.isArray(buff.sources)) {
      result.sources.push(...buff.sources);
    } else if (buff.source) {
      result.sources.push({
        source: buff.source,
        attackPercent: Number(buff.attackPercent || 0),
        flatAttack: Number(buff.flatAttack || 0),
        damageBonus: Number(buff.damageBonus || 0),
        elementDamageBonus: Number(buff.elementDamageBonus || 0),
        skillDamageBonus: Number(buff.skillDamageBonus || 0),
        deepen: Number(buff.deepen || 0),
        multiplierBonus: Number(buff.multiplierBonus || 0),
        ignoreDefense: Number(buff.ignoreDefense || 0)
      });
    }
  }

  return result;
}
