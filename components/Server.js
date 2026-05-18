import { pluginResources } from '../model/path.js';
import Waves from "./Code.js";
import Config from "./Config.js";
import express from 'express';
import fs from 'fs/promises';

// HTML 转义函数，防止 XSS
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// 简易速率限制器
class RateLimiter {
    constructor(windowMs = 60000, maxRequests = 10) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.requests = new Map();
        // 定期清理过期记录
        setInterval(() => {
            const now = Date.now();
            for (const [key, records] of this.requests) {
                this.requests.set(key, records.filter(t => now - t < this.windowMs));
                if (this.requests.get(key).length === 0) this.requests.delete(key);
            }
        }, 60000);
    }

    check(key) {
        const now = Date.now();
        if (!this.requests.has(key)) this.requests.set(key, []);
        const records = this.requests.get(key).filter(t => now - t < this.windowMs);
        this.requests.set(key, records);
        if (records.length >= this.maxRequests) return false;
        records.push(now);
        return true;
    }
}

class Server {
    constructor() {
        this.app = express();
        this.data = {};
        this.server = null;
        this.sessionTTL = 10 * 60 * 1000; // 会话10分钟过期
        this.rateLimiter = new RateLimiter(60000, 10);
        this.init();
    }

    // 清理过期会话
    cleanExpiredSessions() {
        const now = Date.now();
        for (const id in this.data) {
            if (now - this.data[id].createdAt > this.sessionTTL) {
                delete this.data[id];
            }
        }
    }

    async init() {
        this.app.use(express.json());
        await this.checkServer();

        setInterval(() => {
            this.checkServer();
        }, 30000); // 降低轮询频率到30秒

        // 定期清理过期会话
        setInterval(() => {
            this.cleanExpiredSessions();
        }, 60000);

        this.app.get('/login/:id', async (req, res) => {
            const { id } = req.params;

            // 速率限制
            if (!this.rateLimiter.check(`login:${req.ip}`)) {
                return res.status(429).send('Too Many Requests');
            }

            const filePath = this.data[id] ? '/server/login.html' : '/server/error.html';

            try {
                let data = await fs.readFile(pluginResources + filePath, 'utf8');
                res.setHeader('Content-Type', 'text/html');
                if (this.data[id]) {
                    // 对 user_id 进行 HTML 转义，防止 XSS
                    data = data.replace(/undefined/g, escapeHtml(String(this.data[id].user_id)));
                }
                const bgApi = Config.getConfig().background_api;
                if (bgApi) {
                    data = data.replace(/background_image/g, escapeHtml(String(bgApi)));
                }
                res.send(data);
            } catch (error) {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`发送登录页失败`), logger.red(error));
                res.status(500).send('Internal Server Error');
            }
        });

        this.app.post('/code/:id', async (req, res) => {
            const { id } = req.params;

            // 速率限制
            if (!this.rateLimiter.check(`code:${req.ip}`)) {
                return res.status(429).json({ code: 429, msg: 'Too Many Requests' });
            }

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
