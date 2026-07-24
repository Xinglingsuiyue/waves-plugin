import plugin from '../../../lib/plugins/plugin.js'
import WeightCalculator from '../utils/Calculate.js'
import { pluginResources } from '../model/path.js';
import Waves from "../components/Code.js";
import Config from '../components/Config.js';
import Wiki from '../components/Wiki.js';
import Render from '../components/Render.js';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import RankUtil from '../utils/RankUtil.js';
import Zhinengshanghai from '../utils/Zhinengshanghai.js';
import { CharacterRanking } from './Paiming.js';
import { WAVERIDER_ATTRIBUTES } from '../utils/damage/waveriderMap.js';

export class Character extends plugin {
    constructor() {
        super({
            name: "鸣潮-角色面板",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)(.*)面板(\\d{9})?$",
                    fnc: "character"
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

    async character(e) {
        const waves = new Waves();
        const [, message, roleId] = e.msg.match(this.rule[0].reg);

        if (e.at) e.user_id = e.at;

        const accounts = await waves.getValidAccount(e, roleId);
        if (!accounts) return;

        if (!message) return await e.reply('请输入正确的命令格式，如：[~安可面板]');

        const wiki = new Wiki();
        let name = await wiki.getAlias(message);

        if (name.includes('漂泊者')) {
            name = '漂泊者';
        }

        const errorMessages = [];
        const imageBuffers = [];
        const rawImageCards = [];
        const imgListSet = new Set();

        for (const acc of accounts) {
            const { uid, serverId, token, did, isPublicCookie } = acc;

            const roleData = await waves.getRoleData(serverId, uid, token, did);

            if (!roleData.status) {
                errorMessages.push(`UID ${uid}: ${roleData.msg}`);
                continue;
            }

            const rolePicDir = path.join(pluginResources, 'rolePic', name);

            const char = roleData.data.roleList.find(role => role.roleName === name);
            if (!char) {
                errorMessages.push(`UID: ${uid} 还未拥有共鸣者 ${name}`);
                continue;
            }

            const roleDetail = await waves.getRoleDetail(serverId, uid, char.roleId, token, did);
            if (!roleDetail.status) {
                errorMessages.push(`UID ${uid}: ${roleDetail.msg}`);
                continue;
            }

            if (!roleDetail.data.role) {
                const showroleList = roleData.data.showRoleIdList.map(roleId => {
                    const role = roleData.data.roleList.find(r => r.roleId === roleId || r.mapRoleId === roleId);
                    if (role && role.roleName === '漂泊者') {
                        const attribute = WAVERIDER_ATTRIBUTES[role.roleId] || '';
                        return `漂泊者${attribute}`;
                    }
                    return role ? role.roleName : null;
                }).filter(Boolean);

                errorMessages.push(`UID: ${uid} 未在库街区展示此角色，请在库街区展示角色\n\n当前展示角色有：\n${showroleList.join('、')}\n\n使用[~登录]登录该账号后即可查看所有角色`);
                continue;
            }

            let webpFiles = [];
            try {
                webpFiles = fs.readdirSync(rolePicDir).filter(file => file.toLowerCase().endsWith('.webp'));
            } catch {}

            const rolePicUrl = webpFiles.length > 0
                ? `file://${rolePicDir}/${webpFiles[Math.floor(Math.random() * webpFiles.length)]}`
                : roleDetail.data.role.rolePicUrl;

            imgListSet.add(rolePicUrl);

            const rawRoleDetailData = JSON.parse(JSON.stringify(roleDetail.data));

            // 角色面板评分
            const calculated = new WeightCalculator(roleDetail.data).calculate();
            roleDetail.data = calculated;

            const damageResult = await Zhinengshanghai.calc(rawRoleDetailData, {
                enemyName: '无妄者',
                enemyLevel: 90,
                resistance: 0.1,
                ignoreDefense: 0
            });

            const phantomScore = calculated?.phantomData?.statistic?.totalScore || 0;
            if (phantomScore > 0) {
                const groupId = e.isGroup ? e.group_id : 'private';

                const leaderboardName = (name === '漂泊者' && char.roleId in WAVERIDER_ATTRIBUTES)
                    ? `漂泊者${WAVERIDER_ATTRIBUTES[char.roleId]}`
                    : name;

                const charInfo = {
                    roleIcon: char.roleIconUrl,
                    roleName: leaderboardName,
                    level: calculated.level,
                    chainCount: calculated.chainList
                        ? calculated.chainList.filter(chain => chain.unlocked).length
                        : 0,
                    weapon: {
                        name: calculated.weaponData?.weapon?.weaponName || "未知",
                        level: calculated.weaponData?.level || 0,
                        rank: calculated.weaponData?.rank || 0,
                        resonLevel: calculated.weaponData?.resonLevel || 0,
                        icon: calculated.weaponData?.weapon?.weaponIcon || ""
                    },
                    phantom: {
                        rank: calculated.phantomData?.statistic?.rank || "N",
                        color: calculated.phantomData?.statistic?.color || "#a0a0a0",
                        icon: calculated.phantomData?.equipPhantomList?.[0]?.phantomProp?.iconUrl || ""
                    }
                };

                const promises = [];

                // 群排名
                let groupStrictMode = false;
                if (e.isGroup) {
                    const groupEnabled = await CharacterRanking.isGroupRankingEnabled(groupId);
                    const allowPublic = await CharacterRanking.isAllowPublicCookie(groupId, 'group');
                    groupStrictMode = !allowPublic;
                    if (groupEnabled && (allowPublic || !isPublicCookie)) {
                        promises.push(RankUtil.updateRankData(leaderboardName, uid, phantomScore, groupId, charInfo));
                    }
                }

                // 总排名
                const globalEnabled = await CharacterRanking.isGlobalRankingEnabled();
                const allowPublicGlobal = await CharacterRanking.isAllowPublicCookie('global', 'global');
                const allowGlobalPublic = allowPublicGlobal && !groupStrictMode;
                if (globalEnabled && (allowGlobalPublic || !isPublicCookie)) {
                    promises.push(RankUtil.updateRankData(leaderboardName, uid, phantomScore, 'global', charInfo));
                }

                if (promises.length > 0) {
                    await Promise.all(promises);
                }
            }

            const imageCard = await Render.render('Template/charProfile/charProfile', {
                data: { uid, rolePicUrl, roleDetail, damageResult },
            }, { e, retType: 'base64' });

            // 保存原始结果用于回退
            rawImageCards.push(imageCard);

            // 提取图片 Buffer
            const buf = this.extractImageBuffer(imageCard);
            if (buf) {
                // 验证 magic bytes
                const isPng = buf[0] === 0x89 && buf[1] === 0x50;
                const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8;
                const isWebp = buf[0] === 0x52 && buf[1] === 0x49;
                if (isPng || isJpeg || isWebp) {
                    imageBuffers.push(buf);
                } else {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.red(
                        `UID ${uid} 图片 magic bytes 无效: ${buf[0]?.toString(16)} ${buf[1]?.toString(16)}, 长度: ${buf.length}`
                    ));
                }
            } else {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.red(`UID ${uid} 图片 Buffer 提取失败`));
            }
        }

        // 没有任何成功结果
        if (rawImageCards.length === 0) {
            const msg = errorMessages.length > 0
                ? errorMessages.join('\n\n')
                : '无法获取角色数据，请确保角色已展示在库街区';
            return await e.reply(msg);
        }

        // 先发送失败账号的错误信息（如果有的话）
        if (errorMessages.length > 0) {
            await e.reply(errorMessages.join('\n\n'));
        }

        // 尝试横向拼接
        let finalImage = null;
        if (imageBuffers.length > 1) {
            try {
                finalImage = await this.concatImagesHorizontal(imageBuffers);
            } catch (err) {
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.red(`图片拼接失败: ${err.message}`));
            }
        }

        // 拼接失败或只有一张时，直接发送原始结果
        if (!finalImage) {
            if (rawImageCards.length === 1) {
                finalImage = rawImageCards[0];
            } else {
                // 多张但拼接失败，逐张发送
                for (const card of rawImageCards) {
                    await e.reply(card);
                }
                return true;
            }
        }

        const msgRes = await e.reply(finalImage);
        const message_id = Array.isArray(msgRes?.message_id)
            ? msgRes.message_id
            : [msgRes?.message_id].filter(Boolean);

        for (const id of message_id) {
            await redis.set(
                `Yunzai:waves:originpic:${id}`,
                JSON.stringify({ type: 'profile', img: [...imgListSet] }),
                { EX: 3600 * 3 }
            );
        }

        return true;
    }
}
