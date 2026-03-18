import plugin from '../../../lib/plugins/plugin.js'
import WeightCalculator from '../utils/Calculate.js'
import { pluginResources } from '../model/path.js';
import Wiki from '../components/Wiki.js';
import Render from '../components/Render.js';
import Config from '../components/Config.js';
import path from 'path';
import fs from 'fs';


function getOcrKeys() {
    try {
        const config = Config.getConfig();
        const ocrKeys = config?.ocr_keys;
        if (Array.isArray(ocrKeys) && ocrKeys.length > 0) {

            return ocrKeys
                .map(item => (typeof item === 'string' ? item : item?.key))
                .filter(k => typeof k === 'string' && k.trim().length > 0)
                .map(k => k.trim());
        }
    } catch (err) {
        logger.mark(logger.blue('[WAVES 评分]'), logger.red('读取 OCR Key 配置失败:'), logger.red(err));
    }
    return [];
}

// 全局轮询索引
let _ocrKeyIndex = 0;


function getNextOcrKey() {
    const keys = getOcrKeys();
    if (keys.length === 0) return null;
    const key = keys[_ocrKeyIndex % keys.length];
    _ocrKeyIndex = (_ocrKeyIndex + 1) % keys.length;
    return key;
}

// 漂泊者属性ID映射
const WAVERIDER_ATTRIBUTES = {
    '1604': '湮灭', '1605': '湮灭',
    '1501': '衍射', '1502': '衍射',
    '1406': '气动', '1408': '气动'
};


function cleanAttributeName(name) {
    return name.replace(/[。，、.,:：]+$/, '').trim();
}

function getCostByMainStat(mainStatName, mainStatValue) {
    const valStr = mainStatValue.replace('%', '');
    const val = parseFloat(valStr);
    if (isNaN(val)) return 3;

    if (mainStatName.includes('暴击伤害') && Math.abs(val - 44) < 0.1) return 4;
    if (mainStatName.includes('暴击') && Math.abs(val - 22) < 0.1) return 4;
    if (mainStatName.includes('治疗效果加成') && Math.abs(val - 26.4) < 0.1) return 4;
    if (mainStatName.includes('防御') && Math.abs(val - 41.8) < 0.1) return 4;
    if (mainStatName.includes('攻击') && Math.abs(val - 33) < 0.1) return 4;
    if (mainStatName.includes('生命') && Math.abs(val - 33) < 0.1) return 4;

    if (mainStatName.includes('伤害加成') && Math.abs(val - 30) < 0.1) return 3;
    if (mainStatName.includes('共鸣效率') && Math.abs(val - 32) < 0.1) return 3;
    if (mainStatName.includes('生命') && Math.abs(val - 30) < 0.1) return 3;
    if (mainStatName.includes('攻击') && Math.abs(val - 30) < 0.1) return 3;
    if (mainStatName.includes('防御') && Math.abs(val - 38) < 0.1) return 3;

    if (mainStatName.includes('攻击') && Math.abs(val - 18) < 0.1) return 1;
    if (mainStatName.includes('生命') && Math.abs(val - 22.8) < 0.1) return 1;
    if (mainStatName.includes('防御') && Math.abs(val - 18) < 0.1) return 1;

    return 3;
}

/**
 * 规范化可能为数值的行
 */
function normalizeNumber(line) {
    let normalized = line.trim();
    normalized = normalized.replace(/[-–—]/g, '.');
    normalized = normalized.replace(/\s+/g, '');
    if (/^[\d.]+%?$/.test(normalized)) {
        return normalized;
    }
    return line;
}

/**
 * 提取声骸词条信息
 */
