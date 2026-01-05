import plugin from '../../../lib/plugins/plugin.js'
import Waves from "../components/Code.js";
import Config from "../components/Config.js";
import Render from '../components/Render.js';

export class TowerInfo extends plugin {
    constructor() {
        super({
            name: "鸣潮-逆境深塔信息查询",
            event: "message", 
            priority: 1009,
            rule: [
                {
                    reg: "^(?:～|~|鸣潮)?(当期|上期|下期|\\d{1,3}期)深塔$",
                    fnc: "towerInfo"
                }
            ]
        })
        
    }

    async towerInfo(e) {
        const match = e.msg.match(this.rule[0].reg);
        if (!match) return;
        
        let phaseType = match[1] || "当期";
        
        try {
            const schedule = await this.fetchTowerSchedule();
            if (!schedule) {
                return e.reply("获取深塔时间表失败，请稍后重试");
            }
            
            // 获取当前时间
            const now = new Date();
            
            // 计算目标期数
            let targetPhase = await this.calculateTargetPhase(phaseType, now, schedule);
            
            if (targetPhase < 1) {
                return e.reply("期数不能小于1");
            }
            
            // 从API获取深塔数据
            const towerData = await this.fetchTowerData(targetPhase);
            
            if (!towerData) {
                return e.reply(`没有找到第${targetPhase}期深塔信息，请重新查询`);
            }
            
            // 处理怪物头像URL
            this.processMonsterIcons(towerData);
            
            // 添加时间倒计时处理
            let leftTime = '已结束';
            if (towerData.Begin && towerData.End) {
                const endDate = new Date(towerData.End + "T04:00:00");
                const timeSeconds = (endDate.getTime() - now.getTime()) / 1000;
                
                if (timeSeconds > 0) {
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
            }
            
            // 使用渲染模板
            const renderData = {
                phase: targetPhase,
                towerData: towerData,
                leftTime: leftTime,
                saveId: targetPhase,
                getElementName: this.getElementName.bind(this),
                Math: Math
            };
            
            const imageCard = await Render.render('Template/towerInfo/tower', renderData, { e, retType: 'base64' });
            return e.reply(imageCard, false);
            
        } catch (error) {
            console.error("深塔信息查询错误:", error);
            return e.reply("查询深塔信息时出现错误，请稍后重试");
        }
    }

    // 怪物头像URL
    processMonsterIcons(towerData) {
        if (!towerData || !towerData.Area) return;
        
        Object.values(towerData.Area).forEach(area => {
            if (!area.Floor) return;
            
            Object.values(area.Floor).forEach(floor => {
                if (!floor.Monsters) return;
                
                Object.values(floor.Monsters).forEach(monster => {
                    if (monster.Icon) {

                        
                        const parts = monster.Icon.split('/');
                        const fileNameWithExt = parts[parts.length - 1]; 
                        const fileName = fileNameWithExt.split('.')[0]; 
                        
                        // 构建远程URL
                        monster.IconUrl = `https://api.hakush.in/ww/UI/UIResources/Common/Image/IconMonsterHead/${fileName}.webp`;
                    }
                });
            });
        });
    }

    // 获取深塔时间表
    async fetchTowerSchedule() {
        const cacheKey = 'Yunzai:waves:towerSchedule';
        let cachedData = await redis.get(cacheKey);
        
        if (cachedData) {
            try {
                return JSON.parse(cachedData);
            } catch (err) {
                console.error('解析缓存的时间表数据失败:', err);
            }
        }
        
        try {
            const apiUrl = `https://api.hakush.in/ww/data/tower.json`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error(`获取深塔时间表失败: HTTP ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            
            // 缓存
            await redis.set(cacheKey, JSON.stringify(data), { EX: 10 * 24 * 60 * 60 });
            
            return data;
            
        } catch (error) {
            console.error("获取深塔时间表错误:", error);
            return null;
        }
    }

    // 计算目标期数
    async calculateTargetPhase(phaseType, now, schedule) {
        // 找到当前期数
        let currentPhase = this.findCurrentPhase(now, schedule);
        
        let targetPhase;
        
        // 处理期数类型
        if (phaseType === "当期") {
            targetPhase = currentPhase;
        } else if (phaseType === "上期") {
            targetPhase = currentPhase - 1;
        } else if (phaseType === "下期") {
            targetPhase = currentPhase + 1;
        } else {
            // 处理数字期数
            const numMatch = phaseType.match(/(\d+)期/);
            if (numMatch) {
                targetPhase = parseInt(numMatch[1]);
            } else {
                targetPhase = currentPhase;
            }
        }
        
        return targetPhase;
    }

    // 根据时间表找到当前期数
    findCurrentPhase(now, schedule) {
        const today4AM = new Date(now);
        today4AM.setHours(4, 0, 0, 0);
        

        const nowDateStr = now.toISOString().split('T')[0];
        

        for (const [phaseStr, period] of Object.entries(schedule)) {
            const phase = parseInt(phaseStr);
            const beginDate = period.begin;
            const endDate = period.end;
            

            if (nowDateStr >= beginDate && nowDateStr <= endDate) {

                if (nowDateStr === endDate) {
                    if (now >= today4AM) {

                        continue;
                    } else {

                        return phase;
                    }
                } else if (nowDateStr === beginDate) {

                    if (now >= today4AM) {

                        return phase;
                    } else {

                        continue;
                    }
                } else {

                    return phase;
                }
            }
        }
        
        // 尝试找到最近的期数
        return this.findNearestPhase(now, schedule);
    }

    // 找到最近的期数
    findNearestPhase(now, schedule) {
        const nowTime = now.getTime();
        let nearestPhase = 1;
        let minDiff = Infinity;
        
        // 获取所有期数并按数字排序
        const phases = Object.keys(schedule).map(Number).sort((a, b) => a - b);
        
        for (const phase of phases) {
            const period = schedule[phase];
            const endDate = new Date(period.end + "T04:00:00");
            const diff = Math.abs(endDate.getTime() - nowTime);
            
            if (diff < minDiff) {
                minDiff = diff;
                nearestPhase = phase;
            }
        }
        
        return nearestPhase;
    }

    // 从API获取深塔数据
    async fetchTowerData(phase) {
        const cacheKey = `Yunzai:waves:towerData:${phase}`;
        let cachedData = await redis.get(cacheKey);
        
        if (cachedData) {
            try {
                return JSON.parse(cachedData);
            } catch (err) {
                console.error(`解析缓存的深塔数据失败（第${phase}期）:`, err);
            }
        }
        
        try {
            const apiUrl = `https://api.hakush.in/ww/data/zh/tower/${phase}.json`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                return null;
            }
            
            const data = await response.json();
            
            // 缓存到redis
            await redis.set(cacheKey, JSON.stringify(data), { EX: 60 * 60 });
            
            return data;
            
        } catch (error) {
            console.error(`获取第${phase}期深塔数据失败:`, error);
            return null;
        }
    }

    // 获取元素名称
    getElementName(elementId) {
        const elementNames = {
            0: "物理",
            1: "冷凝", 
            2: "热熔",
            3: "导电",
            4: "气动",
            5: "衍射",
            6: "湮灭"
        };
        return elementNames[elementId] || `元素${elementId}`;
    }
}
