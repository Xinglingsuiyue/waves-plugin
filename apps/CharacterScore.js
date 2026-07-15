import plugin from '../../../lib/plugins/plugin.js'
import WeightCalculator from '../utils/Calculate.js'
import { pluginResources } from '../model/path.js';
import Wiki from '../components/Wiki.js';
import Render from '../components/Render.js';
import Config from '../components/Config.js';
import path from 'path';
import fs from 'fs';

let sharp = null;
try {
    const sharpModule = await import('sharp');
    sharp = sharpModule.default || sharpModule;
} catch (err) {
    logger.mark(logger.blue('[WAVES 评分]'), logger.red('未检测到 sharp 依赖，图片过大时将无法自动压缩:'), logger.red(err.message));
}

const MAX_OCR_BYTES = 1024 * 1024;
async function compressImageUnderLimit(buffer, maxBytes) {
    if (!sharp) return null;
    try {
        for (let quality = 85; quality >= 30; quality -= 15) {
            const output = await sharp(buffer).jpeg({ quality }).toBuffer();
            if (output.length <= maxBytes) return output;
        }
        for (const width of [1600, 1200, 900]) {
            const output = await sharp(buffer)
                .resize({ width, withoutEnlargement: true })
                .jpeg({ quality: 50 })
                .toBuffer();
            if (output.length <= maxBytes) return output;
        }
        return null;
    } catch (err) {
        logger.mark(logger.blue('[WAVES 评分]'), logger.red('图片压缩失败:'), logger.red(err));
        return null;
    }
}


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

let _ocrKeyIndex = 0;


function getNextOcrKey() {
    const keys = getOcrKeys();
    if (keys.length === 0) return null;
    const key = keys[_ocrKeyIndex % keys.length];
    _ocrKeyIndex = (_ocrKeyIndex + 1) % keys.length;
    return key;
}

// 漂泊者属性ID映射
import { WAVERIDER_ATTRIBUTES } from '../utils/damage/waveriderMap.js';


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

function normalizeNumber(line) {
    let normalized = line.trim();
    normalized = normalized.replace(/[-–—]/g, '.');
    normalized = normalized.replace(/\s+/g, '');
    normalized = normalized.replace(/^([\d.]+%?)[.,，。]+$/, '$1');
    normalized = normalized.replace(/\.{2,}/g, '.');
    if (/^[\d.]+%?$/.test(normalized)) {
        return normalized;
    }
    return line;
}

