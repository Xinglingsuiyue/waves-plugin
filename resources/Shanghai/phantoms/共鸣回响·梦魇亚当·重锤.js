export default {
  name: '共鸣回响·梦魇亚当·重锤',

  apply({ panel }) {
    const roleName = String(panel?.roleName || '');
    const buff = {
      critRate: 0,
      source: '共鸣回响·梦魇亚当·重锤(主声骸)'
    };

    if (roleName === '露西' || roleName === '丽贝卡') {
      buff.critRate += 0.15;
    }

    return buff;
  }
};
