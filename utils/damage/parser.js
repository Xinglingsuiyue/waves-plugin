import fs from 'fs';
import { fileURLToPath } from 'url';

const weightCache = new Map();

/**
 * 读取角色 90 级基础属性（含武器基础攻击）。
 * 数据来源：resources/Weight/<roleId>.yaml。
 */
function getBaseStat(roleDetailData) {
  const data = normalizeRoleDetailData(roleDetailData);
  const roleId = data?.role?.roleId;
  if (roleId == null) return { baseAttack: 0, baseHP: 0, baseDefense: 0 };

  const key = String(roleId);
  if (weightCache.has(key)) return weightCache.get(key);

  const result = { baseAttack: 0, baseHP: 0, baseDefense: 0 };
  try {
    const filePath = fileURLToPath(new URL(`../../resources/Weight/${key}.yaml`, import.meta.url));
    if (fs.existsSync(filePath)) {
      const text = fs.readFileSync(filePath, 'utf-8');
      const read = name => {
        const match = text.match(new RegExp(`^${name}:\\s*([\\d.]+)`, 'm'));
        return match ? Number(match[1]) || 0 : 0;
      };
      result.baseAttack = read('baseAttack');
      result.baseHP = read('baseHP');
      result.baseDefense = read('baseDefense');
    }
  } catch {
    // 读取失败时保持 0，调用方回退到旧口径。
  }

  weightCache.set(key, result);
  return result;
}

export function getBaseAttack(roleDetailData) {
  return getBaseStat(roleDetailData).baseAttack;
}

export function getBaseHp(roleDetailData) {
  return getBaseStat(roleDetailData).baseHP;
}

export function getBaseDefense(roleDetailData) {
  return getBaseStat(roleDetailData).baseDefense;
}

/**
 * 计算最终攻击力。
 * 面板攻击已包含装备提供的攻击%与固定攻击；战斗中动态获得的攻击%只作用于
 * 基础攻击（角色基础 + 武器基础），不能再乘一次面板总值。
 */
export function calcFinalAttack(panel, buff = {}, roleDetailData) {
  const attack = Number(panel?.attack || 0);
  const attackPercent = Number(buff?.attackPercent || 0);
  const flatAttack = Number(buff?.flatAttack || 0);
  const baseAttack = getBaseAttack(roleDetailData) || Number(panel?.baseAttack || 0);

  if (!baseAttack) {
    // 缺少基础攻击数据时保持旧口径，避免直接丢弃动态攻击加成。
    return attack * (1 + attackPercent) + flatAttack;
  }

  return attack + baseAttack * attackPercent + flatAttack;
}

/**
 * 计算最终生命上限。
 * 与攻击同口径：面板生命已包含装备提供的生命%与固定生命，战斗中动态获得的
 * 生命%只作用于角色基础生命。
 */
export function calcFinalHp(panel, buff = {}, roleDetailData) {
  const hp = Number(panel?.hp || 0);
  const hpPercent = Number(buff?.hpPercent || 0);
  const flatHp = Number(buff?.flatHp || 0);
  const baseHp = getBaseHp(roleDetailData) || Number(panel?.baseHp || 0);

  if (!baseHp) {
    return hp * (1 + hpPercent) + flatHp;
  }

  return hp + baseHp * hpPercent + flatHp;
}

/**
 * 计算最终防御力。
 * 与攻击/生命同口径：面板防御已包含装备提供的防御%与固定防御，
 * 战斗中动态获得的防御%只作用于角色基础防御。
 */
export function calcFinalDefense(panel, buff = {}, roleDetailData) {
  const defense = Number(panel?.defense || panel?.def || 0);
  const defensePercent = Number(buff?.defensePercent || 0);
  const flatDefense = Number(buff?.flatDefense || 0);
  const baseDefense = getBaseDefense(roleDetailData) || Number(panel?.baseDefense || 0);

  if (!baseDefense) {
    return defense * (1 + defensePercent) + flatDefense;
  }

  return defense + baseDefense * defensePercent + flatDefense;
}

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

  // 所有已装备的合鸣套装（不管几套，全都生效），供引擎逐个套用动态效果。
  const groups = Object.entries(groupCounter)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    weaponName,
    phantomName: mainPhantom,
    groupName,
    groupCount,
    groups
  };
}