//提取声骸词条信息
function extractPhantomDataFromOCR(rawText) {
    const phantomData = {
        name: '',
        level: '',
        mainStats: [],
        subStats: []
    };
    
    if (!rawText || typeof rawText !== 'string') {
        logger.mark(logger.blue('[WAVES 评分]'), logger.red('[OCR调试]'), 'rawText 无效，不是字符串类型');
        return phantomData;
    }
    
    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), '原始文本长度:', rawText.length);
    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), '原始文本前200字符:', rawText.substring(0, 200).replace(/\n/g, '\\n'));
    
    // 常见错别字替换表
    const replacements = [
        [/COST/gi, 'cost'],
        [/MAX/gi, 'max'],
        [/＆/g, ''],
        [/&/g, ''],
        [/[，:：。、*,•+×]/g, ' '],
        [/素/g, ''],
        [/表/g, ''],
        [/笑/g, ''],
        [/教/g, ''],
        [/岑/g, ''],
        [/環/g, ''],
        [/ooo/g, ''],
        [/OOO/g, ''],
        [/000/g, ''],
        [/总/g, ''],
        [/衣/g, ''],
        [/病/g, ''],
        [/森/g, ''],
        [/点/g, ''],
        [/瑕/g, ''],
        [/农/g, ''],
        [/－/g, ''],
        [/-/g, ''],
        [/16%/g, ''],
        [/51%/g, ''],
        [/書/g, '害'],
        [/政击/g, '攻击'],
        [/(?<![\d+])25(?!\d)/g, ''],
        [/生前/g, '生命'],
        [/焱/g, ''],
        [/士/g, ''],
        [/土/g, ''],
        [/誕/g, ''],
        [/只/g, ''],
        [/功率/g, ''],
        [/A/g, ''],
        [/B/g, ''],
        [/C/g, ''],
        [/D/g, ''],
        [/E/g, ''],
        [/F/g, ''],
        [/G/g, ''],
        [/H/g, ''],
        [/I/g, ''],
        [/J/g, ''],
        [/K/g, ''],
        [/L/g, ''],
        [/M/g, ''],
        [/N/g, ''],
        [/O/g, ''],
        [/P/g, ''],
        [/Q/g, ''],
        [/R/g, ''],
        [/S/g, ''],
        [/T/g, ''],
        [/U/g, ''],
        [/V/g, ''],
        [/W/g, ''],
        [/X/g, ''],
        [/Y/g, ''],
        [/Z/g, ''],
        [/a/g, ''],
        [/b/g, ''],
        [/c/g, ''],
        [/d/g, ''],
        [/e/g, ''],
        [/f/g, ''],
        [/g/g, ''],
        [/h/g, ''],
        [/i/g, ''],
        [/j/g, ''],
        [/k/g, ''],
        [/l/g, ''],
        [/m/g, ''],
        [/n/g, ''],
        [/o/g, ''],
        [/p/g, ''],
        [/q/g, ''],
        [/r/g, ''],
        [/s/g, ''],
        [/t/g, ''],
        [/u/g, ''],
        [/v/g, ''],
        [/w/g, ''],
        [/x/g, ''],
        [/y/g, ''],
        [/z/g, ''],
        [/包/g, ''],
        [/然/g, ''],
        [/©/g, ''],
        [/沒/g, ''],
        [/没/g, ''],
        [/炎/g, ''],
        [/十/g, ''],
        [/一/g, ''],
        [/＋/g, ''],
        [/－/g, ''],
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
        [/(?<!\d)63(?!\d)/g, '6.3'],
        [/(?<!\d)69(?!\d)/g, '6.9'],
        [/(?<!\d)75(?!\d)/g, '7.5'],
        [/(?<!\d)81(?!\d)/g, '8.1'],
        [/(?<!\d)87(?!\d)/g, '8.7'],
        [/(?<!\d)93(?!\d)/g, '9.3'],
        [/(?<!\d)99(?!\d)/g, '9.9'],
        [/(?<!\d)105(?!\d)/g, '10.5'],
        [/(?<!\d)126(?!\d)/g, '12.6'],
        [/(?<!\d)138(?!\d)/g, '13.8'],
        [/(?<!\d)162(?!\d)/g, '16.2'],
        [/(?<!\d)174(?!\d)/g, '17.4'],
        [/(?<!\d)186(?!\d)/g, '18.6'],
        [/(?<!\d)198(?!\d)/g, '19.8'],
        [/(?<!\d)68(?!\d)/g, '6.8'],
        [/(?<!\d)76(?!\d)/g, '7.6'],
        [/(?<!\d)84(?!\d)/g, '8.4'],
        [/(?<!\d)92(?!\d)/g, '9.2'],
        [/(?<!\d)108(?!\d)/g, '10.8'],
        [/(?<!\d)116(?!\d)/g, '11.6'],
        [/(?<!\d)109(?!\d)/g, '10.9'],
        [/(?<!\d)118(?!\d)/g, '11.8'],
        [/(?<!\d)128(?!\d)/g, '12.8'],
        [/(?<!\d)147(?!\d)/g, '14.7'],
        [/(?<!\d)3\.1(?!\d)/g, '8.1'],
        [/(?<!\d)124(?!\d)/g, '12.4'],
        [/(?<!\d)64(?!\d)/g, '6.4'],
        [/(?<!\d)71(?!\d)/g, '7.1'],
        [/(?<!\d)79(?!\d)/g, '7.9'],
        [/(?<!\d)86(?!\d)/g, '8.6'],
        [/(?<!\d)94(?!\d)/g, '9.4'],
        [/(?<!\d)101(?!\d)/g, '10.1'],
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
        [/普攻(?!伤害加成)/g, '普攻伤害加成'],
        [/普攻伤古如成/g, '普攻伤害加成'],
        [/最击伤害/g, '暴击伤害'],
        [/桑击/g, '暴击'],
        [/寨击/g, '暴击'],
        [/爆击/g, '暴击'],
        [/潮顾重/g, '潮顾重'],
        [/泰击/g, '暴击'],
        [/治疗加成/g, '治疗效果加成'],
        [/能量效率/g, '共鸣效率'],
        [/共鸣技能伤古如成/g, '共鸣技能伤害加成'],
        [/共鸣解放伤古如成/g, '共鸣解放伤害加成'],
        [/伤害加成伤害加成/g, '伤害加成'],
        [/暴击伤古/g, '暴击伤害'],
        [/火攻击/g, '攻击'],
        [/攻击百分(?![比])/g, '攻击百分比'],
        [/生命百分(?![比])/g, '生命百分比'],
        [/防御百分(?![比])/g, '防御百分比'],
        [/暴击伤(?![害])/g, '暴击伤害'],
        [/治疗效果(?![加成])/g, '治疗效果加成'],
        [/重击伤害(?![加成])/g, '重击伤害加成'],
        [/普攻伤害(?![加成])/g, '普攻伤害加成'],
        [/共鸣技能伤害(?![加成])/g, '共鸣技能伤害加成'],
        [/共鸣解放伤害(?![加成])/g, '共鸣解放伤害加成'],
        [/热熔伤害(?![加成])/g, '热熔伤害加成'],
        [/导电伤害(?![加成])/g, '导电伤害加成'],
        [/冷凝伤害(?![加成])/g, '冷凝伤害加成'],
        [/气动伤害(?![加成])/g, '气动伤害加成'],
        [/湮灭伤害(?![加成])/g, '湮灭伤害加成'],
        [/衍射伤害(?![加成])/g, '衍射伤害加成'],
        [/共鸣效(?![率])/g, '共鸣效率'],
        [/热熔(?![\u4e00-\u9fa5])/g, '热熔伤害加成'],
        [/多热熔/g, '热熔伤害加成'],
        [/冷凝(?![\u4e00-\u9fa5])/g, '冷凝伤害加成'],
        [/导电(?![\u4e00-\u9fa5])/g, '导电伤害加成'],
        [/气动(?![\u4e00-\u9fa5])/g, '气动伤害加成'],
        [/湮灭(?![\u4e00-\u9fa5])/g, '湮灭伤害加成'],
        [/衍射(?![\u4e00-\u9fa5])/g, '衍射伤害加成'],
        [/妨缷/g, '防御'],
        [/防御百分比/g, '防御百分比'],
        [/重击(?!伤害加成)/g, '重击伤害加成'],
        [/重击伤古如成/g, '重击伤害加成'],
        [/垂击/g, '重击'],
        [/双扱/g, '双极'],
        [/攻击百分比/g, '攻击百分比'],
        [/生命百分比/g, '生命百分比'],
        [/防御百分比/g, '防御百分比'],
        [/共鸣技能(?!伤害加成)/g, '共鸣技能伤害加成'],
        [/共鸣解放(?!伤害加成)/g, '共鸣解放伤害加成'],
    ];

    let text = rawText;
    if (Array.isArray(replacements)) {
        for (let i = 0; i < replacements.length; i++) {
            const entry = replacements[i];
            if (Array.isArray(entry) && entry.length >= 2) {
                text = text.replace(entry[0], entry[1]);
            }
        }
    }
    text = text.trim();
    
    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), '替换后文本行数:', text.split('\n').length);

    // 属性关键词列表
    const statKeywords = [
        '热熔伤害加成', '熱熔傷害加成', '导电伤害加成', '導電傷害加成', '冷凝伤害加成', '冷凝傷害加成', '氣動傷害加成', '气动伤害加成',
        '湮灭伤害加成', '湮滅傷害加成', '衍射伤害加成', '衍射傷害加成', '共鸣解放伤害加成', '共鳴解放傷害加成', '共鸣技能伤害加成', '共鳴技能傷害加成',
        '普攻伤害加成', '普攻傷害加成', '重击伤害加成', '重擊傷害加成', '治疗效果加成', '治療效果加成', '暴击伤害', '暴擊傷害', '暴击', '暴擊',
        '攻击百分比', '攻擊百分比', '攻击', '攻擊', '防御百分比', '防禦百分比', '防御', '防禦', '生命百分比', '共鳴效率', '生命', '共鸣效率'
    ];

    let lines = text.split('\n').map(l => l.trim()).filter(l => l);
    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), '初始行数:', lines.length);

    lines = lines.filter(l => l && l.length > 1 &&
        !/^\d+\/\d+$/.test(l) &&
        !l.includes('15100') &&
        !l.includes('0/50'));
    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), '过滤后行数:', lines.length);
    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), '过滤后内容:', lines.slice(0, 20).join(' | '));

    // 过滤明显无关的关键词行
    const ignoreLineKeywords = [
        '特征码', '特花码', '声骸强化', '强化消耗材料', '快捷放入', '已完成全部调谐', '调谐成功',
        '技能使下个变奏技能登场的角', '我銷製讀伤實加', '颤樂战厘率', 'X成通', '不限',
        'GPU', '温度', '功率', '利用率', 'FPS', '简述', '全部', '声骸推荐', '声骸调谐',
        '使用声骸技能', '声骸技能', '对敌人造成', '在此后', '若自', '技能冷却',
        '合鸣效果', '简述', '找码固峒', '角色为敌人添加', '聚爆效应'
    ];
    lines = lines.filter(l => !ignoreLineKeywords.some(kw => l.toLowerCase().includes(kw.toLowerCase())));

    // 过滤表格符号行
    lines = lines.filter(l => !/[\|\-—=]{2,}/.test(l));

    // 定义强化等级匹配正则
    const levelRegex = /^(?:MAX|max|\+\d{1,2})$/;

    const scoreLineRegex = /^\d+\.\d+[-A-Za-z]+$/;

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
                const invalidNameKeywords = ['使用', '造成', '伤害', '敌人', '技能', '在此后', '若自', '角色为', '添加'];
                const isInvalidName = invalidNameKeywords.some(kw => line.includes(kw));
                if (!isStat && !isInvalidName && line.length <= 15) {
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
        const numMatch = line.match(/^\d+(\.\d+)?$/);
        if (numMatch) {
            const num = parseFloat(numMatch[0]);
            if (num > MAX_VALID_NUMBER) {
                logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[过滤]'), '异常超大数值(可能为货币/晶蕊计数):', line);
                return false;
            }
        }
        return true;
    });

    // --- 解析属性-数值对 ---
    const mainPairs = [];
    const otherPairs = [];
    let pendingAttrs = [];

    for (let li = 0; li < remainingLines.length; li++) {
        const line = remainingLines[li];
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
            // 特殊数值反推
            const main2Reverse = [
                { value: '150', name: '攻击', consume: '攻击' },
                { value: '100', name: '攻击', consume: '攻击' },
                { value: '2280', name: '生命', consume: '生命' }
            ];
            let isMain2Value = false;
            for (const m2 of main2Reverse) {
                if (normalizedLine === m2.value || normalizedLine === m2.value + '%') {
                    const consumeIdx = pendingAttrs.findIndex(attr => attr.includes(m2.consume));
                    if (consumeIdx !== -1) {
                        pendingAttrs.splice(consumeIdx, 1);
                        logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[反推]'), `数值 ${m2.value} 反推为 ${m2.name}，消耗 pendingAttrs[${consumeIdx}]`);
                    } else {
                        logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[反推]'), `数值 ${m2.value} 反推为 ${m2.name}，OCR未识别属性名，不消耗pendingAttrs`);
                    }
                    otherPairs.push({ attributeName: m2.name, attributeValue: m2.value });
                    isMain2Value = true;
                    break;
                }
            }
            if (!isMain2Value) {
                // 普通数值
                let attr = pendingAttrs.shift();
                attr = cleanAttributeName(attr);
                otherPairs.push({ attributeName: attr, attributeValue: normalizedLine });
            }
            continue;
        }

        // 识别属性名
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
    
    // 过滤垃圾数据
    for (let i = otherPairs.length - 1; i >= 0; i--) {
        const pair = otherPairs[i];
        // 过滤过长的属性
        if (pair.attributeName.length > 15) {
            logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[过滤]'), '过长属性名:', pair.attributeName);
            otherPairs.splice(i, 1);
            continue;
        }
        // 过滤包含技能描述关键词的
        const skillKeywords = ['造成', '伤害加成伤', '在此后', '若', '敌人', '使用', '召唤'];
        if (skillKeywords.some(kw => pair.attributeName.includes(kw))) {
            logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[过滤]'), '技能描述:', pair.attributeName);
            otherPairs.splice(i, 1);
        }
    }

    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), 'mainPairs数量:', mainPairs.length, 'otherPairs数量:', otherPairs.length);
    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), 'mainPairs:', JSON.stringify(mainPairs));
    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), 'otherPairs:', JSON.stringify(otherPairs.slice(0, 10)));
    
    // --- 分配主、次、副词条 ---
    if (mainPairs.length > 0) {
        phantomData.mainStats = mainPairs.slice(0, 2); 
        phantomData.subStats = [...mainPairs.slice(2), ...otherPairs];
    } else if (otherPairs.length > 0) {
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

    // --- 副词条验证和修正 ---
    const verifiedSubStats = [];
    for (const stat of phantomData.subStats) {
        const val = parseFloat(stat.attributeValue.replace('%', ''));
        const isPct = stat.attributeValue.includes('%');
        let corrected = { ...stat };
        
        // 规则1
        if (isPct && val >= 6.0 && val <= 12.0) {
            if (stat.attributeName === '攻击') {
                corrected.attributeName = '攻击百分比';
                logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[修正]'), '攻击 → 攻击百分比:', stat.attributeValue);
            } else if (stat.attributeName === '生命') {
                corrected.attributeName = '生命百分比';
                logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[修正]'), '生命 → 生命百分比:', stat.attributeValue);
            } else if (stat.attributeName === '防御') {
                corrected.attributeName = '防御百分比';
                logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[修正]'), '防御 → 防御百分比:', stat.attributeValue);
            }
        }
        
        // 规则2
        if (!isPct && val >= 300 && val <= 600 && stat.attributeName !== '生命') {
            logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[修正]'), stat.attributeName, '→ 生命:', stat.attributeValue);
            corrected.attributeName = '生命';
        }
        
        // 规则3
        if (!isPct && val >= 30 && val <= 70) {
            if (stat.attributeName === '暴击伤害' || stat.attributeName === '暴击') {
                if (val >= 40 && val <= 70) {
                    logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[修正]'), stat.attributeName, '→ 防御:', stat.attributeValue);
                    corrected.attributeName = '防御';
                } else {
                    logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[修正]'), stat.attributeName, '→ 攻击:', stat.attributeValue);
                    corrected.attributeName = '攻击';
                }
            }
        }
        
        verifiedSubStats.push(corrected);
    }
    phantomData.subStats = verifiedSubStats;
    
    const seen = new Set();
    phantomData.subStats = phantomData.subStats.filter(stat => {
        const key = stat.attributeName + '|' + stat.attributeValue;
        if (seen.has(key)) {
            logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[去重]'), '重复词条:', stat.attributeName, stat.attributeValue);
            return false;
        }
        seen.add(key);
        return true;
    });
    if (phantomData.subStats.length > 5) {
        logger.mark(logger.blue('[WAVES 评分]'), logger.yellow('[截断]'), '副词条超过5条，截断为前5条');
        phantomData.subStats = phantomData.subStats.slice(0, 5);
    }

    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), '识别结果 - 名称:', phantomData.name, '等级:', phantomData.level);
    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), '主词条:', JSON.stringify(phantomData.mainStats));
    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), '副词条数:', phantomData.subStats.length, '内容:', JSON.stringify(phantomData.subStats));

    if (!phantomData.name && phantomData.mainStats.length > 0) {
        const mainStat = phantomData.mainStats[0];
        const cost = getCostByMainStat(mainStat.attributeName, mainStat.attributeValue);
        phantomData.name = `未识别声骸-${cost}cost`;
    }

    return phantomData;
}

