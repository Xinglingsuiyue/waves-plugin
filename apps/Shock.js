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
                    reg: "^(～|~|鸣潮)(梭哈|梭哈|suoha|嗦哈|shuoha)$",
                    fnc: "shockSimulate"
                }
            ]
        });
    }

    async shockSimulate(e) {
        try {
            const userID = e.user_id;
            const dateKey = moment().format('YYYYMMDD');
            const redisKey = `Shock:${userID}:${dateKey}`;
            
            let count = parseInt(await redis.get(redisKey) || 0);
            if (count >= 20) {
                await e.reply(`今日梭哈次数已达上限（20/20），请明天再来！`);
                return true;
            }
            
            // 获取用户信息
            let nickName = `用户${userID}`;
            try {
                if (e.isGroup) {
                    const memberInfo = await e.group.getMemberMap();
                    const member = memberInfo.get(userID);
                    nickName = member?.card || member?.nickname || nickName;
                } else {
                    const friendInfo = await Bot.getFriendInfo(userID);
                    nickName = friendInfo?.nickname || nickName;
                }
            } catch (err) {
                logger.error('获取用户信息失败：', err);
            }
            
            // 生成属性
            const attributes = await this.generateAttributes();
            
            await Render.render('Template/Shock/shock', {
                attributes,
                date: new Date().toLocaleDateString(),
                count: count + 1,
                randomHint: this.getRandomHint(),
                qq: userID,
                baseInfo: {
                    nickName: nickName
                }
            }, {
                e, 
                retType: 'image',
                scale: 1.2
            });
            
            // 原子操作：增加计数并设置过期时间
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
        const allAttributes = [
            { name: "暴击率", values: [10.5, 9.9, 9.3, 8.7, 8.4, 8.1, 7.5, 6.9, 6.3] },
            { name: "暴击伤害", values: [21.0, 19.8, 18.6, 17.4, 16.2, 15.0, 13.8, 12.6] },
            { name: "攻击", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "生命", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "普攻伤害加成", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "重击伤害加成", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "共鸣技能伤害加成", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "共鸣解放伤害加成", values: [11.6, 10.9, 10.1, 9.4, 8.6, 7.9, 7.1, 6.4] },
            { name: "防御", values: [14.7, 13.8, 12.8, 11.8, 10.9, 10.0, 9.0, 8.1] },
            { name: "共鸣效率", values: [12.4, 11.6, 10.8, 10.0, 9.2, 8.4, 7.6, 6.8] },
            { name: "生命", values: [580, 540, 510, 470, 430, 390, 360, 320] },
            { name: "攻击", values: [60, 50, 40] },
            { name: "防御", values: [60, 50, 40] }
        ];

        // Fisher-Yates洗牌算法选取5个属性
        const shuffled = [...allAttributes];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        return shuffled.slice(0, 5).map(attr => {
            const value = attr.values[Math.floor(Math.random() * attr.values.length)];
            return {
                name: attr.name,
                value: Number.isInteger(value) ? value : value.toFixed(1),
                unit: this.getAttributeUnit(attr.name)
            };
        });
    }

    getAttributeUnit(name) {
        if (name.includes("固定")) return "";
        if (name === "共鸣效率") return "";
        return "%";
    }

    // 计算到当天结束的秒数
    calculateMidnightExpire() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return Math.round((tomorrow - now) / 1000);
    }
}
