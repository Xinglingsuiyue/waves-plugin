import plugin from '../../../lib/plugins/plugin.js'
import Waves from "../components/Code.js";
import Config from "../components/Config.js";
import Render from '../components/Render.js';
import sharp from 'sharp';

export class TowerInfo extends plugin {
    constructor() {
        super({
            name: "鸣潮-逆境深塔",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(?:逆境)?(?:深(?:塔|渊)|(稳定|实验|超载|深境)(?:区)?)(\\d{9})?$",
                    fnc: "tower"
                }
            ]
        })
    }

    extractImageBuffer(input) {
        if (!input) return null;
        if (typeof input === 'string') {
            let str = input;
            if (str.startsWith('base64://')) str = str.slice(9);
            const m = str.match(/^data:image\/\w+;base64,(.+)$/);
            if (m) str = m[1];
            if (/^[A-Za-z0-9+/\n\r]+=*$/.test(str) && str.length > 100) {
                return Buffer.from(str, 'base64');
            }
            return null;
        }
        if (typeof input === 'object') {
            if (Buffer.isBuffer(input.file)) return input.file;
            if (Buffer.isBuffer(input.data?.file)) return input.data.file;
            const paths = [['file'], ['data', 'file'], ['url'], ['data', 'url'], ['src'], ['data', 'src'], ['image'], ['base64']];
            for (const path of paths) {
                try {
                    let val = input;
                    for (const key of path) { val = val?.[key]; if (val === undefined || val === null) break; }
                    if (Buffer.isBuffer(val)) return val;
                    if (typeof val === 'string') {
                        let str = val;
                        if (str.startsWith('base64://')) str = str.slice(9);
                        const m = str.match(/^data:image\/\w+;base64,(.+)$/);
                        if (m) str = m[1];
                        if (/^[A-Za-z0-9+/\n\r]+=*$/.test(str) && str.length > 100) return Buffer.from(str, 'base64');
                    }
                } catch (e) {}
            }
            try {
                for (const k1 in input) {
                    const v1 = input[k1];
                    if (Buffer.isBuffer(v1)) return v1;
                    if (v1 && typeof v1 === 'object') {
                        for (const k2 in v1) { if (Buffer.isBuffer(v1[k2])) return v1[k2]; }
                    }
                }
            } catch (e) {}
        }
        return null;
    }

    async concatImagesHorizontal(buffers) {
        if (buffers.length === 0) return null;
        if (buffers.length === 1) return { type: 'image', file: `base64://${buffers[0].toString('base64')}` };

        const metadatas = await Promise.all(buffers.map(buf => sharp(buf).metadata()));
        const maxHeight = Math.round(Math.max(...metadatas.map(m => m.height || 0)));
        const totalWidth = Math.round(metadatas.reduce((sum, m) => sum + (m.width || 0), 0));

        const composites = [];
        let xOffset = 0;
        for (let i = 0; i < buffers.length; i++) {
            composites.push({ input: buffers[i], left: Math.round(xOffset), top: 0 });
            xOffset += metadatas[i].width || 0;
        }

        const result = await sharp({
            create: { width: totalWidth, height: maxHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
        }).composite(composites).png().toBuffer();

        return { type: 'image', file: `base64://${result.toString('base64')}` };
    }

    async tower(e) {
        if (e.at) e.user_id = e.at;
        const waves = new Waves();

        let [, key, roleId] = e.msg.match(this.rule[0].reg)

        if (roleId) {
            let publicCookie = await waves.pubCookie();
            if (!publicCookie) {
                return await e.reply('当前没有可用的公共Cookie，无法查询指定UID');
            }
            
            publicCookie.roleId = roleId;
            const [baseData, towerData] = await Promise.all([
                waves.getBaseData(publicCookie.serverId, roleId, publicCookie.token),
                waves.getTowerData(publicCookie.serverId, roleId, publicCookie.token)
            ]);

            if (!baseData.status || !towerData.status) {
                return await e.reply(baseData.msg || towerData.msg);
            }

            const Mapping = { '稳定': 1, '实验': 2, '深境': 3, '超载': 4 };
            if (!key) key = '深境';
            if (!towerData.data.difficultyList.some(item => item.difficulty === Mapping[key] && item.towerAreaList.length > 0)) {
                return await e.reply(`账号 ${roleId} 没有${key}区数据`);
            }
            
            let leftTime = '未知';
            if (towerData.data.seasonEndTime) {
                const timeSeconds = towerData.data.seasonEndTime / 1000;
                const days = Math.floor(timeSeconds / (3600 * 24));
                const hours = Math.floor((timeSeconds % (3600 * 24)) / 3600);
                const minutes = Math.floor((timeSeconds % 3600) / 60);

                if (days > 0) {
                    leftTime = `${days}天${hours}小时${minutes}分钟`;
                } else if (hours > 0) {
                    leftTime = `${hours}小时${minutes}分钟`;
                } else {
                    leftTime = `${minutes}分钟`;
                }
            }
            
            towerData.data = { ...towerData.data, difficulty: Mapping[key] || 3, diffiname: `${key}区`, leftTime: leftTime };
            const imageCard = await Render.render('Template/towerData/tower', {
                isSelf: false,
                baseData: baseData.data,
                towerData: towerData.data,
            }, { e, retType: 'base64' });

            return await e.reply(imageCard);
        }

        let accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
        
        if (!accountList.length) {
            if (await redis.get(`Yunzai:waves:bind:${e.user_id}`)) {
                let publicCookie = await waves.pubCookie();
                if (!publicCookie) {
                    return await e.reply('当前没有可用的公共Cookie，请使用[~登录]进行登录');
                } else {
                    publicCookie.roleId = await redis.get(`Yunzai:waves:bind:${e.user_id}`);
                    accountList.push(publicCookie);
                }
            } else {
                return await e.reply('当前没有登录任何账号，请使用[~登录]进行登录');
            }
        }

        let errorMessages = [];
        let deleteroleId = [];
        let imageBuffers = [];
        let rawImageCards = [];

        for (const account of accountList) {
            const usability = await waves.isAvailable(account.serverId, account.roleId, account.token);

            if (!usability) {
                errorMessages.push(`账号 ${account.roleId} 的Token已失效\n请重新登录Token`);
                deleteroleId.push(account.roleId);
                continue;
            }

            const [baseData, towerData] = await Promise.all([
                waves.getBaseData(account.serverId, account.roleId, account.token),
                waves.getTowerData(account.serverId, account.roleId, account.token)
            ]);

            if (!baseData.status || !towerData.status) {
                errorMessages.push(`账号 ${account.roleId}: ${baseData.msg || towerData.msg}`);
                continue;
            }

            const Mapping = { '稳定': 1, '实验': 2, '深境': 3, '超载': 4 };
            if (!key) key = '深境';
            if (!towerData.data.difficultyList.some(item => item.difficulty === Mapping[key] && item.towerAreaList.length > 0)) {
                errorMessages.push(`账号 ${account.roleId} 没有${key}区数据`);
                continue;
            }
            
            let leftTime = '未知';
            if (towerData.data.seasonEndTime) {
                const timeSeconds = towerData.data.seasonEndTime / 1000;
                const days = Math.floor(timeSeconds / (3600 * 24));
                const hours = Math.floor((timeSeconds % (3600 * 24)) / 3600);
                const minutes = Math.floor((timeSeconds % 3600) / 60);

                if (days > 0) {
                    leftTime = `${days}天${hours}小时${minutes}分钟`;
                } else if (hours > 0) {
                    leftTime = `${hours}小时${minutes}分钟`;
                } else {
                    leftTime = `${minutes}分钟`;
                }
            }
            
            towerData.data = { ...towerData.data, difficulty: Mapping[key] || 3, diffiname: `${key}区`, leftTime: leftTime };
            const imageCard = await Render.render('Template/towerData/tower', {
                isSelf: true,
                baseData: baseData.data,
                towerData: towerData.data,
            }, { e, retType: 'base64' });

            rawImageCards.push(imageCard);
            const buf = this.extractImageBuffer(imageCard);
            if (buf) {
                const isPng = buf[0] === 0x89 && buf[1] === 0x50;
                const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
                const isWebp = buf[0] === 0x52 && buf[1] === 0x49;
                if (isPng || isJpeg || isWebp) imageBuffers.push(buf);
            }
        }

        if (deleteroleId.length) {
            let newAccountList = accountList.filter(account => !deleteroleId.includes(account.roleId));
            Config.setUserData(e.user_id, newAccountList);
        }

        // 没有任何成功结果
        if (rawImageCards.length === 0) {
            const msg = errorMessages.length > 0
                ? errorMessages.join('\n\n')
                : '无法获取深塔数据';
            return await e.reply(msg);
        }

        // 先发送失败账号的错误信息
        if (errorMessages.length > 0) {
            await e.reply(errorMessages.join('\n\n'));
        }

        let finalImage = null;
        if (imageBuffers.length > 1) {
            try {
                finalImage = await this.concatImagesHorizontal(imageBuffers);
            } catch (err) {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.red(`深塔图片拼接失败: ${err.message}`));
            }
        }

        if (!finalImage) {
            if (rawImageCards.length === 1) {
                finalImage = rawImageCards[0];
            } else {
                for (const card of rawImageCards) {
                    await e.reply(card);
                }
                return true;
            }
        }

        await e.reply(finalImage);
        return true;
    }
}
