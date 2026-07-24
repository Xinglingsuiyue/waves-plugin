import fs from 'fs';
import path from 'path';

export default class MatrixRankUtil {
    // 获取数据存储路径
    static getRankDataPath() {
        const pluginResources = path.join(process.cwd(), 'plugins', 'waves-plugin', 'resources');
        return {
            basePath: path.join(pluginResources, 'data', 'MatrixRank'),
            globalDir: path.join(pluginResources, 'data', 'MatrixRank', 'global'),
            botDir: path.join(pluginResources, 'data', 'MatrixRank', 'bot'),
            groupDir: (groupId) => path.join(pluginResources, 'data', 'MatrixRank', 'groups', `group_${groupId}`)
        };
    }

    // 确保目录存在
    static ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    // 获取矩阵排名文件路径
    static getRankFilePath(scope, groupId = null) {
        const paths = this.getRankDataPath();
        switch (scope) {
            case 'group':
                const groupDir = paths.groupDir(groupId);
                this.ensureDirectoryExists(groupDir);
                return path.join(groupDir, 'matrix.json');
            case 'global':
                this.ensureDirectoryExists(paths.globalDir);
                return path.join(paths.globalDir, 'matrix.json');
            case 'bot':
                this.ensureDirectoryExists(paths.botDir);
                return path.join(paths.botDir, 'matrix.json');
            default:
                return null;
        }
    }

    // 更新排行榜数据
    // scope: 'group' | 'global' | 'bot'
    // playerInfo: { name, uid, avatar, modeScores, teamIcons }
    static async updateRankData(scope, playerInfo, score, groupId = 'private') {
        try {
            const filePath = this.getRankFilePath(scope, groupId);
            if (!filePath) return;

            await this.updateRankFile(filePath, playerInfo.uid, score, playerInfo);

            // 如果是群排名更新，同时更新全局和bot排名
            if (scope === 'group') {
                const globalPath = this.getRankFilePath('global');
                await this.updateRankFile(globalPath, playerInfo.uid, score, playerInfo);

                const botPath = this.getRankFilePath('bot');
                await this.updateRankFile(botPath, playerInfo.uid, score, playerInfo);
            }

            // 如果是全局排名更新，同时更新bot排名
            if (scope === 'global') {
                const botPath = this.getRankFilePath('bot');
                await this.updateRankFile(botPath, playerInfo.uid, score, playerInfo);
            }
        } catch (err) {
            logger.error(`[矩阵排名工具] 更新排名错误: ${err.stack}`);
        }
    }

    // 同步到所有群
    static async syncToAllGroups(uid, score, playerInfo) {
        const paths = this.getRankDataPath();
        const groupsDir = path.join(paths.basePath, 'groups');

        if (!fs.existsSync(groupsDir)) return;

        try {
            const groupDirs = fs.readdirSync(groupsDir);
            for (const groupDirName of groupDirs) {
                if (!groupDirName.startsWith('group_')) continue;
                const groupDirPath = path.join(groupsDir, groupDirName);
                if (!fs.statSync(groupDirPath).isDirectory()) continue;

                const rankFilePath = path.join(groupDirPath, 'matrix.json');
                if (fs.existsSync(rankFilePath)) {
                    if (this.checkUidInFile(rankFilePath, uid)) {
                        await this.updateRankFile(rankFilePath, uid, score, playerInfo);
                    }
                }
            }
        } catch (err) {
            logger.error(`[矩阵排名工具] 同步群排名错误: ${err.stack}`);
        }
    }

    static checkUidInFile(filePath, uid) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            if (!fileContent.trim()) return false;
            const rankData = JSON.parse(fileContent);
            return rankData.some(entry => entry.uid === uid);
        } catch {
            return false;
        }
    }

    // 更新排名文件
    static async updateRankFile(filePath, uid, newScore, playerInfo = null) {
        const now = Date.now();
        const fileDir = path.dirname(filePath);
        this.ensureDirectoryExists(fileDir);

        let rankData = [];
        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                if (fileContent.trim()) {
                    rankData = JSON.parse(fileContent);
                }
            } catch {}
        }

        let userEntry = rankData.find(entry => entry.uid === uid);
        if (!userEntry) {
            userEntry = {
                uid,
                score: newScore,
                timestamp: now,
                playerInfo
            };
            rankData.push(userEntry);
        } else {
            userEntry.score = newScore;
            userEntry.timestamp = now;
            if (playerInfo) {
                userEntry.playerInfo = playerInfo;
            }
        }

        try {
            fs.writeFileSync(filePath, JSON.stringify(rankData, null, 2));
        } catch (err) {
            logger.error(`[矩阵排名工具] 写入排名文件错误: ${err.stack}`);
        }
    }

    // 加载排名数据
    static loadRankData(filePath, currentUserUIDs = [], page = 1) {
        if (!fs.existsSync(filePath)) {
            return { topList: [], currentUserEntry: null, totalCount: 0, totalPages: 0 };
        }

        try {
            const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const sortedData = rawData.sort((a, b) => b.score - a.score);
            const totalCount = sortedData.length;
            const pageSize = 20;
            const maxPages = 5;
            const totalPages = Math.min(Math.ceil(totalCount / pageSize), maxPages);

            const startIndex = (page - 1) * pageSize;
            const topList = sortedData.slice(startIndex, startIndex + pageSize).map((entry, index) => ({
                rank: startIndex + index + 1,
                score: entry.score,
                uid: entry.uid,
                playerInfo: entry.playerInfo || {},
                timestamp: entry.timestamp,
                isCurrentUser: currentUserUIDs.includes(entry.uid)
            }));

            let currentUserEntry = null;
            for (let i = 0; i < sortedData.length; i++) {
                const entry = sortedData[i];
                if (currentUserUIDs.includes(entry.uid)) {
                    const rankDisplay = i < 100 ? i + 1 : "100+";
                    currentUserEntry = { ...entry, rank: rankDisplay, isCurrentUser: true };
                    break;
                }
            }

            return { topList, currentUserEntry, totalCount, totalPages };
        } catch (err) {
            logger.error(`[矩阵排名工具] 解析排名文件错误: ${err.stack}`);
            return { topList: [], currentUserEntry: null, totalCount: 0, totalPages: 0 };
        }
    }
}
