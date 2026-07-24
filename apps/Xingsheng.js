import plugin from '../../../lib/plugins/plugin.js';
import Waves from "../components/Code.js";
import Render from '../components/Render.js';
import sharp from 'sharp';

export class ResourceReport extends plugin {
    constructor() {
        super({
            name: "鸣潮-资源简报",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)\\s*(\\d+\\.\\d+版本)?\\s*(\\d{1,2}月)?\\s*(资源?简报|星声)\\s*$",
                    fnc: "resourceReport"
                }
            ]
        });
    }

    async getAvatarUrl(e) {
        try {
            if (e.isGroup) {
                return await e.group.pickMember(e.user_id).getAvatarUrl();
            }
            return await e.friend.getAvatarUrl();
        } catch {
            return 'https://prod-alicdn-community.kurobbs.com/newHead/offical/mingchao.png';
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

    async concatImagesVertical(buffers) {
        if (buffers.length === 0) return null;
        if (buffers.length === 1) {
            return { type: 'image', file: `base64://${buffers[0].toString('base64')}` };
        }

        const metadatas = await Promise.all(
            buffers.map(buf => sharp(buf).metadata())
        );

        const maxWidth = Math.round(Math.max(...metadatas.map(m => m.width || 0)));
        const totalHeight = Math.round(metadatas.reduce((sum, m) => sum + (m.height || 0), 0));

        const composites = [];
        let yOffset = 0;
        for (let i = 0; i < buffers.length; i++) {
            composites.push({
                input: buffers[i],
                left: 0,
                top: Math.round(yOffset)
            });
            yOffset += metadatas[i].height || 0;
        }

        const result = await sharp({
            create: {
                width: maxWidth,
                height: totalHeight,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
            .composite(composites)
            .png()
            .toBuffer();

        return { type: 'image', file: `base64://${result.toString('base64')}` };
    }

    async resourceReport(e) {
        const originalUserId = e.user_id;

        const match = e.msg.match(this.rule[0].reg);
        let periodType = 'version';
        let periodIndexStr = '';

        if (match[1]) {
            periodType = 'version';
            periodIndexStr = match[1].replace('版本', '');
        } else if (match[2]) {
            periodType = 'month';
            periodIndexStr = match[2].replace('月', '');
        }

        const waves = new Waves();
        const accounts = await waves.getValidAccount(e, '' , true);
        if (!accounts) return true;

        let avatarUrl = await this.getAvatarUrl(e);

        const periodTypeNames = { 'week': '周', 'month': '月', 'version': '版本' };

        const processAccount = async (acc) => {
            const { uid, serverId, token, did } = acc;
            try {
                const baseData = await waves.getBaseData(serverId, uid, token, did);
                let gameNickName = `用户${uid}`;
                if (baseData?.status && baseData.data?.name) {
                    gameNickName = baseData.data.name;
                }

                const periodsData = await waves.getResourcePeriods(
                    serverId,
                    uid,
                    token,
                    did
                );

                if (!periodsData.status) {
                    return { uid, message: `账号 ${uid} 获取周期数据失败：${periodsData.msg}`, isError: true };
                }

                const periods = periodsData.data;
                let finalPeriodIndex = '';
                let periodTitle = '';

                if (periodType === 'version') {
                    const versionItem = periods.versions.find(v =>
                        v.title.replace('版本', '').includes(periodIndexStr)
                    );

                    if (versionItem) {
                        finalPeriodIndex = versionItem.index;
                        periodTitle = versionItem.title;
                    } else if (periodIndexStr) {
                        return { uid, message: `账号 ${uid}: 未找到版本 ${periodIndexStr} 的数据`, isError: true };
                    } else {
                        finalPeriodIndex = periods.versions[0].index;
                        periodTitle = periods.versions[0].title;
                    }
                } else if (periodType === 'month') {
                    const monthItem = periods.months.find(m =>
                        m.title.includes(`${periodIndexStr}月`)
                    );

                    if (monthItem) {
                        finalPeriodIndex = monthItem.index;
                        periodTitle = monthItem.title;
                    } else if (periodIndexStr) {
                        return { uid, message: `账号 ${uid}: 未找到 ${periodIndexStr}月 的数据`, isError: true };
                    } else {
                        finalPeriodIndex = periods.months[periods.months.length - 1].index;
                        periodTitle = periods.months[periods.months.length - 1].title;
                    }
                }

                const reportData = await waves.getResourceReport(
                    serverId,
                    uid,
                    token,
                    did,
                    periodType,
                    finalPeriodIndex
                );

                if (!reportData.status) {
                    return { uid, message: `账号 ${uid} 获取报告失败：${reportData.msg}`, isError: true };
                }

                const starDetails = reportData.data.starList.map(item => ({
                    type: item.type,
                    value: item.num,
                    percentage: reportData.data.totalStar > 0 ?
                        Math.round((item.num / reportData.data.totalStar) * 100) : 0
                })).filter(item => item.value > 0);

                const coinDetails = reportData.data.coinList.map(item => ({
                    type: item.type,
                    value: item.num,
                    percentage: reportData.data.totalCoin > 0 ?
                        Math.round((item.num / reportData.data.totalCoin) * 100) : 0
                })).filter(item => item.value > 0);

                const imageCard = await Render.render('Template/xingsheng/xingsheng', {
                    qq: originalUserId,
                    baseInfo: {
                        nickName: gameNickName,
                        roleId: uid,
                        avatar: avatarUrl
                    },
                    periodType: periodType,
                    periodTitle: periodTitle,
                    periodNames: periodTypeNames,
                    reportData: {
                        totalStar: reportData.data.totalStar,
                        totalCoin: reportData.data.totalCoin,
                        starList: reportData.data.starList,
                        coinList: reportData.data.coinList,
                        itemList: reportData.data.itemList || []
                    },
                    colors: [
                        { color: '#FF6384' },
                        { color: '#36A2EB' },
                        { color: '#FFCE56' },
                        { color: '#4BC0C0' },
                        { color: '#9966FF' },
                        { color: '#FF9F40' }
                    ],
                    starDetails,
                    coinDetails,
                    copywriting: reportData.data.copyWriting || '',
                    currentTime: new Date().toLocaleString()
                }, { e, retType: 'base64' });

                return { uid, message: imageCard, isError: false };
            } catch (error) {
                logger.error(`处理账号 ${uid} 时出错:`, error);
                return { uid, message: `账号 ${uid} 处理过程中出现错误`, isError: true };
            }
        };

        let errorMessages = [];
        let imageBuffers = [];
        let rawImageCards = [];

        for (const acc of accounts) {
            const result = await processAccount(acc);
            if (result.isError) {
                errorMessages.push(result.message);
            } else {
                rawImageCards.push(result.message);

                const buf = this.extractImageBuffer(result.message);
                if (buf) {
                    const isPng = buf[0] === 0x89 && buf[1] === 0x50;
                    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
                    const isWebp = buf[0] === 0x52 && buf[1] === 0x49;
                    if (isPng || isJpeg || isWebp) {
                        imageBuffers.push(buf);
                    } else {
                        logger.mark(logger.blue('[WAVES PLUGIN]'), logger.red(
                            `账号 ${result.uid} 图片 magic bytes 无效: ${buf[0]?.toString(16)} ${buf[1]?.toString(16)}, 长度: ${buf.length}`
                        ));
                    }
                } else {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.red(`账号 ${result.uid} 图片 Buffer 提取失败`));
                }
            }
        }

        if (rawImageCards.length === 0) {
            const msg = errorMessages.length > 0
                ? errorMessages.join('\n\n')
                : '所有账号数据获取失败';
            return await e.reply(msg);
        }

        if (errorMessages.length > 0) {
            await e.reply(errorMessages.join('\n\n'));
        }

        let finalImage = null;
        if (imageBuffers.length > 1) {
            try {
                finalImage = await this.concatImagesVertical(imageBuffers);
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
}
