import plugin from '../../../lib/plugins/plugin.js';
import Render from '../components/Render.js';
import moment from 'moment';

export class Shock extends plugin {
    constructor() {
        super({
            name: "声骇词条模拟器",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^～今日（梭哈|梭哈|suoha|嗦哈|shuoha）$",
                    fnc: "shockSimulate"
                }
            ]
        });
    }

    async shockSimulate(e) {
        try {
            // 检查用户当日使用次数
            const userID = e.user_id;
            const dateKey = moment().format('YYYYMMDD');
            const redisKey = `Shock:${userID}:${dateKey}`;
            
            // 获取当前使用次数
            let count = await redis.get(redisKey) || 0;
            count = parseInt(count);
            
            // 达到20次则拒绝
            if (count >= 20) {
                await e.reply(`今日梭哈次数已达上限（20/20），请明天再来！`);
                return true;
            }
            
            // 获取用户昵称
            const nickname = await this.getUserNickname(e);
            
            // 模拟抽取5个不重复词条
            const attributes = this.generateAttributes();
            
            // 渲染并发送图片
            await Render.render('Template/Shock/shock', {
                attributes,
                date: new Date().toLocaleDateString(),
                nickname,
                count: count + 1,
                randomHint: this.getRandomHint()
            }, {
                e, 
                retType: 'image',
                scale: 1.2
            });
            
            // 更新使用次数（设置24小时过期）
            await redis.incr(redisKey);
            if (count === 0) {
                const expireTime = this.calculateMidnightExpire();
                await redis.expire(redisKey, expireTime);
            }
            
            return true;
        } catch (err) {
            logger.error('[声骇模拟器异常]', err);
            await e.reply('声骇模拟过程中发生错误，请查看日志');
            return false;
        }
    }

    // 获取用户昵称
    async getUserNickname(e) {
        try {
            let nickname;
            if (e.isGroup) {
                // 群聊中获取群昵称或卡片
                const member = await e.group.getMemberInfo(e.user_id);
                nickname = member.card || member.nickname || `用户${e.user_id}`;
            } else {
                // 私聊中获取好友昵称
                const friend = await e.friend.getInfo();
                nickname = friend.nickname || `用户${e.user_id}`;
            }
            return nickname;
        } catch {
            return `用户${e.user_id}`;
        }
    }

    // 获取随机运势提示
    getRandomHint() {
        const hints = [
            "声骇共鸣，运势如虹！",
            "今日欧气满满，宜强化！",
            "高频共振，好运连连！",
            "能量满溢，心想事成！",
            "共鸣之力，助你横扫深渊！",
            "异感波动，好运降临！",
            "声骸之力，无往不利！",
            "今日手气爆棚，再来一发！",
            "共鸣频率完美，大吉大利！",
            "异感能量充沛，好运当头！"
        ];
        return hints[Math.floor(Math.random() * hints.length)];
    }

    generateAttributes() {
        // 定义所有可能的词条和数值
        const allAttributes = [
            { name: "暴击率", values: [10.5, 9.9, 9.3, 8.7, 8.4, 8.1, 7.5, 6.9, 6.3] },
            { name: "暴击伤害", values: [21.0, 19.8, 18.6, 17.4, 16.2, 15.0, 13.8, 12.6] },
            { name: "百分比攻击", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "百分比生命", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "普攻伤害加成", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "重击伤害加成", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "共鸣技能伤害加成", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "共鸣解放伤害加成", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "百分比防御", values: [14.7, 13.8, 12.8, 11.8, 10.9, 10.0, 9.0, 8.1] },
            { name: "共鸣效率", values: [12.4, 11.6, 10.8, 10.0, 9.2, 8.4, 7.6, 6.8] },
            { name: "固定生命", values: [580, 540, 510, 470, 430, 390, 360, 320] },
            { name: "固定攻击", values: [60, 50, 40] },
            { name: "固定防御", values: [60, 50, 40] }
        ];

        // 随机抽取5个不重复词条
        const result = [];
        const usedIndices = new Set();
        
        while (result.length < 5) {
            const attrIndex = Math.floor(Math.random() * allAttributes.length);
            
            if (!usedIndices.has(attrIndex)) {
                usedIndices.add(attrIndex);
                
                const attribute = allAttributes[attrIndex];
                const valueIndex = Math.floor(Math.random() * attribute.values.length);
                const value = attribute.values[valueIndex];
                
                // 确定数值显示格式（整数或带小数点）
                const displayValue = Number.isInteger(value) ? value : value.toFixed(1);
                
                result.push({
                    name: attribute.name,
                    value: displayValue,
                    unit: this.getAttributeUnit(attribute.name)
                });
            }
        }
        
        return result;
    }

    getAttributeUnit(name) {
        if (name.includes("固定")) return "";
        if (name === "共鸣效率") return "";
        return "%";
    }
}