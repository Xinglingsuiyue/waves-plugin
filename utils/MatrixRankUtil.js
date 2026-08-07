import fs from 'fs';
import path from 'path';
import Config from '../components/Config.js';

export default class MatrixRankUtil {
    static getRankDataPath() {
        const pluginResources = path.join(process.cwd(), 'plugins', 'waves-plugin', 'resources');
        return {
            basePath: path.join(pluginResources, 'data', 'MatrixRank'),
            globalDir: path.join(pluginResources, 'data', 'MatrixRank', 'global'),
            botDir: path.join(pluginResources, 'data', 'MatrixRank', 'bot'),
            groupDir: (groupId) => path.join(pluginResources, 'data', 'MatrixRank', 'groups', `group_${groupId}`)
        };
    }

    static ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

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

    static readSeasonFile(filePath) {
        if (!fs.existsSync(filePath)) {
            return { seasons: [] };
        }
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            if (!fileContent.trim()) {
                return { seasons: [] };
            }
            const parsed = JSON.parse(fileContent);
            if (Array.isArray(parsed)) {
                return { seasons: [{ seasonKey: 'legacy', endTime: 0, rankData: parsed }] };
            }
            if (parsed && Array.isArray(parsed.seasons)) {
                return parsed;
            }
            return { seasons: [] };
        } catch (err) {
            logger.error(`[矩阵排名工具] 读取赛季文件错误: ${err.stack}`);
            return { seasons: [] };
        }
    }

    static writeSeasonFile(filePath, data) {
        try {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        } catch (err) {
            logger.error(`[矩阵排名工具] 写入排名文件错误: ${err.stack}`);
        }
    }

    static timestampToSeasonKey(timestamp) {
        if (!timestamp) return 'unknown';
        const d = new Date(timestamp);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    static cleanupSeasons(seasonData) {
        if (!seasonData.seasons || seasonData.seasons.length <= 2) {
            return seasonData;
        }
        seasonData.seasons.sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
        const removed = seasonData.seasons.splice(2);
        if (removed.length > 0) {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow(`矩阵排名: 自动清理了 ${removed.length} 期过期数据`));
        }
        return seasonData;
    }

    static findSeason(seasonData, seasonEndTime = 0) {
        if (!seasonData.seasons || seasonData.seasons.length === 0) return null;
        if (seasonEndTime) {
            const key = this.timestampToSeasonKey(seasonEndTime);
            return seasonData.seasons.find(s => s.seasonKey === key) || null;
        }
        const sorted = [...seasonData.seasons].sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
        return sorted[0] || null;
    }

    static async updateRankData(scope, playerInfo, score, groupId = 'private', seasonEndTime = 0) {
        try {
            const filePath = this.getRankFilePath(scope, groupId);
            if (!filePath) return;
            await this.updateRankFile(filePath, playerInfo.uid, score, playerInfo, seasonEndTime);
        } catch (err) {
            logger.error(`[矩阵排名工具] 更新排名错误: ${err.stack}`);
        }
    }

    static async syncToAllGroups(uid, score, playerInfo, seasonEndTime = 0, isPublicCookie = false) {
        const paths = this.getRankDataPath();
        const groupsDir = path.join(paths.basePath, 'groups');

        if (!fs.existsSync(groupsDir)) return;

        try {
            const groupDirs = fs.readdirSync(groupsDir);
            for (const groupDirName of groupDirs) {
                if (!groupDirName.startsWith('group_')) continue;
                const groupDirPath = path.join(groupsDir, groupDirName);
                if (!fs.statSync(groupDirPath).isDirectory()) continue;

                const groupId = groupDirName.substring('group_'.length);

                const rankFilePath = path.join(groupDirPath, 'matrix.json');
                if (fs.existsSync(rankFilePath)) {
                    if (this.checkUidInFile(rankFilePath, uid, seasonEndTime)) {
                        if (isPublicCookie && await this.isGroupStrictMode(groupId)) {
                            continue;
                        }
                        await this.updateRankFile(rankFilePath, uid, score, playerInfo, seasonEndTime);
                    }
                }
            }
        } catch (err) {
            logger.error(`[矩阵排名工具] 同步群排名错误: ${err.stack}`);
        }
    }

    static async isGroupStrictMode(groupId) {
        try {
            const key = `Yunzai:waves:matrix_reject_public:${groupId}`;
            const value = await redis.get(key);
            if (value !== null) {
                return value !== '0';
            }
            const config = Config.getConfig();
            return config.matrix_reject_public_cookie_group !== false;
        } catch {
            return false;
        }
    }

    static checkUidInFile(filePath, uid, seasonEndTime = 0) {
        try {
            const seasonData = this.readSeasonFile(filePath);
            const uidStr = String(uid);
            const season = this.findSeason(seasonData, seasonEndTime);
            if (!season) return false;
            return season.rankData.some(entry => String(entry.uid) === uidStr);
        } catch {
            return false;
        }
    }

    static async updateRankFile(filePath, uid, newScore, playerInfo = null, seasonEndTime = 0) {
        const now = Date.now();
        const fileDir = path.dirname(filePath);
        this.ensureDirectoryExists(fileDir);

        const seasonData = this.readSeasonFile(filePath);
        const seasonKey = seasonEndTime ? this.timestampToSeasonKey(seasonEndTime) : 'current';

        let season = seasonData.seasons.find(s => s.seasonKey === seasonKey);
        if (!season) {
            season = {
                seasonKey,
                endTime: seasonEndTime || 0,
                rankData: []
            };
            seasonData.seasons.push(season);
        }

        const rankData = season.rankData;
        let userEntry = rankData.find(entry => String(entry.uid) === String(uid));
        if (!userEntry) {
            userEntry = {
                uid: String(uid),
                score: newScore,
                timestamp: now,
                playerInfo
            };
            rankData.push(userEntry);
        } else {
            if (newScore > userEntry.score) {
                userEntry.score = newScore;
                userEntry.timestamp = now;
                if (playerInfo) {
                    const newHasTeams = playerInfo.topTeams && playerInfo.topTeams.length > 0;
                    const oldHasTeams = userEntry.playerInfo &&
                        userEntry.playerInfo.topTeams && userEntry.playerInfo.topTeams.length > 0;
                    if (!newHasTeams && oldHasTeams) {
                        playerInfo.topTeams = userEntry.playerInfo.topTeams;
                        playerInfo.teamIcons = userEntry.playerInfo.teamIcons;
                        playerInfo.teamCount = userEntry.playerInfo.teamCount;
                    }
                    userEntry.playerInfo = playerInfo;
                }
            }
        }

        this.cleanupSeasons(seasonData);

        this.writeSeasonFile(filePath, seasonData);
    }

    static loadRankData(filePath, currentUserUIDs = [], page = 1, seasonOffset = 0) {
        if (!fs.existsSync(filePath)) {
            return { topList: [], currentUserEntries: [], totalCount: 0, totalPages: 0, seasonInfo: null };
        }

        try {
            const seasonData = this.readSeasonFile(filePath);
            const sortedSeasons = [...seasonData.seasons].sort((a, b) => (b.endTime || 0) - (a.endTime || 0));

            const targetSeason = sortedSeasons[seasonOffset];
            if (!targetSeason) {
                return { topList: [], currentUserEntries: [], totalCount: 0, totalPages: 0, seasonInfo: null };
            }

            const rawData = targetSeason.rankData || [];
            const sortedData = rawData.sort((a, b) => b.score - a.score);
            const totalCount = sortedData.length;
            const pageSize = 20;
            const maxPages = 5;
            const totalPages = Math.min(Math.ceil(totalCount / pageSize), maxPages);

            const uidStrSet = currentUserUIDs.map(uid => String(uid));

            const startIndex = (page - 1) * pageSize;
            const topList = sortedData.slice(startIndex, startIndex + pageSize).map((entry, index) => ({
                rank: startIndex + index + 1,
                score: entry.score,
                uid: entry.uid,
                playerInfo: entry.playerInfo || {},
                timestamp: entry.timestamp,
                isCurrentUser: uidStrSet.includes(String(entry.uid))
            }));

            let currentUserEntries = [];
            for (let i = 0; i < sortedData.length; i++) {
                const entry = sortedData[i];
                if (uidStrSet.includes(String(entry.uid))) {
                    const rankDisplay = i < 100 ? i + 1 : "100+";
                    currentUserEntries.push({ ...entry, rank: rankDisplay, isCurrentUser: true });
                }
            }

            let seasonLabel = '';
            const rawKey = targetSeason.seasonKey;
            if (rawKey && rawKey !== 'current' && rawKey !== 'legacy' && rawKey !== 'unknown') {
                const dateKey = /^\d+$/.test(rawKey) ? this.timestampToSeasonKey(Number(rawKey)) : rawKey;
                seasonLabel = `截止${dateKey}`;
            }

            const seasonInfo = {
                seasonKey: targetSeason.seasonKey,
                seasonLabel,
                endTime: targetSeason.endTime,
                totalSeasons: sortedSeasons.length
            };

            return { topList, currentUserEntries, totalCount, totalPages, seasonInfo };
        } catch (err) {
            logger.error(`[矩阵排名工具] 解析排名文件错误: ${err.stack}`);
            return { topList: [], currentUserEntries: [], totalCount: 0, totalPages: 0, seasonInfo: null };
        }
    }
}