// 从单个消息段中提取图片直链。
// 兼容两种格式：OneBot 11 嵌套格式 { type:'image', data:{ url } }
// 以及 icqq/Yunzai 内部的平铺格式 { type:'image', url }
function getImageUrlFromSegment(seg) {
    if (!seg || seg.type !== 'image') return null;
    const data = seg.data || seg;
    return data.url || seg.url || null;
}

// 拉取合并转发消息里的各个节点，兼容不同协议
async function fetchForwardNodes(e, id) {
    const bot = e?.bot;
    if (!bot) return [];

    if (typeof bot.getForwardMsg === 'function') {
        try {
            const nodes = await bot.getForwardMsg(id);
            if (Array.isArray(nodes) && nodes.length > 0) {
                return nodes.map(n => (Array.isArray(n?.message) ? n.message : []));
            }
        } catch (err) {
            console.error('bot.getForwardMsg 调用失败，尝试走 OneBot get_forward_msg API:', err);
        }
    }

    let res = null;
    try {
        if (typeof bot.sendApi === 'function') {
            res = await bot.sendApi('get_forward_msg', { id, message_id: id });
        } else if (typeof bot.api === 'function') {
            res = await bot.api('get_forward_msg', { id, message_id: id });
        } else {
            console.error('当前协议端不支持 getForwardMsg / sendApi，无法解析转发消息');
            return [];
        }
    } catch (err) {
        console.error('获取转发消息失败 (get_forward_msg):', err);
        return [];
    }

    if (res && typeof res === 'object' && 'retcode' in res) {
        if (res.retcode !== 0) {
            console.error('get_forward_msg 返回错误:', res.message || res.msg || `retcode=${res.retcode}`);
            return [];
        }
        res = res.data;
    }

    const rawNodes = res?.messages || res?.message || [];
    if (!Array.isArray(rawNodes)) return [];
    return rawNodes.map(node =>
        Array.isArray(node?.content) ? node.content
            : Array.isArray(node?.message) ? node.message
            : Array.isArray(node?.data?.content) ? node.data.content
            : []
    );
}

