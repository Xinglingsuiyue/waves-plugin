import plugin from '../../../lib/plugins/plugin.js';
import { _path } from '../model/path.js';
import Config from "../components/Config.js";
import Server from "../components/Server.js";
import Waves from "../components/Code.js";
import axios from 'axios';
import fs from 'fs';

// 卡池类型映射
const poolTypeMapping = {
    "0001": "角色活动唤取",
    "0002": "武器活动唤取",
    "0003": "角色常驻唤取",
    "0004": "武器常驻唤取",
    "0005": "新手唤取",
    "0006": "新手自选唤取",
    "0007": "新手自选唤取（感恩定向唤取）",
    "0010": "角色联动唤取",
    "0011": "武器联动唤取"
};

const poolIdMapping = {
    "1": "0001", "2": "0002", "3": "0003", "4": "0004",
    "5": "0005", "6": "0006", "7": "0007", "10": "0010", "11": "0011"
};

const CLOUD_CONSTANTS = {
    SDK_URL: 'https://sdkapi.kurogame.com',
    GAME_URL: 'https://cloud-game-sh.aki-game.com',
    PROJECT_ID: 'G152',
    PRODUCT_ID: 'A1493',
    CHANNEL_ID: '211',
    CLIENT_ID: 'vvkewnskrxxwfo0yi61cy24l',
    CLIENT_SECRET: 'g9ej0i1jf3y68wchb0ncm266',
    PKG: 'com.kurogame.mingchao',
    SDK_VERSION: '2.1.2',
    APP_VERSION: '3.1.0',
    KR_VER: '1.9.0',
    DEFAULT_SERVER_ID: '76402e5b20be2c39f095a152090afddc',
    DEFAULT_RESOURCES_ID: '5c13a63f85465e9fcc0f24d6efb15083',
};

const SDK_HEADERS = {
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    'kr-ver': CLOUD_CONSTANTS.KR_VER,
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
};

function generateDeviceNum() {
    const part = () => Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10);
    return `${part()}-${part()}-${part()}-${part()}-${part()}`;
}

