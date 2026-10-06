import Config from './Config.js';

const HIDDEN_USERS_KEY = 'Yunzai:waves:uid_hidden_users';
const USER_KEY = userId => `Yunzai:waves:users:${userId}`;
const BIND_KEY = userId => `Yunzai:waves:bind:${userId}`;

function maskUid(uid) {
    const value = String(uid ?? '');
    if (!/^\d{5,}$/.test(value)) return value;
    return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`;
}

function collectUids(accountList, boundUid) {
    const uids = new Set();
    if (boundUid) uids.add(String(boundUid));
    (accountList || []).forEach(account => {
        if (account?.roleId) uids.add(String(account.roleId));
    });
    return [...uids];
}

class Uid {
    parseAccountList(raw) {
        if (!raw) return null;
        try {
            return JSON.parse(raw) || [];
        } catch (error) {
            return [];
        }
    }

    async getHiddenUsers() {
        const raw = await redis.get(HIDDEN_USERS_KEY);
        if (!raw) return [];
        try {
            const list = JSON.parse(raw);
            return Array.isArray(list) ? list.map(String) : [];
        } catch (error) {
            return [];
        }
    }

    async saveHiddenUsers(list) {
        if (!list.length) {
            await redis.del(HIDDEN_USERS_KEY);
            return;
        }
        await redis.set(HIDDEN_USERS_KEY, JSON.stringify(list));
    }

    /**
     * 用户是否关闭了UID显示
     */
    async isHidden(userId) {
        if (!userId) return false;
        return (await this.getHiddenUsers()).includes(String(userId));
    }

    async setHidden(userId, hidden) {
        if (!userId) return false;
        const id = String(userId);
        const list = await this.getHiddenUsers();
        const next = hidden
            ? [...new Set([...list, id])]
            : list.filter(item => item !== id);
        await this.saveHiddenUsers(next);
        return true;
    }

    async getMaskMap() {
        const userIds = await this.getHiddenUsers();
        if (!userIds.length) return null;

        const maskMap = new Map();
        await Promise.all(userIds.map(async userId => {
            const [raw, boundUid] = await Promise.all([
                redis.get(USER_KEY(userId)),
                redis.get(BIND_KEY(userId)),
            ]);

            let accountList = this.parseAccountList(raw);
            if (accountList === null) accountList = await Config.getUserData(userId);

            collectUids(accountList, boundUid).forEach(uid => maskMap.set(uid, maskUid(uid)));
        }));

        return maskMap.size ? maskMap : null;
    }

    maskCopy(data, maskMap, seen = new WeakMap()) {
        if (!maskMap || data === null || typeof data !== 'object') {
            if (typeof data === 'string' || typeof data === 'number') {
                const str = String(data);
                if (maskMap.has(str)) return maskMap.get(str);
            }
            return data;
        }
        if (Buffer.isBuffer(data)) return data;

        if (seen.has(data)) return seen.get(data);

        if (Array.isArray(data)) {
            const arr = new Array(data.length);
            seen.set(data, arr);
            for (let i = 0; i < data.length; i++) {
                arr[i] = this.maskCopy(data[i], maskMap, seen);
            }
            return arr;
        }

        // 仅复制普通对象，跳过其他类型实例
        const proto = Object.getPrototypeOf(data);
        if (proto !== Object.prototype && proto !== null) return data;

        const obj = {};
        seen.set(data, obj);
        for (const key of Object.keys(data)) {
            obj[key] = this.maskCopy(data[key], maskMap, seen);
        }
        return obj;
    }

    maskText(text, maskMap) {
        if (text == null || !maskMap) return text;
        let result = String(text);
        for (const [uid, masked] of maskMap) {
            if (uid) result = result.split(uid).join(masked);
        }
        return result;
    }
}

export default new Uid();