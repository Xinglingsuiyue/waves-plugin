export default {
  name: '焰光裁定',

  // 数据来源：百度百科 / wuthering.gg - 焰光裁定（5★ 臂铠 赞妮专武）
  // 90 级面板：攻击 587、暴击伤害 48.6%。
  //
  // 谐振「破暗者」 R1/R2/R3/R4/R5：
  //   攻击提升 12% / 15% / 18% / 21% / 24%
  //   施放共鸣解放时，获得以下效果（持续 14s，重复刷新）：
  //     自身造成伤害无视目标 8% / 10% / 12% / 14% / 16% 防御
  //     自身直接造成的【光噪效应】伤害加深 50% / 62.5% / 75% / 87.5% / 100%
  //
  // 默认假设：赞妮爆发链开局即释放共鸣解放，buff 全程在线。
  //   - 【光噪效应】属于异常伤害区间，不直接进赞妮自身的普攻/重击区，
  //     因此 lightNoiseDeepen 不并入 deepen，本模块仅给攻击%与无视防御。
  //     如外部以 windErosion/lightNoise 类型计算异常时，可读 buff.windErosionDeepen 沿用。
  apply({ panel }) {
    const reson = Number(panel?.weaponResonLevel || 1);

    const attackMap = { 1: 0.12, 2: 0.15, 3: 0.18, 4: 0.21, 5: 0.24 };
    const ignoreMap = { 1: 0.08, 2: 0.10, 3: 0.12, 4: 0.14, 5: 0.16 };
    const lightNoiseMap = { 1: 0.50, 2: 0.625, 3: 0.75, 4: 0.875, 5: 1.00 };

    return {
      attackPercent: attackMap[reson] || attackMap[1],
      ignoreDefense: ignoreMap[reson] || ignoreMap[1],
      lightNoiseDeepen: lightNoiseMap[reson] || lightNoiseMap[1],
      source: '焰光裁定'
    };
  }
};
