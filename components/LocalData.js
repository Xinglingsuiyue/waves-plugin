// LocalData.js
import fs from 'fs';
import path from 'path';
import { pluginResources, _path } from '../model/path.js';
import Config from './Config.js';
import Wiki from './Wiki.js';

export class LocalData {
    constructor() {
        this.charactersFile = path.join(pluginResources, 'data/characters.json');
        this.weaponsFile = path.join(pluginResources, 'data/weapons.json');
        this.ensureDataFiles();
    }

    ensureDataFiles() {
        if (!fs.existsSync(path.dirname(this.charactersFile))) {
            fs.mkdirSync(path.dirname(this.charactersFile), { recursive: true });
        }
        if (!fs.existsSync(this.charactersFile)) {
            fs.writeFileSync(this.charactersFile, '{}');
        }
        if (!fs.existsSync(this.weaponsFile)) {
            fs.writeFileSync(this.weaponsFile, '{}');
        }
    }

    async getCharacter(name) {
        const data = JSON.parse(fs.readFileSync(this.charactersFile, 'utf-8'));
        if (data[name]) {
            return data[name];
        }

        // 如果配置允许从Wiki获取
        if (Config.getConfig().enable_wiki_fallback) {
            const wiki = new Wiki();
            const result = await wiki.getRecord(name);
            if (result.status) {
                const characterData = {
                    name: name,
                    avatar: result.record.content.contentUrl,
                    // 其他需要的角色属性
                };
                // 保存到本地
                data[name] = characterData;
                fs.writeFileSync(this.charactersFile, JSON.stringify(data, null, 2));
                return characterData;
            }
        }

        return null;
    }

    async getWeapon(name) {
        // 类似getCharacter的实现
    }

    async updateAllFromWiki() {
        if (!Config.getConfig().enable_wiki_fallback) return false;
        
        const wiki = new Wiki();
        // 获取所有角色数据并保存到本地
        // 实现类似上面的逻辑，但批量处理
    }
}
