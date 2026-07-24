import plugin from '../../../lib/plugins/plugin.js';
import Waves from "../components/Code.js";
import Config from "../components/Config.js";
import Render from '../components/Render.js';
import sharp from 'sharp';

export class Slash extends plugin {
    constructor() {
        super({
            name: "鸣潮-冥歌海墟",
            dsc: "鸣潮-冥歌海墟查询",
            event: "message",
            priority: 1009,
            rule: [{
                reg: '^(?:～|~|鸣潮)[\\s]*?(冥歌海墟|新深渊|(?:再生)?海域|冥歌|海墟|冥海|破船|禁忌海域|(?:再生海域-?)?海隙|(?:再生海域-?)?湍渊|(?:再生海域-?)?无尽)(\\d{9})?$',
                fnc: 'slash'
            }]
        });
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

    async slash(e) {
        if (e.at) e.user_id = e.at;
        const waves = new Waves();

        let [, type, roleId] = e.msg.match(this.rule[0].reg);

        if (roleId) {
            let publicCookie = await waves.pubCookie();
            if (!publicCookie) {
                return await e.reply('当前没有可用的公共Cookie，无法查询指定UID');
            }
            
            const usability = await waves.isAvailable(publicCookie.serverId, roleId, publicCookie.token);
            if (!usability) {
                return await e.reply(`账号 ${roleId} 不可用或Token已失效`);
            }

            publicCookie.roleId = roleId;
            return await this.processData(e, waves, type, publicCookie, roleId, true);
        }

        let accountList = JSON.parse(await redis.get(`Yunzai:waves:users:${e.user_id}`)) || await Config.getUserData(e.user_id);
        
        if (!accountList.length) {
            const bindUid = await redis.get(`Yunzai:waves:bind:${e.user_id}`);
            if (bindUid) {
                let publicCookie = await waves.pubCookie();
                if (!publicCookie) {
                    return await e.reply('当前没有可用的公共Cookie，请使用[~登录]进行登录');
                }
                
                const usability = await waves.isAvailable(publicCookie.serverId, bindUid, publicCookie.token);
                if (!usability) {
                    return await e.reply(`绑定的账号 ${bindUid} 不可用或Token已失效`);
                }

                publicCookie.roleId = bindUid;
                return await this.processData(e, waves, type, publicCookie, bindUid, true);
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

            try {
                const [baseData, slashData] = await Promise.all([
                    waves.getBaseData(account.serverId, account.roleId, account.token),
                    waves.getHaiXuData(account.serverId, account.roleId, account.token, account.did, account.userId)
                ]);

                if (!baseData?.status || !slashData?.status) {
                    const errorMsg = baseData?.msg || slashData?.msg || '获取数据失败';
                    errorMessages.push(`账号 ${account.roleId} ${errorMsg}`);
                    continue;
                }

                if (!slashData.data || !slashData.data.difficultyList || 
                    !Array.isArray(slashData.data.difficultyList) || 
                    slashData.data.difficultyList.length === 0) {
                    errorMessages.push(`账号 ${account.roleId} 没有可用的海墟数据`);
                    continue;
                }

                if (slashData.data.isUnlock === false) {
                    errorMessages.push(`账号 ${account.roleId} 尚未解锁冥歌海墟`);
                    continue;
                }

                const renderData = await this.formatData(slashData.data, baseData.data, type, e, false);
                if (!renderData) {
                    errorMessages.push(`账号 ${account.roleId} 数据格式化失败`);
                    continue;
                }

                const image = await Render.render('Template/slash/slash', renderData, {
                    e, 
                    retType: 'base64',
                    copyright: `数据来源: 库街区 · 生成时间: ${new Date().toLocaleString()}`
                });

                rawImageCards.push(image);
                const buf = this.extractImageBuffer(image);
                if (buf) {
                    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
                    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
                    const isWebp = buf[0] === 0x52 && buf[1] === 0x49;
                    if (isPng || isJpeg || isWebp) imageBuffers.push(buf);
                }
            } catch (err) {
                logger.error('[冥歌海墟查询异常]', err);
                errorMessages.push(`账号 ${account.roleId} 查询异常: ${err.message || '未知错误'}`);
            }
        }

        if (deleteroleId.length) {
            let newAccountList = accountList.filter(account => !deleteroleId.includes(account.roleId));
            Config.setUserData(e.user_id, newAccountList);
        }

        if (rawImageCards.length === 0) {
            const msg = errorMessages.length > 0
                ? errorMessages.join('\n\n')
                : '没有获取到有效的冥歌海墟数据';
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
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.red(`海墟图片拼接失败: ${err.message}`));
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

    async processData(e, waves, type, cookie, uid, isOther) {
        const [baseData, slashData] = await Promise.all([
            waves.getBaseData(cookie.serverId, uid, cookie.token),
            isOther 
                ? waves.getHaiXuDataForOther(cookie.serverId, uid, cookie.token, cookie.did, cookie.userId)
                : waves.getHaiXuData(cookie.serverId, uid, cookie.token, cookie.did, cookie.userId)
        ]);

        if (!baseData.status || !slashData.status) {
            return await e.reply(baseData.msg || slashData.msg);
        }

        if (!slashData.data || !slashData.data.difficultyList || 
            !Array.isArray(slashData.data.difficultyList) || 
            slashData.data.difficultyList.length === 0) {
            return await e.reply(`账号 ${uid} 没有可用的海墟数据`);
        }

        if (slashData.data.isUnlock === false) {
            return await e.reply(`账号 ${uid} 尚未解锁冥歌海墟`);
        }

        const renderData = await this.formatData(slashData.data, baseData.data, type, e, isOther);
        if (!renderData) {
            return await e.reply(`账号 ${uid} 数据格式化失败`);
        }

        const image = await Render.render('Template/slash/slash', renderData, {
            e, 
            retType: 'base64',
            copyright: `数据来源: 库街区 · 生成时间: ${new Date().toLocaleString()}`
        });

        return await e.reply(image);
    }

    async formatData(slashData, baseData, type, e, isOther) {
        try {
            if (!slashData?.difficultyList || !baseData?.name || !baseData?.id) {
                logger.error('[数据格式错误]', { slashData, baseData });
                return null;
            }

            const userInfo = {
                name: baseData.name,
                uid: baseData.id,
                avatar: await this.getAvatarUrl(e)
            };

            const difficultyNames = {
                0: '禁忌海域',
                1: '再生海域-海隙',
                2: '再生海域-湍渊'
            };

            const list = slashData.difficultyList.map(diff => {
                if (!diff.challengeList) return [];
                
                diff.difficultyName = difficultyNames[diff.difficulty] || `难度${diff.difficulty}`;
                const perMaxScore = Math.floor(diff.maxScore / diff.challengeList.length);
                
                return diff.challengeList.map(challenge => ({
                    ...challenge,
                    maxScore: perMaxScore,
                    difficulty: diff.difficulty,
                    difficultyName: diff.difficultyName,
                    detailPageBG: diff.detailPageBG || '',
                    homePageBG: diff.homePageBG || '',
                    teamIcon: diff.teamIcon || ''
                }));
            }).flat();

            const challengeList = this.getPickList(type, list.flat());

            let leftTime = '未知';
            if (slashData.seasonEndTime) {
                const timeSeconds = slashData.seasonEndTime / 1000;
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

            const allScore = challengeList.reduce((acc, item) => acc + (item.score || 0), 0);
            const maxScore = challengeList.reduce((acc, item) => acc + (item.maxScore || 0), 0);

            return { 
                userInfo, 
                challengeList: challengeList || [], 
                leftTime, 
                allScore, 
                maxScore 
            };
        } catch (err) {
            logger.error('[格式化数据异常]', err);
            return null;
        }
    }

    getPickList(type, challengeList) {
        if (!challengeList?.length) return [];
        
        switch (type) {
            case '禁忌海域':
                return challengeList
                    .filter(item => item.difficulty === 0)
                    .sort((a, b) => (a.challengeId || 0) - (b.challengeId || 0));
            case '海隙':
            case '再生海域海隙':
            case '再生海域-海隙':
                return challengeList
                    .filter(item => item.difficulty === 1)
                    .sort((a, b) => (a.challengeId || 0) - (b.challengeId || 0));
            case '湍渊':
            case '无尽':
            case '再生海域湍渊':
            case '再生海域无尽':
            case '再生海域-湍渊':
            case '再生海域-无尽':
                return challengeList
                    .filter(item => item.difficulty === 2)
                    .sort((a, b) => (a.challengeId || 0) - (b.challengeId || 0));
            case '海域':
            case '再生海域':
                return challengeList
                    .filter(item => item.difficulty !== 0)
                    .sort((a, b) => (a.challengeId || 0) - (b.challengeId || 0));
            default:
                return challengeList
                    .sort((a, b) => (b.challengeId || 0) - (a.challengeId || 0))
                    .slice(0, 4);
        }
    }

    async getAvatarUrl(e) {
        try {
            if (e.isGroup) {
                return await e.group.pickMember(e.user_id).getAvatarUrl();
            }
            return await e.friend.getAvatarUrl();
        } catch {
            return '';
        }
    }
}
