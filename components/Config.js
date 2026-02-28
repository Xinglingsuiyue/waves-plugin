import YAML from 'yaml';
import fs from 'fs';
import { pluginRoot, _path, pluginResources } from '../model/path.js';

class Config {
    constructor() {
        this.cache = {
            config: null,
            config_default: null,
            user: null,
            user_default: null,
        };

        this.fileMaps = {
            config: `${pluginRoot}/config/config/config.yaml`,
            config_default: `${pluginRoot}/config/config_default.yaml`,
            user: `${pluginRoot}/config/config/user.yaml`,
            user_default: `${pluginRoot}/config/user_default.yaml`,
        };

        this.localDataConfig = {
            characters: `${pluginResources}/data/characters.yaml`,
            weapons: `${pluginResources}/data/weapons.yaml`,
            lastUpdate: `${pluginResources}/data/last_update.txt`
        };

        this.watchFiles();
        this.initLocalData();
    }

    initLocalData() {
        const dataDir = `${pluginResources}/data`;
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.localDataConfig.characters)) {
            fs.writeFileSync(this.localDataConfig.characters, YAML.stringify({
                default: {
                    enable_wiki_fallback: true,
                    auto_update_data: false,
                    data_update_interval: 86400
                },
                characters: {}
            }));
        }
        
        if (!fs.existsSync(this.localDataConfig.weapons)) {
            fs.writeFileSync(this.localDataConfig.weapons, YAML.stringify({
                weapons: {}
            }));
        }
    }

    loadYAML(filePath) {
        try {
            return YAML.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (error) {
            const fileName = filePath.split('/').pop();
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`读取 ${fileName} 失败`), logger.red(error));
            return null;
        }
    }

    saveConfig(filePath, data) {
        try {
            fs.writeFileSync(filePath, YAML.stringify(data));
            return true;
        } catch (error) {
            const fileName = filePath.split('/').pop();
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`写入 ${fileName} 失败`), logger.red(error));
            return false;
        }
    }

    watchFiles() {
        Object.entries(this.fileMaps).forEach(([key, filePath]) => {
            fs.watchFile(filePath, () => {
                this.cache[key] = this.loadYAML(filePath);
            });
        });
    }

    getLocalDataConfig() {
        try {
            const data = this.loadYAML(this.localDataConfig.characters);
            return {
                enable_wiki_fallback: data?.default?.enable_wiki_fallback ?? true,
                auto_update_data: data?.default?.auto_update_data ?? false,
                data_update_interval: data?.default?.data_update_interval ?? 86400
            };
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan('读取本地数据配置失败'), logger.red(error));
            return {
                enable_wiki_fallback: true,
                auto_update_data: false,
                data_update_interval: 86400
            };
        }
    }

    getLocalCharacters() {
        try {
            const data = this.loadYAML(this.localDataConfig.characters);
            return data?.characters || {};
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan('读取本地角色数据失败'), logger.red(error));
            return {};
        }
    }

    updateLocalCharacters(data) {
        try {
            const currentData = this.loadYAML(this.localDataConfig.characters) || {
                default: {
                    enable_wiki_fallback: true,
                    auto_update_data: false,
                    data_update_interval: 86400
                },
                characters: {}
            };
            
            currentData.characters = { ...currentData.characters, ...data };
            this.saveConfig(this.localDataConfig.characters, currentData);
            
            fs.writeFileSync(this.localDataConfig.lastUpdate, Date.now().toString());
            return true;
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan('更新本地角色数据失败'), logger.red(error));
            return false;
        }
    }

    getConfig() {
        if (!this.cache.config) {
            this.cache.config = this.loadYAML(this.fileMaps.config);
        }
        return this.cache.config;
    }

    getDefConfig() {
        if (!this.cache.config_default) {
            this.cache.config_default = this.loadYAML(this.fileMaps.config_default);
        }
        return this.cache.config_default;
    }

    setConfig(config_data) {
        if (this.saveConfig(this.fileMaps.config, config_data)) {
            this.cache.config = config_data;
            return true;
        }
        return false;
    }

    getUserConfig() {
        if (!this.cache.user) {
            this.cache.user = this.loadYAML(this.fileMaps.user);
        }
        return this.cache.user;
    }

    getDefUserConfig() {
        if (!this.cache.user_default) {
            this.cache.user_default = this.loadYAML(this.fileMaps.user_default);
        }
        return this.cache.user_default;
    }

    setUserConfig(user_data) {
        return this.saveConfig(this.fileMaps.user, user_data);
    }

    getUserData(userId) {
        const userConfigData = `${_path}/data/waves/${userId}.yaml`;
        try {
            return fs.existsSync(userConfigData) ? this.loadYAML(userConfigData) : [];
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`读取用户数据 ${userId}.yaml 失败`), logger.red(error));
            return [];
        }
    }

    setUserData(userId, userData) {
        const userConfigData = `${_path}/data/waves/${userId}.yaml`;
        try {
            if (!userData.length) {
                if (fs.existsSync(userConfigData)) fs.unlinkSync(userConfigData);
                redis.del(`Yunzai:waves:users:${userId}`);
                return true;
            }

            this.saveConfig(userConfigData, userData);
            redis.set(`Yunzai:waves:users:${userId}`, JSON.stringify(userData));
            return true;
        } catch (error) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`写入用户数据 ${userId}.yaml 失败`), logger.red(error));
            return false;
        }
    }
}

export default new Config();