function extractPhantomDataFromOCR(rawText) {
    // 常见错别字替换表
    const replacements = [
        [/＆/g, ''],
        [/&/g, ''],
        [/[，*,•×]/g, ' '],
        [/e/g, ''],
        [/◎/g, ''],
        [/縱/g, ''],
        [/器/g, ''],
        [/ *暴击/g, '暴击'],
        [/①/g, ''],
        [/②/g, ''],
        [/③/g, ''],
        [/④/g, ''],
        [/⑤/g, ''],
        [/⑥/g, ''],
        [/⑦/g, ''],
        [/⑧/g, ''],
        [/⑨/g, ''],
        [/⑩/g, ''],
        [/多/g, ''],
        [/暴擊/g, '暴击'],
        [/暴擊傷害/g, '暴击伤害'],
        [/共鳴效率/g, '共鸣效率'],
        [/共鳴解放/g, '共鸣解放伤害加成'],
        [/共鳴技能/g, '共鸣技能伤害加成'],
        [/攻擊/g, '攻击'],
        [/湮滅/g, '湮灭伤害加成'],
        [/熱熔/g, '热熔伤害加成'],
        [/氣動/g, '气动伤害加成'],
        [/導電/g, '导电伤害加成'],
        [/重擊/g, '重击'],
        [/防禦/g, '防御'],
        [/主印/g, '生命'],
        [/其鸣/g, '共鸣'],
        [/共呜/g, '共鸣'],
        [/共呜郊卒/g, '共鸣效率'],
        [/共呜枝熊/g, '共鸣技能'],
        [/共呜触效/g, '共鸣解放'],
        [/功擎/g, '攻击'],
        [/攻击%/g, '攻击百分比'],
        [/攻击伤害/g, '暴击伤害'],
        [/攻擎/g, '攻击'],
        [/晋攻/g, '普攻'],
        [/普攻/g, '普攻伤害加成'],
        [/普攻伤古如成/g, '普攻伤害加成'],
        [/最击伤害/g, '暴击伤害'],
        [/寨击/g, '暴击'],
        [/爆击/g, '暴击'],
        [/潮顾重/g, '潮顾重'],
        [/热熔/g, '热熔伤害加成'],
        [/多热熔/g, '热熔伤害加成'],
        [/湮灭/g, '湮灭伤害加成'],
        [/衍射/g, '衍射伤害加成'],
        [/生命百分比/g, '生命百分比'],
        [/冷凝/g, '冷凝伤害加成'],
        [/导电/g, '导电伤害加成'],
        [/妨缷/g, '防御'],
        [/防御百分比/g, '防御百分比'],
        [/重击/g, '重击伤害加成'],
        [/重击伤古如成/g, '重击伤害加成'],
        [/垂击/g, '重击'],
        [/双扱/g, '双极'],
        [/攻击百分比/g, '攻击百分比'],
        [/气动/g, '气动伤害加成'],
        [/泰击/g, '暴击'],
        [/治疗加成/g, '治疗效果加成'],
        [/能量效率/g, '共鸣效率'],
        [/共鸣技能/g, '共鸣技能伤害加成'],
        [/共鸣技能伤古如成/g, '共鸣技能伤害加成'],
        [/共鸣解放/g, '共鸣解放伤害加成'],
        [/共鸣解放伤古如成/g, '共鸣解放伤害加成'],
        [/伤害加成伤害加成/g, '伤害加成'],
        [/暴击伤古/g, '暴击伤害'],
        [/火攻击/g, '攻击'],
    ];

    let text = rawText;
    for (let [pattern, replacement] of replacements) {
        text = text.replace(pattern, replacement);
    }
    text = text.trim();

    // 属性关键词列表
    const statKeywords = [
        '热熔伤害加成', '熱熔傷害加成', '导电伤害加成', '導電傷害加成', '冷凝伤害加成', '冷凝傷害加成', '氣動傷害加成', '气动伤害加成',
        '湮灭伤害加成', '湮滅傷害加成', '衍射伤害加成', '衍射傷害加成', '共鸣解放伤害加成', '共鳴解放傷害加成', '共鸣技能伤害加成', '共鳴技能傷害加成',
        '普攻伤害加成', '普攻傷害加成', '重击伤害加成', '重擊傷害加成', '治疗效果加成', '治療效果加成', '暴击伤害', '暴擊傷害', '暴击', '暴擊',
        '攻击百分比', '攻擊百分比', '攻击', '攻擊', '防御百分比', '防禦百分比', '防御', '防禦', '生命百分比', '共鳴效率', '生命', '共鸣效率'
    ];

    // 拆分行，保留所有行以便后续精准提取
    let lines = text.split('\n').map(l => l.trim()).filter(l => l);

    // 过滤无意义行
    lines = lines.filter(l => l && l.length > 1 &&
        !/^\d+\/\d+$/.test(l) &&
        !l.includes('15100') &&
        !l.includes('0/50'));

    // 过滤明显无关的关键词行
    const ignoreLineKeywords = ['特征码', '声骸强化', '强化消耗材料', '快捷放入', '已完成全部调谐', '调谐成功', '我銷製讀伤實加', 'X成通', '不限'];
    lines = lines.filter(l => !ignoreLineKeywords.some(kw => l.includes(kw)));

    // 过滤表格符号行
    lines = lines.filter(l => !/[\|\-—=]{2,}/.test(l));

    // 定义强化等级匹配正则
    const levelRegex = /^(?:MAX|max|\+\d{1,2})$/;

    const scoreLineRegex = /^\d+\.\d+[-A-Za-z]+$/;

    const phantomData = {
        name: '',
        level: '',
        mainStats: [],
        subStats: []
    };

    const usedLines = new Set();

    // 提取声骸名称和强化等级
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 增强名称识别
        if (!phantomData.name) {
            const nameKeywords = ['·', '冠顶', '辛吉勒姆', '共鸣回响', '苍隼', '双极', '渊陨重锋', '格洛犸图', '影烁者', '岩蛛', '象', '无冠者', '角', '钟', '龟', '鹭', '猿', '猩', '虎', '狼', '鸟', '蜂', '蝎', '蛛', '蜥', '蟹', '鱼', '蝶', '蕈', '傀', '偶', '兵', '将', '士'];
            if (nameKeywords.some(kw => line.includes(kw))) {
                let isStat = false;
                for (const kw of statKeywords) {
                    if (line.includes(kw)) { isStat = true; break; }
                }
                if (!isStat && line.length <= 15) { // 名称通常不会太长
                    phantomData.name = line.replace(/\s+/g, '');
                    usedLines.add(i);
                    continue;
                }
            }
        }

        if (!phantomData.level && levelRegex.test(line)) {
            phantomData.level = line.startsWith('+') ? line : '+25';
            usedLines.add(i);
            continue;
        }
    }

    let remainingLines = lines.filter((_, idx) => !usedLines.has(idx));
    remainingLines = remainingLines.filter(line => !scoreLineRegex.test(line));

    // 过滤超大纯数字行
    const MAX_VALID_NUMBER = 3000;
    remainingLines = remainingLines.filter(line => {
        const numMatch = line.match(/^\d+$/);
        if (numMatch) {
            const num = parseInt(numMatch[0]);
            if (num > MAX_VALID_NUMBER) return false;
        }
        return true;
    });

    // --- 解析属性-数值对 ---
    const mainPairs = []; // 存放主次词条 (带有 >> 的)
    const otherPairs = []; // 存放其他对 (不带 >> 的)
    let pendingAttrs = [];

    for (let line of remainingLines) {
        // 1. 优先处理带有 >> 的主次词条行
        if (line.includes('>>')) {
            const parts = line.split('>>');
            const lastPart = parts[parts.length - 1].trim();
            const valMatch = lastPart.match(/[\d.]+%?/);
            if (valMatch) {
                const val = valMatch[0];
                let attr = '';
                for (const kw of statKeywords) {
                    if (line.includes(kw)) { attr = kw; break; }
                }
                if (!attr) {
                    const beforeArrow = parts[0].replace(/[\d.%]/g, '').trim();
                    if (beforeArrow) attr = beforeArrow;
                }
                if (attr) {
                    mainPairs.push({ attributeName: cleanAttributeName(attr), attributeValue: val });
                    continue;
                }
            }
        }

        // 2. 匹配普通的混合行 (属性+数值)
        const mixedMatch = line.match(/^([\u4e00-\u9fa5\s]+?)[\s:：]+([\d.]+%?)$/);
        if (mixedMatch) {
            let attr = mixedMatch[1].trim();
            const val = mixedMatch[2].trim();
            attr = cleanAttributeName(attr);
            otherPairs.push({ attributeName: attr, attributeValue: val });
            continue;
        }

        // 3. 处理属性名和数值分离的情况
        const normalizedLine = normalizeNumber(line);
        const isValue = /^[\d.]+%?$/.test(normalizedLine);

        if (isValue && pendingAttrs.length > 0) {
            let attr = pendingAttrs.shift();
            attr = cleanAttributeName(attr);
            otherPairs.push({ attributeName: attr, attributeValue: normalizedLine });
            continue;
        }

        // 4. 识别属性名
        let isAttribute = false;
        if (/[\u4e00-\u9fa5]/.test(line)) { 
            for (const keyword of statKeywords) {
                if (line.includes(keyword)) {
                    pendingAttrs.push(line);
                    isAttribute = true;
                    break;
                }
            }
            if (!isAttribute && /[伤害加成攻击暴击防御生命效率]/.test(line) && !/\d/.test(line)) {
                pendingAttrs.push(line);
                isAttribute = true;
            }
        }
    }

    // --- 分配主、次、副词条 ---
    
    // 如果识别到了带有 >> 的行，这些行强制作为主词条和次词条
    if (mainPairs.length > 0) {
        phantomData.mainStats = mainPairs.slice(0, 2); // 取前两个作为主词条1和主词条2
        // 其余所有识别到的 otherPairs 以及 mainPairs 剩下的部分都作为副词条
        phantomData.subStats = [...mainPairs.slice(2), ...otherPairs];
    } else if (otherPairs.length > 0) {
        // 如果没有 >> 标记，按原有的数值特征从 otherPairs 中匹配
        const main1Candidates = [
            { nameIncludes: '暴击伤害', value: 44, cost: 4 },
            { nameIncludes: '暴击', value: 22, cost: 4 },
            { nameIncludes: '治疗效果加成', value: 26.4, cost: 4 },
            { nameIncludes: '防御', value: 41.8, cost: 4 },
            { nameIncludes: '攻击', value: 33, cost: 4 },
            { nameIncludes: '生命', value: 33, cost: 4 },
            { nameIncludes: '伤害加成', value: 30, cost: 3 },
            { nameIncludes: '共鸣效率', value: 32, cost: 3 },
            { nameIncludes: '生命', value: 30, cost: 3 },
            { nameIncludes: '攻击', value: 30, cost: 3 },
            { nameIncludes: '防御', value: 38, cost: 3 },
            { nameIncludes: '攻击', value: 18, cost: 1 },
            { nameIncludes: '生命', value: 22.8, cost: 1 },
            { nameIncludes: '防御', value: 18, cost: 1 }
        ];
        const main2Candidates = [
            { cost: 4, nameIncludes: '攻击', value: 150 },
            { cost: 3, nameIncludes: '攻击', value: 100 },
            { cost: 1, nameIncludes: '生命', value: 2280 }
        ];

        let main1Idx = -1;
        let main2Idx = -1;
        let detectedCost = 3;

        // 匹配主词条1
        for (let i = 0; i < otherPairs.length; i++) {
            const pair = otherPairs[i];
            const val = parseFloat(pair.attributeValue.replace('%', ''));
            if (isNaN(val)) continue;
            for (const cand of main1Candidates) {
                if (pair.attributeName.includes(cand.nameIncludes) && Math.abs(val - cand.value) < 0.1) {
                    main1Idx = i;
                    detectedCost = cand.cost;
                    break;
                }
            }
            if (main1Idx !== -1) break;
        }
        if (main1Idx === -1) main1Idx = 0;

        phantomData.mainStats.push(otherPairs[main1Idx]);
        const afterMain1 = otherPairs.filter((_, idx) => idx !== main1Idx);

        // 匹配主词条2
        for (let i = 0; i < afterMain1.length; i++) {
            const pair = afterMain1[i];
            const val = parseFloat(pair.attributeValue);
            if (isNaN(val)) continue;
            for (const cand of main2Candidates) {
                if (cand.cost === detectedCost && pair.attributeName.includes(cand.nameIncludes) && Math.abs(val - cand.value) < (cand.cost === 1 ? 10 : 1)) {
                    main2Idx = i;
                    break;
                }
            }
            if (main2Idx !== -1) break;
        }

        if (main2Idx !== -1) {
            phantomData.mainStats.push(afterMain1[main2Idx]);
            phantomData.subStats = afterMain1.filter((_, idx) => idx !== main2Idx);
        } else {
            phantomData.subStats = afterMain1;
        }
    }

    if (!phantomData.name && phantomData.mainStats.length > 0) {
        const mainStat = phantomData.mainStats[0];
        const cost = getCostByMainStat(mainStat.attributeName, mainStat.attributeValue);
        phantomData.name = `未识别声骸-${cost}cost`;
    }

    return phantomData;
}

