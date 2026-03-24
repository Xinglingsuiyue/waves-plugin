function parsePercent(value) {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  if (str.endsWith('%')) return Number(str.replace('%', '')) / 100;
  return Number(str) || 0;
}

function parseNumber(value) {
  if (value == null) return 0;
  return Number(String(value).replace(/,/g, '').replace('%', '').trim()) || 0;
}

export function normalizeRoleDetailData(roleDetailData) {
  if (!roleDetailData) return {};

  if (typeof roleDetailData.data === 'string') {
    try {
      return JSON.parse(roleDetailData.data);
    } catch {
      return {};
    }
  }

  if (roleDetailData.data && typeof roleDetailData.data === 'object') {
    return roleDetailData.data;
  }

  return roleDetailData;
}

export function getAttrMap(roleDetailData) {
  const data = normalizeRoleDetailData(roleDetailData);
  const map = {};

  const roleAttrs = data?.roleAttributeList || [];
  const phantomAddProps = data?.equipPhantomAddPropList || [];
  const phantomAttrList = data?.equipPhantomAttributeList || [];

  // 1. 先放最终角色面板属性（优先级最高）
  for (const item of roleAttrs) {
    if (!item?.attributeName) continue;
    map[item.attributeName] = item.attributeValue;
  }

  // 2. 再补充声骸附加属性，但不覆盖角色最终属性
  for (const item of phantomAddProps) {
    if (!item?.attributeName) continue;
    if (!(item.attributeName in map)) {
      map[item.attributeName] = item.attributeValue;
    }
  }

  // 3. 最后补充声骸明细，同样不覆盖
  for (const item of phantomAttrList) {
    if (!item?.attributeName) continue;
    if (!(item.attributeName in map)) {
      map[item.attributeName] = item.attributeValue;
    }
  }

  return map;
}

export function parsePanel(roleDetailData) {
  const data = normalizeRoleDetailData(roleDetailData);
  const attrMap = getAttrMap(roleDetailData);

  const role = data?.role || {};
  const weaponData = data?.weaponData || {};
  const weapon = weaponData?.weapon || {};

  const attack = parseNumber(attrMap['攻击']);
  const hp = parseNumber(attrMap['生命']);
  const def = parseNumber(attrMap['防御']);

  const critRate = parsePercent(attrMap['暴击']);

  // 面板“暴击伤害”一般直接显示最终值，比如 266%
  // 这里按最终暴伤乘区处理：266% -> 2.66
  const critDamage = parsePercent(attrMap['暴击伤害']) || 1.5;

  const resonanceEfficiency = parsePercent(attrMap['共鸣效率']);

  return {
    roleId: role.roleId,
    roleName: role.roleName,
    level: data?.level || role.level || 90,
    attack,
    hp,
    def,
    critRate,
    critDamage,
    resonanceEfficiency,
    weaponId: weapon.weaponId,
    weaponName: weapon.weaponName,
    weaponResonLevel: weaponData?.resonLevel || 1,
    attrMap,
    raw: data
  };
}

export function getPercentAttr(attrMap, key) {
  return parsePercent(attrMap?.[key] || 0);
}

export function getNumberAttr(attrMap, key) {
  return parseNumber(attrMap?.[key] || 0);
}

export function parseEquipment(roleDetailData) {
  const data = normalizeRoleDetailData(roleDetailData);

  const weaponName = data?.weaponData?.weapon?.weaponName || '';

  const phantoms = data?.phantomData?.equipPhantomList || [];
  const mainPhantom = phantoms?.[0]?.phantomProp?.name || '';

  const groupCounter = {};
  for (const item of phantoms) {
    const groupName = item?.fetterDetail?.name;
    if (!groupName) continue;
    groupCounter[groupName] = (groupCounter[groupName] || 0) + 1;
  }

  let groupName = '';
  let groupCount = 0;
  for (const [name, count] of Object.entries(groupCounter)) {
    if (count > groupCount) {
      groupName = name;
      groupCount = count;
    }
  }

  return {
    weaponName,
    phantomName: mainPhantom,
    groupName,
    groupCount
  };
}
