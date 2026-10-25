import axios from 'axios';
import { createHash } from 'crypto';

const ALPHA = 'AB45STUVWZEFGJ6CH01D237IXYPQRKLMN89';
const VERSION = '999.0.4';
const GACHA_PATH = '/game/wuthering_waves/lottery_analyse';
const API_HOST = 'https://api.xiaoheihe.cn';

const DEFAULT_HEADERS = {
    Accept: '*/*',
    Origin: 'https://web.xiaoheihe.cn',
    Referer: 'https://web.xiaoheihe.cn/',
    'X-Requested-With': 'com.max.xiaoheihe',
};

/* 小黑盒卡池 与 WW卡池的对应关系 */
const POOL_MAP = {
    1: { gacha_id: '0005', gacha_type: '新手唤取' },
    2: { gacha_id: '0001', gacha_type: '角色活动唤取' },
    3: { gacha_id: '0002', gacha_type: '武器活动唤取' },
    4: { gacha_id: '0003', gacha_type: '角色常驻唤取' },
    5: { gacha_id: '0004', gacha_type: '武器常驻唤取' },
    10: { gacha_id: '0010', gacha_type: '角色联动唤取' },
    11: { gacha_id: '0011', gacha_type: '武器联动唤取' },
};

/* 输出顺序：角色活动、武器活动、角色常驻、武器常驻、新手、联动角色、联动武器 */
const POOL_ORDER = [2, 3, 4, 5, 1, 10, 11];

/* 三星武器（小黑盒不记录三星名字，用游戏内常见三星武器填充占位） */
const STAR3_ITEMS = [
    ['21010043', '远行者长刃·辟路'],
    ['21020043', '远行者迅刀·旅迹'],
    ['21030043', '远行者佩枪·洞察'],
    ['21040043', '远行者臂铠·破障'],
    ['21050043', '远行者矩阵·探幽'],
    ['21010013', '暗夜长刃·玄明'],
    ['21020013', '暗夜迅刀·黑闪'],
    ['21030013', '暗夜佩枪·暗星'],
    ['21040013', '暗夜臂铠·夜芒'],
    ['21050013', '暗夜矩阵·暝光'],
    ['21010023', '源能长刃·测壹'],
    ['21020023', '源能迅刀·测贰'],
    ['21030023', '源能佩枪·测叁'],
    ['21040023', '源能臂铠·测肆'],
    ['21050023', '源能音感仪·测五'],
].map(([item_id, name]) => ({ item_id, name, item_type: '武器', rank_type: 3 }));

const md5 = input => createHash('md5').update(input, 'utf8').digest('hex');

/* -------------------------- hkey 算法 -------------------------- */

const xtime = e => (e & 128 ? ((e << 1) ^ 27) & 255 : (e << 1) & 255);
const nr = e => xtime(e) ^ e;
const gr = e => nr(xtime(e));
const jr = e => gr(nr(xtime(e)));
const cn = e => jr(e) ^ gr(e) ^ nr(e);

function lg(arr) {
    const [a, b, c, d] = arr;
    const t = arr.slice();
    t[0] = cn(a) ^ jr(b) ^ gr(c) ^ nr(d);
    t[1] = nr(a) ^ cn(b) ^ jr(c) ^ gr(d);
    t[2] = gr(a) ^ nr(b) ^ cn(c) ^ jr(d);
    t[3] = jr(a) ^ gr(b) ^ nr(c) ^ cn(d);
    return t;
}

function mapChars(s, alpha) {
    let r = '';
    for (const ch of s) r += alpha[ch.codePointAt(0) % alpha.length];
    return r;
}

function interleave(arrays) {
    let out = '';
    const max = Math.max(...arrays.map(a => a.length));
    for (let i = 0; i < max; i += 1) {
        for (const a of arrays) {
            if (i < a.length) out += a[i];
        }
    }
    return out;
}

