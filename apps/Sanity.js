import plugin from '../../../lib/plugins/plugin.js'
import Waves from "../components/Code.js";
import Config from "../components/Config.js";
import Render from '../components/Render.js';
import pLimit from 'p-limit';
import sharp from 'sharp';

export class Sanity extends plugin {
    constructor() {
        super({
            name: "鸣潮-日常数据",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(～|~|鸣潮)(波片|体力|日常数据)$",
                    fnc: "sanity"
                }
            ]
        })
        this.task = {
            name: '[Waves-Plugin] 波片推送',
            fnc: () => this.autoPush(),
            cron: Config.getConfig().sanity_push_time,
            log: false
        }
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

            const paths = [
                ['file'], ['data', 'file'], ['url'], ['data', 'url'],
                ['src'], ['data', 'src'], ['image'], ['base64'],
            ];
            for (const path of paths) {
                try {
                    let val = input;
                    for (const key of path) {
                        val = val?.[key];
                        if (val === undefined || val === null) break;
                    }
                    if (Buffer.isBuffer(val)) return val;
                    if (typeof val === 'string') {
                        let str = val;
                        if (str.startsWith('base64://')) str = str.slice(9);
                        const m = str.match(/^data:image\/\w+;base64,(.+)$/);
                        if (m) str = m[1];
                        if (/^[A-Za-z0-9+/\n\r]+=*$/.test(str) && str.length > 100) {
                            return Buffer.from(str, 'base64');
                        }
                    }
                } catch (e) {}
            }

            try {
                for (const k1 in input) {
                    const v1 = input[k1];
                    if (Buffer.isBuffer(v1)) return v1;
                    if (v1 && typeof v1 === 'object') {
                        for (const k2 in v1) {
                            if (Buffer.isBuffer(v1[k2])) return v1[k2];
                        }
                    }
                }
            } catch (e) {}
        }

        return null;
    }

    async concatImagesHorizontal(buffers) {
        if (buffers.length === 0) return null;
        if (buffers.length === 1) {
            return { type: 'image', file: `base64://${buffers[0].toString('base64')}` };
        }

        const metadatas = await Promise.all(
            buffers.map(buf => sharp(buf).metadata())
        );

        const maxHeight = Math.round(Math.max(...metadatas.map(m => m.height || 0)));
        const totalWidth = Math.round(metadatas.reduce((sum, m) => sum + (m.width || 0), 0));

        const composites = [];
        let xOffset = 0;
        for (let i = 0; i < buffers.length; i++) {
            composites.push({
                input: buffers[i],
                left: Math.round(xOffset),
                top: 0
            });
            xOffset += metadatas[i].width || 0;
        }

        const result = await sharp({
            create: {
                width: totalWidth,
                height: maxHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
            .composite(composites)
            .png()
            .toBuffer();

        return { type: 'image', file: `base64://${result.toString('base64')}` };
    }

    async sanity(e) {
        let accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
        if (!accountList || !accountList.length) {
            return await e.reply('当前没有登录任何账号，请使用[~登录]进行登录');
        }

        const waves = new Waves();
        let errorMessages = [];
        let deleteroleId = [];
        let imageBuffers = [];
        let rawImageCards = [];

        for (let account of accountList) {
            const usability = await waves.isAvailable(account.serverId, account.roleId, account.token, account.did ? account.did : '');

            if (!usability) {
                errorMessages.push(`账号 ${account.roleId} 的Token已失效\n请重新登录Token`);
                deleteroleId.push(account.roleId);
                continue;
            }

            const gameData = await waves.getGameData(account.token, account.did ? account.did : '');

            if (!gameData.status) {
                errorMessages.push(gameData.msg);
            } else {
                const imageCard = await Render.render('Template/dailyData/dailyData', {
                    isSelf: true,
                    gameData: gameData.data,
                }, { e, retType: 'base64' });

                rawImageCards.push(imageCard);

                const buf = this.extractImageBuffer(imageCard);
                if (buf) {
                    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
                    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
                    const isWebp = buf[0] === 0x52 && buf[1] === 0x49;
                    if (isPng || isJpeg || isWebp) {
                        imageBuffers.push(buf);
                    } else {
                        logger.mark(logger.blue('[WAVES PLUGIN]'), logger.red(
                            `账号 ${account.roleId} 图片 magic bytes 无效: ${buf[0]?.toString(16)} ${buf[1]?.toString(16)}, 长度: ${buf.length}`
                        ));
                    }
                } else {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.red(`账号 ${account.roleId} 图片 Buffer 提取失败`));
                }
            }
        }

        if (deleteroleId.length) {
            let newAccountList = accountList.filter(account => !deleteroleId.includes(account.roleId));
            Config.setUserData(e.user_id, newAccountList);
        }

        if (rawImageCards.length === 0) {
            const msg = errorMessages.length > 0
                ? errorMessages.join('\n\n')
                : '无法获取日常数据';
            return await e.reply(msg);
        }

        if (errorMessages.length > 0) {
            await e.reply(errorMessages.join('\n\n'));
        }

        let finalImage = null;
        if (imageBuffers.length > 1) {
            try {
                finalImage = await this.concatImagesHorizontal(imageBuffers);
            } catch (err) {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.red(`图片拼接失败: ${err.message}`));
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

    async autoPush() {
        const { waves_auto_push_list: autoPushList } = Config.getUserConfig();
        const limit = pLimit(Config.getConfig().limit);
        await Promise.all(autoPushList.map(user =>
            limit(async () => {
                const { botId, groupId, userId } = user;
                let accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${userId}`)) || await Config.getUserData(userId);
                if (!accountList.length) {
                    return
                }

                const waves = new Waves();
                let data = [];
                let deleteroleId = [];

                for (let account of accountList) {
                    const usability = await waves.isAvailable(account.serverId, account.roleId, account.token, account.did ? account.did : '');

                    if (!usability) {
                        data.push({ message: `账号 ${account.roleId} 的Token已失效\n请重新登录Token` });
                        deleteroleId.push(account.roleId);
                        continue;
                    }

                    const result = await waves.getGameData(account.token, account.did ? account.did : '');

                    if (!result.status) {
                        data.push({ message: result.msg })
                        return true;
                    }

                    const key = `Yunzai:waves:pushed:${result.data.roleId}`;
                    const isPushed = await redis.get(key);
                    const threshold = await redis.get(`Yunzai:waves:sanity_threshold:${userId}`) || result.data.energyData.total;
                    const isFull = result.data.energyData.cur >= threshold;
                    if (isFull && !isPushed) {
                        data.push({ message: `漂泊者${result.data.roleName}(${result.data.roleId})，你的结晶波片已经恢复至 ${threshold} 了哦~` })
                        await redis.set(key, 'true');
                    } else if (!isFull && isPushed) {
                        await redis.del(key);
                    }
                }

                if (deleteroleId.length) {
                    let newAccountList = accountList.filter(account => !deleteroleId.includes(account.roleId));
                    Config.setUserData(userId, newAccountList);
                }

                if (data.length) {
                    if (data.length === 1) {
                        if (!groupId) {
                            await Bot[botId]?.pickUser(userId).sendMsg(data[0].message)
                        } else {
                            await Bot[botId]?.pickGroup(groupId).sendMsg([segment.at(userId), data[0].message])
                        }
                        return true;
                    }
                    else if (!groupId) {
                        await Bot[botId]?.pickUser(userId).sendMsg(await Bot.makeForwardMsg([{ message: `用户 ${userId}` }, ...data]))
                    }
                    else {
                        await Bot[botId]?.pickGroup(groupId).sendMsg(segment.at(userId))
                        await Bot[botId]?.pickGroup(groupId).sendMsg(await Bot.makeForwardMsg([{ message: `用户 ${userId}` }, ...data]))
                    }
                }
                return true;
            })
        ));
    }
}