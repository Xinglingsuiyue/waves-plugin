import Config from './Config.js';
import axios from 'axios';
import qs from 'qs';
import { HttpsProxyAgent } from 'https-proxy-agent';

const CONSTANTS = {
    LOGIN_URL: '/user/sdkLogin',
    REFRESH_URL: '/aki/roleBox/akiBox/refreshData',
    TOKEN_REFRESH_URL: '/aki/roleBox/requestToken',
    GAME_DATA_URL: '/gamer/widget/game3/refresh',
    BASE_DATA_URL: '/aki/roleBox/akiBox/baseData',
    ROLE_DATA_URL: '/aki/roleBox/akiBox/roleData',
    CALABASH_DATA_URL: '/aki/roleBox/akiBox/calabashData',
    CHALLENGE_DATA_URL: '/aki/roleBox/akiBox/challengeDetails',
    EXPLORE_DATA_URL: '/aki/roleBox/akiBox/exploreIndex',
    SIGNIN_URL: '/encourage/signIn/v2',
    QUERY_RECORD_URL: '/encourage/signIn/queryRecordV2',
    GACHA_URL: 'https://gmserver-api.aki-game2.com/gacha/record/query',
    INTL_GACHA_URL: 'https://gmserver-api.aki-game2.net/gacha/record/query',
    ROLE_DETAIL_URL: '/aki/roleBox/akiBox/getRoleDetail',
    EVENT_LIST_URL: '/forum/companyEvent/findEventList',
    SELF_TOWER_DATA_URL: '/aki/roleBox/akiBox/towerDataDetail',
    OTHER_TOWER_DATA_URL: '/aki/roleBox/akiBox/towerIndex',
    HAIXU_DATA_URL: '/aki/roleBox/akiBox/slashDetail',
    RESOURCE_PERIOD_LIST_URL: '/aki/resource/period/list',
    RESOURCE_WEEK_URL: '/aki/resource/week',
    RESOURCE_MONTH_URL: '/aki/resource/month',
    RESOURCE_VERSION_URL: '/aki/resource/version',
    KURO_VERSION: "2.9.1",
    FORUM_LIST_URL: '/forum/list',
    FORUM_POST_DETAIL_URL: '/forum/post/detail',
    COSPLAY_TOPIC_ID: 90,
    GAME_ID: 3,
    FORUM_ID: 17,
};

let sentPostIds = new Set();

const wavesApi = axios.create();
wavesApi.interceptors.request.use(
    async config => {
        const proxyUrl = Config.getConfig().proxy_url;
        if (proxyUrl) {
            const proxyAgent = new HttpsProxyAgent(proxyUrl);
            config.httpsAgent = proxyAgent;
        }
        if (config.url.startsWith('/')) {
            config.url = Config.getConfig().reverse_proxy_url + config.url;
        }
        return config;
    },
    error => Promise.reject(error)
);

class Waves {
    constructor() {
        this.bat = null;
    }

    async getPublicIP(host = "192.168.0.1") {
        try {
            const res1 = await fetch("https://event.kurobbs.com/event/ip", { timeout: 4000 });
            if (res1.ok) return await res1.text();
        } catch (e) {}
    
        try {
            const res2 = await fetch("https://api.ipify.org/?format=json", { timeout: 4000 });
            if (res2.ok) return (await res2.json()).ip;
        } catch (e) {}
    
        try {
            const res3 = await fetch("https://httpbin.org/ip", { timeout: 4000 });
            if (res3.ok) return (await res3.json()).origin;
        } catch (e) {}
    
        return host;
    }