function hkey(path, t, nonce) {
    const n = '/' + path.split('/').filter(Boolean).join('/') + '/';
    const o = mapChars(String(t), ALPHA.slice(0, -2));
    const i = mapChars(n, ALPHA);
    const s = mapChars(nonce, ALPHA);
    const c = interleave([o, i, s]).slice(0, 20);
    const h = md5(c);
    const g = Array.from(h.slice(-6)).map(ch => ch.charCodeAt(0));
    const a = String(lg(g).reduce((x, y) => x + y, 0) % 100).padStart(2, '0');
    return mapChars(h.slice(0, 5), ALPHA.slice(0, -4)) + a;
}

function makeParams(path) {
    const now = Math.floor(Date.now() / 1000);
    const nonce = md5(String(Date.now()) + String(Math.random())).slice(0, 32).toUpperCase();
    return { _time: now, nonce, hkey: hkey(path, now + 1, nonce), version: VERSION };
}

/* --------------------------- 数据转换 --------------------------- */

const pad = n => String(n).padStart(2, '0');

function formatTime(ts) {
    const d = new Date(ts * 1000 + 8 * 3600 * 1000);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
        `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** 从图标地址推断物品 ID 与类型 */
function parseItem(item, rankType) {
    const img = String((item && item.img) || '');
    const match = img.match(/(\d{5,})_UI\.png/i) || img.match(/\/(\d+)\.png$/i);
    return {
        name: item.name,
        item_id: match ? match[1] : '0',
        item_type: /\/weapon\//i.test(img) ? '武器' : '角色',
        rank_type: rankType,
    };
}

function pickFillers(srList, slots) {
    const fourStar = [];
    for (const sr of srList || []) {
        const count = Math.max(0, Number(sr.count) || 0);
        for (let i = 0; i < count; i += 1) fourStar.push(parseItem(sr, 4));
    }

    const result = new Array(slots).fill(null);
    const total = Math.min(fourStar.length, slots);
    let acc = 0;
    let index = 0;
    for (let slot = 0; slot < slots && total > 0; slot += 1) {
        acc += total;
        if (acc >= slots) {
            acc -= slots;
            result[slot] = fourStar[index];
            index += 1;
        }
    }

    return result.map((item, i) => item || STAR3_ITEMS[i % STAR3_ITEMS.length]);
}

/**
 * 按卡池还原逐抽记录（新→旧）
 * 每个五星分段长度为 diff（含五星本身），五星位于该段最新位置；
 * 顶部无 name 的记录是当前垫抽，只有填充抽。
 * @param {object} group 卡池数据
 * @param {object} meta 卡池映射
 * @param {number} dataEndTs 小黑盒数据的截止时间（最新一条五星的时间）
 */
function buildPoolRecords(group, meta, dataEndTs) {
    const records = Array.isArray(group.records) ? group.records : [];
    const out = [];
    const seqByTs = new Map();

    const makeId = ts => {
        const seq = (seqByTs.get(ts) || 0) + 1;
        seqByTs.set(ts, seq);
        return `${String(ts).padStart(10, '0')}${meta.gacha_id}000${String(seq).padStart(2, '0')}`;
    };

    const pushRecord = (item, ts) => {
        out.push({
            gacha_id: meta.gacha_id,
            gacha_type: meta.gacha_type,
            item_id: String(item.item_id || '0'),
            count: '1',
            time: formatTime(ts),
            name: item.name,
            item_type: item.item_type,
            rank_type: String(item.rank_type),
            id: makeId(ts),
        });
    };

    for (let i = 0; i < records.length; i += 1) {
        const record = records[i];
        const isCurrent = !record.name;
        const length = Math.max(1, Number(record.diff) || 1);
        const nextTs = i + 1 < records.length ? Number(records[i + 1].timestamp) : 0;
        let endTs = Number(record.timestamp) || Math.floor(Date.now() / 1000);

        if (isCurrent) {
            const lastFiveStarTs = nextTs > 0 ? nextTs : 0;
            endTs = dataEndTs || lastFiveStarTs || endTs;
            endTs = Math.max(endTs, lastFiveStarTs + length);
        }

        const prevTs = nextTs > 0 && nextTs < endTs ? nextTs : endTs - length * 60;
        const span = Math.max(endTs - prevTs, length);

        const fillerCount = isCurrent ? length : length - 1;
        const fillers = pickFillers(record.sr_list, fillerCount);

        if (!isCurrent) pushRecord(parseItem(record, 5), endTs);

        for (let j = 0; j < fillerCount; j += 1) {
            const offset = Math.min(span - 1, Math.max(1, Math.round(((j + 1) * span) / length)));
            pushRecord(fillers[j], endTs - offset);
        }
    }

    return out;
}

/* ----------------------------- 接口 ----------------------------- */

/**
 * 按小黑盒 ID 查询鸣潮抽卡记录
 * @param {string|number} userId 小黑盒 ID
 * @param {object} [options] { timeout }
 * @returns {Promise<object>} 接口原始数据
 */
async function queryGacha(userId, options = {}) {
    const { _time, nonce, hkey: key, version } = makeParams(GACHA_PATH);
    const params = {
        app: 'heybox',
        heybox_id: '-1',
        os_type: 'web',
        x_app: 'heybox',
        x_client_type: 'web',
        x_client_version: '1.3.398',
        x_os_type: 'Android',
        user_id: String(userId),
        _time,
        hkey: key,
        nonce,
        version,
    };

    const res = await axios.get(API_HOST + GACHA_PATH, {
        params,
        headers: DEFAULT_HEADERS,
        timeout: options.timeout || 15000,
    });

    if (typeof res.data === 'string') {
        try {
            return JSON.parse(res.data);
        } catch {
            throw new Error('小黑盒返回数据格式异常');
        }
    }
    return res.data;
}

/** 整理接口返回，便于提示用户 */
function summarize(data) {
    const result = (data && data.result) || {};
    if (!data || data.status !== 'ok') {
        return { ok: false, message: (data && (data.msg || data.status)) || '请求失败' };
    }
    if (!result.is_bind) {
        return { ok: false, message: '该小黑盒 ID 未绑定鸣潮抽卡数据' };
    }
    const info = result.user_info || {};
    return {
        ok: true,
        nickname: info.nickname || '',
        gameUid: String(info.uid || ''),
    };
}

/**
 * 将小黑盒数据转换为 waves-plugin 使用的格式
 * @param {object} data 接口原始数据
 * @param {object} [options] { version: 插件版本号 }
 * @returns {{info: object, list: object[]}}
 */
function toWWGF(data, options = {}) {
    const result = (data && data.result) || {};
    const userInfo = result.user_info || {};
    const groups = Array.isArray(result.gacha_record) ? result.gacha_record : [];

    const list = [];
    let dataEndTs = 0;

    for (const group of groups) {
        for (const record of group.records || []) {
            const ts = Number(record.timestamp) || 0;
            if (record.name && ts > dataEndTs) dataEndTs = ts;
        }
    }

    for (const key of POOL_ORDER) {
        const group = groups.find(item => item.pool_key === key);
        if (!group) continue;
        list.push(...buildPoolRecords(group, POOL_MAP[key], dataEndTs));
    }

    return {
        info: {
            lang: 'zh-cn',
            region_time_zone: 8,
            export_timestamp: dataEndTs ? dataEndTs * 1000 : Date.now(),
            export_app: 'Waves-Plugin-Heybox',
            export_app_version: options.version || '0.0.0',
            wwgf_version: 'v0.1b',
            uid: String(userInfo.uid || ''),
        },
        list,
    };
}

const Heybox = {
    queryGacha,
    summarize,
    toWWGF,
};

export default Heybox;
