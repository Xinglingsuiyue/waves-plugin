import fs from 'fs';
import path from 'path';

// 漂泊者属性ID映射
const WAVERIDER_ATTRIBUTES = {
    '1604': '湮灭', '1605': '湮灭',
    '1501': '衍射', '1502': '衍射',
    '1406': '气动', '1408': '气动'
};

export default class RankUtil {
    // 获取数据存储路径
    static getRankDataPath() {
        const pluginResources = path.join(process.cwd(), 'plugins', 'waves-plugin', 'resources');
        return {
            basePath: path.join(pluginResources, 'data', 'CharacterRank'),
            globalDir: path.join(pluginResources, 'data', 'CharacterRank', 'global'),
            groupDir: (groupId) => path.join(pluginResources, 'data', 'CharacterRank', 'groups', `group_${groupId}`)
        };
    }

    // 确保目录存在
    static ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    // 更新排行榜数据（添加角色信息参数）
    static async updateRankData(charName, uid, score, groupId = 'private', charInfo = null) {
        try {
            // 处理漂泊者角色名
            let finalCharName = charName;
            if (charInfo && charInfo.roleName === '漂泊者') {
                const attribute = WAVERIDER_ATTRIBUTES[charInfo.roleId];
                if (attribute) {
                    finalCharName = `漂泊者${attribute}`;
                }
            }
            
            const paths = this.getRankDataPath();
            
            // 确保基础目录存在
            this.ensureDirectoryExists(paths.basePath);
            this.ensureDirectoryExists(paths.globalDir);
            
            // 处理全服标识
            const isGlobal = groupId === 'global';
            if (isGlobal) {
                groupId = 'private'; // 重置为private避免目录创建错误
            }
            
            // 全局排名更新
            await this.updateRankFile(
                path.join(paths.globalDir, `${finalCharName}.json`), 
                uid, 
                score,
                charInfo
            );
            
            // 群排名更新 (处理全服标识)
            if (groupId !== 'private') {
                const groupDirPath = paths.groupDir(groupId);
                this.ensureDirectoryExists(groupDirPath);
                await this.updateRankFile(
                    path.join(groupDirPath, `${finalCharName}.json`), 
                    uid, 
                    score,
                    charInfo
                );
            }
        } catch (err) {
            logger.error(`[排行榜工具] 更新排名错误: ${err.stack}`);
        }
    }

    // 更新排名文件（移除自动清理功能）
    static async updateRankFile(filePath, uid, newScore, charInfo = null) {
        const now = Date.now();
        
        // 确保文件所在目录存在
        const fileDir = path.dirname(filePath);
        this.ensureDirectoryExists(fileDir);
        
        // 读取现有数据或初始化
        let rankData = [];
        let fileExists = false;
        
        if (fs.existsSync(filePath)) {
            fileExists = true;
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                if (fileContent.trim()) {
                    rankData = JSON.parse(fileContent);
                }
            } catch (err) {
                // 忽略解析错误
            }
        }
        
        // 查找或创建用户记录
        let userEntry = rankData.find(entry => entry.uid === uid);
        if (!userEntry) {
            userEntry = { 
                uid, 
                score: newScore, 
                timestamp: now,
                charInfo
            };
            rankData.push(userEntry);
        } else {
            // 只保留最高分
            if (newScore > userEntry.score) {
                userEntry.score = newScore;
                userEntry.timestamp = now;
                userEntry.charInfo = charInfo || userEntry.charInfo;
            }
        }
        
        // 移除了自动清理过期数据的代码，保留所有历史记录
        
        try {
            // 保存更新
            fs.writeFileSync(filePath, JSON.stringify(rankData, null, 2));
        } catch (err) {
            logger.error(`[排行榜工具] 写入排名文件错误: ${err.stack}`);
        }
    }
}
