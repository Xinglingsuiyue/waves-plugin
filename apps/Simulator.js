import plugin from '../../../lib/plugins/plugin.js'
import { pluginResources } from "../model/path.js";
import Render from '../components/Render.js';
import Wiki from '../components/Wiki.js';
import YAML from 'yaml'
import fs from 'fs'

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
                    reg: "^更新抽卡资源$",
                    fnc: "updateResources"
                }
            ]
        })
    }

    async updateResources(e) {
        await e.reply('开始更新抽卡资源...')
        try {
            const wiki = new Wiki()
            const type = 'role' // 可以扩展为同时更新武器资源
            
            // 加载本地角色数据
            let localData = {}
            const localPath = pluginResources + '/local_characters.yaml'
            if (fs.existsSync(localPath)) {
                localData = YAML.parse(fs.readFileSync(localPath, 'utf8')) || {}
            }
            
            // 获取当前卡池数据
            const poolData = YAML.parse(fs.readFileSync(pluginResources + `/Simulator/${type}.yaml`, 'utf8'))
            
            // 收集所有需要更新的角色
            const allRoles = [
                ...poolData.five_star.up_pool,
                ...poolData.five_star.other_pool,
                ...poolData.four_star.up_pool,
                ...poolData.four_star.other_pool,
                ...poolData.three_star.other_pool
            ]
            
            let updatedCount = 0
            for (const role of allRoles) {
                if (!localData[role.name]?.image) {
                    const record = await wiki.getRecord(role.name)
                    if (record.status) {
                        localData[role.name] = {
                            name: role.name,
                            image: record.record.content.contentUrl,
                            star: role.star || (role.name.includes('5星') ? 5 : 
                                 role.name.includes('4星') ? 4 : 3)
                        }
                        updatedCount++
                        await new Promise(resolve => setTimeout(resolve, 500)) // 防止请求过快
                    }
                }
            }
            
            // 保存更新后的数据
            fs.writeFileSync(localPath, YAML.stringify(localData))
            
            await e.reply(`抽卡资源更新完成，共更新了 ${updatedCount} 个角色资源`)
        } catch (error) {
            logger.error('更新抽卡资源失败:', error)
            await e.reply('更新抽卡资源失败，请查看日志')
        }
        return true
    }

    async simulator(e) {
        let type = e.msg.includes('武器') ? 'weapon' : 'role'
        let data = YAML.parse(fs.readFileSync(pluginResources + `/Simulator/${type}.yaml`, 'utf8'))
        
        // 加载本地角色数据
        let localData = {}
        const localPath = pluginResources + '/local_characters.yaml'
        if (fs.existsSync(localPath)) {
            localData = YAML.parse(fs.readFileSync(localPath, 'utf8')) || {}
        }

        let gachaData = []

        for (let i = 0; i < 10; i++) {
            let userData = JSON.parse(await redis.get(`Yunzai:waves:simulator:${type}:${e.user_id}`)) || { 
                five_star_time: 0, 
                five_star_other: true, 
                four_star_time: 0, 
                four_star_other: true 
            };
            
            let { five_star_time, five_star_other, four_star_time, four_star_other } = userData;

            // 5星角色逻辑
            if (five_star_time < 70 && Math.random() < data.five_star.basic) {
                if (five_star_other) {
                    if (Math.random() < data.five_star.other) {
                        const item = data.five_star.other_pool[Math.floor(Math.random() * data.five_star.other_pool.length)]
                        gachaData.push({ 
                            role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                            star: 5 
                        });
                        five_star_other = false
                        five_star_time = 0
                        await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                        continue
                    } else {
                        const item = data.five_star.up_pool[Math.floor(Math.random() * data.five_star.up_pool.length)]
                        gachaData.push({ 
                            role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                            star: 5 
                        });
                        five_star_other = true
                        five_star_time = 0
                        await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                        continue
                    }
                } else {
                    const item = data.five_star.up_pool[Math.floor(Math.random() * data.five_star.up_pool.length)]
                    gachaData.push({ 
                        role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                        star: 5 
                    });
                    five_star_other = true
                    five_star_time = 0
                    await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                    continue
                }
            }

            // 保底5星逻辑
            if (Math.random() < ((five_star_time - 69) * data.five_star.increase + data.five_star.basic)) {
                if (five_star_other) {
                    if (Math.random() < data.five_star.other) {
                        const item = data.five_star.other_pool[Math.floor(Math.random() * data.five_star.other_pool.length)]
                        gachaData.push({ 
                            role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                            star: 5 
                        });
                        five_star_other = false
                        five_star_time = 0
                        await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                        continue
                    } else {
                        const item = data.five_star.up_pool[Math.floor(Math.random() * data.five_star.up_pool.length)]
                        gachaData.push({ 
                            role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                            star: 5 
                        });
                        five_star_other = true
                        five_star_time = 0
                        await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                        continue
                    }
                } else {
                    const item = data.five_star.up_pool[Math.floor(Math.random() * data.five_star.up_pool.length)]
                    gachaData.push({ 
                        role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                        star: 5 
                    });
                    five_star_other = true
                    five_star_time = 0
                    await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                    continue
                }
            }

            five_star_time++

            // 4星角色逻辑
            if (four_star_time < 9 && Math.random() < data.four_star.basic) {
                if (four_star_other) {
                    if (Math.random() < data.four_star.other) {
                        const item = data.four_star.other_pool[Math.floor(Math.random() * data.four_star.other_pool.length)]
                        gachaData.push({ 
                            role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                            star: 4 
                        });
                        four_star_other = false
                        four_star_time = 0
                        await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                        continue
                    } else {
                        const item = data.four_star.up_pool[Math.floor(Math.random() * data.four_star.up_pool.length)]
                        gachaData.push({ 
                            role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                            star: 4 
                        });
                        four_star_other = true
                        four_star_time = 0
                        await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                        continue
                    }
                } else {
                    const item = data.four_star.up_pool[Math.floor(Math.random() * data.four_star.up_pool.length)]
                    gachaData.push({ 
                        role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                        star: 4 
                    });
                    four_star_other = true
                    four_star_time = 0
                    await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                    continue
                }
            }

            // 保底4星逻辑
            if (four_star_time >= 9) {
                if (four_star_other) {
                    if (Math.random() < data.four_star.other) {
                        const item = data.four_star.other_pool[Math.floor(Math.random() * data.four_star.other_pool.length)]
                        gachaData.push({ 
                            role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                            star: 4 
                        });
                        four_star_other = false
                        four_star_time = 0
                        await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                        continue
                    } else {
                        const item = data.four_star.up_pool[Math.floor(Math.random() * data.four_star.up_pool.length)]
                        gachaData.push({ 
                            role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                            star: 4 
                        });
                        four_star_other = true
                        four_star_time = 0
                        await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                        continue
                    }
                } else {
                    const item = data.four_star.up_pool[Math.floor(Math.random() * data.four_star.up_pool.length)]
                    gachaData.push({ 
                        role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                        star: 4 
                    });
                    four_star_other = true
                    four_star_time = 0
                    await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
                    continue
                }
            }

            four_star_time++
            
            // 3星物品
            const item = data.three_star.other_pool[Math.floor(Math.random() * data.three_star.other_pool.length)]
            gachaData.push({ 
                role: localData[item.name]?.image || await this.getRoleImage(item.name), 
                star: 3 
            });

            await redis.set(`Yunzai:waves:simulator:${type}:${e.user_id}`, JSON.stringify({ five_star_time, five_star_other, four_star_time, four_star_other }))
        }

        const imageCard = await Render.render('Template/simulatorGacha/simulatorGacha', {
            gachaData: { 
                userName: e.sender.nickname, 
                poolName: data.pool_name, 
                times: JSON.parse(await redis.get(`Yunzai:waves:simulator:${type}:${e.user_id}`)).five_star_time, 
                list: gachaData 
            },
        }, { e, retType: 'base64' });

        await e.reply(imageCard)
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
                    star: roleName.includes('5星') ? 5 : 
                         roleName.includes('4星') ? 4 : 3
                }
                
                fs.writeFileSync(localPath, YAML.stringify(localData))
                return record.record.content.contentUrl
            }
        } catch (error) {
            logger.error(`获取角色 ${roleName} 图片失败:`, error)
        }
        return roleName // 回退为角色名称
    }
}
                    }
                } else {
                    gachaData.push({ role: data.four_star.up_pool[Math.floor(Math.random() * data.four_star.up_pool.length)].name, star: 4 });
                    four_star_other = true
                    four_star_time = 0
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
