import plugin from '../../../lib/plugins/plugin.js'
import { pluginResources } from "../model/path.js";
import Render from '../components/Render.js';
import Wiki from '../components/Wiki.js';
import YAML from 'yaml'
import fs from 'fs'
import common from '../../../lib/common/common.js'

export class Simulator extends plugin {
    constructor() {
        super({
            name: "鸣潮-模拟抽卡",
            event: "message",
            priority: 1009,
            rule: [
                {
                    reg: "^(～|~|鸣潮)(角色|武器)?(十连|抽卡)$",
                    fnc: "simulator"
                },
                {
                    reg: "^(～|~|鸣潮)(角色|武器)?(百连|百抽)$",
                    fnc: "hundredPull"
                },
                {
                    reg: "^(～|~|鸣潮)更新抽卡资源$",
                    fnc: "updateResources"
                },
                {
                    reg: "^(～|~|鸣潮)重置抽卡保底$",
                    fnc: "resetPity"
                }
            ]
        })
    }

    async resetPity(e) {
        const type = e.msg.includes('武器') ? 'weapon' : 'role'
        await redis.del(`Yunzai:waves:simulator:${type}:${e.user_id}`)
        await e.reply(`已重置${type === 'weapon' ? '武器' : '角色'}抽卡保底计数器`)
        return true
    }

    async hundredPull(e) {
        await e.reply('开始模拟百连抽卡，请稍候...')
        const type = e.msg.includes('武器') ? 'weapon' : 'role'
        
        // 执行10次十连抽卡
        const allResults = []
        const imgs = []
        for (let i = 0; i < 10; i++) {
            const { results, image } = await this.doTenPull(e, type, i + 1)
            allResults.push(results)
            imgs.push(image)
            await new Promise(resolve => setTimeout(resolve, 300))
        }
        
        // 统计结果
        const fiveStarItems = allResults.flat().filter(item => item.star === 5)
        const fourStarItems = allResults.flat().filter(item => item.star === 4)
        
        // 创建统计信息图片
        const statsImage = await Render.render('Template/simulatorGacha/statsSummary', {
            statsData: {
                title: '〓〓百连抽卡统计〓〓',
                fiveStarCount: fiveStarItems.length,
                fiveStarList: fiveStarItems.map(item => item.name),
                fourStarCount: fourStarItems.length,
                fourStarList: fourStarItems.map(item => item.name),
                userName: e.sender.nickname,
                poolType: type === 'weapon' ? '武器池' : '角色池'
            }
        }, { e, retType: 'base64' });

        // 将统计图片添加到图片列表最前面
        imgs.unshift(statsImage);
        
        // 生成转发消息
        let forwardMsg;
        if (e.isGroup) {
            forwardMsg = await common.makeForwardMsg(e, imgs, '点我查看百连抽卡结果');
        } else {
            forwardMsg = imgs;
        }
        
        await e.reply(forwardMsg);
        return true;
    }

    async simulator(e) {
        const type = e.msg.includes('武器') ? 'weapon' : 'role'
        const { image } = await this.doTenPull(e, type)
        await e.reply(image)
        return true
    }