function generateDeviceId() {
    return [...Array(32)].map(() => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
}

export class CloudGacha extends plugin {
    constructor() {
        super({
            name: "鸣潮-云抽卡记录",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)云登录(.*)$",
                    fnc: "cloudLogin"
                },
                {
                    reg: "^(?:～|~|鸣潮)更新抽卡记录(.*)$",
                    fnc: "updateGacha"
                },
                {
                    reg: "^(?:～|~|鸣潮)解除云登录(.*)$",
                    fnc: "unbindCloud"
                },
                {
                    reg: "^(?:～|~|鸣潮)我的抽卡链接$",
                    fnc: "myGachaUrl"
                }
            ]
        });
    }

    generateId(ts, poolId, drawNum) {
        return `${String(ts).padStart(10, '0')}${String(poolId).padStart(4, '0')}000${String(drawNum).padStart(2, '0')}`;
    }

    buildSdkParams(deviceNum, extra = {}) {
        return {
            redirect_uri: '1',
            __e__: '1',
            pack_mark: '1',
            projectId: CLOUD_CONSTANTS.PROJECT_ID,
            productId: CLOUD_CONSTANTS.PRODUCT_ID,
            platform: 'h5',
            channelId: CLOUD_CONSTANTS.CHANNEL_ID,
            deviceNum,
            version: CLOUD_CONSTANTS.SDK_VERSION,
            sdkVersion: CLOUD_CONSTANTS.SDK_VERSION,
            response_type: 'code',
            client_id: CLOUD_CONSTANTS.CLIENT_ID,
            client_secret: CLOUD_CONSTANTS.CLIENT_SECRET,
            pkg: CLOUD_CONSTANTS.PKG,
            ...extra
        };
    }

    async sendCloudSms(phone, deviceNum) {
        try {
            const params = new URLSearchParams(
                this.buildSdkParams(deviceNum, { phone })
            );
            const resp = await axios.post(
                `${CLOUD_CONSTANTS.SDK_URL}/sdkcom/v2/login/getPhoneCode.lg`,
                params.toString(),
                {
                    headers: SDK_HEADERS,
                    timeout: 10000
                }
            );
            return resp.data;
        } catch (error) {
            logger.error('[CloudGacha] 发送验证码失败:', error);
            return { code: -1, msg: '网络错误' };
        }
    }

    async cloudSdkLogin(phone, code, deviceNum) {
        try {
            const params = new URLSearchParams(
                this.buildSdkParams(deviceNum, {
                    phone,
                    code,
                    deviceModel: 'Chrome',
                    os: 'Linux'
                })
            );
            const resp = await axios.post(
                `${CLOUD_CONSTANTS.SDK_URL}/sdkcom/v2/login/phoneCode.lg`,
                params.toString(),
                {
                    headers: SDK_HEADERS,
                    timeout: 10000
                }
            );

            if (resp.data.code !== 0) {
                return { status: false, msg: resp.data.msg || '登录失败' };
            }

            const data = resp.data.data;
            return {
                status: true,
                data: {
                    username: data.username,
                    sdkuserid: data.sdkuserid,
                    id: data.id,
                    cuid: String(data.cuid || data.id),
                    code: data.code,
                    autoToken: data.autoToken,
                    autoTokenStatus: data.autoTokenStatus,
                    phone: data.phone,
                    phoneToken: data.phoneToken,
                    loginType: data.loginType
                }
            };
        } catch (error) {
            logger.error('[CloudGacha] SDK登录失败:', error);
            return { status: false, msg: '网络错误，请检查控制台日志' };
        }
    }

    async cloudGetAccessToken(authCode, deviceNum) {
        try {
            const params = new URLSearchParams(
                this.buildSdkParams(deviceNum, {
                    code: authCode,
                    grant_type: 'authorization_code'
                })
            );
            const resp = await axios.post(
                `${CLOUD_CONSTANTS.SDK_URL}/sdkcom/v2/auth/getToken.lg`,
                params.toString(),
                {
                    headers: SDK_HEADERS,
                    timeout: 10000
                }
            );

            if (resp.data.code !== 0) {
                return { status: false, msg: resp.data.msg || '获取token失败' };
            }

            return {
                status: true,
                data: {
                    accessToken: resp.data.data.access_token,
                    expiresIn: resp.data.data.expires_in
                }
            };
        } catch (error) {
            logger.error('[CloudGacha] 获取access_token失败:', error);
            return { status: false, msg: '网络错误' };
        }
    }

    async cloudAppLogin(userId, userName, token, deviceId) {
        try {
            const resp = await axios.post(
                `${CLOUD_CONSTANTS.GAME_URL}/Login/Login`,
                {
                    loginType: 1,
                    userId: String(userId),
                    userName,
                    token,
                    deviceId: deviceId || generateDeviceId(),
                    platform: 'web',
                    appVersion: CLOUD_CONSTANTS.APP_VERSION
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-b3-traceid': deviceId || generateDeviceId(),
                        'x-os': 'web',
                        'Origin': 'https://mc.kurogames.com',
                        'Referer': 'https://mc.kurogames.com/cloud/',
                        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
                    },
                    timeout: 10000
                }
            );

            if (resp.data.code !== 0) {
                return { status: false, msg: resp.data.msg || '云游戏登录失败' };
            }

            return {
                status: true,
                data: {
                    uniqueId: resp.data.data.uniqueId,
                    token: resp.data.data.token,
                    walletData: resp.data.data.walletData
                }
            };
        } catch (error) {
            logger.error('[CloudGacha] 云游戏登录失败:', error);
            return { status: false, msg: '网络错误' };
        }
    }

    // 使用登录时保存的长效凭证
    // 无需用户重新输入验证码。
    async refreshCloudToken(account) {
        const cg = account.cloudGacha;
        if (!cg) return { status: false, msg: '账号未绑定云登录信息' };

        const tokenCandidates = [
            { name: 'access_token', value: cg.accessToken },
            { name: 'autoToken', value: cg.autoToken },
            { name: 'phoneToken', value: cg.phoneToken }
        ];

        if (!tokenCandidates.some(c => c.value)) {
            return { status: false, msg: '缺少长效登录凭证，请重新 ~云登录' };
        }

        for (const candidate of tokenCandidates) {
            if (!candidate.value) continue;
            logger.mark(`[CloudGacha] cloudToken已失效，尝试用 ${candidate.name} 自动重新登录`);
            const result = await this.cloudAppLogin(
                cg.cuid,
                cg.username,
                candidate.value,
                generateDeviceId()
            );
            if (result.status) {
                cg.cloudToken = result.data.token;
                logger.mark(`[CloudGacha] 自动刷新cloudToken成功! 使用凭证=${candidate.name}`);
                return { status: true };
            }
        }
        return { status: false, msg: '长效登录凭证已全部失效，请重新 ~云登录' };
    }

    async cloudGameRecordInfo(token) {
        try {
            const deviceId = generateDeviceId();
            const resp = await axios.get(
                `${CLOUD_CONSTANTS.GAME_URL}/Message/GameRecordInfo`,
                {
                    headers: {
                        'x-token': token,
                        'x-b3-traceid': deviceId,
                        'x-os': 'web',
                        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
                    },
                    timeout: 10000
                }
            );

            if (resp.data.code !== 0) {
                return { status: false, msg: resp.data.msg || '获取游戏记录失败' };
            }

            return {
                status: true,
                data: {
                    playerId: resp.data.data.playerId,
                    recordId: resp.data.data.recordId
                }
            };
        } catch (error) {
            logger.error('[CloudGacha] 获取游戏记录失败:', error);
            return { status: false, msg: '网络错误' };
        }
    }

    async doCloudLogin(phone, code) {

        const deviceNum = generateDeviceNum();

        // Step 1: SDK 登录
        const loginResult = await this.cloudSdkLogin(phone, code, deviceNum);
        if (!loginResult.status) return loginResult;

        const sdkData = loginResult.data;

        // Step 2: 获取 access_token
        const tokenResult = await this.cloudGetAccessToken(sdkData.code, deviceNum);
        if (!tokenResult.status) return tokenResult;

        // Step 3: 云游戏应用登录
        const tokenCandidates = [
            { name: 'access_token', value: tokenResult.data.accessToken },
            { name: 'autoToken', value: sdkData.autoToken },
            { name: 'phoneToken', value: sdkData.phoneToken }
        ];

        let appResult = null;
        for (const candidate of tokenCandidates) {
            if (!candidate.value) continue;
            logger.mark(`[CloudGacha] 尝试 Login/Login 使用 ${candidate.name}`);
            const result = await this.cloudAppLogin(
                sdkData.cuid,
                sdkData.username,
                candidate.value,
                generateDeviceId()
            );
            if (result.status) {
                appResult = result;
                logger.mark(`[CloudGacha] Login/Login 成功! token=${candidate.name}`);
                break;
            }
        }
        if (!appResult || !appResult.status) return appResult || { status: false, msg: '云游戏登录失败：SDK请求异常' };

        // Step 4: 获取游戏记录信息
        const recordResult = await this.cloudGameRecordInfo(appResult.data.token);
        if (!recordResult.status) return recordResult;

        return {
            status: true,
            data: {
                // 云登录凭证
                autoToken: sdkData.autoToken,
                phoneToken: sdkData.phoneToken,
                accessToken: tokenResult.data.accessToken,
                cloudToken: appResult.data.token,
                deviceId: generateDeviceId(),
                // 用户信息
                cuid: sdkData.cuid,
                username: sdkData.username,
                phone: sdkData.phone,
                // 抽卡记录所需参数
                playerId: recordResult.data.playerId,
                recordId: recordResult.data.recordId,
                serverId: CLOUD_CONSTANTS.DEFAULT_SERVER_ID
            }
        };
    }

    async cloudLogin(e) {
        const [, message] = e.msg.match(this.rule[0].reg);
        const cleanMsg = message ? message.trim() : '';

        // 方式1: 手机号+验证码直接登录
        if (cleanMsg) {
            if (e.isGroup) e.group.recallMsg(e.message_id);

            const parts = cleanMsg.split(/(:|：)/);
            const mobile = parts[0]?.trim();
            const code = parts[2]?.trim();

            if (!mobile || !code) {
                return await e.reply(
                    "请输入正确的手机号与验证码\n格式：~云登录 手机号:验证码\n" +
                    "或直接使用 ~云登录 打开网页登录"
                );
            }

            if (!/^\d{11}$/.test(mobile)) {
                return await e.reply("请输入正确的11位手机号");
            }

            await e.reply("正在登录云鸣潮，请稍候...");

            const result = await this.doCloudLogin(mobile, code);
            if (!result.status) {
                return await e.reply(`云登录失败：${result.msg}`, true);
            }

            return await this.saveCloudLoginResult(e, result.data);
        }

        // 方式2: 网页登录
        if (!Config.getConfig().allow_login) {
            return await e.reply(
                "当前网页登录功能已被禁用，请联系主人前往插件配置项中开启\n" +
                "或使用 ~云登录 手机号:验证码 直接登录"
            );
        }

        const id = Math.random().toString(36).substring(2, 12);
        Server.data[id] = { user_id: e.user_id, type: 'cloudLogin' };

        await e.reply(
            `请复制云登录地址到浏览器打开：\n${Config.getConfig().public_link}/cloudlogin/${id}\n` +
            `您的识别码为【${e.user_id}】\n` +
            `登录地址10分钟内有效`
        );

        const timeout = Date.now() + 10 * 60 * 1000;
        while (!Server.data[id]?.cloudData && Date.now() < timeout) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        if (!Server.data[id]?.cloudData) {
            delete Server.data[id];
            return await e.reply('云登录超时，请重新登录', true);
        }

        const cloudData = Server.data[id].cloudData;
        delete Server.data[id];

        if (!cloudData.status) {
            return await e.reply(`云登录失败：${cloudData.msg}`, true);
        }

        return await this.saveCloudLoginResult(e, cloudData.data);
    }

    async saveCloudLoginResult(e, data) {
        const userConfig = Config.getUserData(e.user_id);
        let account = userConfig.find(item =>
            (item.roleId && item.roleId == data.playerId) ||
            (item.cloudGacha && item.cloudGacha.playerId == data.playerId)
        );

        const cloudGachaData = {
            cloudToken: data.cloudToken,
            playerId: data.playerId,
            // 以下为长效凭证
            // cloudToken(x-token) 本身仅约1天有效，过期后用这些凭证自动换取新的 cloudToken，
            // 避免用户必须重新输入验证码 ~云登录
            cuid: data.cuid,
            username: data.username,
            accessToken: data.accessToken,
            autoToken: data.autoToken,
            phoneToken: data.phoneToken
        };

        if (account) {
            account.cloudGacha = cloudGachaData;
        } else {
            userConfig.push({
                roleId: data.playerId,
                cloudGacha: cloudGachaData
            });
        }

        Config.setUserData(e.user_id, userConfig);
        await redis.set(`Yunzai:waves:gachaHistory:${e.user_id}`, data.playerId);

        await e.reply(
            `云登录成功！\n` +
            `现在可以使用 ~更新抽卡记录 来获取抽卡数据\n` +
            `之后使用 ~抽卡统计 即可查看分析`,
            true
        );
        return true;
    }

    async updateGacha(e) {
        const [, message] = e.msg.match(this.rule[1].reg);
        const targetUid = message ? message.trim() : '';

        const userConfig = Config.getUserData(e.user_id);
        if (!userConfig || !userConfig.length) {
            return await e.reply('未找到登录信息，请先使用 ~云登录 命令登录', true);
        }

        const cloudAccounts = userConfig.filter(item => item.cloudGacha);
        if (!cloudAccounts.length) {
            return await e.reply('未找到云抽卡记录信息，请先使用 ~云登录 命令登录', true);
        }

        let account;
        if (targetUid) {
            // 指定了 UID，查找匹配的账号
            account = cloudAccounts.find(item => String(item.cloudGacha.playerId) === String(targetUid));
            if (!account) {
                const uidList = cloudAccounts.map(a => a.cloudGacha.playerId).join('、');
                return await e.reply(
                    `未找到UID为 ${targetUid} 的云登录账号\n` +
                    `当前已登录的UID: ${uidList}`,
                    true
                );
            }
        } else if (cloudAccounts.length > 1) {
            // 多账号但未指定 UID，提示选择
            const uidList = cloudAccounts.map(a => a.cloudGacha.playerId).join('、');
            return await e.reply(
                `检测到多个云鸣潮账号，请指定UID：\n` +
                `~更新抽卡记录 ${cloudAccounts[0].cloudGacha.playerId}\n` +
                `已登录UID: ${uidList}`,
                true
            );
        } else {
            account = cloudAccounts[0];
        }

        const { playerId } = account.cloudGacha;
        await e.reply(`正在更新UID为 ${playerId} 的抽卡记录，请稍候...`);

        let recordResult = await this.cloudGameRecordInfo(account.cloudGacha.cloudToken);
        if (!recordResult.status) {
            // cloudToken(x-token) 有效期约1天，过期后先尝试用长效凭证自动重新登录，成功后重试一次
            const refreshResult = await this.refreshCloudToken(account);
            if (refreshResult.status) {
                Config.setUserData(e.user_id, userConfig);
                recordResult = await this.cloudGameRecordInfo(account.cloudGacha.cloudToken);
            }
        }
        if (!recordResult.status) {
            return await e.reply('获取抽卡记录失败：' + (recordResult.msg || '云登录可能已过期，请重新 ~云登录'));
        }
        const finalRecordId = recordResult.data.recordId;

        const data = {
            playerId,
            serverId: CLOUD_CONSTANTS.DEFAULT_SERVER_ID,
            languageCode: "zh-Hans",
            recordId: finalRecordId
        };

        const waves = new Waves();
        const poolIds = ["1", "2", "3", "4", "5", "6", "7", "10", "11"];

        const pools = await Promise.all(
            poolIds.map(poolId =>
                waves.getGaCha({ ...data, cardPoolId: poolId, cardPoolType: poolId })
            )
        );

        const failedPool = pools.find(pool => !pool.status);
        if (failedPool) {
            await e.reply("获取抽卡记录失败：" + (failedPool.msg || "未知错误"));
            return true;
        }

        const dir = `${_path}/data/wavesGacha`;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const allRecords = [];
        pools.forEach((pool, index) => {
            const poolId = poolIds[index];
            const gachaId = poolIdMapping[poolId];
            const gachaType = poolTypeMapping[gachaId];

            if (pool.data && Array.isArray(pool.data)) {
                pool.data.forEach(item => {
                    allRecords.push({
                        gacha_id: gachaId,
                        gacha_type: gachaType,
                        item_id: String(item.resourceId),
                        count: String(item.count || 1),
                        time: item.time,
                        name: item.name,
                        item_type: item.resourceType,
                        rank_type: String(item.qualityLevel),
                        id: null
                    });
                });
            }
        });

        allRecords.sort((a, b) => new Date(a.time) - new Date(b.time));
        const timestampCount = {};
        allRecords.forEach(item => {
            const ts = Math.floor(new Date(item.time).getTime() / 1000);
            if (!timestampCount[ts]) {
                timestampCount[ts] = allRecords.filter(
                    r => Math.floor(new Date(r.time).getTime() / 1000) === ts
                ).length;
            }
            const drawNum = timestampCount[ts]--; 
            item.id = this.generateId(ts, item.gacha_id, Math.min(drawNum, 99));
        });

        // 读取插件版本号
        let appVersion = '1.0.0';
        try {
            const pkg = JSON.parse(fs.readFileSync(`${_path}/package.json`, 'utf-8'));
            appVersion = pkg.version || appVersion;
        } catch (_) {}

        const exportData = {
            info: {
                lang: "zh-cn",
                region_time_zone: 8,
                export_timestamp: Date.now(),
                export_app: "Waves-Plugin",
                export_app_version: appVersion,
                wwgf_version: "v0.1b",
                uid: String(playerId)
            },
            list: allRecords
        };

        const filePath = `${dir}/${playerId}_Export.json`;

        // 合并旧记录
        if (fs.existsSync(filePath)) {
            try {
                const oldData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                const oldList = oldData.list || [];
                const oldExportTimestamp = oldData.info?.export_timestamp || 0;

                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                const isOldFileRecent = oldExportTimestamp >= sixMonthsAgo.getTime();

                const oldGroups = {};
                oldList.forEach(item => {
                    (oldGroups[item.gacha_id] = oldGroups[item.gacha_id] || []).push(item);
                });

                const filteredOld = Object.values(oldGroups).filter(group => {
                    if (isOldFileRecent) return true;
                    return group.some(oldItem =>
                        exportData.list.some(newItem => newItem.id === oldItem.id)
                    );
                }).flat();

                exportData.list = [...exportData.list, ...filteredOld].filter(
                    (item, index, self) => index === self.findIndex(t => t.id === item.id)
                );
            } catch (err) {
                logger.error('[CloudGacha] 合并旧抽卡记录失败:', err);
            }
        }

        exportData.list.sort((a, b) => a.gacha_id - b.gacha_id || b.id - a.id);

        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        await redis.set(`Yunzai:waves:gachaHistory:${e.user_id}`, playerId);

        await e.reply(
            `抽卡记录更新成功！\n` +
            `UID: ${playerId}\n` +
            `记录数: ${allRecords.length} 条\n` +
            `可使用 ~抽卡统计 查看`,
            true
        );
        return true;
    }

    async unbindCloud(e) {
        const [, message] = e.msg.match(this.rule[2].reg);
        const targetUid = message ? message.trim() : '';

        const userConfig = Config.getUserData(e.user_id);
        if (!userConfig || !userConfig.length) {
            return await e.reply('没有绑定的云登录账号', true);
        }

        const cloudAccounts = userConfig.filter(item => item.cloudGacha);
        if (!cloudAccounts.length) {
            return await e.reply('没有绑定的云登录账号', true);
        }

        if (targetUid) {
            const account = cloudAccounts.find(item => String(item.cloudGacha.playerId) === String(targetUid));
            if (!account) {
                const uidList = cloudAccounts.map(a => a.cloudGacha.playerId).join('、');
                return await e.reply(
                    `未找到UID为 ${targetUid} 的云登录账号\n` +
                    `当前已登录的UID: ${uidList}`,
                    true
                );
            }
            delete account.cloudGacha;
            if (!account.token && !account.did) {
                const idx = userConfig.indexOf(account);
                userConfig.splice(idx, 1);
            }
            Config.setUserData(e.user_id, userConfig);
            return await e.reply(`已解除UID为 ${targetUid} 的云登录绑定`, true);
        }

        if (cloudAccounts.length === 1) {
            const account = cloudAccounts[0];
            const uid = account.cloudGacha.playerId;
            delete account.cloudGacha;
            if (!account.token && !account.did) {
                const idx = userConfig.indexOf(account);
                userConfig.splice(idx, 1);
            }
            Config.setUserData(e.user_id, userConfig);
            return await e.reply(`已解除UID为 ${uid} 的云登录绑定`, true);
        }

        // 多个账号，列出让用户选择
        const uidList = cloudAccounts.map((a, i) => `${i + 1}. ${a.cloudGacha.playerId}`).join('\n');
        await e.reply(
            `检测到多个云鸣潮账号，请使用 ~解除云登录 [UID] 指定：\n${uidList}`,
            true
        );
        return true;
    }

    async myGachaUrl(e) {
        const userConfig = Config.getUserData(e.user_id);
        if (!userConfig || !userConfig.length) {
            return await e.reply('未找到登录信息，请先使用 ~云登录 命令登录', true);
        }

        const cloudAccounts = userConfig.filter(item => item.cloudGacha);
        if (!cloudAccounts.length) {
            return await e.reply('未找到云抽卡记录信息，请先使用 ~云登录 命令登录', true);
        }

        const results = [];
        let configChanged = false;
        for (const account of cloudAccounts) {
            const { playerId } = account.cloudGacha;
            try {
                let recordResult = await this.cloudGameRecordInfo(account.cloudGacha.cloudToken);
                if (!recordResult.status) {
                    // cloudToken 已过期，先尝试用长效凭证自动重新登录，成功后重试一次
                    const refreshResult = await this.refreshCloudToken(account);
                    if (refreshResult.status) {
                        configChanged = true;
                        recordResult = await this.cloudGameRecordInfo(account.cloudGacha.cloudToken);
                    }
                }
                if (recordResult.status) {
                    const recordId = recordResult.data.recordId;
                    const url = `https://aki-gm-resources.aki-game.com/aki/gacha/index.html#/record?` +
                        `svr_id=${CLOUD_CONSTANTS.DEFAULT_SERVER_ID}` +
                        `&player_id=${playerId}` +
                        `&record_id=${recordId}` +
                        `&lang=zh-Hans` +
                        `&svr_area=cn` +
                        `&resources_id=${CLOUD_CONSTANTS.DEFAULT_RESOURCES_ID}` +
                        `&platform=web`;
                    results.push(`UID ${playerId}:\n${url}`);
                } else {
                    results.push(`UID ${playerId}: cloudToken 已过期，请重新 ~云登录`);
                }
            } catch (_) {
                results.push(`UID ${playerId}: 获取失败，请重新 ~云登录`);
            }
        }

        if (configChanged) {
            Config.setUserData(e.user_id, userConfig);
        }

        await e.reply(results.join('\n\n'), true);
        return true;
    }
}