// 递归解析合并转发消息。
// 防止转发套娃导致死循环。
async function collectImageUrlsFromForwardId(e, id, depth = 0) {
    if (!id || depth > 3) return [];
    const nodeSegmentsList = await fetchForwardNodes(e, id);
    const urls = [];
    for (const segs of nodeSegmentsList) {
        urls.push(...(await collectImageUrlsFromSegments(e, segs, depth + 1)));
    }
    return urls;
}

async function collectImageUrlsFromSegments(e, segments, depth = 0) {
    const urls = [];
    if (!Array.isArray(segments)) return urls;

    for (const seg of segments) {
        if (!seg || !seg.type) continue;
        const data = seg.data || seg;

        if (seg.type === 'image') {
            const url = getImageUrlFromSegment(seg);
            if (url) urls.push(url);
        } else if (seg.type === 'forward') {
            const id = data.id || data.resId || data.res_id || seg.id || seg.resId || seg.res_id;
            if (id) urls.push(...(await collectImageUrlsFromForwardId(e, id, depth)));
        } else if (seg.type === 'json') {
            const jsonStr = typeof seg.data === 'string' ? seg.data : (typeof data.data === 'string' ? data.data : '');
            if (jsonStr && /resid/i.test(jsonStr)) {
                const resid = jsonStr.match(/"resid":"(.*?)"/i)?.[1];
                if (resid) urls.push(...(await collectImageUrlsFromForwardId(e, resid, depth)));
            }
        }
    }
    return urls;
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
            priority: 1008,
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
            return await e.reply('请输入角色名，如：～今汐评分');
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
            if (source && Array.isArray(source.message)) {
                images.push(...(await collectImageUrlsFromSegments(e, source.message)));
            }
        }

        if (e.reply_id) {
            let reply = [];
            try {
                const replyMsg = await e.getReply(e.reply_id);
                reply = replyMsg?.message || [];
            } catch (err) {
                console.error('获取回复消息失败:', err);
                reply = [];
            }
            images.push(...(await collectImageUrlsFromSegments(e, reply)));
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
                let buffer = Buffer.from(arrayBuffer);
                let mimeType = 'image/png';

                if (buffer.length > MAX_OCR_BYTES) {
                    logger.mark(logger.blue('[WAVES 评分]'), logger.yellow(`第${idx + 1}张图片大小 ${(buffer.length / 1024).toFixed(0)}KB 超过1MB限制，尝试压缩...`));
                    const compressed = await compressImageUnderLimit(buffer, MAX_OCR_BYTES);
                    if (compressed) {
                        buffer = compressed;
                        mimeType = 'image/jpeg';
                        logger.mark(logger.blue('[WAVES 评分]'), logger.green(`第${idx + 1}张图片压缩后大小 ${(buffer.length / 1024).toFixed(0)}KB`));
                    } else {
                        const warnMsg = `⚠️ 第 ${idx + 1} 张图片过大，请重新上传`;
                        forwardMessages.push({ message: warnMsg, nickname: e.bot?.nickname || 'Bot' });
                        continue;
                    }
                }

                const base64Image = `data:${mimeType};base64,${buffer.toString('base64')}`;

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
                
                // 调试日志：输出OCR API完整响应
                logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), `第${idx + 1}张图片OCR响应:`);
                logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), 'OCRExitCode:', json.OCRExitCode);
                logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), 'IsErroredOnProcessing:', json.IsErroredOnProcessing);
                logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), 'ErrorMessage:', JSON.stringify(json.ErrorMessage));
                logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), 'ParsedResults长度:', json.ParsedResults?.length || 0);
                if (json.ParsedResults?.[0]) {
                    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), 'ParsedText存在:', !!json.ParsedResults[0].ParsedText);
                    logger.mark(logger.blue('[WAVES 评分]'), logger.green('[OCR调试]'), 'ParsedText前100字符:', json.ParsedResults[0].ParsedText?.substring(0, 100)?.replace(/\n/g, '\\n'));
                }
                
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
                    const forward = await Bot.makeForwardMsg(forwardMessages);
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
                const forward = await Bot.makeForwardMsg(forwardMessages);
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
                    const forward = await Bot.makeForwardMsg(forwardMessages);
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
                const forward = await Bot.makeForwardMsg(forwardMessages);
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
                const forward = await Bot.makeForwardMsg(forwardMessages);
                await e.reply(forward);
            }
        }
        
        return true;
    }
}