function replacePhantomStats(targetPhantom, ocrData) {
    if (!targetPhantom || !ocrData) return false;

    let newCost = null;
    if (ocrData.mainStats && ocrData.mainStats.length > 0) {
        const mainStat = ocrData.mainStats[0];
        newCost = getCostByMainStat(mainStat.attributeName, mainStat.attributeValue);
    }
    if (newCost !== null) {
        targetPhantom.cost = newCost;
        if (targetPhantom.phantomProp) {
            targetPhantom.phantomProp.cost = newCost;
        }
    }

    // 主词条
    const originalMainLength = targetPhantom.mainProps ? targetPhantom.mainProps.length : 2;
    const newMainProps = [];
    for (let i = 0; i < ocrData.mainStats.length; i++) {
        const stat = ocrData.mainStats[i];
        newMainProps.push({
            attributeName: stat.attributeName,
            attributeValue: stat.attributeValue,
            key: `main-${i}`,
            valid: true
        });
    }
    for (let i = ocrData.mainStats.length; i < originalMainLength; i++) {
        newMainProps.push({
            attributeName: '未知',
            attributeValue: '0',
            key: `main-${i}`,
            valid: false
        });
    }
    targetPhantom.mainProps = newMainProps;

    // 副词条
    const newSubProps = [];
    for (let i = 0; i < ocrData.subStats.length; i++) {
        const stat = ocrData.subStats[i];
        newSubProps.push({
            attributeName: stat.attributeName,
            attributeValue: stat.attributeValue,
            key: `sub-${i}`,
            valid: true
        });
    }
    targetPhantom.subProps = newSubProps;

    return true;
}

