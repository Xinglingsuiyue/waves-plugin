import { pluginResources } from '../model/path.js';
import Waves from "./Code.js";
import Config from "./Config.js";
import express from 'express';
import fs from 'fs/promises';
import axios from 'axios';

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

function buildSdkParams(deviceNum, extra = {}) {
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

class Server {
    constructor() {
        this.app = express();
        this.data = {};
        this.server = null;
        this.init();
    }

    async init() {
        this.app.use(express.json());
        await this.checkServer();
        setInterval(() => {
            this.checkServer();
        }, 5000);


        this.app.get('/login/:id', async (req, res) => {
            const { id } = req.params;
            const filePath = this.data[id] ? '/server/login.html' : '/server/error.html';
            try {
                let data = await fs.readFile(pluginResources + filePath, 'utf8');
                res.setHeader('Content-Type', 'text/html');
                if (this.data[id]) {
                    data = data.replace(/undefined/g, this.data[id].user_id);
                }
                data = data.replace(/background_image/g, await Config.getConfig().background_api);
                res.send(data);
            } catch (error) {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`发送登录页失败`), logger.red(error));
                res.status(500).send('Internal Server Error');
            }
        });

        this.app.post('/code/:id', async (req, res) => {
            const { id } = req.params;
            const { mobile, code } = req.body;
            if (!this.data[id]) return res.status(200).json({ code: 400, msg: 'Authorization is required' });
            if (!mobile || !code) return res.status(200).json({ code: 400, msg: 'Unable to retrieve mobile number and verification code' });
            const waves = new Waves();
            const data = await waves.getToken(mobile, code);
            if (!data.status) return res.status(200).json({ code: 400, msg: data.msg });
            this.data[id].token = data.data.token;
            this.data[id].did = data.data.did;
            return res.status(200).json({ code: 200, msg: 'Login successful' });
        });


        this.app.get('/cloudlogin/:id', async (req, res) => {
            const { id } = req.params;
            const filePath = this.data[id] ? '/server/cloudlogin.html' : '/server/error.html';
            try {
                let data = await fs.readFile(pluginResources + filePath, 'utf8');
                res.setHeader('Content-Type', 'text/html');
                if (this.data[id]) {
                    data = data.replace(/undefined/g, this.data[id].user_id);
                }
                data = data.replace(/background_image/g, await Config.getConfig().background_api);
                res.send(data);
            } catch (error) {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`发送云登录页失败`), logger.red(error));
                res.status(500).send('Internal Server Error');
            }
        });

        this.app.post('/cloudlogin/sms/:id', async (req, res) => {
            const { id } = req.params;
            const { phone } = req.body;

            if (!this.data[id]) {
                return res.status(200).json({ code: 400, msg: '会话已过期，请重新在机器人中使用 ~云登录 命令' });
            }

            if (!phone || !/^\d{11}$/.test(phone)) {
                return res.status(200).json({ code: 400, msg: '请输入正确的手机号' });
            }

            const deviceNum = generateDeviceNum();
            this.data[id].deviceNum = deviceNum;

            try {
                const params = new URLSearchParams(buildSdkParams(deviceNum, { phone }));
                const resp = await axios.post(
                    `${CLOUD_CONSTANTS.SDK_URL}/sdkcom/v2/login/getPhoneCode.lg`,
                    params.toString(),
                    {
                        headers: SDK_HEADERS,
                        timeout: 15000
                    }
                );

                logger.mark(
                    logger.blue('[WAVES PLUGIN]'),
                    logger.cyan(`云登录发送验证码响应`),
                    logger.green(`code: ${resp.data?.code}`),
                    logger.green(`msg: ${resp.data?.msg}`)
                );

                if (resp.data && resp.data.code === 0) {
                    return res.status(200).json({ code: 200, msg: '验证码已发送，请注意查收' });
                } else {
                    const errMsg = resp.data?.msg || '发送验证码失败';
                    return res.status(200).json({ code: 400, msg: errMsg });
                }
            } catch (error) {
                logger.error('[WAVES PLUGIN] 发送云验证码失败:', error.message || error);
                return res.status(200).json({ code: 400, msg: '无法连接云鸣潮服务器，请确认机器人网络是否正常' });
            }
        });

        this.app.post('/cloudlogin/:id', async (req, res) => {
            const { id } = req.params;
            const { phone, code } = req.body;

            if (!this.data[id]) {
                return res.status(200).json({ code: 400, msg: '会话已过期，请重新在机器人中使用 ~云登录 命令' });
            }

            if (!phone || !code) {
                return res.status(200).json({ code: 400, msg: '请输入手机号和验证码' });
            }

            const deviceNum = this.data[id].deviceNum || generateDeviceNum();

            try {
                const sdkParams = new URLSearchParams(
                    buildSdkParams(deviceNum, { phone, code, deviceModel: 'Chrome', os: 'Linux' })
                );
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`云登录 Step1: phoneCode.lg`));

                const loginResp = await axios.post(
                    `${CLOUD_CONSTANTS.SDK_URL}/sdkcom/v2/login/phoneCode.lg`,
                    sdkParams.toString(),
                    {
                        headers: SDK_HEADERS,
                        timeout: 15000
                    }
                );

                if (loginResp.data.code !== 0) {
                    return res.status(200).json({
                        code: 400,
                        msg: loginResp.data.msg || '云SDK登录失败，请检查验证码是否正确'
                    });
                }

                const sdkData = loginResp.data.data;
                const authCode = sdkData.code;
                const autoToken = sdkData.autoToken;

                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`云登录 Step1 成功`));

                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`云登录 Step2: getToken.lg`));
                const tokenParams = new URLSearchParams(
                    buildSdkParams(deviceNum, { code: authCode, grant_type: 'authorization_code' })
                );
                const tokenResp = await axios.post(
                    `${CLOUD_CONSTANTS.SDK_URL}/sdkcom/v2/auth/getToken.lg`,
                    tokenParams.toString(),
                    {
                        headers: SDK_HEADERS,
                        timeout: 15000
                    }
                );

                if (tokenResp.data.code !== 0) {
                    return res.status(200).json({
                        code: 400,
                        msg: '获取access_token失败：' + (tokenResp.data.msg || '未知错误')
                    });
                }

                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`云登录 Step2 成功`));

                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`云登录 Step3: Login/Login`));
                let deviceId = generateDeviceId();
                let cloudToken;

                const tokenCandidates = [
                    { name: 'access_token', value: tokenResp.data.data.access_token },
                    { name: 'autoToken', value: sdkData.autoToken },
                    { name: 'phoneToken', value: sdkData.phoneToken }
                ];

                let loginSuccess = false;
                for (const candidate of tokenCandidates) {
                    if (!candidate.value) continue;
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`尝试 Login/Login 使用 ${candidate.name}`));

                    const appReqBody = {
                        loginType: 1,
                        userId: String(sdkData.cuid || sdkData.id),
                        userName: sdkData.username,
                        token: candidate.value,
                        deviceId: candidate.name === 'access_token' ? deviceId : generateDeviceId(),
                        platform: 'web',
                        appVersion: CLOUD_CONSTANTS.APP_VERSION
                    };
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`请求体: ${JSON.stringify(appReqBody)}`));

                    try {
                        const appResp = await axios.post(
                            `${CLOUD_CONSTANTS.GAME_URL}/Login/Login`,
                            appReqBody,
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'x-b3-traceid': appReqBody.deviceId,
                                    'x-os': 'web',
                                    'Origin': 'https://mc.kurogames.com',
                                    'Referer': 'https://mc.kurogames.com/cloud/',
                                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
                                },
                                timeout: 15000
                            }
                        );

                        logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`${candidate.name} 响应: code=${appResp.data?.code} msg=${appResp.data?.msg}`));

                        if (appResp.data.code === 0 && appResp.data?.data?.token) {
                            cloudToken = appResp.data.data.token;
                            deviceId = appReqBody.deviceId;
                            loginSuccess = true;
                            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`Login/Login 成功! token=${candidate.name}`));
                            break;
                        }
                    } catch (appErr) {
                        logger.error(`[WAVES PLUGIN] Login/Login ${candidate.name} 网络错误:`, appErr.message);
                    }
                }

                if (!loginSuccess) {
                    return res.status(200).json({
                        code: 400,
                        msg: '云游戏登录失败：SDK请求异常，请稍后重试或联系客服'
                    });
                }
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`云登录 Step3 成功, cloudToken: ${cloudToken?.substring(0, 20)}...`));

                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`云登录 Step4: GameRecordInfo`));
                const recordResp = await axios.get(
                    `${CLOUD_CONSTANTS.GAME_URL}/Message/GameRecordInfo`,
                    {
                        headers: {
                            'x-token': cloudToken,
                            'x-b3-traceid': deviceId,
                            'x-os': 'web'
                        },
                        timeout: 15000
                    }
                );

                logger.mark(
                    logger.blue('[WAVES PLUGIN]'),
                    logger.cyan(`GameRecordInfo 响应:`),
                    logger.green(`code: ${recordResp.data?.code}`),
                    logger.green(`msg: ${recordResp.data?.msg}`),
                    logger.green(`data: ${JSON.stringify(recordResp.data?.data)}`)
                );

                if (recordResp.data.code !== 0) {
                    return res.status(200).json({
                        code: 400,
                        msg: '获取游戏记录失败：' + (recordResp.data.msg || '未知错误')
                    });
                }

                const playerId = recordResp.data.data.playerId;
                const recordId = recordResp.data.data.recordId;

                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`云登录 Step4 成功`), logger.green(`playerId: ${playerId}`));

                this.data[id].cloudData = {
                    status: true,
                    data: {
                        cloudToken,
                        playerId,
                        recordId
                    }
                };

                logger.mark(
                    logger.blue('[WAVES PLUGIN]'),
                    logger.cyan(`云登录全部完成`),
                    logger.green(`用户: ${this.data[id].user_id}`),
                    logger.green(`playerId: ${playerId}`)
                );

                return res.status(200).json({ code: 200, msg: '登录成功' });

            } catch (error) {
                logger.error('[WAVES PLUGIN] 云登录流程失败:', error.message || error);
                return res.status(200).json({
                    code: 400,
                    msg: '登录过程网络异常，请重试'
                });
            }
        });



        this.app.use((req, res) => {
            res.redirect('https://github.com/erzaozi/waves-plugin');
        });
    }

    async checkServer() {
        const allowLogin = Config.getConfig().allow_login;
        if (allowLogin && !this.server) {
            const port = await Config.getConfig().server_port;
            this.server = this.app.listen(port, () => {
                logger.mark(logger.blue('[Waves PLUGIN]'), logger.cyan(`已开启 HTTP 登录服务器，本地端口为`), logger.green(port));
            });
        }
        if (!allowLogin && this.server) {
            this.server.close((error) => {
                if (error) {
                    logger.mark(logger.blue('[Waves PLUGIN]'), logger.cyan(`无法关闭登录服务器`), logger.red(error));
                } else {
                    logger.mark(logger.blue('[Waves PLUGIN]'), logger.cyan(`已关闭登录服务器`));
                }
            });
            this.server = null;
        }
    }
}

export default new Server();