    async buildHeaders(platform = 'ios', token = null, did = null, needToken = false) {
        const headers = {
            "source": platform,
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            "version": CONSTANTS.KURO_VERSION,
        };

        if (platform === 'ios') {
            headers["User-Agent"] = `Mozilla/5.0 (iPhone; CPU iPhone OS 18_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) KuroGameBox/${CONSTANTS.KURO_VERSION}`;
            const ip = await this.getPublicIP();
            headers["devCode"] = `${ip}, Mozilla/5.0 (iPhone; CPU iPhone OS 18_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)  KuroGameBox/${CONSTANTS.KURO_VERSION}`;
        } else if (platform === 'android') {
            headers["User-Agent"] = "okhttp/3.11.0";
            headers["osVersion"] = "35";
            headers["model"] = "V2243A";
            headers["versionCode"] = "2500";
            headers["channelId"] = "6";
            headers["lang"] = "zh-Hans";
            headers["countryCode"] = "CN";
            if (token) headers["Cookie"] = `user_token=${token}`;
        } else {
            headers["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0";
        }

        if (did) headers["did"] = did;
        if (this.bat) headers["b-at"] = this.bat;
        if (needToken && token) headers["token"] = token;

        return headers;
    }

    // Cosplay相关方法
    async getCosplayList(pageSize = 20, pageIndex = 1) {
        try {
            const headers = await this.buildHeaders('ios');
            const params = {
                forumId: CONSTANTS.FORUM_ID,
                gameId: CONSTANTS.GAME_ID,
                pageIndex,
                pageSize: Math.min(pageSize, 20),
                searchType: 3,
                topicId: CONSTANTS.COSPLAY_TOPIC_ID
            };

            const response = await wavesApi.post(CONSTANTS.FORUM_LIST_URL, qs.stringify(params), { 
                headers,
                timeout: 10000
            });
            
            if (response.data.code === 200 && response.data.data) {
                let posts = response.data.data.postList || [];
                
                if (sentPostIds.size > 0) {
                    posts = posts.filter(post => !sentPostIds.has(post.postId));
                }
                
                if (posts.length === 0 && sentPostIds.size > 0) {
                    this.clearSentHistory();
                    const newResponse = await wavesApi.post(CONSTANTS.FORUM_LIST_URL, qs.stringify(params), { 
                        headers,
                        timeout: 10000
                    });
                    if (newResponse.data.code === 200 && newResponse.data.data) {
                        posts = newResponse.data.data.postList || [];
                    }
                }
                
                return posts.map(post => {
                    if (post.imgContent && !Array.isArray(post.imgContent)) {
                        try {
                            post.imgContent = JSON.parse(post.imgContent);
                        } catch (e) {
                            post.imgContent = [];
                        }
                    }
                    return post;
                });
            }
            return [];
        } catch (error) {
            logger.error('[COS] 获取Cosplay列表失败:', error);
            return [];
        }
    }

    markPostAsSent(postId) {
        sentPostIds.add(postId);
        if (sentPostIds.size > 100) {
            const array = Array.from(sentPostIds);
            sentPostIds = new Set(array.slice(-50));
        }
    }

    clearSentHistory() {
        sentPostIds.clear();
    }

    getSentCount() {
        return sentPostIds.size;
    }

    async getPostDetail(postId) {
        try {
            const headers = await this.buildHeaders('ios');
            const response = await wavesApi.post(
                CONSTANTS.FORUM_POST_DETAIL_URL, 
                qs.stringify({ postId }), 
                { headers, timeout: 10000 }
            );
            
            if (response.data.code === 200) {
                const postDetail = response.data.data;
                if (postDetail.imgContent && !Array.isArray(postDetail.imgContent)) {
                    try {
                        postDetail.imgContent = JSON.parse(postDetail.imgContent);
                    } catch (e) {
                        postDetail.imgContent = [];
                    }
                }
                return postDetail;
            }
            return null;
        } catch (error) {
            logger.error('[COS] 获取帖子详情异常:', error);
            return null;
        }
    }

    // 其他方法保持不变
    async getToken(mobile, code) {
        const did = [...Array(40)].map(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[(Math.random() * 36) | 0]).join('');
        const headers = await this.buildHeaders('ios');
        const data = qs.stringify({ mobile, code, devCode: did });

        try {
            const response = await wavesApi.post(CONSTANTS.LOGIN_URL, data, { headers });
            if (response.data.code === 200) {
                if (Config.getConfig().enable_log) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`验证码登录成功，库街区用户`), logger.green(response.data.data.userName));
                }
                return { status: true, data: { ...response.data.data, did } };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`验证码登录失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`验证码登录失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '登录失败，疑似网络问题，请检查控制台日志' };
        }
    }

    async isAvailable(serverId, roleId, token, did = null, strict = false) {
        const headers = await this.buildHeaders('ios', token, did, true);
        const data = qs.stringify({ serverId, roleId });

        try {
            const response = await wavesApi.post(CONSTANTS.TOKEN_REFRESH_URL, data, { headers });
            if (response.data.code === 220) {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`获取可用性成功，账号已过期`));
                return false;
            } else {
                if (Config.getConfig().enable_log) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取可用性成功，账号可用`));
                }
                if (response.data.data) {
                    this.bat = JSON.parse(response.data.data).accessToken;
                }
                return true;
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取可用性失败，疑似网络问题`), logger.red(error));
            return !strict;
        }
    }

    async refreshData(serverId, roleId, token, did = null) {
        const headers = await this.buildHeaders('ios', token, did);
        const data = qs.stringify({ gameId: 3, serverId, roleId });

        try {
            const response = await wavesApi.post(CONSTANTS.REFRESH_URL, data, { headers });
            if (response.data.code === 10902 || response.data.code === 200) {
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`刷新资料成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`刷新资料失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`刷新资料失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '刷新资料失败，疑似网络问题，请检查控制台日志' };
        }
    }

    async getGameData(token, did = null) {
        const headers = await this.buildHeaders('ios', token, did, true);
        const data = qs.stringify({ type: '2', sizeType: '1' });

        try {
            const response = await wavesApi.post(CONSTANTS.GAME_DATA_URL, data, { headers });
            if (response.data.code === 200) {
                if (response.data.data === null) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`获取日常数据失败，返回空数据`));
                    return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取日常数据成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取日常数据失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取日常数据失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '获取日常数据失败，疑似网络问题，请检查控制台日志' };
        }
    }

    async getBaseData(serverId, roleId, token, did = null) {
        await this.refreshData(serverId, roleId, token, did);
        const headers = await this.buildHeaders('ios', token, did);
        const data = qs.stringify({ gameId: 3, serverId, roleId });

        try {
            const response = await wavesApi.post(CONSTANTS.BASE_DATA_URL, data, { headers });
            if (response.data.code === 10902 || response.data.code === 200) {
                response.data.data = JSON.parse(response.data.data);
                if (response.data.data === null || !response.data.data.showToGuest) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`获取我的资料失败，返回空数据`));
                    return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取我的资料成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取我的资料失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取我的资料失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '获取我的资料失败，疑似网络问题，请检查控制台日志' };
        }
    }

    async getRoleData(serverId, roleId, token, did = null) {
        await this.refreshData(serverId, roleId, token, did);
        const headers = await this.buildHeaders('ios', token, did);
        const data = qs.stringify({ gameId: 3, serverId, roleId });

        try {
            const response = await wavesApi.post(CONSTANTS.ROLE_DATA_URL, data, { headers });
            if (response.data.code === 10902 || response.data.code === 200) {
                response.data.data = JSON.parse(response.data.data);
                if (response.data.data === null || !response.data.data.showToGuest) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`获取共鸣者失败，返回空数据`));
                    return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取共鸣者成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取共鸣者失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取共鸣者失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '获取共鸣者失败，疑似网络问题，请检查控制台日志' };
        }
    }

    async getCalabashData(serverId, roleId, token, did = null) {
        await this.refreshData(serverId, roleId, token, did);
        const headers = await this.buildHeaders('ios', token, did);
        const data = qs.stringify({ gameId: 3, serverId, roleId });

        try {
            const response = await wavesApi.post(CONSTANTS.CALABASH_DATA_URL, data, { headers });
            if (response.data.code === 10902 || response.data.code === 200) {
                response.data.data = JSON.parse(response.data.data);
                if (response.data.data === null) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`获取数据坞失败，返回空数据`));
                    return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取数据坞成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取数据坞失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取数据坞失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '获取数据坞失败，疑似网络问题，请检查控制台日志' };
        }
    }

    async getChallengeData(serverId, roleId, token, did = null) {
        await this.refreshData(serverId, roleId, token, did);
        const headers = await this.buildHeaders('ios', token, did);
        const data = qs.stringify({ gameId: 3, serverId, roleId, countryCode: 1 });

        try {
            const response = await wavesApi.post(CONSTANTS.CHALLENGE_DATA_URL, data, { headers });
            if (response.data.code === 10902 || response.data.code === 200) {
                response.data.data = JSON.parse(response.data.data);
                if (response.data.data === null || !response.data.data.open) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`获取挑战数据失败，返回空数据`));
                    return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取挑战数据成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取挑战数据失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取挑战数据失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '获取挑战数据失败，疑似网络问题，请检查控制台日志' };
        }
    }

    async getExploreData(serverId, roleId, token, did = null) {
        await this.refreshData(serverId, roleId, token, did);
        const headers = await this.buildHeaders('ios', token, did);
        const data = qs.stringify({ gameId: 3, serverId, roleId, countryCode: 1 });

        try {
            const response = await wavesApi.post(CONSTANTS.EXPLORE_DATA_URL, data, { headers });
            if (response.data.code === 10902 || response.data.code === 200) {
                response.data.data = JSON.parse(response.data.data);
                if (response.data.data === null || !response.data.data.open) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`获取探索数据失败，返回空数据`));
                    return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取探索数据成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取探索数据失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取探索数据失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '获取数据失败' };
        }
    }

    async getRoleDetail(serverId, roleId, id, token, did = null) {
        await this.refreshData(serverId, roleId, token, did);
        const headers = await this.buildHeaders('ios', token, did);
        const data = qs.stringify({ serverId, roleId, id });

        try {
            const response = await wavesApi.post(CONSTANTS.ROLE_DETAIL_URL, data, { headers });
            if (response.data.code === 10902 || response.data.code === 200) {
                response.data.data = JSON.parse(response.data.data);
                if (response.data.data === null) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`获取角色详细信息失败，返回空数据`));
                    return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取角色详细信息成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取角色详细信息失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取角色详细信息失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '获取角色详细信息失败，疑似网络问题，请检查控制台日志' };
        }
    }

    async signIn(serverId, roleId, userId, token, did = null) {
        await this.refreshData(serverId, roleId, token, did);
        const headers = await this.buildHeaders('ios', token, did, true);
        const data = qs.stringify({
            gameId: 3, serverId, roleId, userId,
            reqMonth: (new Date().getMonth() + 1).toString().padStart(2, '0'),
        });

        try {
            const response = await wavesApi.post(CONSTANTS.SIGNIN_URL, data, { headers });
            if (response.data.code === 200) {
                if (response.data.data === null) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`签到失败，返回空数据`));
                    return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`签到成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`签到失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`签到失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '签到失败' };
        }
    }

    async queryRecord(serverId, roleId, token, did = null) {
        await this.refreshData(serverId, roleId, token, did);
        const headers = await this.buildHeaders('ios', token, did, true);
        const data = qs.stringify({ gameId: 3, serverId, roleId });

        try {
            const response = await wavesApi.post(CONSTANTS.QUERY_RECORD_URL, data, { headers });
            if (response.data.code === 200) {
                if (response.data.data === null) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`查询签到领取记录失败，返回空数据`));
                    return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`查询签到领取记录成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`查询签到领取记录失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`查询签到领取记录失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '查询签到领取记录失败，疑似网络问题，请检查控制台日志' };
        }
    }

    async getTowerData(serverId, roleId, token, did = null) {
        await this.refreshData(serverId, roleId, token, did);
        const headers = await this.buildHeaders('ios', token, did);
        const data = qs.stringify({ gameId: 3, serverId, roleId });

        try {
            const response = await wavesApi.post(CONSTANTS.SELF_TOWER_DATA_URL, data, { headers });
            if (response.data.code === 10902 || response.data.code === 200) {
                response.data.data = JSON.parse(response.data.data);
                if (response.data.data === null) {
                    const other = await wavesApi.post(CONSTANTS.OTHER_TOWER_DATA_URL, data, { headers });
                    if (other.data.code === 200) {
                        other.data.data = JSON.parse(other.data.data);
                        if (other.data.data === null) {
                            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`获取逆境深塔数据失败，返回空数据`));
                            return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                        }
                        if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取逆境深塔数据成功`));
                        return { status: true, data: other.data.data };
                    } else {
                        logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取逆境深塔数据失败`), logger.red(other.data.msg));
                        return { status: false, msg: other.data.msg };
                    }
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取逆境深塔数据成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取逆境深塔数据失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取逆境深塔数据失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '获取数据失败' };
        }
    }

    async getGaCha(data) {
        const isCN = !!(data.serverId == "76402e5b20be2c39f095a152090afddc");

        try {
            const response = await wavesApi.post(isCN ? CONSTANTS.GACHA_URL : CONSTANTS.INTL_GACHA_URL, data);
            if (response.data.code === 0) {
                if (response.data.data === null) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`获取抽卡记录失败，返回空数据`));
                    return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取抽卡记录成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取抽卡记录失败`), logger.red(response.data.message));
                return { status: false, msg: response.data.message };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取抽卡记录失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '获取抽卡记录失败，疑似网络问题，请检查控制台日志' };
        }
    }

    async pubCookie() {
        try {
            if (!Config.getConfig().use_public_cookie) return false;
            const keys = await redis.keys('Yunzai:waves:users:*');
            if (!keys || keys.length === 0) return false;

            const values = await Promise.all(keys.map(key => redis.get(key)));
            const validUsers = values
                .map(value => {
                    try { return value ? JSON.parse(value) : null; } catch (e) { return null; }
                })
                .filter(Boolean)
                .flat()
                .filter(user => user && user.token && user.serverId && user.roleId)
                .sort(() => Math.random() - 0.5);

            for (let user of validUsers) {
                try {
                    const isAvailable = await this.isAvailable(user.serverId, user.roleId, user.token, user.did || '', false);
                    if (isAvailable) return user;
                } catch (error) { continue; }
            }
            return false;
        } catch (error) {
            logger.error('[COS] 获取公共Cookie异常:', error);
            return false;
        }
    }

    async getValidAccount(e, roleId = '', forceUserCookie = false) {
        if (e.at) e.user_id = e.at;
        if (!roleId) {
            const boundUid = await redis.get(`Yunzai:waves:bind:${e.user_id}`);
            if (!boundUid) {
                await e.reply('未绑定鸣潮特征码，请使用[~绑定uid]完成绑定，或使用[~登录]进行登录自动绑定');
                return null;
            }
        }

        let accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
        const invalidRoleIds = new Set();
        const resultList = [];
        const publicCookie = forceUserCookie ? null : await this.pubCookie?.();

        const processAccount = async (uid) => {
            const boundAcc = accountList.find(a => a.roleId === uid);
            let cookieInfo = null;

            if (boundAcc) {
                const isUsable = await this.isAvailable(boundAcc.serverId, boundAcc.roleId, boundAcc.token, boundAcc.did || '');
                if (isUsable) {
                    cookieInfo = { uid, serverId: boundAcc.serverId, token: boundAcc.token, did: boundAcc.did || '' };
                } else {
                    invalidRoleIds.add(uid);
                }
            }

            if (!cookieInfo) {
                if (forceUserCookie) {
                    await e.reply(`用户 ${uid} 未登录或登录失效，请使用[~登录]进行登录`);
                } else if (publicCookie) {
                    cookieInfo = { uid, serverId: publicCookie.serverId, token: publicCookie.token, did: publicCookie.did || '' };
                } else {
                    await e.reply(`没有可用的公共Cookie，请使用[~登录]进行登录`);
                }
            }
            return cookieInfo;
        };

        if (roleId) {
            const cookieInfo = await processAccount(roleId);
            cookieInfo && resultList.push(cookieInfo);
        } else {
            const boundUid = await redis.get(`Yunzai:waves:bind:${e.user_id}`);
            const targetUids = new Set([...(boundUid ? [boundUid] : []), ...accountList.map(a => a.roleId)].filter(Boolean));
            for (const uid of targetUids) {
                const cookieInfo = await processAccount(uid);
                cookieInfo && resultList.push(cookieInfo);
            }
        }

        if (invalidRoleIds.size > 0) {
            const newAccountList = accountList.filter(a => !invalidRoleIds.has(a.roleId));
            Config.setUserData(e.user_id, newAccountList);
        }

        return resultList.length > 0 ? resultList : null;
    }
    
    async getHaiXuData(serverId, roleId, token, did = null) {
        await this.refreshData(serverId, roleId, token, did);
        const headers = await this.buildHeaders('ios', token, did);
        let data = qs.stringify({ 'gameId': 3, 'serverId': serverId, 'roleId': roleId });

        try {
            const response = await wavesApi.post(CONSTANTS.HAIXU_DATA_URL, data, { headers });
            if (response.data.code === 10902 || response.data.code === 200) {
                const parsedData = JSON.parse(response.data.data);
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取海虚数据成功`));
                return { status: true, data: parsedData };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取海虚数据失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取海虚数据异常`), logger.red(error));
            return { status: false, msg: '获取海虚数据失败，疑似网络问题' };
        }
    }

    async getEventList(eventType = 0) {
        const headers = await this.buildHeaders('ios');
        const data = qs.stringify({ gameId: 3, eventType });

        try {
            const response = await wavesApi.post(CONSTANTS.EVENT_LIST_URL, data, { headers });
            if (response.data.code === 200) {
                if (response.data.data === null) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`获取活动列表失败，返回空数据`));
                    return { status: false, msg: "查询信息失败，请检查库街区数据终端中对应板块的对外展示开关是否打开" };
                }
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取活动列表成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取活动列表失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取活动列表失败，疑似网络问题`), logger.red(error));
            return { status: false, msg: '获取活动列表失败' };
        }
    }

    async getResourcePeriods(serverId, roleId, token, did = null) {
        if (!serverId || !roleId || !token) {
            return { status: false, msg: '当前没有可用的Cookie，请使用[~登录]进行登录' };
        }
        const headers = await this.buildHeaders('ios', token, did, true);
        
        try {
            const response = await wavesApi.get(CONSTANTS.RESOURCE_PERIOD_LIST_URL, { headers, params: { serverId, roleId } });
            if (response.data.code === 200) {
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取资源周期列表成功`));
                return { status: true, data: response.data.data };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取资源周期列表失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取资源周期列表异常`), logger.red(error));
            return { status: false, msg: '获取资源周期失败，疑似网络问题' };
        }
    }

    async getResourceReport(serverId, roleId, token, did, periodType, periodIndex) {
        if (!serverId || !roleId || !token || !did) {
            return { status: false, msg: '当前没有可用的Cookie，请使用[~登录]进行登录' };
        }
        const endpoints = { week: CONSTANTS.RESOURCE_WEEK_URL, month: CONSTANTS.RESOURCE_MONTH_URL, version: CONSTANTS.RESOURCE_VERSION_URL };
        if (!endpoints[periodType]) return { status: false, msg: '无效的资源周期类型' };
        
        const headers = await this.buildHeaders('ios', token, did, true);
        const data = qs.stringify({ period: periodIndex, roleId, serverId });
        
        try {
            const response = await wavesApi.post(endpoints[periodType], data, { headers });
            if (response.data.code === 200) {
                if (Config.getConfig().enable_log) logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`获取${periodType}资源报告成功`));
                return { status: true, data: response.data.data, periodType };
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取${periodType}资源报告失败`), logger.red(response.data.msg));
                return { status: false, msg: response.data.msg };
            }
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取${periodType}资源报告异常`), logger.red(error));
            return { status: false, msg: '获取资源数据失败，疑似网络问题' };
        }
    }
}

export default Waves;
