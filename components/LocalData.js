// LocalData.js - 本地数据管理
import fs from 'fs';
import path from 'path';
import { pluginResources, _path, PLAYER_PATH, ensureDir } from '../model/path.js';
import Config from './Config.js';
import Wiki from './Wiki.js';

// 漂泊者属性ID映射
const WAVERIDER_ATTRIBUTES = {
    '1604': '湮灭', '1605': '湮灭',
    '1501': '衍射', '1502': '衍射',
    '1406': '气动', '1408': '气动'
};

const WAVERIDER_ROLE_IDS = Object.keys(WAVERIDER_ATTRIBUTES);

export class LocalData {
    constructor() {
        this.charactersFile = path.join(pluginResources, 'data/characters.json');
        this.weaponsFile = path.join(pluginResources, 'data/weapons.json');
        this.ensureDataFiles();
    }

    ensureDataFiles() {
        if (!fs.existsSync(path.dirname(this.charactersFile))) {
            fs.mkdirSync(path.dirname(this.charactersFile), { recursive: true });
        }
        if (!fs.existsSync(this.charactersFile)) fs.writeFileSync(this.charactersFile, '{}');
        if (!fs.existsSync(this.weaponsFile)) fs.writeFileSync(this.weaponsFile, '{}');
    }

    // ==================== rawData.json 读写 ====================

    /**
     * 获取玩家数据目录路径 (核心路径判定)
     * 1. 如果配置了外部路径，直接返回外部路径下的 UID 目录
     * 2. 否则返回默认路径 (Yunzai/data/waves/players/UID)
     */
    getPlayerDir(uid, useExternal = true) {
        const externalConfig = Config.getExternalConfig();
        
        // 优先检查配置的外部路径
        if (useExternal && externalConfig.external_xwuid_enable && externalConfig.external_xwuid_players_path) {
            const externalRoot = externalConfig.external_xwuid_players_path;
            // 只要外部根目录存在，就使用它
            if (fs.existsSync(externalRoot)) {
                return path.join(externalRoot, uid);
            }
        }
        
        // 否则使用默认路径
        return path.join(PLAYER_PATH, uid);
    }

    getRawDataPath(uid, useExternal = true) {
        return path.join(this.getPlayerDir(uid, useExternal), 'rawData.json');
    }

    getCharListDataPath(uid, useExternal = true) {
        return path.join(this.getPlayerDir(uid, useExternal), 'charListData.json');
    }

    readRawData(uid) {
        try {
            // 直接通过 getPlayerDir 确定读取位置
            const rawDataPath = this.getRawDataPath(uid, true);
            
            if (!fs.existsSync(rawDataPath)) {
                return null;
            }

            const content = fs.readFileSync(rawDataPath, 'utf-8');
            const data = JSON.parse(content);
            
            if (!Array.isArray(data)) {
                logger.warn(`[WAVES PLUGIN] UID ${uid} 数据格式错误，已清理`);
                fs.unlinkSync(rawDataPath);
                return null;
            }
            return data;
        } catch (error) {
            return null;
        }
    }

    /**
     * 保存面板数据
     * 修改点：不再分别写入，而是直接写入到 getPlayerDir 确定的“主目录”
     */
    saveRawData(uid, roleDetailList) {
        try {
            const existingData = this.readRawData(uid) || [];
            const mergedData = this._mergeRoleData(existingData, roleDetailList);
            const deduplicatedData = this._deduplicateWaverider(mergedData);
            
            // 1. 获取目标目录 (如果配置了外部路径，这里就是外部路径)
            const targetDir = this.getPlayerDir(uid, true);
            ensureDir(targetDir); // 确保目录存在
            
            // 2. 写入文件
            const targetPath = path.join(targetDir, 'rawData.json');
            fs.writeFileSync(targetPath, JSON.stringify(deduplicatedData, null, 2));
            
            if (Config.getConfig()?.enable_log) {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`数据已保存至: ${targetPath}`));
            }
            