    async doTenPull(e, type, batchNum = null) {
        // 加载卡池数据
        const poolPath = pluginResources + `/Simulator/${type}.yaml`
        if (!fs.existsSync(poolPath)) {
            await e.reply(`未找到${type === 'weapon' ? '武器' : '角色'}卡池数据`)
            return { results: [], image: null }
        }
        
        const data = YAML.parse(fs.readFileSync(poolPath, 'utf8'))
        
        // 加载本地角色数据
        let localData = {}
        const localPath = pluginResources + '/local_characters.yaml'
        if (fs.existsSync(localPath)) {
            localData = YAML.parse(fs.readFileSync(localPath, 'utf8')) || {}
        }

        let gachaData = []
        let userData = JSON.parse(await redis.get(`Yunzai:waves:simulator:${type}:${e.user_id}`)) || { 
            five_star_time: 0, 
            five_star_other: true, 
            four_star_time: 0, 
            four_star_other: true 
        };
        
        let { five_star_time, five_star_other, four_star_time, four_star_other } = userData;

        for (let i = 0; i < 10; i++) {
            // 5星判断
            if (five_star_time < 70 && Math.random() < data.five_star.basic) {
                const item = this.getRandomItem(data.five_star, five_star_other)
                gachaData.push({
                    name: item.name,
                    role: localData[item.name]?.image || await this.getRoleImage(item.name),
                    star: 5
                })
                five_star_other = item.isUp ? true : false
                five_star_time = 0
                continue
            }

            // 保底5星判断
            if (Math.random() < ((five_star_time - 69) * data.five_star.increase + data.five_star.basic)) {
                const item = this.getRandomItem(data.five_star, five_star_other)
                gachaData.push({
                    name: item.name,
                    role: localData[item.name]?.image || await this.getRoleImage(item.name),
                    star: 5
                })
                five_star_other = item.isUp ? true : false
                five_star_time = 0
                continue
            }

            five_star_time++

            // 4星判断
            if (four_star_time < 9 && Math.random() < data.four_star.basic) {
                const item = this.getRandomItem(data.four_star, four_star_other)
                gachaData.push({
                    name: item.name,
                    role: localData[item.name]?.image || await this.getRoleImage(item.name),
                    star: 4
                })
                four_star_other = item.isUp ? true : false
                four_star_time = 0
                continue
            }

            // 保底4星判断
            if (four_star_time >= 9) {
                const item = this.getRandomItem(data.four_star, four_star_other)
                gachaData.push({
                    name: item.name,
                    role: localData[item.name]?.image || await this.getRoleImage(item.name),
                    star: 4
                })
                four_star_other = item.isUp ? true : false
                four_star_time = 0
                continue
            }

            four_star_time++
            
            // 3星物品
            const item = data.three_star.other_pool[Math.floor(Math.random() * data.three_star.other_pool.length)]
            gachaData.push({
                name: item.name,
                role: localData[item.name]?.image || item.name,
                star: 3
            })
        }

        // 渲染图片
        const imageCard = await Render.render('Template/simulatorGacha/simulatorGacha', {
            gachaData: { 
                userName: e.sender.nickname, 
                poolName: data.pool_name + (batchNum ? ` (${batchNum}/10)` : ''),
                times: five_star_time,
                list: gachaData 
            },
        }, { e, retType: 'base64' });
        
        // 更新用户数据
        await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ 
            five_star_time, 
            five_star_other, 
            four_star_time, 
            four_star_other 
        }))
        
        return {
            results: gachaData,
            image: imageCard
        }
    }

    getRandomItem(poolData, isOtherAvailable) {
        const useUpPool = !isOtherAvailable || Math.random() > poolData.other
        const pool = useUpPool ? poolData.up_pool : poolData.other_pool
        const item = pool[Math.floor(Math.random() * pool.length)]
        return {
            name: item.name,
            isUp: useUpPool
        }
    }

    async updateResources(e) {
        await e.reply('开始更新抽卡资源...')
        try {
            const wiki = new Wiki()
            const types = ['role', 'weapon']
            
            let localData = {}
            const localPath = pluginResources + '/local_characters.yaml'
            if (fs.existsSync(localPath)) {
                localData = YAML.parse(fs.readFileSync(localPath, 'utf8')) || {}
            }
            
            let updatedCount = 0
            for (const type of types) {
                const poolPath = pluginResources + `/Simulator/${type}.yaml`
                if (!fs.existsSync(poolPath)) continue
                
                const poolData = YAML.parse(fs.readFileSync(poolPath, 'utf8'))
                const allItems = [
                    ...poolData.five_star.up_pool,
                    ...poolData.five_star.other_pool,
                    ...poolData.four_star.up_pool,
                    ...poolData.four_star.other_pool,
                    ...poolData.three_star.other_pool
                ]
                
                for (const item of allItems) {
                    if (!localData[item.name]?.image) {
                        const record = await wiki.getRecord(item.name)
                        if (record.status) {
                            localData[item.name] = {
                                name: item.name,
                                image: record.record.content.contentUrl,
                                star: item.star || (poolData.five_star.up_pool.concat(poolData.five_star.other_pool).some(i => i.name === item.name) ? 5 : 
                                    poolData.four_star.up_pool.concat(poolData.four_star.other_pool).some(i => i.name === item.name) ? 4 : 3)
                            }
                            updatedCount++
                            await new Promise(resolve => setTimeout(resolve, 500))
                        }
                    }
                }
            }
            
            fs.writeFileSync(localPath, YAML.stringify(localData))
            await e.reply(`抽卡资源更新完成，共更新 ${updatedCount} 项资源`)
        } catch (error) {
            logger.error('更新抽卡资源失败:', error)
            await e.reply('更新抽卡资源失败，请查看日志')
        }
        return true
    }

    async getRoleImage(roleName) {
        try {
            const wiki = new Wiki()
            const record = await wiki.getRecord(roleName)
            if (record.status) {
                // 更新本地缓存
                const localPath = pluginResources + '/local_characters.yaml'
                let localData = {}
                if (fs.existsSync(localPath)) {
                    localData = YAML.parse(fs.readFileSync(localPath, 'utf8')) || {}
                }
                
                localData[roleName] = {
                    name: roleName,
                    image: record.record.content.contentUrl,
                    star: localData[roleName]?.star || 4
                }
                
                fs.writeFileSync(localPath, YAML.stringify(localData))
                return record.record.content.contentUrl
            }
        } catch (error) {
            logger.error(`获取角色 ${roleName} 图片失败:`, error)
        }
        return roleName
    }
}
                    await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                    continue

                }
            }


            if (four_star_time >= 9) {
                if (four_star_other) {
                    if (Math.random() < data.four_star.other) {
                        gachaData.push({ role: data.four_star.other_pool[Math.floor(Math.random() * data.four_star.other_pool.length)].name, star: 4 });
                        four_star_other = false
                        four_star_time = 0
                        await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                        continue

                    } else {
                        gachaData.push({ role: data.four_star.up_pool[Math.floor(Math.random() * data.four_star.up_pool.length)].name, star: 4 });
                        four_star_other = true
                        four_star_time = 0
                        await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                        continue

                    }
                } else {
                    gachaData.push({ role: data.four_star.up_pool[Math.floor(Math.random() * data.four_star.up_pool.length)].name, star: 4 });
                    four_star_other = true
                    four_star_time = 0
                    await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                    continue

                }
            }

            four_star_time++
            gachaData.push({ role: data.three_star.other_pool[Math.floor(Math.random() * data.three_star.other_pool.length)].name, star: 3 });

            await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
        }

        const wiki = new Wiki()
        let promises = gachaData.map(async (data) => {
            let record = await wiki.getRecord(data.role);
            data.role = record.record.content.contentUrl;
        });

        await Promise.all(promises);

        const imageCard = await Render.render('Template/simulatorGacha/simulatorGacha', {
            gachaData: { userName: e.sender.nickname, poolName: data.pool_name, times: JSON.parse(await redis.get(`Yunzai:waves:simulator:${type}:${e.user_id}`)).five_star_time, list: gachaData },
        }, { e, retType: 'base64' });

        await e.reply(imageCard)
        return true
    }
}
