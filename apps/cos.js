import plugin from '../../../lib/plugins/plugin.js'
import Waves from "../components/Code.js";
import { segment } from 'oicq';

export class Cosplay extends plugin {
    constructor() {
        super({
            name: "鸣潮-Cosplay推送",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(～|~|鸣潮)(cos|cosplay)$",
                    fnc: "randomCos",
                    coolDown: 30000,
                    permission: "everyone"
                },
                {
                    reg: "^(～|~|鸣潮)(cos|cosplay)(\\d+)$",
                    fnc: "specifiedPageCos",
                    coolDown: 30000,
                    permission: "everyone"
                },
                {
                    reg: "^(～|~)cos清空$",
                    fnc: "clearHistory",
                    permission: "master"
                }
            ]
        });
        this.waves = new Waves();
    }

    async randomCos(e) {
        try {
            const randomPage = Math.floor(Math.random() * 10) + 1;
            const posts = await this.waves.getCosplayList(20, randomPage);
            
            if (!posts?.length) {
                await e.reply('暂无可用Cosplay内容，请稍后再试');
                return true;
            }

            const validPosts = posts.filter(post => post.imgContent?.length > 0);
            if (!validPosts.length) {
                await e.reply('暂无Cosplay图片内容，请稍后再试');
                return true;
            }

            const post = validPosts[Math.floor(Math.random() * validPosts.length)];
            await this.sendCosMessage(e, post);
            
        } catch (err) {
            logger.error('[COS] 处理失败:', err);
            await e.reply('获取内容失败，请稍后重试');
        }
        return true;
    }

    async specifiedPageCos(e) {
        try {
            const pageIndex = parseInt(e.msg.match(/(\d+)$/)[1]);
            const posts = await this.waves.getCosplayList(20, pageIndex);
            
            if (!posts?.length) {
                await e.reply(`第${pageIndex}页暂无可用Cosplay内容`);
                return true;
            }

            const validPosts = posts.filter(post => post.imgContent?.length > 0);
            if (!validPosts.length) {
                await e.reply(`第${pageIndex}页暂无Cosplay图片内容`);
                return true;
            }

            const post = validPosts[Math.floor(Math.random() * validPosts.length)];
            await this.sendCosMessage(e, post);
            
        } catch (err) {
            logger.error('[COS] 处理指定页数失败:', err);
            await e.reply('获取内容失败，请稍后重试');
        }
        return true;
    }

    async sendCosMessage(e, post) {
        try {
            const messages = await this.buildMessages(post);
            
            if (messages.length > 1) {
                await this.sendSafeForwardMsg(e, messages);
            } else if (messages.length === 1) {
                await e.reply(messages[0]);
            }
            
            if (post.postId) {
                this.waves.markPostAsSent(post.postId);
            }
            
        } catch (error) {
            logger.error('[COS] 发送消息失败:', error);
            await this.sendFallbackMessage(e, post);
        }
    }

    async buildMessages(post) {
        try {
            const detail = post;
            const messages = [];
            
            let createTime = '最近';
            if (detail.createTimestamp) {
                try {
                    const timestamp = typeof detail.createTimestamp === 'string' 
                        ? parseInt(detail.createTimestamp) 
                        : detail.createTimestamp;
                    createTime = new Date(timestamp).toLocaleString('zh-CN');
                } catch (timeError) {}
            }
            
            const headerMessage = [
                `✨【${detail.postTitle || 'Cosplay分享'}】✨`,
                `👤 作者：${detail.userName || '未知'}`,
                `📅 ${createTime}`,
                `❤️ ${detail.likeCount || 0} 👍 ${detail.commentCount || 0} 👀 ${detail.browseCount || 0}`
            ];
            
            if (detail.topicList?.length) {
                headerMessage.push(`🏷️ 标签：${detail.topicList.map(t => t.topicName).join(' ')}`);
            }
            
            messages.push({
                nickname: '鸣潮Cos推送',
                user_id: Bot.uin,
                message: headerMessage.join('\n')
            });
            
            if (detail.imgContent?.length) {
                for (const img of detail.imgContent.slice(0, 6)) {
                    if (img.url) {
                        messages.push({
                            nickname: detail.userName || '分享者',
                            user_id: Bot.uin,
                            message: segment.image(img.url)
                        });
                    }
                }
            }
            
            if (detail.postId) {
                messages.push({
                    nickname: '详情',
                    user_id: Bot.uin,
                    message: `📎 帖子链接：https://www.kurobbs.com/mc/post/${detail.postId}`
                });
            }
            
            return messages;
            
        } catch (error) {
            logger.error('[COS] 构建消息失败:', error);
            return [{
                nickname: '鸣潮Cos推送',
                user_id: Bot.uin,
                message: '暂时无法获取内容详情'
            }];
        }
    }

    async sendSafeForwardMsg(e, messages) {
        try {
            await e.reply(await Bot.makeForwardMsg(messages));
        } catch (error) {
            for (const msg of messages) {
                try {
                    if (msg.message) {
                        await e.reply(msg.message);
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                } catch (singleError) {
                    continue;
                }
            }
        }
    }

    async sendFallbackMessage(e, post) {
        try {
            const fallbackMsg = await this.buildFallbackMessage(post);
            await e.reply(fallbackMsg);
        } catch (error) {
            await e.reply('内容发送失败，可能是网络问题，请稍后重试');
        }
    }

    async buildFallbackMessage(post) {
        try {
            const detail = post;
            const messageParts = [];
            
            messageParts.push(`【${detail.postTitle || 'Cosplay分享'}】`);
            messageParts.push(`作者：${detail.userName || '未知'}`);
            
            let createTime = '最近';
            if (detail.createTimestamp) {
                try {
                    const timestamp = typeof detail.createTimestamp === 'string' 
                        ? parseInt(detail.createTimestamp) 
                        : detail.createTimestamp;
                    createTime = new Date(timestamp).toLocaleString('zh-CN');
                } catch (error) {}
            }
            messageParts.push(`时间：${createTime}`);
            messageParts.push(`互动：❤️${detail.likeCount || 0} 👍${detail.commentCount || 0} 👀${detail.browseCount || 0}`);
            
            if (detail.topicList?.length) {
                messageParts.push(`标签：${detail.topicList.map(t => t.topicName).join(' ')}`);
            }
            
            if (detail.postId) {
                messageParts.push(`链接：https://www.kurobbs.com/mc/post/${detail.postId}`);
            }
            
            return messageParts.join('\n');
            
        } catch (error) {
            return '内容获取失败，请稍后重试';
        }
    }

    async clearHistory(e) {
        this.waves.clearSentHistory();
        await e.reply('Cosplay发送记录已清空');
        return true;
    }
}

export default Cosplay;