export class CharacterScore extends plugin {
    constructor() {
        super({
            name: "鸣潮-角色评分",
            event: "message",
            priority: 1006,
            rule: [
                {
                    reg: "^(?:～|\~)(.*)评分",
                    fnc: "characterScore"
                }
            ]
        })
    }

    async characterScore(e) {
        logger.mark(logger.blue('[WAVES 评分]'), `触发命令: ${e.msg}`);

        const match = e.msg.match(this.rule[0].reg);
        const message = match ? match[1].trim() : '';

        if (!message) {
            return await e.reply('请输入角色名，如：～爱弥斯评分');
        }

        // ====================== 检查 OCR Key 配置 ======================
        const ocrKeys = getOcrKeys();
        if (ocrKeys.length === 0) {
            return await e.reply(
                '⚠️ 未配置 OCR API Key！\n\n' +
                '请添加至少一个API key'
            );
        }

        let images = [...(e.img || [])];

        if (e.source) {
            let source;
            try {
                source = (await e[e.isGroup ? 'group' : 'friend']?.getChatHistory(
                    e.isGroup ? e.source?.seq : e.source?.time + 1, 1
                ))?.pop();
            } catch (error) {
                console.error('获取历史消息出错:', error);
            }
            if (source) {
                for (const msg of source.message) {
                    if (msg.type === 'image') images.push(msg.url);
                    else if (msg.type === 'json' && /resid/.test(msg.data)) {
                        const resid = msg.data.match(/"resid":"(.*?)"/)?.[1];
                        if (resid) {
                            const forwardMessages = await e.bot?.getForwardMsg(resid) || [];
                            forwardMessages.forEach(item => 
                                images.push(...item.message.filter(itm => itm.type === 'image').map(itm => itm.url))
                            );
                        }
                    }
                }
            }
        }

        if (e.reply_id) {
            let reply;
            try {
                const replyMsg = await e.getReply(e.reply_id);
                reply = replyMsg?.message || [];
            } catch (err) {
                console.error('获取回复消息失败:', err);
                reply = [];
            }
            for (const val of reply) {
                if (val.type === "image") images.push(val.url);
            }
        }

        if (!images.length) {
            return await e.reply('请在消息中附带图片 或 回复/引用【声骸截图】后再使用 ～角色名评分\n\n支持多张图片');
        }

        const imagesToProcess = images.slice(0, 5);
        const ocrResults = [];

        const forwardMessages = [];

        // ====================== OCR识别图片 ======================
        for (let idx = 0; idx < imagesToProcess.length; idx++) {
            const rolePicUrl = imagesToProcess[idx];

            let ocrText = '';
            let phantomData = null;
            
            // 获取请求使用的 OCR Key
            const currentOcrKey = getNextOcrKey();
            
            try {
                const imgResponse = await fetch(rolePicUrl);
                const arrayBuffer = await imgResponse.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;

                const res = await fetch('https://api.ocr.space/parse/image', {
                    method: 'POST',
                    body: new URLSearchParams({
                        apikey: currentOcrKey,
                        base64Image,
                        language: 'chs',
                        OCREngine: '2',
                        scale: 'true',
                        detectOrientation: 'true'
                    }),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                });

                const json = await res.json();
                if (json.ParsedResults?.[0]?.ParsedText) {
                    ocrText = json.ParsedResults[0].ParsedText.trim();
                    phantomData = extractPhantomDataFromOCR(ocrText);
                    
                    let summary = `✅ 第 ${idx + 1}/${imagesToProcess.length} 张图片识别完成\n`;
                    summary += `声骸: ${phantomData.name || '未知'}\n`;
                    summary += `等级: ${phantomData.level || '未知'}\n`;
                    if (phantomData.mainStats.length > 0) {
                        summary += `主词条: ${phantomData.mainStats[0].attributeName} ${phantomData.mainStats[0].attributeValue}\n`;
                    }
                    if (phantomData.mainStats.length > 1) {
                        summary += `次词条: ${phantomData.mainStats[1].attributeName} ${phantomData.mainStats[1].attributeValue}\n`;
                    }
                    summary += `副词条(${phantomData.subStats.length}条):\n`;
                    phantomData.subStats.forEach((stat, i) => {
                        summary += `  ${i+1}. ${stat.attributeName} ${stat.attributeValue}\n`;
                    });
                    
                    ocrResults.push({
                        index: idx,
                        phantomData: phantomData,
                        summary: summary
                    });
                    
                    forwardMessages.push({ message: summary, nickname: e.bot?.nickname || 'Bot' });
                } else if (json.ErrorMessage) {
                    const errMsg = `❌ 第 ${idx + 1} 张图片识别失败: ${json.ErrorMessage.join('; ')}`;
                    forwardMessages.push({ message: errMsg, nickname: e.bot?.nickname || 'Bot' });
                } else {
                    const warnMsg = `❌ 第 ${idx + 1} 张图片未识别到文字`;
                    forwardMessages.push({ message: warnMsg, nickname: e.bot?.nickname || 'Bot' });
                }
            } catch (err) {
                const errMsg = `❌ 第 ${idx + 1} 张图片处理出错: ${err.message}`;
                forwardMessages.push({ message: errMsg, nickname: e.bot?.nickname || 'Bot' });
            }
        }

        if (ocrResults.length === 0) {
            if (forwardMessages.length > 0) {
                if (!e.isGroup) {
                    const forward = await e.bot.makeForwardMsg(forwardMessages);
                    await e.reply(forward);
                }
            } else {
                await e.reply('未成功识别到任何声骸信息，请检查图片清晰度');
            }
            return;
        }

        forwardMessages.push({ 
            message: `📊 共识别到 ${ocrResults.length} 个声骸，正在计算评分...`, 
            nickname: e.bot?.nickname || 'Bot' 
        });

        const wiki = new Wiki();
        let name = await wiki.getAlias(message);
        let dataFileName = name.includes('漂泊者') ? '漂泊者' : name;

        const dataFilePath = path.join(pluginResources, 'CharacterMAX', `${dataFileName}.json`);

        if (!fs.existsSync(dataFilePath)) {
            const errMsg = `暂未收录【${name}】的面板数据`;
            forwardMessages.push({ message: errMsg, nickname: e.bot?.nickname || 'Bot' });
            if (!e.isGroup) {
                const forward = await e.bot.makeForwardMsg(forwardMessages);
                await e.reply(forward);
            }
            return true;
        }

        let roleDetail;
        try {
            const rawData = fs.readFileSync(dataFilePath, 'utf-8');
            let maxData = JSON.parse(rawData);
            let roleDetailData = maxData.data || maxData;
            if (typeof roleDetailData === 'string') roleDetailData = JSON.parse(roleDetailData);

            roleDetail = { status: true, data: roleDetailData };
            
            const originalData = JSON.parse(JSON.stringify(roleDetail.data));
            
            const phantomList = roleDetail.data.phantomData?.equipPhantomList || [];
            if (phantomList.length === 0) {
                const errMsg = '角色面板数据中没有找到配置';
                forwardMessages.push({ message: errMsg, nickname: e.bot?.nickname || 'Bot' });
                if (!e.isGroup) {
                    const forward = await e.bot.makeForwardMsg(forwardMessages);
                    await e.reply(forward);
                }
                return true;
            }

            const replacementLog = [];
            
            for (let i = 0; i < Math.min(ocrResults.length, phantomList.length); i++) {
                const ocrResult = ocrResults[i];
                const phantomData = ocrResult.phantomData;
                const targetPhantom = phantomList[i];
                
                if (targetPhantom) {
                    const replaced = replacePhantomStats(targetPhantom, phantomData);
                    
                    if (replaced) {
                        targetPhantom.hasBeenReplaced = true;
                        const cost = targetPhantom.cost || 0;
                        replacementLog.push({
                            index: i + 1,
                            phantomName: phantomData.name || `声骸${i+1}`,
                            cost: cost,
                            mainStat: phantomData.mainStats[0] ? `${phantomData.mainStats[0].attributeName} ${phantomData.mainStats[0].attributeValue}` : '未知',
                            subStat: phantomData.mainStats[1] ? `${phantomData.mainStats[1].attributeName} ${phantomData.mainStats[1].attributeValue}` : null,
                            subStatCount: phantomData.subStats.length
                        });
                    }
                }
            }

            phantomList.forEach(phantom => {
                if (!phantom.hasBeenReplaced) {
                    if (phantom.mainProps) {
                        phantom.mainProps.forEach(prop => {
                            prop.attributeValue = '0';
                            prop.valid = false;
                        });
                    }
                    if (phantom.subProps) {
                        phantom.subProps.forEach(prop => {
                            prop.attributeValue = '0';
                            prop.valid = false;
                        });
                    }
                }
            });

            forwardMessages.push({ 
                message: '🔄 正在计算评分...', 
                nickname: e.bot?.nickname || 'Bot' 
            });

            const calculated = new WeightCalculator(roleDetail.data).calculate();
            roleDetail.data = calculated;
            
            if (!roleDetail.data.weightVersion) roleDetail.data.weightVersion = '1.0';
            
            roleDetail.data.ocrReplacements = {
                count: replacementLog.length,
                total: phantomList.length,
                logs: replacementLog,
                originalScore: originalData.score || 0,
                newScore: calculated.score || 0
            };

            const rolePicDir = path.join(pluginResources, 'rolePic', name);
            let rolePicUrl = '';
            try {
                const webpFiles = fs.readdirSync(rolePicDir).filter(f => f.toLowerCase().endsWith('.webp'));
                if (webpFiles.length > 0) {
                    const randomFile = webpFiles[Math.floor(Math.random() * webpFiles.length)];
                    rolePicUrl = `file://${rolePicDir}/${randomFile}`;
                }
            } catch (err) {}

            // ====================== 处理漂泊者显示 ======================
            const roleId = roleDetail.data.role?.roleId?.toString();
            let displayName = name;
            if (name === '漂泊者' && roleId && WAVERIDER_ATTRIBUTES[roleId]) {
                displayName = `漂泊者${WAVERIDER_ATTRIBUTES[roleId]}`;
                if (roleDetail.data.role) {
                    roleDetail.data.role.name = displayName;
                }
            }


            let summaryMsg = `🔧 声骸词条识别完成\n`;
            summaryMsg += `角色: ${displayName}\n`;
            summaryMsg += `识别了 ${replacementLog.length}/${phantomList.length} 个声骸\n\n`;
            replacementLog.forEach(log => {
                summaryMsg += `${log.index}. ${log.phantomName} (${log.cost}cost)\n`;
                summaryMsg += `   主: ${log.mainStat}\n`;
                if (log.subStat) {
                    summaryMsg += `   次: ${log.subStat}\n`;
                }
                summaryMsg += `   副: ${log.subStatCount}条词条\n`;
            });
            forwardMessages.push({ message: summaryMsg, nickname: e.bot?.nickname || 'Bot' });

            // 发送合并转发消息
            if (!e.isGroup) {
                const forward = await e.bot.makeForwardMsg(forwardMessages);
                await e.reply(forward);
            }

            // ====================== 渲染评分 ======================
            const displayPhantomList = phantomList.filter(p => p.hasBeenReplaced);
            const displayRoleDetail = JSON.parse(JSON.stringify(roleDetail));
            displayRoleDetail.data.phantomData.equipPhantomList = displayPhantomList;
            
            const renderData = { 
                uid: 'USER_OCR_REPLACE', 
                rolePicUrl: rolePicUrl,
                roleDetail: displayRoleDetail 
            };

            const imageCard = await Render.render('Template/charProfile/charProfile', { 
                data: renderData 
            }, { e, retType: 'base64' });

            if (imageCard) {
                const msgRes = await e.reply(imageCard);
                if (msgRes?.message_id) {
                    const ids = Array.isArray(msgRes.message_id) ? msgRes.message_id : [msgRes.message_id];
                    for (const id of ids) {
                        await redis.set(`Yunzai:waves:originpic:${id}`, JSON.stringify({
                            type: 'ocrScore',
                            img: [rolePicUrl],
                            character: displayName,
                            ocrResults: ocrResults.map(r => ({
                                name: r.phantomData.name,
                                mainStat: r.phantomData.mainStats[0],
                                subStats: r.phantomData.subStats
                            })),
                            replacements: replacementLog
                        }), { EX: 3600 * 3 });
                    }
                }
            } else {
                await e.reply('生成评分失败，请检查模板配置');
            }

        } catch (error) {
            console.error('处理评分时出错:', error);
            const errMsg = `处理【${name}】评分时发生错误：${error.message}`;
            forwardMessages.push({ message: errMsg, nickname: e.bot?.nickname || 'Bot' });
            if (!e.isGroup) {
                const forward = await e.bot.makeForwardMsg(forwardMessages);
                await e.reply(forward);
            }
        }
        
        return true;
    }
}