            return true;
        } catch (error) {
            logger.error(`[WAVES PLUGIN] 保存数据失败: ${error.message}`);
            return false;
        }
    }

    // ... _mergeRoleData 和 _deduplicateWaverider 保持不变 ...
    _mergeRoleData(existingData, newData) {
        const dataMap = new Map();
        for (const role of existingData) {
            const roleId = role.role?.roleId || role.roleId;
            if (roleId) dataMap.set(roleId.toString(), role);
        }
        for (const role of newData) {
            const roleId = role.role?.roleId || role.roleId;
            if (roleId) dataMap.set(roleId.toString(), role);
        }
        return Array.from(dataMap.values());
    }

    _deduplicateWaverider(roleDataList) {
        const waveriderRoles = [];
        const otherRoles = [];
        for (const role of roleDataList) {
            const roleId = (role.role?.roleId || role.roleId)?.toString();
            if (WAVERIDER_ROLE_IDS.includes(roleId)) waveriderRoles.push(role);
            else otherRoles.push(role);
        }
        if (waveriderRoles.length > 1) {
            waveriderRoles.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            return [...otherRoles, waveriderRoles[0]];
        }
        return [...otherRoles, ...waveriderRoles];
    }

    getRoleByName(uid, roleName) {
        const rawData = this.readRawData(uid);
        if (!rawData) return null;
        
        const isWaverider = roleName.includes('漂泊者');
        for (const roleData of rawData) {
            const role = roleData.role || roleData;
            const name = role.roleName;
            if (isWaverider && name === '漂泊者') {
                const roleId = role.roleId?.toString();
                const attribute = WAVERIDER_ATTRIBUTES[roleId];
                if (roleName === '漂泊者' || roleName === `漂泊者${attribute}`) return roleData;
            } else if (name === roleName) {
                return roleData;
            }
        }
        return null;
    }

    getAllRoles(uid) {
        const rawData = this.readRawData(uid);
        if (!rawData) return [];
        return rawData.map(roleData => {
            const role = roleData.role || roleData;
            const roleId = role.roleId?.toString();
            let displayName = role.roleName;
            if (displayName === '漂泊者' && WAVERIDER_ATTRIBUTES[roleId]) displayName = `漂泊者${WAVERIDER_ATTRIBUTES[roleId]}`;
            return {
                roleId: roleId,
                displayName: displayName,
                level: roleData.level || role.level
            };
        });
    }

    // ==================== charListData.json 读写 ====================

    saveCharListData(uid, roleId, score) {
        try {
            // 1. 获取目标目录 (外部优先)
            const targetDir = this.getPlayerDir(uid, true);
            const targetPath = path.join(targetDir, 'charListData.json');
            
            let charListData = {};
            
            // 2. 读取现有
            if (fs.existsSync(targetPath)) {
                try {
                    charListData = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
                } catch {}
            }
            
            // 3. 更新并写入
            charListData[roleId] = score;
            ensureDir(targetDir);
            fs.writeFileSync(targetPath, JSON.stringify(charListData, null, 2));
        } catch (e) {
            logger.error(`保存 charListData 失败: ${e.message}`);
        }
    }

    // ... 保留 getCharacter, getWeapon 等其他方法 ...
    async getCharacter(name) {
        const data = JSON.parse(fs.readFileSync(this.charactersFile, 'utf-8'));
        if (data[name]) return data[name];
        if (Config.getConfig()?.enable_wiki_fallback) {
            const wiki = new Wiki();
            const result = await wiki.getRecord(name);
            if (result.status) {
                const characterData = { name: name, avatar: result.record.content.contentUrl };
                data[name] = characterData;
                fs.writeFileSync(this.charactersFile, JSON.stringify(data, null, 2));
                return characterData;
            }
        }
        return null;
    }

    async getWeapon(name) { /* ... */ }
    async updateAllFromWiki() { /* ... */ }
}

export default new LocalData();