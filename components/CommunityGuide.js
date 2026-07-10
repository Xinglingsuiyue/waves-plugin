import puppeteer from '../../../lib/puppeteer/puppeteer.js';
import Config from './Config.js';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fs from 'fs';
import path from 'path';
import { pluginRoot, _path } from '../model/path.js';

const GUIDE_SERVER = 'https://guide-server.aki-game.com';
const GUIDE_PAGE_URL = 'https://mcguide.kurogames.com/zh-Hans';

const guideApi = axios.create();

guideApi.interceptors.request.use(async config => {
    const proxyUrl = Config.getConfig().proxy_url;
    if (proxyUrl) {
        const proxyAgent = new HttpsProxyAgent(proxyUrl);
        config.httpsAgent = proxyAgent;
    }
    return config;
}, error => Promise.reject(error));

const wait = (ms) => new Promise(r => setTimeout(r, ms));

class CommunityGuide {
    constructor() {
        this.roleCache = null;
        this.roleCacheTime = 0;
        this.CACHE_TTL = 30 * 60 * 1000;
        this._lock = Promise.resolve();
    }

    async _ensureBrowser() {
        if (!puppeteer.browser || typeof puppeteer.browser.newPage !== 'function') {
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.yellow('浏览器未就绪，重新初始化...'));
            await puppeteer.browserInit();
            await wait(2000);
        }
    }

    async captureGuideScreenshots(roleGbId, guides) {
        const result = new Map();

        const doCapture = async () => {
            const cacheDir = path.join(_path, 'data', 'wavesStrategy');
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            await this._ensureBrowser();

            for (const guide of guides) {
                const cacheFile = path.join(cacheDir, `${guide.guideId}.jpg`);
                if (fs.existsSync(cacheFile)) {
                    result.set(guide.guideId, cacheFile);
                    continue;
                }

                let info = null;
                try {
                    const resp = await guideApi.get(`${GUIDE_SERVER}/introduction/info`, {
                        params: { roleGbId, id: guide.guideId }
                    });
                    if (resp.data.code === 200) {
                        info = this._parse(resp.data.data);
                    }
                } catch (err) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`获取攻略详情API失败: ${guide.guideId}`), logger.red(err.message));
                }

                if (!info) {
                    result.set(guide.guideId, null);
                    continue;
                }

                // 构建 HTML 并截图
                const html = this._html(info);
                // 调试日志
                logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`攻略数据: attrs=${info.attrs?.length || 0}, echo=${info.echo ? 'Y' : 'N'}, skills=${info.skills?.length || 0}, weapons=${info.weapons?.length || 0}, teammates=${info.teammates?.length || 0}, resonances=${info.resonances?.length || 0}, synopsis=${info.synopsis ? 'Y' : 'N'}, detail=${info.detail ? 'Y' : 'N'}`));

                if (info.teammates && info.teammates.length > 0) {
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`队友武器/声骸命中情况: ${info.teammates.map(tm => `${tm.main?.name || '?'}[weapon=${tm.weapon ? 'Y' : 'N'},echo=${tm.echo ? 'Y' : 'N'}]`).join(' ')}`));
                }
                let page = null;
                try {
                    await this._ensureBrowser();
                    page = await puppeteer.browser.newPage();

                    await page.setViewport({ width: 873, height: 900, deviceScaleFactor: 2 });

                    // 注入 HTML 内容
                    try {

                        if (typeof page.setContent === 'function') {
                            await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
                        } else {
                            throw new Error('setContent not available');
                        }
                    } catch {

                        await page.goto('about:blank');
                        await page.evaluate((content) => {
                            document.open('text/html');
                            document.write(content);
                            document.close();
                        }, html);
                    }
                    await wait(4000);

                    const img = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 88 });
                    fs.writeFileSync(cacheFile, img);
                    result.set(guide.guideId, cacheFile);
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.green(`社区攻略截图成功: ${guide.guideId}`));
                } catch (err) {
                    result.set(guide.guideId, null);
                    logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan(`社区攻略截图失败: ${guide.guideId}`), logger.red(err.message));
                } finally {
                    try { if (page) await page.close().catch(() => {}); } catch {}
                }
            }
        };

        this._lock = this._lock.then(doCapture, doCapture);
        await this._lock;
        return result;
    }

    _parse(d) {
        const bt = (d.baseTexts || d.texts || []).find(t => t.language === 'zh-Hans') || {};

        // 属性推荐
        let attrs = [];
        if (d.roleAttribute?.items) {
            attrs = d.roleAttribute.items.map(a => ({
                icon: a.pictureUrl || '',
                name: (a.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
                value: a.recommendAmount || ''
            }));
        }

        // 声骸
        let echo = null;
        if (d.echo) {
            const parseEchoItem = (item) => {
                if (!item) return null;
                return {
                    icon: item.echoProps?.pictureUrl || '',
                    name: (item.echoProps?.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
                    desc: (item.echoProps?.texts || []).find(t => t.language === 'zh-Hans')?.skillDescription || '',
                    sets: (item.echoSetEffects || []).map(s => ({
                        icon: s.pictureUrl || '',
                        name: (s.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
                        desc: (s.texts || []).find(t => t.language === 'zh-Hans')?.description || '',
                        set: s.echoSet || 0
                    })),
                    attrs: (item.echoAttributes || []).map(a => ({
                        cost: a.cost,
                        mainIcon: a.attribute?.pictureUrl || '',
                        mainName: (a.attribute?.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
                        subIcon: a.attribute2?.pictureUrl || '',
                        subName: (a.attribute2?.texts || []).find(t => t.language === 'zh-Hans')?.name || ''
                    }))
                };
            };
            echo = {
                main: parseEchoItem(d.echo.main),
                spare: parseEchoItem(d.echo.spare)
            };
        }
        const echoText = (d.echoTexts || []).find(t => t.language === 'zh-Hans');
        const echoRec = echoText?.recommendDescription || '';

        // 技能加点顺序
        const parseSkillItem = (s) => ({
            icon: s.pictureUrl || '',
            type: (s.skillType?.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
            name: (s.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
            desc: (s.texts || []).find(t => t.language === 'zh-Hans')?.description || ''
        });
        let skillSequence = [];
        if (d.roleSkill?.addPointSequence) {
            skillSequence = d.roleSkill.addPointSequence.filter(Boolean).map(parseSkillItem);
        }
        // 固有技能
        let fixedSkills = [];
        if (d.roleSkill?.fixedSkills) {
            fixedSkills = d.roleSkill.fixedSkills.filter(Boolean).map(parseSkillItem);
        }
        // 延奏技能/谐度破坏
        let keynoteSkills = [];
        if (d.roleSkill?.keynoteSkills) {
            keynoteSkills = d.roleSkill.keynoteSkills.filter(Boolean).map(parseSkillItem);
        }
        // 弧形图固定顺序：常态攻击-共鸣技能-共鸣回路-共鸣解放-变奏技能
        let skillArc = [];
        if (d.roleSkill?.addPointTarget) {
            skillArc = d.roleSkill.addPointTarget.filter(Boolean).map(parseSkillItem);
        }

        // 共鸣链
        let resonances = [];
        if (d.roleResonance?.items) {
            resonances = d.roleResonance.items.map(r => ({
                seq: r.resonanceSequence || 0,
                icon: r.pictureUrl || '',
                name: (r.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
                desc: (r.texts || []).find(t => t.language === 'zh-Hans')?.description || '',
                status: r.status || 0
            }));
        }
        const resText = (d.roleResonanceTexts || []).find(t => t.language === 'zh-Hans');
        const resRec = resText?.recommendDescription || '';

        // 武器
        let weapons = [];
        if (d.weapon?.items) {
            weapons = d.weapon.items.map(w => ({
                icon: w.pictureUrl || '',
                star: w.star || 0,
                name: (w.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
                effect: (w.texts || []).find(t => t.language === 'zh-Hans')?.effectName || '',
                effectDesc: (w.texts || []).find(t => t.language === 'zh-Hans')?.effectDescription || '',
                status: w.status || 0
            }));
        }
        const wpText = (d.weaponTexts || []).find(t => t.language === 'zh-Hans');
        const wpRec = wpText?.recommendDescription || '';

        // 队友
        const parseTmWeapon = (w) => {
            if (!w) return null;
            return {
                icon: w.pictureUrl || '',
                name: (w.texts || []).find(t => t.language === 'zh-Hans')?.name || ''
            };
        };
        const parseTmEcho = (tm) => {
            if (!tm || !tm.echoProps) return null;
            const sets = [tm.echoSetEffect2, tm.echoSetEffect5].filter(Boolean).map(s => ({
                icon: s.pictureUrl || '',
                name: (s.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
                set: s.echoSet || 0
            }));
            return {
                icon: tm.echoProps.pictureUrl || '',
                name: (tm.echoProps.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
                sets,
                attrs: (tm.echoAttributes || []).map(a => ({
                    cost: a.cost,
                    mainName: (a.attribute?.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
                    subName: (a.attribute2?.texts || []).find(t => t.language === 'zh-Hans')?.name || ''
                }))
            };
        };
        let teammates = [];
        if (d.teammate?.items) {
            teammates = d.teammate.items.map(tm => ({
                main: tm.main ? {
                    name: (tm.main.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
                    icon: tm.main.illustrationPictureUrl || tm.main.cardPictureUrl || '',
                    star: tm.main.star || 0,
                    attr: tm.main.attributeId || '',
                    element: tm.main.element?.pictureUrl || ''
                } : null,
                weapon: parseTmWeapon(tm.weapon),
                echo: parseTmEcho(tm),
                spares: (tm.spares || []).filter(Boolean).map(s => ({
                    name: (s.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
                    icon: s.cardPictureUrl || '',
                    star: s.star || 0
                }))
            }));
        }


        // 角色卡片左上角的图标
        let roleTypes = [];
        if (d.role?.rolePlays) {
            roleTypes = d.role.rolePlays.filter(Boolean).map(p => ({
                icon: p.pictureUrl || ''
            }));
        }
        let elementIcon = d.role?.element?.pictureUrl || null;

        return {
            title: bt.introductionName || '',
            source: bt.introductionSource || '',
            desc: bt.introductionDescription || '',
            synopsis: bt.introductionSynopsis || '',
            detail: bt.introductionDetail || '',
            roleDesc: bt.roleDescription || '',
            illus: d.role?.illustrationPictureUrl || '',
            card: d.role?.cardPictureUrl || '',
            roleName: (d.role?.texts || []).find(t => t.language === 'zh-Hans')?.name || '',
            star: d.role?.star || 0,
            elementIcon,
            roleTypes,
            like: d.likeCount || 0,
            collect: d.collectCount || 0,
            attrs, echo, echoRec, skills: skillSequence, fixedSkills, keynoteSkills, skillArc, resonances, resRec, weapons, wpRec, teammates
        };
    }


    _richText(html) {
        if (!html) return '';
        let s = String(html);
        s = s.replace(/<script[\s\S]*?<\/script>/gi, '')
             .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
             .replace(/<(object|embed|link|style|meta)\b[^>]*>/gi, '')
             .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
             .replace(/javascript\s*:/gi, '');

        s = s.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (m, tag, attrs) => {
            const t = tag.toLowerCase();
            if (!['p', 'br', 'span', 'strong', 'b', 'em', 'i'].includes(t)) return '';
            if (t === 'br') return '<br>';
            if (t === 'span' && /^\s*\S/.test(attrs)) {
                const colorMatch = attrs.match(/style\s*=\s*["']([^"']*)["']/i);
                if (colorMatch) {
                    const colorOnly = colorMatch[1].match(/color\s*:\s*[^;"']+/i);
                    if (colorOnly && !/url\(|expression\(/i.test(colorOnly[0])) {
                        return `<span style="${colorOnly[0]}">`;
                    }
                }
                return '<span>';
            }
            return m.startsWith('</') ? `</${t}>` : `<${t}>`;
        });
        return s.trim();
    }


    _plainText(html) {
        return String(html || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    }

_html(info) {
        const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        const STAR_IMG = 'https://mcguide.kurogames.com/assets/start-Dx8rdMp9.webp';
        const BG_LINE = 'https://mcguide.kurogames.com/assets/bg-line-C8I8ZLNC.webp';
        const FIVE_BG = 'https://mcguide.kurogames.com/assets/five-bg-Dra9qiQC.webp';
        const FOUR_BG = 'https://mcguide.kurogames.com/assets/four-bg-JUho4zXn.webp';
        const WEAPON_NAME_BG = 'https://mcguide.kurogames.com/assets/weapon-bg-BdI34pFD.webp';
        const CORNER_DIAMONDS = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD4AAAAjCAYAAADMibkBAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkFGNDQ0NDhEQzhFMzExRUZCREU2RDcwMTI3NENDM0Y3IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkFGNDQ0NDhFQzhFMzExRUZCREU2RDcwMTI3NENDM0Y3Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QUY0NDQ0OEJDOEUzMTFFRkJERTZENzAxMjc0Q0MzRjciIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QUY0NDQ0OENDOEUzMTFFRkJERTZENzAxMjc0Q0MzRjciLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6cLypnAAADgUlEQVR42uSZeYhPURTHf7MgS0goa2NN1jAjDA3ZIrLNMLKXpGyhoaZkGtvwh0mDsQwaf2gWW03TlL2EyD6Wf1AmRBjDWKbB/Hxvfaduz1t/987vqd+pT+/37uvdc8+9555z7vtFFe5dEfBROoOPoCbciqMD/koSGOiHYr8NHwFGRaLh48AkPxTH+mh0L9AH9ABtQGWkrPhCXhuB6ZHi6sLTFkv3S/9HwxMaQG8y6CrdjwZDNPafoMPw9Zo9Q/SVbtK+WaOOuaCLiuEtwUwwXOOghFsPMGmfASZq0jENTFExfBZoAlI1Dag9yLJ5vo/6VGQw6O00ZjvDo8AaaZVaKw5I9JcH2jqkuB2KelbxOoaT4NnwZOnFFiBNcUDpdEEnWQfmh6ijP1gk3Wd6NbwVyDa0bbDYm25kJdjqwTOOuZwkWWJArqEomwpS3BouOjgFOhnaxd47A9p5jOCZ3LtRHt5rTF1ejo57LOr+I2YLZjS8GSgC4y067wmugG4uBtIdnFdIU7FcQbEIHRwmN0uKR2bee5EHon8Mj2YEf8irnfQDd8Fq0NzkuZjdA+AZDyGqMhu8ADkmwSoRXAebXGSTq2B7vcfGpEyOF9F6F8hwmFlZmjJqdgT3QDVnNo1GJ3HL6BJRzw/j2T0InrOwyuZBx20MSGTmeCpWuopuEgeOuuzkHBUuB2/Y9gVsY2yYJzrXaHgh6AtGMvBV073juJX+uOjjNoinR5fLe1wcC5dxEoI2HezmyxUWz3+BAjAIbAF1Cga/43k9lVvHKDWcbJEBftj0c5Yeet8uqufYpJ587qegi0H/ZkRPdhiUlYh4M5QB0knKwBKLcd3ixP10k8czGDRkeekxvcizPcGj8eVgLHjr4Z1icNjQ9h3MAbVuC5ggS7+goaIK9WvoDQ6gzqV7iwPG5xCrwyrpfqfVlrQrWR+AUv5+BEoUA1QpB2InYqIXgNch6qhkVglwAvaHejrLla7BgLqIPf/Y5rmIIZcUdRziWE8aVt+T4aLi+QROa0pLYq+ttVmtjRp0VDB1Faucx2sZ5T9ozMmXwQWT9myNekpMgrPnT08HG+Cbm/HM/Y0HGV2Sx3pCyfD3DWC4qJufSPfH7fZjCOI4Zj+/q+dLv0+EW7mfhhdJhdGdcCv38y+kV0xtZX4o9/tPQxF5r0Wi4TdZzgYiydXrDzBf/VD8V4ABAKforGnuLPqnAAAAAElFTkSuQmCC';
        const gradeBg = (star) => star >= 5 ? FIVE_BG : FOUR_BG;
        const S = (n, size) => new Array(n).fill(`<img class="role-pic-item" src="${STAR_IMG}"${size ? ` style="width:${size}px;height:${size}px;display:inline-block"` : ''}/>`).join('');


        const officialCSS = `/* ===== 官网 CSS 已处理 (无 var()/calc()) ===== */
:root {
    --gpx: 0.4395833333333333px;
    --color-text: #ece5d8;
    --color-text-secondary: #adadad;
    --color-text-tertiary: #ac8839;
    --color-text-quaternary: #0b0d0a;
    --color-text-quinary: #e3dbd0;
    --color-text-senary: #cabaa3;
    --color-text-septenary: #d3af7c;
    --color-text-octonary: #767068;
    --color-text-nonary: #ffe09e;
    --color-text-denary: #6c665e;
    --color-text-ternary: #dab57e;
    --color-text-white: #ffffff;
    --color-text-secondary-dark: #504f4c;
    --color-text-quinary-dark: #201d1c;
    --color-text-nonary-dark: #ffefd7;
    --color-text-senary-dark: #bab2a6;
    --color-text-octonary-dark: #a08864;
    --color-text-ternary-dark: #d0b48d;
    --color-gold: #d6c17b;
    --color-text-gold: #ffdba8;
    --color-dark-brown: #3a362f;
    --color-line-warm: #4e4434;
    --color-border-cream: #dabf98;
    --color-bg: #494034;
    --bg-color: #1c171e;
    --border-color: #867357;
    --table-bg-color: rgba(61, 57, 40, .3);
    --title-color: #aa9b6a;
    --title-level-color: #ffd12f;
    --active-color: #facc89;
    --like-color: #d7b27e;
    --like-bg-color: #483e33;
    --like-border-color: #d4b17a;
    --like-btn-color: #c2b294;
    --like-btn-bg-color: #ffe1b6;
    --like-btn-border-color: #ffd12f;
    --general-game-element-imaginary: #f9ce8f;
    --general-game-element-default: #6c5f4d;
    --general-game-element-scrollbar-track: #433c2f;
    --general-game-element-scrollbar-thumb: #8f7a5b;
    --background-color: #2f2c26;
    --color-hover-border: #f4eee7;
    --color-icon: #666666;
    --color-text-olive: #716749;
}
/* =====  CSS 变量 ===== */

*{margin:0;padding:0;box-sizing:border-box;user-select:none}
body{background:#1b1b1b;color:#ece5d8;width:1280px;font-family:"Microsoft YaHei","PingFang SC","Helvetica Neue",sans-serif;font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
img{display:block;max-width:100%;pointer-events:none}
.flex{display:flex}.flex-center{display:flex;align-items:center;justify-content:center}.flex-align-center{display:flex;align-items:center}.flex-align-end{display:flex;align-items:flex-end}.flex-column{display:flex;flex-direction:column}.flex-column-center{display:flex;flex-direction:column;align-items:center}.flex-between{display:flex;justify-content:space-between}.flex-justify-center{display:flex;justify-content:center}.flex-wrap{display:flex;flex-wrap:wrap}.flex-start{display:flex;justify-content:flex-start}
.role-card{border-radius:17.58px 0px 17.58px 0px;width:307.71px;height:412.77px;background:url(https://mcguide.kurogames.com/assets/role-bg-BsSrKbs7.webp) no-repeat center/cover;position:relative}.role-card .role-img{width:307.71px;height:412.77px;position:relative;overflow:hidden}.role-card .role-img img{width:auto;height:100%;position:absolute;bottom:0;left:50%;transform:translate(-50%);object-fit:contain}.role-card .role-bg{position:absolute;top:0;width:100%;height:100%}.role-card .role-skill-content{position:absolute;top:0;padding:9.23px 11.43px}.role-card .role-skill{position:relative;margin-bottom:9.67px}.role-card .role-skill:before{content:"";position:absolute;top:50%;left:50%;width:36.05px;height:36.05px;border:solid 1.76px #ac8839;border-radius:50%;opacity:.5;transform:translate(-50%,-50%);box-sizing:border-box;z-index:0;pointer-events:none}.role-card .role-skill-item{width:29.89px;height:29.89px;border:solid 0.88px #ac8839;border-radius:50%;display:block;position:relative;z-index:1}.role-card .role-name{width:100%;font-size:35.17px;color:#ece5d8;position:absolute;bottom:63.74px;text-align:center;z-index:1}.role-card .role-name-logo{width:auto;height:40.44px;margin-right:9.67px}.role-card .role-name-text{font-size:35.17px;max-width:237.38px;line-height:43.96px;height:43.96px}.role-card .role-pic{width:100%;position:absolute;bottom:4.84px}.role-card .role-pic-item{width:41.32px;height:41.32px}.skill-add-container{background:url(https://mcguide.kurogames.com/assets/skill-add-bg-PWMMcHU4.webp) no-repeat;background-size:100% 100%;box-sizing:border-box;height:96.71px}.skill-add-container .skill-add-title{margin:8.79px 17.58px 4.4px;font-size:15.83px;color:#aa9b6a;width:189.02px;height:26.38px;line-height:21.98px}.skill-add-container .skill-radio{font-size:14.07px;color:#f9ce8f;background-color:#2f2c26;border-radius:10.11px;border:solid 0.44px #f9ce8f;text-align:center;line-height:20.66px;margin-right:17.14px;box-sizing:border-box;cursor:pointer;white-space:nowrap;width:86.6px;height:21.98px;padding:0 4.4px}@media (hover: hover) and (pointer: fine){.skill-add-container .skill-radio:hover{filter:brightness(1.1)}}.skill-add-container .skill-radio.hover{filter:brightness(1.1)}.skill-add-container .skill-icons{margin-left:24.18px}.skill-add-container .skill-icons .skill-icon-image{width:52.31px;height:49.23px;background:url(data:image/webp;base64,UklGRpIFAABXRUJQVlA4WAoAAAAQAAAAdwAAbwAAQUxQSMgDAAABkAVJsmlbc3Bt28azbdu2bdu2bdu2bRuXx8/mPtp7+n5HBAQ3khRJkb3Me9AFWR8gCeRaqMmQ+ZuPX7367NHVKwfWzupVK7stcZdt4b47n3+4vHF853ql8uSOjM2Tt2KTHjN33v90e2XbBL74ddhpuD67YbScLJBd7g5rXr5ZUsuBIc6tjuo3NPEhqxTf67hubWUFLxIX6vbUFeVL9O924/VQbz4U25s+MphEU76VuvnhPChw5EV7exJVgZM184Okx3dVSidbCd7sNO0QB2mRd1LNdCVJFL39VRUpyX3lXA6STBVebPCW7Nr+qnYyklBOs1PKSoP3ofORJLEqpo5XSECeV9OUDP6znjziJTq1NQ2Jg5SznsaITM+0/MREnTMLi8qopxHERtU0ZUVk8v0AYqTSmsqiMfKuD7FSUXVpkej9JJCYqay2gChUT4smdqqVES0CeVUFiKEG3nazGp9X9Ymllm+TWbsXHJ5OPHG41t9K+l1UElOFq/JZt+GqI4mtmj1ysubf+I02xFhbplrz635cxhl/VV6LCdVGE2u1uyKzlPUTiDfyKy0spGCqMzFX0RQHyzjUhdhrVx/LvoWXtvzJme5sCfs6EoB2drMk5ct0QKDIU6V5FowhCF2oZT6v1gVj0Gqf+TeylzBw0oaY42hdEGhpP3MZhd4RhXJXzNBxI6GgzAwz8wfdBAZa08l0/cngi0PjXab/j1wjHHz0ClP0nwUEPcxh8pb6SCzrZIpX0Uh0WmwC93cyJIpeMlUIvEBIuL03QfN1UJDaz5jhY7C4XNDEJtEOi611jdleC4tFHY1wTKmCxfJDRoejv+95IJH38+/hgsOR379/XwVaefW/f/8eLjwIFtJBsHr/FmoiCLKbvwX8yC5fLmC3LcpR+AvBoSmRYrnRAWa9FB4E69y/A9DS/2xGJFi36hGU1i/B/f+Mux/h7r+w8QZufIUbT+LGz7j5Am5+BJsP4ua/uPk+bH0DtZ6zpB9o/crRfP3KWQtTr4OtT9ZErcc+UcLWn7OSejsd6gzaX6CCKc7sb09xyFr6RxSqieZNmysyy/uDx7j3B7OefijlQu3/EvW7wLjfnRe1v98P1c+wVYbq33BF9auIY2/qxdKfA+pHUpUmsTSJmf9KVZnE00hOfrOq6rLi+utS87PJdjMLi+0nVDfgkZXMeBoD65+E9Yui+mNh/cCo/mdYvzeqvx3Vz486v4A6r8F2PqVRjNwS7HN3Es6n8J7H+Xh548TODUrnyROdkCdfpaY9Zu56IMk8jqTzR08eSDl/RFZQOCCkAQAAUA4AnQEqeABwAD4xGIpDoiGhE36sMCADBLO3b+ZmRHpTfyvrntu8b/IfDTnAsQHPt7IBY2nsSfs84wTzNcjOZtM8/tn5diuSCLOknKL5IGh4UWg4PKTOQyZjLIZN8BdDkOlrmjKdT+4J+bETr/SNpSSlAI3BXIHROhtAAP7+VgQzfrix/U6bzHVRwOz2BAewjP/8J8j8gfF5taABAdWT+Lru5w7xpkL0sVN7jC8rVZe9Lp8t0v5IFu/GRrYr7eN8+i8grhX38dm4A4h51xa1BNqyACWrPPj4yZU0+u80/X/Z4lXG2g7/SsWpum033YXZNGEZ6f4gj+rnc+WbFMRMfGv3zX/n79lj0/iRwpVh2yJnwWzDA4eBxo9i/rPNzF6+sKLWYWWmh/al5ZUApTl+tl77CqdWH5mboVNbgIAsaB0WXzRGAgOvRfqX8Ewsg3YApqWPHOTkKvOfkY/37cMy9moX/ycj/iQNWVMNrXkmR5EOytdjg21kXma7CO4E+yhVCLTqe4UtfAWq2+9Z//8J7X7rUA8gCoAmPlyI3O04mppAQAAA) no-repeat center center;background-size:contain;border-radius:50%;cursor:pointer}.skill-add-container .skill-icons .skill-icon-background{width:44.84px;height:44.4px;background-color:#cabaa3;border-radius:50%;display:flex;align-items:center;justify-content:center}.skill-add-container .skill-icons .skill-icon-background img{width:37.36px;height:33.85px;border-radius:50%}@media (hover: hover) and (pointer: fine){.skill-add-container .skill-icons .skill-icon-background:hover{filter:brightness(1.2)}}.skill-add-container .skill-icons .skill-icon-background.hover{filter:brightness(1.2)}.skill-add-container .skill-icons .skill-icon-background.finish{background-color:#e3dbd0}.skill-add-container .skill-icons .skill-icon .skill-symbol{font-weight:600;font-size:21.1px;color:#aa9b6a;margin:0 17.58px}.role-skeleton{background:url(https://mcguide.kurogames.com/assets/skeleton-bg-pWcsiakJ.webp) no-repeat;background-size:100% 100%;box-sizing:border-box;width:100%;padding-bottom:8.79px;margin-bottom:8.79px}.role-skeleton .recommend-skeleton{width:99.35px;padding-top:8.35px}.role-skeleton .recommend-skeleton-title{font-size:15.83px;width:71.65px;height:28.13px;color:#aa9b6a;vertical-align:middle;text-align:center}.role-skeleton .recommend-skeleton-img{width:69.01px;height:69.01px;border-radius:50%;border:solid 1.32px #ffe1b6;position:relative;box-sizing:border-box;margin:4.4px 0 7.47px;overflow:hidden;cursor:pointer;display:flex;align-items:center;justify-content:center}.role-skeleton .recommend-skeleton-img img{width:63.3px;height:63.3px;border-radius:50%}.role-skeleton .recommend-skeleton-img:before{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:63.3px;height:63.3px;background:url(https://mcguide.kurogames.com/assets/header-border-jzZ1brG7.webp) no-repeat;background-size:100%;z-index:2}@media (hover: hover) and (pointer: fine){.role-skeleton .recommend-skeleton-img:hover{background-color:#504f4c}}.role-skeleton .recommend-skeleton-img.hover{background-color:#504f4c}.role-skeleton .recommend-skeleton-name{font-size:14.07px;line-height:13.63px;color:#ece5d8;width:79.13px;height:29.01px;text-align:center}.role-skeleton .skeleton-line{width:0.88px;height:auto;background-color:#4e4434;margin-top:4.4px}.role-skeleton .recommend-content{width:449.69px;padding:8.35px 16.7px 0px 9.23px;box-sizing:border-box}.role-skeleton .recommend-content .content-title .skeleton-title{font-size:15.83px;color:#aa9b6a;width:149.46px;height:19.34px;line-height:19.34px}.role-skeleton .recommend-content .content-title .resonance-chain-pic{width:14.95px;height:15.39px;margin-right:7.03px}.role-skeleton .recommend-content .content-title .resonance-chain-name{font-size:14.07px;color:#ece5d8;max-width:175.83px;height:21.98px;line-height:21.98px}.role-skeleton .recommend-content .content-title .resonance-chain-grade{background-color:#0b0d0a;border-radius:1.76px;border:0.44px solid #c2b294;padding:0 4.4px;font-size:14.07px;margin-left:4.4px;line-height:19.34px;color:#aa9b6a;box-sizing:border-box;height:18.46px}.role-skeleton .recommend-content .skill-content .skill-list{margin-top:8.79px;margin-right:4.4px}.role-skeleton .recommend-content .skill-content .skill-list:last-child{margin-right:0}.role-skeleton .recommend-content .skill-content .skill-list .skill-glade{background-color:#0b0d0a;border-radius:1.76px;width:14.95px;height:14.95px;text-align:center;line-height:14.95px;border:0.44px solid #c2b294;box-sizing:border-box;font-size:14.07px;color:#aa9b6a}.role-skeleton .recommend-content .skill-content .skill-list .line{width:1.32px;height:10.55px;background-color:#ece5d8;margin:1.76px 5.28px 0}.role-skeleton .recommend-content .skill-content .skill-list .s-name{width:108.14px;height:23.74px;line-height:23.74px;font-size:14.07px;color:#ece5d8;word-wrap:break-word;white-space:pre-wrap;vertical-align:middle}.role-skeleton .recommend-content .side-attribute{margin-top:14.95px;font-size:12.31px;color:#ece5d8;max-height:65.94px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;will-change:transform}.role-skeleton .recommend-content .side-attribute-title{font-size:12.31px;color:#aa9b6a}.role-skeleton .recommend-content .side-attribute::-webkit-scrollbar{width:4.4px}.role-skeleton .recommend-content .side-attribute::-webkit-scrollbar-track{background-color:#433c2f}.role-skeleton .recommend-content .side-attribute::-webkit-scrollbar-thumb{background-color:#8f7a5b;border-radius:1.76px}.role-skeleton .recommend-content .side-attribute::-webkit-scrollbar-button{pointer-events:none;height:0}.team-member .small,.team-member .small img{width:43.96px;height:43.96px}.team-member .spare-text{width:43.96px;height:13.19px;line-height:13.19px;text-align:center;font-size:14.07px;color:#adadad;margin-bottom:4.4px}.team-member-pic{width:60.22px;height:59.78px;margin-right:9.23px;background:var(--grade-bg) no-repeat;background-size:100%}.team-member-pic img{width:60.22px;height:59.78px}.team-member-symbol{width:13.63px;height:13.63px;margin:0 10.55px 0 1.76px;background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB8AAAAfCAYAAAAfrhY5AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAydpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMC1jMDAxIDc5LmMwMjA0YjJkZWYsIDIwMjMvMDIvMDItMTI6MTQ6MjQgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyNC41IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpCMkQ4QjlFMjJCMjMxMUYwOTQwNUZDMjY0MTczQjAwMCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpCMkQ4QjlFMzJCMjMxMUYwOTQwNUZDMjY0MTczQjAwMCI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkIyRDhCOUUwMkIyMzExRjA5NDA1RkMyNjQxNzNCMDAwIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkIyRDhCOUUxMkIyMzExRjA5NDA1RkMyNjQxNzNCMDAwIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+TgkeJQAAAEtJREFUeNpivLy+hoEM8B+LGCOphjAxDCAYtXzU8lHLRy0ftZwmgAVHJUGtymY02Ectx0hwjFRKXKMtmVHLRy0ftXzU8lHLGQACDABvvgY/0zxEZQAAAABJRU5ErkJggg==) no-repeat;background-size:100% 100%}.role-team-recommend{margin-top:8.79px;background:url(https://mcguide.kurogames.com/assets/team-bg-IEHddMzm.webp) no-repeat;background-size:100% 100%;padding:0px 17.14px;display:flex;justify-content:center;flex-direction:column;margin-left:10.55px;width:370.13px;height:102.86px;box-sizing:border-box}.role-team-recommend-title{font-size:15.83px;color:#aa9b6a;width:219.79px;height:17.58px;line-height:17.58px;margin-bottom:2.64px}.role-team-recommend .team-recommend{display:flex;align-items:baseline;margin-top:6.59px}.weapon-image{background:var(--grade-bg) no-repeat;background-size:100%;background-repeat:no-repeat;background-size:100% 100%;cursor:pointer}.weapon-image img{width:100%;height:100%}.weapon-image.is-finished{filter:brightness(.7)}.weapon-image.size-small{width:43.96px;height:43.96px}.weapon-image:not(.size-small){width:59.78px;height:59.78px}@media (hover: hover) and (pointer: fine){.weapon-image:hover{filter:brightness(1.5)}}.weapon-image.hover{filter:brightness(1.5)}.role-weapon-recommend{margin-top:8.79px;background:url(https://mcguide.kurogames.com/assets/weapon-bg-agtTngdc.webp) no-repeat;background-size:100% 100%;box-sizing:border-box;padding:8.79px 17.14px;width:169.68px;height:102.42px}.role-weapon-recommend-title{font-size:15.83px;color:#aa9b6a;width:140.67px;height:17.58px;line-height:17.58px;margin-bottom:2.64px}.role-weapon-recommend .isFinished{filter:brightness(.7)}.role-weapon-recommend .weapon-recommend-pic,.role-weapon-recommend .weapon-recommend-name-pic{background:var(--grade-bg) no-repeat;background-size:100%;background-repeat:no-repeat;background-size:100% 100%;cursor:pointer}.role-weapon-recommend .weapon-recommend-pic img,.role-weapon-recommend .weapon-recommend-name-pic img{width:100%;height:100%}@media (hover: hover) and (pointer: fine){.role-weapon-recommend .weapon-recommend-pic:hover,.role-weapon-recommend .weapon-recommend-name-pic:hover{filter:brightness(1.5)}}.role-weapon-recommend .weapon-recommend-pic.hover,.role-weapon-recommend .weapon-recommend-name-pic.hover{filter:brightness(1.5)}.role-weapon-recommend .weapon-recommend-pic{width:59.78px;height:59.78px}.role-weapon-recommend .weapon-recommend-name{margin-left:10.99px;text-align:center;flex-direction:column;height:59.78px}.role-weapon-recommend .weapon-recommend-name-title{font-size:14.07px;color:#adadad;width:43.96px;height:13.19px;line-height:13.19px;margin-bottom:4.4px}.role-weapon-recommend .weapon-recommend-name-pic{width:43.96px;height:43.96px}.role-weapon-recommend .weapon-recommend .bg-color{background:var(--grade-bg) no-repeat;background-size:100%;background-repeat:no-repeat;background-size:100% 100%;cursor:pointer}@media (hover: hover) and (pointer: fine){.role-weapon-recommend .weapon-recommend .bg-color:hover{filter:brightness(1.5)}}.role-weapon-recommend .weapon-recommend .bg-color.hover{filter:brightness(1.5)}.popup__content{width:482.66px;height:351.67px;background:url(https://mcguide.kurogames.com/assets/pop-bg-CEI8mQm0.webp) no-repeat;background-size:100% 100%;position:relative;box-sizing:border-box}.popup__close-btn{width:24.18px!important;height:24.62px!important;position:absolute;top:-24.62px;right:-24.18px;user-select:none;background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAABBCAYAAABmd3xuAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAydpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMC1jMDAxIDc5LmMwMjA0YjJkZWYsIDIwMjMvMDIvMDItMTI6MTQ6MjQgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyNC41IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpFN0ExN0QyOUU1RjQxMUVGODc1MUQwMDc3NTQ3QjBFMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpFN0ExN0QyQUU1RjQxMUVGODc1MUQwMDc3NTQ3QjBFMSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU3QTE3RDI3RTVGNDExRUY4NzUxRDAwNzc1NDdCMEUxIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU3QTE3RDI4RTVGNDExRUY4NzUxRDAwNzc1NDdCMEUxIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+McJMCQAAAy9JREFUeNrsm0lo1kAUx6d1AevSuhUVjxVcStW6YV2KK+hB0CJCBRXFXbocCuJZEDwoanGhWhdQUBQEt7pUEFFBxIMXEa11+aR4VMSiUuv/MS8Q4pfFg5lk8h78Dl8yzZff+5KZyby0oLqqUhmMGnAN/DTx5YUGxZvAZXAB9MuSfCPY7/r1z4M+WZCvBwc821abSEDc8rvAQZ99a8DZOBMQp/w2cBgUBLRZC07GlYC45DeAoyHi7rbHbJJ/Ab5EbNsDHtsk/xwsiZCAXrAFnLHtnn8GlgYkwBFvtbW3fwqWga95xHdwZ2f1OP8ELAffXOJ14HhWZniPOAHfebbXbOIk+hqc2z8EZaDL1AmYfLBRJsWTIK9EXuRFXuRFXuRFXuRFXuTjkR9giWPRv8qP5IWHppSLLwRvwPSo8iPAXVCudFWlMaXi1UrXAUeDO6AyTH4YN5zs2kbVlfqUic8DN1yX/FD2muInX8INpuY5GFVZdqZEfA6LD/RsH85+FV75Yt4xzeeAVGw4ArYmXHw2iw8O6MvugUmOPIm3gRkhB6YEUCVlU0LF6fxvsU9QUALugwkkPx/MjPgFlIAG0D+B8tsjiDtRCtYVco+4Wekl5LB4CRYrQ29ShATdklcitj0F9jj3fCv/cVACXoFF4HNCL/tfoBZcDWl3WunKUK+7t2/hHj1fAl6zeJdKdtAVSXX+6z77z/FV/jvfOE8dWp0nAR08U/qUkqGOElDDnZ876N2fjUpXgX1neM2uWV0nWAByKZvkUAJWgtv8+RJ1cG5xCr+KzSGlS0k09n9M6fT2ByeggafpPd4GQeWqFgue6LrBPnmeF3mRF3mRF3mRF3mRF3mR/69Rwk9dFVmTp7U2KozQu7i0mlqeFfli/sWdEhKtpraDibbLDwE3wSzP9lJOwHhb5QcpXVCo8tk/ihMwzjb5IhafG9JujNIFhTKb5HcrXRyJEmPBCZvk96q/V1P9gurp622Sd1ZT20LavVV6mTxnkzwFraauUnpFOF+8Y/HYVovjHuq6+Qpo92z/wOLvbZ/kUD1gBXjAn3Ms3pmV6S0lgP7H5qLSFaEOEyfxR4ABAG7PkFeZ7phzAAAAAElFTkSuQmCC) no-repeat;background-size:cover;background-position:1.32px 0px;background-size:21.98px}@media (hover: hover) and (pointer: fine){.popup__close-btn:hover{opacity:.8}}.popup__close-btn.hover{opacity:.8}.popup__close-btn:active{opacity:.6}.popup__close-btn img{width:100%;height:100%}.avatar-border,.detail-popup-header .detail-popup-skeleton-avatar{border-radius:50%;border:solid 1.32px #ffe1b6;position:relative;box-sizing:border-box;overflow:hidden}.detail-popup-header{padding:0 21.54px 13.63px}.detail-popup-header .detail-popup-avatar{margin-top:14.51px;width:59.78px;height:59.78px;background:var(--grade-bg) no-repeat;background-size:100%}.detail-popup-header .detail-popup-avatar img{width:100%;height:100%}.detail-popup-header .detail-popup-skeleton-avatar{margin-top:11.43px;width:64.18px;height:64.18px;display:flex;align-items:center;justify-content:center}.detail-popup-header .detail-popup-skeleton-avatar img{width:58.03px;height:58.03px}.detail-popup-header .detail-popup-skeleton-avatar:before{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:58.03px;height:58.03px;background:url(https://mcguide.kurogames.com/assets/header-border-jzZ1brG7.webp) no-repeat;background-size:100%;z-index:2}.detail-popup-header .detail-popup-skill-icon{margin-top:17.14px}.detail-popup-header .detail-popup-skill-icon-image{width:52.75px;height:49.23px;background:url(data:image/webp;base64,UklGRpIFAABXRUJQVlA4WAoAAAAQAAAAdwAAbwAAQUxQSMgDAAABkAVJsmlbc3Bt28azbdu2bdu2bdu2bRuXx8/mPtp7+n5HBAQ3khRJkb3Me9AFWR8gCeRaqMmQ+ZuPX7367NHVKwfWzupVK7stcZdt4b47n3+4vHF853ql8uSOjM2Tt2KTHjN33v90e2XbBL74ddhpuD67YbScLJBd7g5rXr5ZUsuBIc6tjuo3NPEhqxTf67hubWUFLxIX6vbUFeVL9O924/VQbz4U25s+MphEU76VuvnhPChw5EV7exJVgZM184Okx3dVSidbCd7sNO0QB2mRd1LNdCVJFL39VRUpyX3lXA6STBVebPCW7Nr+qnYyklBOs1PKSoP3ofORJLEqpo5XSECeV9OUDP6znjziJTq1NQ2Jg5SznsaITM+0/MREnTMLi8qopxHERtU0ZUVk8v0AYqTSmsqiMfKuD7FSUXVpkej9JJCYqay2gChUT4smdqqVES0CeVUFiKEG3nazGp9X9Ymllm+TWbsXHJ5OPHG41t9K+l1UElOFq/JZt+GqI4mtmj1ysubf+I02xFhbplrz635cxhl/VV6LCdVGE2u1uyKzlPUTiDfyKy0spGCqMzFX0RQHyzjUhdhrVx/LvoWXtvzJme5sCfs6EoB2drMk5ct0QKDIU6V5FowhCF2oZT6v1gVj0Gqf+TeylzBw0oaY42hdEGhpP3MZhd4RhXJXzNBxI6GgzAwz8wfdBAZa08l0/cngi0PjXab/j1wjHHz0ClP0nwUEPcxh8pb6SCzrZIpX0Uh0WmwC93cyJIpeMlUIvEBIuL03QfN1UJDaz5jhY7C4XNDEJtEOi611jdleC4tFHY1wTKmCxfJDRoejv+95IJH38+/hgsOR379/XwVaefW/f/8eLjwIFtJBsHr/FmoiCLKbvwX8yC5fLmC3LcpR+AvBoSmRYrnRAWa9FB4E69y/A9DS/2xGJFi36hGU1i/B/f+Mux/h7r+w8QZufIUbT+LGz7j5Am5+BJsP4ua/uPk+bH0DtZ6zpB9o/crRfP3KWQtTr4OtT9ZErcc+UcLWn7OSejsd6gzaX6CCKc7sb09xyFr6RxSqieZNmysyy/uDx7j3B7OefijlQu3/EvW7wLjfnRe1v98P1c+wVYbq33BF9auIY2/qxdKfA+pHUpUmsTSJmf9KVZnE00hOfrOq6rLi+utS87PJdjMLi+0nVDfgkZXMeBoD65+E9Yui+mNh/cCo/mdYvzeqvx3Vz486v4A6r8F2PqVRjNwS7HN3Es6n8J7H+Xh548TODUrnyROdkCdfpaY9Zu56IMk8jqTzR08eSDl/RFZQOCCkAQAAUA4AnQEqeABwAD4xGIpDoiGhE36sMCADBLO3b+ZmRHpTfyvrntu8b/IfDTnAsQHPt7IBY2nsSfs84wTzNcjOZtM8/tn5diuSCLOknKL5IGh4UWg4PKTOQyZjLIZN8BdDkOlrmjKdT+4J+bETr/SNpSSlAI3BXIHROhtAAP7+VgQzfrix/U6bzHVRwOz2BAewjP/8J8j8gfF5taABAdWT+Lru5w7xpkL0sVN7jC8rVZe9Lp8t0v5IFu/GRrYr7eN8+i8grhX38dm4A4h51xa1BNqyACWrPPj4yZU0+u80/X/Z4lXG2g7/SsWpum033YXZNGEZ6f4gj+rnc+WbFMRMfGv3zX/n79lj0/iRwpVh2yJnwWzDA4eBxo9i/rPNzF6+sKLWYWWmh/al5ZUApTl+tl77CqdWH5mboVNbgIAsaB0WXzRGAgOvRfqX8Ewsg3YApqWPHOTkKvOfkY/37cMy9moX/ycj/iQNWVMNrXkmR5EOytdjg21kXma7CO4E+yhVCLTqe4UtfAWq2+9Z//8J7X7rUA8gCoAmPlyI3O04mppAQAAA) no-repeat;border-radius:50%;background-size:100% 100%}.detail-popup-header .detail-popup-skill-icon-background{width:44.84px;height:43.96px;background-color:#e3dbd0;border-radius:50%}.detail-popup-header .detail-popup-skill-icon-background img{width:37.36px;height:33.85px}.detail-popup-header .detail-popup-skill-icon .skill-symbol{font-weight:600;font-size:15.83px;color:#aa9b6a;margin:0 20.22px}.detail-popup-header .detail-popup-info{margin-top:14.51px;display:flex;flex-direction:column;align-items:flex-start;margin-left:11.43px}.detail-popup-header .detail-popup-info .detail-popup-name{width:197.81px;height:30.77px;font-size:23.74px;letter-spacing:0.44px;color:#ece5d8;line-height:30.77px}.detail-popup-header .detail-popup-info .detail-popup-type{font-size:14.07px;letter-spacing:0.44px;color:#aa9b6a;background-color:#0b0d0a;border-radius:1.76px;border:solid 0.44px #c2b294;padding:0 7.47px;margin-top:9.67px;height:17.58px;line-height:17.58px}.detail-popup-header .detail-popup-info .detail-popup-grade{margin-top:5.28px;background-color:#0b0d0a;border-radius:1.76px;border:0.44px solid #c2b294;padding:0 4.4px;font-size:14.07px;margin-left:4.4px;color:#aa9b6a;font-weight:600;height:17.58px;line-height:17.58px}.detail-popup-header .detail-popup-info .detail-popup-skill{font-size:14.07px;letter-spacing:0.44px;color:#aa9b6a}.detail-popup-skill-text{width:181.11px;height:42.2px;font-size:17.58px;color:#000001;background:url(https://mcguide.kurogames.com/assets/select-bg-CQ8KkQrK.webp) no-repeat;background-size:100% 100%;text-align:center;line-height:42.2px;box-sizing:border-box;margin-top:17.58px;cursor:pointer}@media (hover: hover) and (pointer: fine){.detail-popup-skill-text:hover{filter:brightness(1.1)}}.detail-popup-skill-text.hover{filter:brightness(1.1)}.detail-popup-description{margin:23.74px 14.95px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;will-change:transform;min-height:87.92px;max-height:219.79px;font-size:15.83px;line-height:23.74px;color:#6c665e;position:relative;z-index:1;white-space:pre-line}.detail-popup-description::-webkit-scrollbar{width:4.4px}.detail-popup-description::-webkit-scrollbar-track{background-color:#433c2f}.detail-popup-description::-webkit-scrollbar-thumb{background-color:#8f7a5b;border-radius:1.76px}.detail-popup-description::-webkit-scrollbar-button{pointer-events:none;height:0}.demo-tabs{width:546.84px;height:43.96px;box-sizing:border-box;border-bottom:solid 0.44px #867357}.demo-tabs__list .demo-tabs__item{font-size:17.58px;letter-spacing:0;color:#aa9b6a;width:120.01px;line-height:41.76px;text-align:center;height:41.76px;position:relative;cursor:pointer;transition:color .2s ease}@media (hover: hover) and (pointer: fine){.demo-tabs__list .demo-tabs__item:hover{color:#d6c17b}}.demo-tabs__list .demo-tabs__item.hover{color:#d6c17b}.demo-tabs__list .demo-tabs__item--active{color:#facc89;cursor:default}.demo-tabs__list .demo-tabs__item .demo-tabs__indicator{width:120.01px;height:17.14px;position:absolute;top:34.29px;left:0;animation:expandFromCenter-529c54a7 .5s ease forwards}.demo-tabs__list .demo-tabs__item .demo-tabs__label{font-size:17.58px;width:120.01px;height:43.96px;line-height:43.96px;padding:0 4.4px;box-sizing:border-box}.demo-tabs__back{width:78.25px;height:20.66px;background-color:#2f2c26;border-radius:10.11px;border:solid 0.44px #f9ce8f;font-size:14.07px;line-height:20.66px;text-align:center;color:#f9ce8f;margin-right:12.31px;cursor:pointer;box-sizing:border-box;transition:all .2s ease;padding:0 4.4px}.demo-tabs__back:hover,.demo-tabs__back.hover{background-color:#3a362f;border-color:#ffdba8;color:#ffdba8}.demo-tabs__back .demo-tabs__back-icon{width:14.51px;height:11.87px;margin-right:7.03px}.demo-tabs__back .demo-tabs__back-text{font-size:14.07px;width:65.06px;height:20.66px;white-space:nowrap}@keyframes expandFromCenter-529c54a7{0%{clip-path:inset(0 50% 0 50%);opacity:0}to{clip-path:inset(0 0 0 0);opacity:1}}.skill-list{margin:24.18px 0 20.22px 24.18px}.skill-list__item{cursor:pointer}.skill-list__item--active .skill-list__icon-inner{background-color:#f4eee7}@media (hover: hover) and (pointer: fine){.skill-list__item:hover .skill-list__icon-inner{filter:brightness(1.2)}}.skill-list__item.hover .skill-list__icon-inner{filter:brightness(1.2)}.skill-list__icon-wrapper{width:52.75px;height:49.67px;background:url(data:image/webp;base64,UklGRpIFAABXRUJQVlA4WAoAAAAQAAAAdwAAbwAAQUxQSMgDAAABkAVJsmlbc3Bt28azbdu2bdu2bdu2bRuXx8/mPtp7+n5HBAQ3khRJkb3Me9AFWR8gCeRaqMmQ+ZuPX7367NHVKwfWzupVK7stcZdt4b47n3+4vHF853ql8uSOjM2Tt2KTHjN33v90e2XbBL74ddhpuD67YbScLJBd7g5rXr5ZUsuBIc6tjuo3NPEhqxTf67hubWUFLxIX6vbUFeVL9O924/VQbz4U25s+MphEU76VuvnhPChw5EV7exJVgZM184Okx3dVSidbCd7sNO0QB2mRd1LNdCVJFL39VRUpyX3lXA6STBVebPCW7Nr+qnYyklBOs1PKSoP3ofORJLEqpo5XSECeV9OUDP6znjziJTq1NQ2Jg5SznsaITM+0/MREnTMLi8qopxHERtU0ZUVk8v0AYqTSmsqiMfKuD7FSUXVpkej9JJCYqay2gChUT4smdqqVES0CeVUFiKEG3nazGp9X9Ymllm+TWbsXHJ5OPHG41t9K+l1UElOFq/JZt+GqI4mtmj1ysubf+I02xFhbplrz635cxhl/VV6LCdVGE2u1uyKzlPUTiDfyKy0spGCqMzFX0RQHyzjUhdhrVx/LvoWXtvzJme5sCfs6EoB2drMk5ct0QKDIU6V5FowhCF2oZT6v1gVj0Gqf+TeylzBw0oaY42hdEGhpP3MZhd4RhXJXzNBxI6GgzAwz8wfdBAZa08l0/cngi0PjXab/j1wjHHz0ClP0nwUEPcxh8pb6SCzrZIpX0Uh0WmwC93cyJIpeMlUIvEBIuL03QfN1UJDaz5jhY7C4XNDEJtEOi611jdleC4tFHY1wTKmCxfJDRoejv+95IJH38+/hgsOR379/XwVaefW/f/8eLjwIFtJBsHr/FmoiCLKbvwX8yC5fLmC3LcpR+AvBoSmRYrnRAWa9FB4E69y/A9DS/2xGJFi36hGU1i/B/f+Mux/h7r+w8QZufIUbT+LGz7j5Am5+BJsP4ua/uPk+bH0DtZ6zpB9o/crRfP3KWQtTr4OtT9ZErcc+UcLWn7OSejsd6gzaX6CCKc7sb09xyFr6RxSqieZNmysyy/uDx7j3B7OefijlQu3/EvW7wLjfnRe1v98P1c+wVYbq33BF9auIY2/qxdKfA+pHUpUmsTSJmf9KVZnE00hOfrOq6rLi+utS87PJdjMLi+0nVDfgkZXMeBoD65+E9Yui+mNh/cCo/mdYvzeqvx3Vz486v4A6r8F2PqVRjNwS7HN3Es6n8J7H+Xh548TODUrnyROdkCdfpaY9Zu56IMk8jqTzR08eSDl/RFZQOCCkAQAAUA4AnQEqeABwAD4xGIpDoiGhE36sMCADBLO3b+ZmRHpTfyvrntu8b/IfDTnAsQHPt7IBY2nsSfs84wTzNcjOZtM8/tn5diuSCLOknKL5IGh4UWg4PKTOQyZjLIZN8BdDkOlrmjKdT+4J+bETr/SNpSSlAI3BXIHROhtAAP7+VgQzfrix/U6bzHVRwOz2BAewjP/8J8j8gfF5taABAdWT+Lru5w7xpkL0sVN7jC8rVZe9Lp8t0v5IFu/GRrYr7eN8+i8grhX38dm4A4h51xa1BNqyACWrPPj4yZU0+u80/X/Z4lXG2g7/SsWpum033YXZNGEZ6f4gj+rnc+WbFMRMfGv3zX/n79lj0/iRwpVh2yJnwWzDA4eBxo9i/rPNzF6+sKLWYWWmh/al5ZUApTl+tl77CqdWH5mboVNbgIAsaB0WXzRGAgOvRfqX8Ewsg3YApqWPHOTkKvOfkY/37cMy9moX/ycj/iQNWVMNrXkmR5EOytdjg21kXma7CO4E+yhVCLTqe4UtfAWq2+9Z//8J7X7rUA8gCoAmPlyI3O04mppAQAAA) no-repeat;border-radius:50%;background-size:100% 100%;position:relative}.skill-list__icon-inner{width:45.72px;height:45.72px;background-color:#cabaa3;border-radius:50%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}.skill-list__icon-inner img{width:37.36px;height:33.85px}.skill-list__connector{width:42.2px;height:7.91px;color:#aa9b6a;margin:0 8.79px;background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAAASCAYAAACkctvyAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAydpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMC1jMDAxIDc5LmMwMjA0YjJkZWYsIDIwMjMvMDIvMDItMTI6MTQ6MjQgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyNC41IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGN0Q1MkI0RUE3REExMUYwOEM5QUVGODgxNTFGRDQ3MyIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGN0Q1MkI0RkE3REExMUYwOEM5QUVGODgxNTFGRDQ3MyI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkY3RDUyQjRDQTdEQTExRjA4QzlBRUY4ODE1MUZENDczIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkY3RDUyQjREQTdEQTExRjA4QzlBRUY4ODE1MUZENDczIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+lODjfQAAAchJREFUeNpi/P//PwM9QU9jIbWNZAPiP0D8j1oGltT30y08mBiGPtADYs2h6niWYRABHkD8AYivDkXHD4ccEA7FozlgAIAbEOtA2YZAfH40B5AOfMnUxwzE7cj1OxAzkmiGHBArj+QIEAbiaVCaVFADxEZIfCcgziHRjCAKEgBVAGN3QwHdLAM179CaofOBOAGIFwFxPAlGZQHxFCwp/i8QRwPxSiLM4Afi69Dmqy4Qvx+oOoBeKWAzElsJiBuAOBbKj4O6pRGIb+ExQwqIW6GRhqtYWg6tG+qB+AkOdVpAPBeIJaH8nUCcjlaH+NIrAjYPQMSzQztQ6Kn3Dx49oMq2C4g9CeVqaISCIqMJiO/hsJ8Fze5feBIM7YqgAe4JL4LmggVAnEikEU7QVC6GQ/4qtFlKqF8gBMSXoPUgqCP3cSB6wgPdDC0GYmeQn0nQsw+ILYD4BJZIAAW6LZHl+TukltPHkdoPeA3EGUD8lkR994E4BIgPILXkvgFxIImV6VYg/jnS+wHklrWHoa0oGGgB4tskmgFS/2h0KIJ80AatuEFjQZNHhyLoD0AtnD1Q+stoBAwM2ICjqTkaAXQCoIr48VB1PECAAQBfLls5/0E2cQAAAABJRU5ErkJggg==) no-repeat;background-size:100% 100%}.skill-video{margin-left:18.9px}.skill-video__content{width:250.56px;height:136.27px;overflow:hidden;position:relative}.skill-video__content--ready{background:url(https://mcguide.kurogames.com/assets/video-bg-C-ExEYhW.webp) no-repeat;background-size:100% 100%}.skill-video__content--playable{cursor:pointer}.skill-video__content img{width:246.17px;height:126.6px;object-fit:cover;display:block}.skill-video__title{font-size:15.83px;width:219.79px;height:20.22px;line-height:20.22px;color:#f4eee7;margin-top:8.79px}.skill-video__desc{width:250.56px;height:83.52px;font-size:13.19px;margin-top:8.79px;overflow-y:auto;padding-right:4.4px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;white-space:pre-line;color:#ece5d8}.skill-video__desc::-webkit-scrollbar{width:4.4px}.skill-video__desc::-webkit-scrollbar-track{background-color:#433c2f}.skill-video__desc::-webkit-scrollbar-thumb{background-color:#8f7a5b;border-radius:1.76px}.skill-video__desc::-webkit-scrollbar-button{pointer-events:none;height:0}.skill-video__play{position:absolute;width:22.86px;height:21.98px;background:url(https://mcguide.kurogames.com/assets/play-button-CAPL1PVV.webp) no-repeat;background-size:100% 100%}.skill-video__loading{position:absolute;width:26.38px;height:26.38px;background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAjCAYAAADxG9hnAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAydpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMC1jMDAxIDc5LmMwMjA0YjJkZWYsIDIwMjMvMDIvMDItMTI6MTQ6MjQgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyNC41IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4N0JERjRDRTAzMjUxMUYwODNFOUU4RkZDMUQzQzVEQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo4N0JERjRDRjAzMjUxMUYwODNFOUU4RkZDMUQzQzVEQSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjg3QkRGNENDMDMyNTExRjA4M0U5RThGRkMxRDNDNURBIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjg3QkRGNENEMDMyNTExRjA4M0U5RThGRkMxRDNDNURBIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+bZnzsAAAA5FJREFUeNrMmHtojWEcx9/tzGVDbLKZUUixNGJIKYxWLvEHDW1upU1yWSkUcmsp2V+MUUSG0E5yySVzGZZcZjJM+IMaDk3LbaFdfH/1fdbPu/ecnbNztuNbn8553st5v8/v+b3P83tOhNvttgJQZzARjAejwADQi+dqQTWoAPdBKfjj7w9H+XmdPHAdyAJxPq4bB+bw+1dwHOSDtw7XSocaaLwushUDPcAe8AasbsWEXT3BSvAaHGRbKw/cBd9Amq+IiOOjYJDtuIT/PHgAXnJIRLFgKKMym1E0Uc8BM8FicAO4wGiel+9V3oxkgiPMCaNS9kJ+qNHLfZIbxxi9NLCZn6IkcAUsBw9BN9Uxj9PQ5HBsjYkasABMBiU+TGg10fAUMBd84vFO4DDzzUhMWXYj6WA/iGC7HIwEp63AtYP5JR1J5VBa/O1F6rpH9rcmHhRxzESVYCqzP1C5GNkEDtNHcIHJn6w62hwRbSSfN1q8cUYbTZhET1DtRBqz+Mq67BExQzOMc4TRMiZRW3Wb+SHD7HGIlpGcq9NGNqjvF8FlKzhJr29yHunPRN/nYEoM/zZGYkCGOrnTCq0a+Oqv4is8CRSAD3zdmyeb6eqdfgHuWe2nRkZByAXR5kQkTbxi2211nMTUTx2R6+AzV9SrVpgkRt6TMvAjnEaMvlthVKT1nyicRiK4CMYGUqG1h6TOWcs1riycRtI58/6yD816kNKBRmbxsyu4Y4zISrkLPJWyDWwDw9vRRCIjYoqos8bIBHWRrMRbwTOyhcdCqVxVAcp0X22MTPNyg0RlO6Mk0dpoK2ramqRrVHu3zpF428UevQ5QKazEm4KcQIvUYier7yVtZKzthr6sS+aBYlO8QGeCnDf2qjSQXWC26VgUE6cfT0qR0oXf54N6sJDXSZbfCiISBdxKGG1iXdw8s6aqk1JpF6p2FlfnPuCUQ4XljwaCazYThayR/5nix6h2OavuA+qYhPI5kzaQLWcc76lkqWh0iM9osdak2ipqKe1WcBNUz+MxfI2loD7BneAQh4cP5pCeBO94T3eeq+dbl81ntBg7D+uRJEZEby9K2ANjNpomMtmW6fkLE663Lv1skqgs4c7f6+qbzUo7UZWMRk+4qc6wmbTU9JzE+51MyIS4lP+lVPhbGHl81JbFJJl7WdmzjGAUtGr4QCnAz4HHof6jxqiK/wjkqdyJ5RxR6zAJ+q2/AgwAaGjEUgUa2xEAAAAASUVORK5CYII=) no-repeat;background-size:100% 100%;animation:skill-video-spin-a91f5668 .8s linear infinite}.skill-video__pop{width:86vw;max-width:844px;aspect-ratio:16/9;background:#000001}body.vertical .skill-video__pop{transform:rotate(90deg)}.skill-video__pop-content{position:relative}.skill-video__pop-content .skill-video__close-btn{position:absolute;right:-30.77px;top:5.28px;width:24.18px;height:24.62px;user-select:none;background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAABBCAYAAABmd3xuAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAydpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMC1jMDAxIDc5LmMwMjA0YjJkZWYsIDIwMjMvMDIvMDItMTI6MTQ6MjQgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyNC41IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpFN0ExN0QyOUU1RjQxMUVGODc1MUQwMDc3NTQ3QjBFMSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpFN0ExN0QyQUU1RjQxMUVGODc1MUQwMDc3NTQ3QjBFMSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOkU3QTE3RDI3RTVGNDExRUY4NzUxRDAwNzc1NDdCMEUxIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOkU3QTE3RDI4RTVGNDExRUY4NzUxRDAwNzc1NDdCMEUxIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+McJMCQAAAy9JREFUeNrsm0lo1kAUx6d1AevSuhUVjxVcStW6YV2KK+hB0CJCBRXFXbocCuJZEDwoanGhWhdQUBQEt7pUEFFBxIMXEa11+aR4VMSiUuv/MS8Q4pfFg5lk8h78Dl8yzZff+5KZyby0oLqqUhmMGnAN/DTx5YUGxZvAZXAB9MuSfCPY7/r1z4M+WZCvBwc821abSEDc8rvAQZ99a8DZOBMQp/w2cBgUBLRZC07GlYC45DeAoyHi7rbHbJJ/Ab5EbNsDHtsk/xwsiZCAXrAFnLHtnn8GlgYkwBFvtbW3fwqWga95xHdwZ2f1OP8ELAffXOJ14HhWZniPOAHfebbXbOIk+hqc2z8EZaDL1AmYfLBRJsWTIK9EXuRFXuRFXuRFXuRFXuTjkR9giWPRv8qP5IWHppSLLwRvwPSo8iPAXVCudFWlMaXi1UrXAUeDO6AyTH4YN5zs2kbVlfqUic8DN1yX/FD2muInX8INpuY5GFVZdqZEfA6LD/RsH85+FV75Yt4xzeeAVGw4ArYmXHw2iw8O6MvugUmOPIm3gRkhB6YEUCVlU0LF6fxvsU9QUALugwkkPx/MjPgFlIAG0D+B8tsjiDtRCtYVco+4Wekl5LB4CRYrQ29ShATdklcitj0F9jj3fCv/cVACXoFF4HNCL/tfoBZcDWl3WunKUK+7t2/hHj1fAl6zeJdKdtAVSXX+6z77z/FV/jvfOE8dWp0nAR08U/qUkqGOElDDnZ876N2fjUpXgX1neM2uWV0nWAByKZvkUAJWgtv8+RJ1cG5xCr+KzSGlS0k09n9M6fT2ByeggafpPd4GQeWqFgue6LrBPnmeF3mRF3mRF3mRF3mRF3mR/69Rwk9dFVmTp7U2KozQu7i0mlqeFfli/sWdEhKtpraDibbLDwE3wSzP9lJOwHhb5QcpXVCo8tk/ihMwzjb5IhafG9JujNIFhTKb5HcrXRyJEmPBCZvk96q/V1P9gurp622Sd1ZT20LavVV6mTxnkzwFraauUnpFOF+8Y/HYVovjHuq6+Qpo92z/wOLvbZ/kUD1gBXjAn3Ms3pmV6S0lgP7H5qLSFaEOEyfxR4ABAG7PkFeZ7phzAAAAAElFTkSuQmCC) no-repeat;background-size:21.98px;background-position:1.32px 0px}@media (hover: hover) and (pointer: fine){.skill-video__pop-content .skill-video__close-btn:hover{opacity:.8}}.skill-video__pop-content .skill-video__close-btn.hover{opacity:.8}.skill-video__pop-content .skill-video__close-btn:active{opacity:.6}.skill-video__pop-content .skill-video__close-btn img{width:100%;height:100%}@keyframes skill-video-spin-a91f5668{to{transform:rotate(360deg)}}.skill-intro{margin-left:21.54px}.skill-intro__header{width:241.77px;height:47.91px}.skill-intro__icon-wrapper{width:43.08px;height:43.08px;border:solid 0.44px #dabf98;border-radius:50%}.skill-intro__icon-bg{width:40.44px;height:40.44px;background-color:#cabaa3;border-radius:50%}.skill-intro__icon-bg img{width:29.45px;height:29.45px}.skill-intro__header-content{margin-left:13.19px}.skill-intro__name{font-size:17.58px;height:21.1px;line-height:21.1px;width:175.83px;color:#f4eee7}.skill-intro__type{font-size:14.07px;width:175.83px;height:17.58px;line-height:17.58px;color:#716749;margin-top:3.96px}.skill-intro__description{width:232.98px;height:179.35px;overflow-y:auto;font-size:13.19px;color:#ece5d8;margin-top:28.13px;padding-right:4.4px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;white-space:pre-line}.skill-intro__description::-webkit-scrollbar{width:4.4px}.skill-intro__description::-webkit-scrollbar-track{background-color:#433c2f}.skill-intro__description::-webkit-scrollbar-thumb{background-color:#8f7a5b;border-radius:1.76px}.skill-intro__description::-webkit-scrollbar-button{pointer-events:none;height:0}.tutorial-content{margin-left:43.96px}.tutorial-content__player{width:423.76px;aspect-ratio:16/9;position:relative;margin-top:21.1px;cursor:pointer;margin-left:17.58px}.tutorial-content__player:before{content:"";position:absolute;top:-12.31px;left:-5.71px;right:0;bottom:0;background:url(https://mcguide.kurogames.com/assets/video-bg-C-ExEYhW.webp) no-repeat;background-size:100% 100%;width:435.19px;height:263.75px}.tutorial-content__player>*{position:relative;z-index:1}.tutorial-content__player-container{width:100%;height:100%}.tutorial-content__cover{width:100%;height:100%;position:relative;overflow:hidden;cursor:pointer}.tutorial-content__cover img{width:100%;height:100%;object-fit:cover;display:block}.tutorial-content__play{position:absolute;width:22.86px;height:21.98px;background:url(https://mcguide.kurogames.com/assets/play-button-CAPL1PVV.webp) no-repeat;background-size:100% 100%;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2}.tutorial-content__loading{position:absolute;width:26.38px;height:26.38px;background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAAjCAYAAADxG9hnAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAydpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMC1jMDAxIDc5LmMwMjA0YjJkZWYsIDIwMjMvMDIvMDItMTI6MTQ6MjQgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCAyNC41IChXaW5kb3dzKSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo4N0JERjRDRTAzMjUxMUYwODNFOUU4RkZDMUQzQzVEQSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo4N0JERjRDRjAzMjUxMUYwODNFOUU4RkZDMUQzQzVEQSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjg3QkRGNENDMDMyNTExRjA4M0U5RThGRkMxRDNDNURBIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjg3QkRGNENEMDMyNTExRjA4M0U5RThGRkMxRDNDNURBIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+bZnzsAAAA5FJREFUeNrMmHtojWEcx9/tzGVDbLKZUUixNGJIKYxWLvEHDW1upU1yWSkUcmsp2V+MUUSG0E5yySVzGZZcZjJM+IMaDk3LbaFdfH/1fdbPu/ecnbNztuNbn8553st5v8/v+b3P83tOhNvttgJQZzARjAejwADQi+dqQTWoAPdBKfjj7w9H+XmdPHAdyAJxPq4bB+bw+1dwHOSDtw7XSocaaLwushUDPcAe8AasbsWEXT3BSvAaHGRbKw/cBd9Amq+IiOOjYJDtuIT/PHgAXnJIRLFgKKMym1E0Uc8BM8FicAO4wGiel+9V3oxkgiPMCaNS9kJ+qNHLfZIbxxi9NLCZn6IkcAUsBw9BN9Uxj9PQ5HBsjYkasABMBiU+TGg10fAUMBd84vFO4DDzzUhMWXYj6WA/iGC7HIwEp63AtYP5JR1J5VBa/O1F6rpH9rcmHhRxzESVYCqzP1C5GNkEDtNHcIHJn6w62hwRbSSfN1q8cUYbTZhET1DtRBqz+Mq67BExQzOMc4TRMiZRW3Wb+SHD7HGIlpGcq9NGNqjvF8FlKzhJr29yHunPRN/nYEoM/zZGYkCGOrnTCq0a+Oqv4is8CRSAD3zdmyeb6eqdfgHuWe2nRkZByAXR5kQkTbxi2211nMTUTx2R6+AzV9SrVpgkRt6TMvAjnEaMvlthVKT1nyicRiK4CMYGUqG1h6TOWcs1riycRtI58/6yD816kNKBRmbxsyu4Y4zISrkLPJWyDWwDw9vRRCIjYoqos8bIBHWRrMRbwTOyhcdCqVxVAcp0X22MTPNyg0RlO6Mk0dpoK2ramqRrVHu3zpF428UevQ5QKazEm4KcQIvUYier7yVtZKzthr6sS+aBYlO8QGeCnDf2qjSQXWC26VgUE6cfT0qR0oXf54N6sJDXSZbfCiISBdxKGG1iXdw8s6aqk1JpF6p2FlfnPuCUQ4XljwaCazYThayR/5nix6h2OavuA+qYhPI5kzaQLWcc76lkqWh0iM9osdak2ipqKe1WcBNUz+MxfI2loD7BneAQh4cP5pCeBO94T3eeq+dbl81ntBg7D+uRJEZEby9K2ANjNpomMtmW6fkLE663Lv1skqgs4c7f6+qbzUo7UZWMRk+4qc6wmbTU9JzE+51MyIS4lP+lVPhbGHl81JbFJJl7WdmzjGAUtGr4QCnAz4HHof6jxqiK/wjkqdyJ5RxR6zAJ+q2/AgwAaGjEUgUa2xEAAAAASUVORK5CYII=) no-repeat;background-size:100% 100%;top:50%;left:50%;z-index:2;animation:tutorial-content-spin-c4ada4e1 .8s linear infinite}.tutorial-content__title{font-size:15.83px;color:#f4eee7;padding:15.83px 0 8.79px 0}.tutorial-content__desc{width:461.56px;height:50.99px;font-size:13.19px;line-height:16.7px;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;white-space:pre-line;color:#ece5d8}.tutorial-content__desc::-webkit-scrollbar{width:4.4px}.tutorial-content__desc::-webkit-scrollbar-track{background-color:#433c2f}.tutorial-content__desc::-webkit-scrollbar-thumb{background-color:#8f7a5b;border-radius:1.76px}.tutorial-content__desc::-webkit-scrollbar-button{pointer-events:none;height:0}@keyframes tutorial-content-spin-c4ada4e1{0%{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}.demonstration{width:100%;max-width:553.88px;height:100vh;max-height:412.77px;position:relative;box-sizing:border-box;margin-left:11.43px;background:url(https://mcguide.kurogames.com/assets/demonstration-bg-BZ4lj-3T.webp) no-repeat;background-size:100% 100%}.demonstration__wrapper{width:100%;height:calc(100% - 43.52px);max-height:369.25px;box-sizing:border-box;padding-bottom:0.88px}.demonstration__content,.role-overview{display:flex}.role-overview__info{width:545.08px;margin-left:11.43px;padding-top:0.88px}.role-overview__card{opacity:1;animation:fadeIn-1-61f207e2 .6s linear}.role-overview__proficiency{opacity:1;animation:fadeIn-1-61f207e2 .4s linear}.role-overview__skeleton{opacity:1;animation:fadeIn-2-61f207e2 .5s linear;box-sizing:border-box}.role-overview__skill-add{opacity:1;animation:fadeIn-3-61f207e2 .6s linear}.role-overview__weapon-team{display:flex;opacity:1;animation:fadeIn-4-61f207e2 .7s linear}@keyframes fadeIn-1-61f207e2{0%,33.3%{opacity:0}to{opacity:1}}@keyframes fadeIn-2-61f207e2{0%,50%{opacity:0}to{opacity:1}}@keyframes fadeIn-3-61f207e2{0%,60%{opacity:0}to{opacity:1}}@keyframes fadeIn-4-61f207e2{0%,66.7%{opacity:0}to{opacity:1}}.attribute{width:100%}.attribute-title{font-size:17.58px;color:#aa9b6a;box-sizing:border-box;background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;height:61.54px;padding:0 0 0 18.9px}.attribute-title-logo{width:21.1px;height:21.1px;margin-right:3.52px}.attribute-title-finish{width:28.13px;height:28.13px;margin-left:17.58px}.attribute-title-info{height:49.67px}.attribute-content{background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:cover;border:0.44px solid #867357;border-top:none;border-radius:0 0 13.19px 0;width:866.42px;box-sizing:border-box}.attribute-content-title{font-size:17.58px;padding:4.4px 0 11.87px 24.18px;color:#aa9b6a}.attribute-content .attribute-table{width:864.22px;border-collapse:collapse;margin:8.79px 0 32.53px}.attribute-content .attribute-table th,.attribute-content .attribute-table td{padding:4.4px;text-align:left;height:32.53px}.attribute-content .attribute-table th{font-size:17.58px;color:#ece5d8;background-color:rgba(61, 57, 40, .3);padding-left:24.62px;width:33%}.attribute-content .attribute-table td{font-size:15.83px;color:#ece5d8;padding-left:24.62px}.attribute-content .attribute-table tr:nth-child(2n){background-color:rgba(61, 57, 40, .3)}.attribute-content .attribute-table-icon{width:24.62px;height:24.62px;margin-right:6.15px}.attribute-content .attribute-table-operation{font-size:26.38px;font-weight:600}.attribute-content .attribute-table-finish{width:17.58px;height:17.58px;margin-left:9.67px} .attribute-content-title-level{font-size:22.86px!important;color:#ffd12f!important}@keyframes expandFromCenter-73663f95{0%{clip-path:inset(0 50% 0 50%);opacity:0}to{clip-path:inset(0 0 0 0);opacity:1}}.introduction{width:865.98px;min-height:202.21px;position:relative;box-sizing:border-box}.introduction .sticky{position:sticky;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(46,41,38,.95) 60%,rgba(46,41,38,.2))!important}.introduction-tab{width:865.54px;background:url(https://mcguide.kurogames.com/assets/introduction-bg-sHRaG7qk.webp) no-repeat;background-size:100% 201.33px;height:43.96px;box-sizing:border-box}.introduction-tab-title{font-size:17.58px;letter-spacing:0;color:#aa9b6a;width:120.01px;line-height:41.76px;text-align:center;height:41.76px;position:relative;cursor:pointer}.introduction-tab-title:hover,.introduction-tab-title.hover{color:#d6c17b}.introduction-tab-title.active{color:#facc89;cursor:default}.introduction-tab-title.active:hover,.introduction-tab-title.active.hover{color:#facc89}.introduction-tab-title .line{width:120.01px;height:17.14px;position:absolute;top:35.17px;left:0;animation:expandFromCenter-73663f95 .5s ease forwards}.introduction-tab-title-label{font-size:17.58px;width:120.01px;height:43.96px;padding:0 4.4px;box-sizing:border-box}.introduction .introduction-wrapper{width:865.54px;background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:100% 100%;border-radius:0 0 13.19px 0;border:0.44px solid #867357;box-sizing:border-box;padding-bottom:0.88px}.introduction-content{width:865.54px;padding:21.54px 24.62px 17.58px;font-size:15.83px;line-height:26.38px;letter-spacing:0;color:#ece5d8;overflow:visible;-ms-overflow-style:none;scrollbar-width:none;box-sizing:border-box;position:relative}.introduction-content::-webkit-scrollbar{display:none}.introduction-content.expanded{min-height:157.81px;overflow-y:auto;padding-bottom:39.56px}.introduction-content.collapsed{height:157.81px;overflow:hidden}.introduction-more{font-size:17.58px;line-height:14.07px;letter-spacing:0;color:#aa9b6a;width:862.46px;text-align:center;position:absolute;bottom:1.32px;height:56.27px;margin:0 0.44px;background:linear-gradient(to top,rgba(46,41,38,.95) 60%,rgba(46,41,38,.2));border-radius:0 0 13.19px 0;box-sizing:border-box;transition:transform .3s ease}.introduction-more img{width:11.43px;height:9.67px;margin-left:4.4px;display:block}.introduction-more .more-icon{transform:rotate(180deg);transition:transform .3s ease}.introduction-more .more-icon-down{transform:rotate(0);transition:transform .3s ease}.introduction-more-btn{cursor:pointer;margin-top:12.31px}.key-resonance-chain{position:relative;border:0.44px solid #867357;width:816.75px;min-height:101.98px;margin-left:5.28px;font-size:14.07px;border-radius:0 0 13.19px 0;color:#ece5d8;padding:19.34px 15.83px 0.88px;box-sizing:border-box}.key-resonance-chain__title{width:99%;overflow:hidden;-ms-overflow-style:none;scrollbar-width:none}.key-resonance-chain__title::-webkit-scrollbar{display:none}.key-resonance-chain__title--expanded{min-height:131.88px;overflow-y:auto}.key-resonance-chain__title--collapsed{height:131.88px}.key-resonance-chain__toggle{font-size:17.58px;line-height:14.07px;letter-spacing:0px;color:#aa9b6a;width:calc(100% - 0.88px);text-align:center;position:absolute;height:56.27px;margin:0 0.44px -0.88px -14.95px;bottom:0.88px;background:linear-gradient(to top,rgba(46,41,38,.95) 60%,rgba(46,41,38,.2));border-radius:0 0 13.19px 0;box-sizing:border-box;transition:transform .3s ease}.key-resonance-chain__toggle--sticky{position:sticky!important;bottom:0px!important;left:0;right:0;background:linear-gradient(to top,rgba(46,41,38,.95) 60%,rgba(46,41,38,.2))!important;width:814.99px!important}.key-resonance-chain__toggle-btn{cursor:pointer;margin-top:12.31px}.key-resonance-chain__toggle-icon{width:11.43px;height:9.67px;margin-left:4.4px;display:block;transform:rotate(180deg);transition:transform .3s ease}.key-resonance-chain__toggle-icon--down{transform:rotate(0)}.key-resonance-chain:before{content:"";position:absolute;width:27.25px;height:15.39px;background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD4AAAAjCAYAAADMibkBAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkFGNDQ0NDhEQzhFMzExRUZCREU2RDcwMTI3NENDM0Y3IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkFGNDQ0NDhFQzhFMzExRUZCREU2RDcwMTI3NENDM0Y3Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QUY0NDQ0OEJDOEUzMTFFRkJERTZENzAxMjc0Q0MzRjciIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QUY0NDQ0OENDOEUzMTFFRkJERTZENzAxMjc0Q0MzRjciLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6cLypnAAADgUlEQVR42uSZeYhPURTHf7MgS0goa2NN1jAjDA3ZIrLNMLKXpGyhoaZkGtvwh0mDsQwaf2gWW03TlL2EyD6Wf1AmRBjDWKbB/Hxvfaduz1t/987vqd+pT+/37uvdc8+9555z7vtFFe5dEfBROoOPoCbciqMD/koSGOiHYr8NHwFGRaLh48AkPxTH+mh0L9AH9ABtQGWkrPhCXhuB6ZHi6sLTFkv3S/9HwxMaQG8y6CrdjwZDNPafoMPw9Zo9Q/SVbtK+WaOOuaCLiuEtwUwwXOOghFsPMGmfASZq0jENTFExfBZoAlI1Dag9yLJ5vo/6VGQw6O00ZjvDo8AaaZVaKw5I9JcH2jqkuB2KelbxOoaT4NnwZOnFFiBNcUDpdEEnWQfmh6ijP1gk3Wd6NbwVyDa0bbDYm25kJdjqwTOOuZwkWWJArqEomwpS3BouOjgFOhnaxd47A9p5jOCZ3LtRHt5rTF1ejo57LOr+I2YLZjS8GSgC4y067wmugG4uBtIdnFdIU7FcQbEIHRwmN0uKR2bee5EHon8Mj2YEf8irnfQDd8Fq0NzkuZjdA+AZDyGqMhu8ADkmwSoRXAebXGSTq2B7vcfGpEyOF9F6F8hwmFlZmjJqdgT3QDVnNo1GJ3HL6BJRzw/j2T0InrOwyuZBx20MSGTmeCpWuopuEgeOuuzkHBUuB2/Y9gVsY2yYJzrXaHgh6AtGMvBV073juJX+uOjjNoinR5fLe1wcC5dxEoI2HezmyxUWz3+BAjAIbAF1Cga/43k9lVvHKDWcbJEBftj0c5Yeet8uqufYpJ587qegi0H/ZkRPdhiUlYh4M5QB0knKwBKLcd3ixP10k8czGDRkeekxvcizPcGj8eVgLHjr4Z1icNjQ9h3MAbVuC5ggS7+goaIK9WvoDQ6gzqV7iwPG5xCrwyrpfqfVlrQrWR+AUv5+BEoUA1QpB2InYqIXgNch6qhkVglwAvaHejrLla7BgLqIPf/Y5rmIIZcUdRziWE8aVt+T4aLi+QROa0pLYq+ttVmtjRp0VDB1Faucx2sZ5T9ozMmXwQWT9myNekpMgrPnT08HG+Cbm/HM/Y0HGV2Sx3pCyfD3DWC4qJufSPfH7fZjCOI4Zj+/q+dLv0+EW7mfhhdJhdGdcCv38y+kV0xtZX4o9/tPQxF5r0Wi4TdZzgYiydXrDzBf/VD8V4ABAKforGnuLPqnAAAAAElFTkSuQmCC) no-repeat;background-size:100%;right:42.2px;top:-7.47px}.tip{position:absolute;top:7.91px;height:21.98px;background-color:#aa9268;border-radius:0px 0px 4.4px 0px;font-size:13.19px;color:#1f1c19;line-height:10.99px;text-align:center;padding:5.28px 8.79px;box-sizing:border-box}.tip-spare{left:0.44px;background-color:#483e33;color:#d3af7c;opacity:.5}.skeleton-content-title{font-size:17.58px;color:#aa9b6a;padding:4.4px 24.18px}.skeleton-suggestion{font-size:14.07px;color:#ece5d8;margin-left:24.18px;margin-bottom:13.63px}.skeleton-suggestion-title{font-size:17.58px;color:#aa9b6a;margin-right:7.91px}.skeleton-content-data{width:817.19px;margin-left:24.18px;background:url(https://mcguide.kurogames.com/assets/skeleton-bg-atQzfNOq.webp) no-repeat;background-size:100% 100%;margin-bottom:16.26px;padding:13.19px 0;position:relative;box-sizing:border-box}.skeleton-content-data .data-skeleton{width:136.27px;box-sizing:border-box;padding:17.58px 0}.skeleton-content-data .data-skeleton-title{font-size:15.83px;color:#ece5d8;text-align:center;height:35.17px;width:123.08px}.skeleton-content-data .data-skeleton-img{cursor:pointer;width:85.28px;height:85.28px;border-radius:50%;border:solid 1.32px #ffe1b6;position:relative;display:flex;align-items:center;justify-content:center}.skeleton-content-data .data-skeleton-img img{width:85.28px;height:85.28px;border-radius:50%}.skeleton-content-data .data-skeleton-img:before{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:77.81px;height:77.81px;background:url(https://mcguide.kurogames.com/assets/header-border-C7i_3hDA.webp) no-repeat;background-size:100%;z-index:2}@media (hover: hover) and (pointer: fine){.skeleton-content-data .data-skeleton-img:hover{background-color:#504f4c}}.skeleton-content-data .data-skeleton-img.hover{background-color:#504f4c}.skeleton-content-data .data-skeleton-name{font-size:15.83px;color:#ece5d8;text-align:center;height:35.17px;width:123.08px}.skeleton-content-data .line{width:1.76px;min-height:175.83px;background-color:#d4b17a;opacity:.2;box-sizing:border-box}.skeleton-content-data .data-skill{width:354.74px;padding:0 8.79px 0 0}.skeleton-content-data .data-skill .skill-cost{font-size:17.58px;height:18.46px;width:118.69px;text-align:center;color:#aa9b6a;background-color:#0b0d0a;border-radius:1.76px;margin:13.19px 0 15.39px 38.68px;border:solid 0.44px #c2b294;box-sizing:border-box}.skeleton-content-data .data-skill .skill-list{margin-left:22.42px}.skeleton-content-data .data-resonance{padding:13.19px 0 0 22.42px;width:326.61px;height:auto;box-sizing:border-box}.skeleton{width:100%}.skeleton .sticky{position:sticky!important;bottom:0px!important;left:0;right:0;background:linear-gradient(to top,rgba(46,41,38,.95) 60%,rgba(46,41,38,.2));box-shadow:0 -1.76px 4.4px rgba(0,0,1,.1)}.skeleton-title{font-size:17.58px;color:#aa9b6a;background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;height:61.54px;padding-left:18.9px}.skeleton-title-logo{width:25.5px;height:21.1px;margin-right:3.52px}.skeleton-title-finish{width:28.13px;height:28.13px;margin-left:17.58px}.skeleton-title-info{height:49.67px}.skeleton-content{background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:cover;border:0.44px solid #867357;border-top:none;border-radius:0 0 13.19px 0;width:866.42px;box-sizing:border-box}.skeleton-content .sub-attribute-recommendation{position:relative;width:816.75px;margin:0 0 29.89px 21.1px;font-size:14.07px;color:#ece5d8;box-sizing:border-box}.skill-item{flex-direction:column;width:75.61px;height:131.88px;position:absolute}@media (hover: hover) and (pointer: fine){.skill-item:hover{filter:brightness(1.2)}}.skill-item.hover{filter:brightness(1.2)}.skill-item-logo{width:76.05px;height:76.93px;background-image:url(https://mcguide.kurogames.com/assets/skill-add-border-C_If3sep.webp);background-size:contain}.skill-item .unFinish{width:62.86px;height:63.3px;border-radius:50%;background-color:#767068;cursor:pointer}.skill-item .unFinish img{width:50.11px;height:49.23px}.skill-item .finish{width:63.3px;height:63.3px;border-radius:50%;box-sizing:border-box;background-color:#fdefdb;border:solid 1.32px #ffe09e;cursor:pointer}.skill-item .finish img{width:52.75px;height:52.75px;border-radius:50%}.skill-item-grade{font-size:14.07px;color:#c3bba9;background-color:#483e33;border-radius:7.47px;border:solid 0.44px #ffe09e;width:50.55px;margin-top:-17.58px;height:14.95px;text-align:center;line-height:16.7px;box-sizing:border-box}.skill-item-grade .skill-grade{font-size:14.07px;color:#d4b17a;box-sizing:border-box}.skill-item-name{font-size:14.07px;color:#ece5d8;margin-top:3.52px;text-align:center;width:75.61px;height:26.38px}.skill-item:nth-child(1){left:29.01px;top:85.28px}.skill-item:nth-child(2){left:119.57px;top:21.54px}.skill-item:nth-child(3){left:230.78px;top:0px}.skill-item:nth-child(4){left:334.52px;top:22.86px}.skill-item:nth-child(5){left:425.52px;top:81.76px}.keynote-item-container{height:81.32px;width:243.97px;background:url(https://mcguide.kurogames.com/assets/skill-keynote-bg-LrO7tqfc.webp) no-repeat;background-size:100% 100%;position:absolute;top:124.84px;left:145.06px;box-sizing:border-box}.keynote-item{flex-direction:column;width:98.91px;height:79.13px;margin-top:17.58px}@media (hover: hover) and (pointer: fine){.keynote-item:hover{filter:brightness(1.5)}}.keynote-item.hover{filter:brightness(1.5)}.keynote-item-logo{cursor:pointer;width:39.12px;height:39.12px;background-color:#e3dbd0;border:solid 1.32px #867357;box-sizing:border-box;border-radius:50%}.keynote-item-logo img{width:28.57px;height:25.5px}.keynote-item-name{font-size:14.07px;color:#ece5d8;margin-top:2.2px;text-align:center}.fixed-item{min-width:52.75px;flex-direction:column;margin-top:14.51px;box-sizing:border-box}@media (hover: hover) and (pointer: fine){.fixed-item:hover{filter:brightness(1.5)}}.fixed-item.hover{filter:brightness(1.5)}.fixed-item-logo{box-sizing:border-box;width:52.75px;height:49.67px;background:url(data:image/webp;base64,UklGRpIFAABXRUJQVlA4WAoAAAAQAAAAdwAAbwAAQUxQSMgDAAABkAVJsmlbc3Bt28azbdu2bdu2bdu2bRuXx8/mPtp7+n5HBAQ3khRJkb3Me9AFWR8gCeRaqMmQ+ZuPX7367NHVKwfWzupVK7stcZdt4b47n3+4vHF853ql8uSOjM2Tt2KTHjN33v90e2XbBL74ddhpuD67YbScLJBd7g5rXr5ZUsuBIc6tjuo3NPEhqxTf67hubWUFLxIX6vbUFeVL9O924/VQbz4U25s+MphEU76VuvnhPChw5EV7exJVgZM184Okx3dVSidbCd7sNO0QB2mRd1LNdCVJFL39VRUpyX3lXA6STBVebPCW7Nr+qnYyklBOs1PKSoP3ofORJLEqpo5XSECeV9OUDP6znjziJTq1NQ2Jg5SznsaITM+0/MREnTMLi8qopxHERtU0ZUVk8v0AYqTSmsqiMfKuD7FSUXVpkej9JJCYqay2gChUT4smdqqVES0CeVUFiKEG3nazGp9X9Ymllm+TWbsXHJ5OPHG41t9K+l1UElOFq/JZt+GqI4mtmj1ysubf+I02xFhbplrz635cxhl/VV6LCdVGE2u1uyKzlPUTiDfyKy0spGCqMzFX0RQHyzjUhdhrVx/LvoWXtvzJme5sCfs6EoB2drMk5ct0QKDIU6V5FowhCF2oZT6v1gVj0Gqf+TeylzBw0oaY42hdEGhpP3MZhd4RhXJXzNBxI6GgzAwz8wfdBAZa08l0/cngi0PjXab/j1wjHHz0ClP0nwUEPcxh8pb6SCzrZIpX0Uh0WmwC93cyJIpeMlUIvEBIuL03QfN1UJDaz5jhY7C4XNDEJtEOi611jdleC4tFHY1wTKmCxfJDRoejv+95IJH38+/hgsOR379/XwVaefW/f/8eLjwIFtJBsHr/FmoiCLKbvwX8yC5fLmC3LcpR+AvBoSmRYrnRAWa9FB4E69y/A9DS/2xGJFi36hGU1i/B/f+Mux/h7r+w8QZufIUbT+LGz7j5Am5+BJsP4ua/uPk+bH0DtZ6zpB9o/crRfP3KWQtTr4OtT9ZErcc+UcLWn7OSejsd6gzaX6CCKc7sb09xyFr6RxSqieZNmysyy/uDx7j3B7OefijlQu3/EvW7wLjfnRe1v98P1c+wVYbq33BF9auIY2/qxdKfA+pHUpUmsTSJmf9KVZnE00hOfrOq6rLi+utS87PJdjMLi+0nVDfgkZXMeBoD65+E9Yui+mNh/cCo/mdYvzeqvx3Vz486v4A6r8F2PqVRjNwS7HN3Es6n8J7H+Xh548TODUrnyROdkCdfpaY9Zu56IMk8jqTzR08eSDl/RFZQOCCkAQAAUA4AnQEqeABwAD4xGIpDoiGhE36sMCADBLO3b+ZmRHpTfyvrntu8b/IfDTnAsQHPt7IBY2nsSfs84wTzNcjOZtM8/tn5diuSCLOknKL5IGh4UWg4PKTOQyZjLIZN8BdDkOlrmjKdT+4J+bETr/SNpSSlAI3BXIHROhtAAP7+VgQzfrix/U6bzHVRwOz2BAewjP/8J8j8gfF5taABAdWT+Lru5w7xpkL0sVN7jC8rVZe9Lp8t0v5IFu/GRrYr7eN8+i8grhX38dm4A4h51xa1BNqyACWrPPj4yZU0+u80/X/Z4lXG2g7/SsWpum033YXZNGEZ6f4gj+rnc+WbFMRMfGv3zX/n79lj0/iRwpVh2yJnwWzDA4eBxo9i/rPNzF6+sKLWYWWmh/al5ZUApTl+tl77CqdWH5mboVNbgIAsaB0WXzRGAgOvRfqX8Ewsg3YApqWPHOTkKvOfkY/37cMy9moX/ycj/iQNWVMNrXkmR5EOytdjg21kXma7CO4E+yhVCLTqe4UtfAWq2+9Z//8J7X7rUA8gCoAmPlyI3O04mppAQAAA) no-repeat;border-radius:50%;background-size:contain}.fixed-item-logo-bg{width:46.16px;height:45.72px;background-color:#767068;border-radius:50%;margin-bottom:0.88px;overflow:hidden;cursor:pointer}.fixed-item-logo-bg img{width:37.36px;height:33.85px}.fixed-item .finish{background-color:#e3dbd0}.fixed-item-name{font-size:13.19px;color:#ece5d8;width:79.13px;height:30.77px;text-align:center}.skill-add-item .outweigh{font-size:26.38px;color:#d3af7c;padding:0 8.79px;font-weight:600}.skill{width:871.25px;height:403.54px;background:url(https://mcguide.kurogames.com/assets/skill-bg-BB4C8lJf.webp) no-repeat;background-size:100%;box-sizing:border-box}.skill-title{font-size:17.58px;color:#aa9b6a;box-sizing:border-box;height:40.88px;padding:0 0 0 18.9px}.skill-title-logo{width:31.65px;height:18.46px;margin-right:3.52px}.skill-title-finish{width:28.13px;height:28.13px;margin-left:17.58px}.skill-title-info{height:49.67px}.skill-add .skill-left{position:relative;width:550.8px;height:228.58px;margin:2.64px 0 13.19px}.skill-add .skill-left .skill-list{position:relative}.skill-add .skill-right{width:302.43px;height:228.58px;flex-direction:column;margin-top:4.4px}.skill-add .skill-right .unFinish-item{font-size:14.07px;color:#ece5d8}.skill-add .skill-right .unFinish-item img{width:16.7px;height:16.26px;margin-right:5.71px}.skill-add .skill-right .unFinish-item-text{font-size:14.07px;width:263.75px;height:43.96px}.skill .fixed-skill{margin:0px 0 0 23.74px}.skill .fixed-skill-title{font-size:14.07px;color:#ece5d8}.skill .fixed-skill-title span{font-size:14.07px;padding-right:7.91px;color:#aa9b6a}.skill .fixed-skill-content img{width:10.99px;height:16.7px;margin:0 16.7px}.skill .skill-add-list{margin-left:50.55px}.skill .skill-name{color:#ffd12f;display:contents}.resonance-info{margin-bottom:36.49px}.resonance-info .resonance-logo{width:81.32px;height:72.09px;margin-right:8.79px;background:url(https://mcguide.kurogames.com/assets/select-Dxvu_ngA.webp) no-repeat;background-size:100% 100%}.resonance-info .resonance-logo img{width:26.38px;height:26.38px}.resonance-info .resonance-logo.unselect-logo{width:81.32px;height:61.98px;background:url(https://mcguide.kurogames.com/assets/no-select-wk-Aspa3.webp) no-repeat;background-size:100% 100%}.resonance-info .resonance-text{height:100%;flex:1}.resonance-info .resonance-text-recommend{font-size:14.07px;color:#d7b27e;padding:0 8.79px;display:table;background-color:#483e33;border-radius:7.47px;margin-bottom:6.15px;line-height:17.58px;height:17.58px;box-sizing:border-box}.resonance-info .resonance-text-title,.resonance-info .resonance-text-content{font-size:14.07px;color:#ece5d8;line-height:17.58px}.resonance-info .resonance-text-title{font-size:15.83px;margin-bottom:6.15px}.resonance{width:871.25px;box-sizing:border-box}.resonance-title{font-size:17.58px;color:#aa9b6a;box-sizing:border-box;background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;height:61.54px;padding:0 0 0 18.9px}.resonance-title-logo{width:21.1px;height:21.1px;margin-right:3.52px}.resonance-title-finish{width:auto;height:28.13px;margin-left:17.58px}.resonance-title-info{height:49.67px}.resonance-content{background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:cover;border:0.44px solid #867357;border-top:none;border-radius:0 0 13.19px 0;width:865.98px;box-sizing:border-box;padding:7.91px 16.26px 21.98px}.weapon-content-item{display:flex;align-items:flex-start;gap:0;font-size:0}@media (hover: hover) and (pointer: fine){.weapon-content-item:hover{filter:brightness(1.3)}}.weapon-content-item.hover{filter:brightness(1.3)}.weapon-content-item.item-right{margin-right:30.33px}.weapon-content-item.bg-color .weapon-content-item-img{background-size:100% 100%;margin-right:-0.88px}.weapon-content-item .weapon-content-item-img{position:relative;width:59.78px;height:59.78px;background:var(--grade-bg) no-repeat;background-size:100%;cursor:pointer;box-sizing:border-box;margin-right:-0.88px}.weapon-content-item .weapon-content-item-img img{width:100%;height:100%}.weapon-content-item .weapon-content-item-img .weapon-finish{width:100%;height:100%;background-color:rgba(0,0,1,.56);position:absolute;top:0}.weapon-content-item .weapon-content-item-img .weapon-finish:before{content:"";width:28.13px;height:28.13px;position:absolute;background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAE4UlEQVRYhcWYC4gVVRjHf+fOLcvC1uyFbpppaUaRPVwys1woaUuI3lZI2JOyB5sRBfaAIEELyuwBZsXag6gIJU3KVVeKWK0WVuxhbYUrZeVjXXu4W058d/+zzI4z9965d6/9YTgz33nMf77zzTn/8zm/dQEl4iRgHHAucBZwCjAUcMBO4DvgS6AJ+AL4qpTXpCV4JHA5UA+cmvJd3wMvAG8AP/c3wQxwJzAfGCDbn/LQR/JQG7BLHhwMHAOcA9QCNcCg0HjzgLnAjv4gaFPYAIzS8wZ54nVgbzFfB3jANGA2cJ5s+4ATgC0x7S8D9gBrMgUGvhf4VORsoKvllcUpyBn+Bd4HJgET5O0fYjxoYbMaWAYMM0M2z6A2nffr3rx1E/BPClJJWK8PzkbGsxBaqHvz7tIegs4VIjcr1LE/ESb3GjAj9Pyrpti+Yj+C9SFy1wJvV4BcgEOAj0NxGcDI+T0EXZ8wHA88pfu7KkzuCKAZODmmrju4iRL8UOVbwPMVJtcKHJ9Q30sqi/OC+3u0dnUC0ytIbiDweR5yhoNDBHNkbfF9RrbbK0gOkRtVoM1I4DDgj4DglarYCrxZQXJrgbFFtFscxGEwxY+rYn4FyS0BJhdosxy4D9gcGIygxcJoPT+X8qUmHnYXsYA/BtyQp74duFu7TR8YwRoZWlPsFLYL3Ag8q6XoljxtrwcezVPfoP5dIVuVlrx9RvACGZuKJGcvfBIYruebgTkJEmqctsk4/A3cJoJRTAQ+sP06S8Ybr8r1eUiZEK3TUnRaTL158fwY+8qE8b4BpgI/JdS3qxxoHhwZ6pSE4ZrOQxPqTaVcaPIoZGsEqmPargAuDbayBPwuc1UG5w3O/cnO61QZd32G86pw3rw8bZaE7p/AeVNi2ryK8+pwnp9nHLv2qhzg/C0ruxX0Y4Bv83xVgAmKj6Ni6i4GWqRGoni5wM8Uhq0O29FfvE3isKrIzs36mHeAKZE6s/0V06chBTmkcgzdmRzBHndWF3B7+NqB36.05px3isR+yCcd2zE9i7Om5FibLsOV9mRJZO1g8+Z+rXfS/GVhpmaitkJ9ebtq1KOaRii8heb4rVayyaVMJDhAcmj+oi9UzFZCiaqT4vztzWP1aG6OyxzSkBUto/WWbgUtEnRTHX+b6Z+cuvOEO0S5agZW+zPBm4FFpU4xlCpKoPLKBjnqnwkZTBHr+k4byHOW1TGGA+qXGql87ebRshJ8F1ibbH4SRleLAeWfehQf8v1fB3owQ5JrVnKnYz4nwi+pHKdkSOX+tjZuwV7UhhZ5U0eOsDkLpFgRXv41h6CHZvDjaYFJ3qplxUHiNwwpVbskP6w5Bwi2BZtvEBTjfIwGypMzjJhm4DjpIb6bJ/O3/1jXKflcjlKn62uELkTdZCqVsyNi8qwTC43s/9Vh3OrZG/EufqEduVcV+DcJpyrxrmNOFeDc350POfviUvP9eLF0Dm5SemQjWV6zeLtaeAaPa+Ruu6Ka1woP3hHaPuarIPVMmVM02KMlpH2ELk5irlYcuRiML8HA4zQ0nNdyGZJ8kZJ+3VKRnbpTzwIOFoqqVbHgdNDfVdJAbUUenGxBAOcoWmeGeN9C27LuhrBII8dhR2uLMViWduikJZgABMWdhq8SFNvAiEuW2uLrG2bpjNNdwanteIA/AemXw/s14TxCQAAAABJRU5ErkJggg==");background-size:100%;left:15.83px;top:15.83px}.weapon-content-item .weapon-content-item-text{width:122.2px;height:59.34px;padding:4.4px 0 0 6.59px;background:url(https://mcguide.kurogames.com/assets/weapon-bg-BdI34pFD.webp) no-repeat;background-size:100% 100%;flex-direction:column;position:relative;box-sizing:border-box;cursor:pointer}.weapon-content-item .weapon-content-item-text .have{position:absolute;right:0;top:0;font-size:13.19px;color:#d7b27e;padding:0 3.08px;background-color:#483e33;border-radius:0px 1.76px 0px 1.76px;width:35.17px;height:16.7px;line-height:16.7px;text-align:center}.weapon-content-item .weapon-content-item-tip{font-size:13.19px;color:#5b544a;width:70.33px;height:16.7px;line-height:16.7px}.weapon-content-item .weapon-content-item-title{font-size:15.83px;color:#010101;width:109.9px;height:21.98px;line-height:21.98px}.weapon-content-item .weapon-content-item-star img{width:15.83px;height:15.83px}.weapon{width:100%}.weapon .sticky{position:sticky!important;bottom:0px!important;left:0;right:0;background:linear-gradient(to top,rgba(46,41,38,.95) 60%,rgba(46,41,38,.2));box-shadow:0 -1.76px 4.4px rgba(0,0,1,.1)}.weapon__title{font-size:17.58px;color:#aa9b6a;box-sizing:border-box;background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;height:61.54px;padding:0 0 0 18.9px}.weapon__title-logo{width:auto;height:21.1px;margin-right:3.52px}.weapon__title-finish{width:28.13px;height:28.13px;margin-left:17.58px}.weapon__title-info{height:49.67px}.weapon__content{background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:cover;border:0.44px solid #867357;border-top:none;border-radius:0 0 13.19px 0;width:866.42px;box-sizing:border-box;padding:0px 24.18px 22.42px}.weapon__content-title{font-size:17.58px;color:#aa9b6a;margin-bottom:13.19px}.weapon__content-title--tips{font-size:14.07px;color:#ece5d8;margin-left:7.91px}.weapon__content-title--top{padding-bottom:16.26px}.weapon__have-weapon{width:78.69px;height:57.59px;margin-left:3.52px}.weapon__illustrate{position:relative;width:816.75px;min-height:101.98px;font-size:14.07px;color:#ece5d8;box-sizing:border-box;margin-top:18.02px;margin-left:-2.64px}.team-member{position:relative;width:197.81px}.team-member-bg{position:absolute;bottom:0.88px;width:auto;height:167.92px}.team-member-pic{position:absolute;bottom:7.03px}.team-member-pic .team-member-notOwned{font-size:14.07px;color:#adadad;width:125.72px;height:20.22px;line-height:20.22px;text-align:center;background:url(https://mcguide.kurogames.com/assets/notOwned-bg-BbERdpo1.webp) no-repeat;background-size:100%;border-radius:0px;opacity:.9}.team-member-pic .team-member-name{margin:6.15px 0 2.64px;z-index:2}.team-member-pic .team-member-name span{font-size:17.58px;line-height:17.58px;color:#ece5d8;text-align:center}.team-member-pic .team-member-name img{width:auto;height:19.34px;margin-right:2.2px}.team-member-pic .team-member-star{z-index:2}.team-member-pic .team-member-star img{width:26.38px;height:26.38px}.team-member:before{content:"";width:99%;height:79.13px;position:absolute;bottom:0.88px;z-index:1;background:linear-gradient(to top,rgb(28,23,25) 0%,transparent 100%)}.team-item{flex-direction:column;margin:17.14px 35.17px 0 0}.team-item-title{border-radius:2.2px;border:solid 0.44px #d4b17a;background-color:rgba(27,25,22,.4);font-size:14.07px;color:#ece5d8;width:59.78px;text-align:center;height:16.7px;line-height:16.7px;box-sizing:border-box}.team-item-img{width:59.78px;height:59.78px;background:var(--grade-bg) no-repeat;background-size:100%;background-size:100% 100%;margin:10.55px 0 5.28px;cursor:pointer;box-sizing:border-box}@media (hover: hover) and (pointer: fine){.team-item-img:hover{filter:brightness(1.3)}}.team-item-img.hover{filter:brightness(1.3)}.team-item-img img{width:59.78px;height:59.78px}.team-item-name{font-size:14.07px;color:#ece5d8;width:87.92px;height:30.77px;text-align:center}.team-item .team-skeleton-img{cursor:pointer;width:59.78px;height:59.78px;border-radius:50%;border:solid 1.32px #ffe1b6;position:relative;margin:10.55px 0 5.28px;display:flex;align-items:center;justify-content:center}.team-item .team-skeleton-img img{width:59.78px;height:59.78px;border-radius:50%}.team-item .team-skeleton-img:before{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:54.95px;height:55.39px;background:url(https://mcguide.kurogames.com/assets/header-border-C7i_3hDA.webp) no-repeat;background-size:100%;z-index:2}@media (hover: hover) and (pointer: fine){.team-item .team-skeleton-img:hover{background-color:#504f4c}}.team-item .team-skeleton-img.hover{background-color:#504f4c}.team-skill{margin:17.14px 0 0 6.15px;display:flex;width:193.42px;flex-direction:column;align-items:baseline}.team-skill-resonance{padding:0 4.4px;border-radius:2.2px;border:solid 0.44px #d4b17a;margin-bottom:10.55px;height:16.7px;line-height:16.7px;box-sizing:border-box}.team-skill-resonance img{width:14.07px;height:14.51px;margin-right:3.52px}.team-skill-resonance .team-skill-title{font-size:14.07px;color:#ece5d8;height:16.7px;line-height:16.7px;max-width:87.92px;box-sizing:border-box}.team-skill .team-skill-data{margin-bottom:3.52px}.team-skill .team-skill-data .skill-level{font-size:14.07px;color:#aa9b6a;background-color:#0b0d0a;border-radius:1.76px;border:solid 0.44px #c2b294;width:14.95px;height:14.95px;box-sizing:border-box;line-height:14.95px;text-align:center}.team-skill .team-skill-data .skill-title{font-size:14.07px;color:#ece5d8;width:149.46px;height:14.51px;line-height:14.07px}.team-skill .team-skill-data .line{width:1.76px;height:12.31px;background-color:#ece5d8;margin-top:0.88px;margin:0 6.15px 0 3.52px}.team-backup{margin-top:17.14px}.team-backup-title{font-size:14.07px;color:#ece5d8;width:129.24px;border-radius:2.2px;border:solid 0.44px #d4b17a;text-align:center;height:16.7px;line-height:16.7px;box-sizing:border-box}.team-backup-img{width:129.24px;display:flex;justify-content:space-between;margin-top:10.55px}.team-backup-img-item{width:59.78px;height:59.78px;background:var(--grade-bg) no-repeat;background-size:100%;background-size:100% 100%;position:relative;box-sizing:border-box;overflow:hidden}.team-backup-img-item .mask{position:absolute;top:0;left:0;width:59.78px;height:59.78px;background:rgba(0,0,1,.6)}.team-backup-img-item .mask .mask-text{font-size:14.07px;color:#ece5d8;text-align:center;width:59.78px;height:17.58px;line-height:17.58px}.team-backup-img-item .backup-img{width:59.78px;height:59.78px;box-sizing:border-box}.team-list{background:url(https://mcguide.kurogames.com/assets/team-bg-DZ9FGg1j.webp) no-repeat;background-size:100%;width:816.75px;height:149.9px;margin-bottom:14.51px}.team{width:100%}.team-title{font-size:17.58px;color:#aa9b6a;box-sizing:border-box;background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;height:61.54px;padding:0 0 0 18.9px}.team-title-logo{width:17.14px;height:17.14px;margin-right:3.52px}.team-title-info{height:49.67px}.team .team-recommend{background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:cover;border:0.44px solid #867357;border-top:none;border-radius:0 0 13.19px 0;width:866.42px;box-sizing:border-box;padding:0 24.18px 21.98px}@keyframes expandFromCenter-a547fb8e{0%{transform:scaleX(0);transform-origin:center;opacity:0}to{transform:scaleX(1);transform-origin:center;opacity:1}}.strategy{width:871.69px;position:relative;margin-bottom:21.98px}.strategy-title{font-size:17.58px;color:#aa9b6a;background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;height:61.54px;padding:0 0 0 18.9px}.strategy-title-logo{width:16.7px;height:19.78px;margin-right:3.52px}.strategy-title-info{height:49.67px}.strategy .sticky{position:sticky!important;bottom:0px!important;left:0;right:0;background:linear-gradient(to top,rgba(46,41,38,.95) 60%,rgba(46,41,38,.2));box-shadow:0 -1.76px 4.4px rgba(0,0,1,.1)}.strategy .introduction-wrap{width:865.98px;background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:100% 100%;border:0.44px solid #867357;border-top:none;box-sizing:border-box;border-radius:0 0 13.19px 0}.strategy .introduction-content{border-radius:0 0 13.19px 0;padding:21.54px 24.62px 0px;font-size:15.83px;line-height:26.38px;color:#ece5d8;overflow:hidden;width:866.42px;min-height:182.87px;margin-bottom:21.98px;box-sizing:border-box}.strategy .introduction-content::-webkit-scrollbar{display:none}.strategy .introduction-content.is-open{min-height:157.81px;overflow-y:auto}.strategy .introduction-content.is-close{height:157.81px}.strategy .introduction-more{font-size:17.58px;line-height:14.07px;color:#aa9b6a;width:864.22px;text-align:center;position:absolute;bottom:0.88px;height:56.27px;margin:0 0.44px;background:linear-gradient(to top,rgba(46,41,38,.95) 60%,rgba(46,41,38,.2));border-radius:0 0 13.19px 0;transition:transform .3s ease;box-sizing:border-box}.strategy .introduction-more img{width:11.43px;height:9.67px;margin-left:4.4px;display:block}.strategy .introduction-more .more-icon{transform:rotate(180deg);transition:transform .3s ease}.strategy .introduction-more .more-icon-down{transform:rotate(0);transition:transform .3s ease}.strategy .introduction-more-btn{cursor:pointer;margin-top:12.31px}
`;

        // ===== 角色卡片 =====
        const roleTypeIcons = (info.roleTypes || []).map(t =>
            `<div class="role-skill flex-center"><img class="role-skill-item" src="${t.icon}"/></div>`
        ).join('');

        const roleCard = info.illus ? `
        <div class="role-card role-overview__card">
            <div class="role-img flex-center"><img src="${info.illus}"/></div>
            <div class="role-skill-content flex-column">${roleTypeIcons}</div>
            <div class="role-name flex-center">
                ${info.elementIcon ? `<img class="role-name-logo" src="${info.elementIcon}"/>` : ''}
                <div class="role-name-text">${esc(info.roleName)}</div>
            </div>
            <img class="role-bg" src="${BG_LINE}"/>
            <div class="role-pic flex-justify-center">${S(info.star)}</div>
        </div>` : '';

        // ===== 声骸推荐 =====
        let skeletonSection = '';
        if (info.echo && info.echo.main) {
            const ed = info.echo.main;
            const attrs = (ed.attrs || []).map(a => `
                <div class="skill-list flex-align-center">
                    <div class="skill-glade">${a.cost}</div>
                    <div class="line"></div>
                    <div class="s-name flex-align-center">${esc(a.mainName)}</div>
                </div>`).join('');
            skeletonSection = `
            <div class="role-skeleton flex role-overview__skeleton">
                <div class="recommend-skeleton flex-column-center">
                    <div class="recommend-skeleton-title">推荐声骸</div>
                    <div class="recommend-skeleton-img"><img src="${ed.icon}"/></div>
                    <div class="recommend-skeleton-name">${esc(ed.name)}</div>
                </div>
                <div class="skeleton-line"></div>
                <div class="recommend-content">
                    <div class="content-title flex-between">
                        <div class="mc-mini-attr-title">主属性推荐</div>
                        ${ed.sets && ed.sets[0] ? `<div class="resonance-chain flex-align-center"><img class="resonance-chain-pic" src="${ed.sets[0].icon}"/><div class="resonance-chain-name flex-center">${esc(ed.sets[0].name)}</div><div class="resonance-chain-grade">COST12/12</div></div>` : ''}
                    </div>
                    <div class="skill-content mc-skill-grid">${attrs}</div>
                    ${info.echoRec ? `<div class="side-attribute">${this._richText(info.echoRec)}</div>` : ''}
                </div>
            </div>`;
        }

        // ===== 技能加点 =====
        let skillSection = '';
        if (info.skills && info.skills.length > 0) {
            skillSection = `
            <div class="skill-add-container flex-column role-overview__skill-add">
                <div class="flex-between">
                    <div class="skill-add-title">技能加点</div>
                </div>
                <div class="skill-icons flex">
                    ${info.skills.map((s, i) => `
                    <div class="skill-icon flex-center">
                        <div class="skill-icon-image flex-center">
                            <div class="skill-icon-background flex-center finish"><img src="${s.icon}"/></div>
                        </div>
                        ${i < info.skills.length - 1 ? '<div class="skill-symbol">&gt;</div>' : ''}
                    </div>`).join('')}
                </div>
            </div>`;
        }

        // ===== 武器 + 队友 =====
        let weaponTeamSection = '';
        if (info.weapons && info.weapons.length > 0) {
            const mainWp = info.weapons[0];
            const altWps = info.weapons.slice(1, 2);
            const altHtml = altWps.map(w => `
                <div class="mc-mini-wp-alt flex-column-center">
                    <div class="mc-mini-wp-alt-label">备选</div>
                    <div class="mc-mini-wp-pic mc-mini-wp-pic-small flex-center" style="--grade-bg:url(${gradeBg(w.star)})">
                        <img src="${w.icon}"/>
                    </div>
                </div>`).join('');

            const weaponHtml = `
            <div class="role-weapon-recommend flex-column role-overview__weapon">
                <div class="role-weapon-recommend-title">武器推荐</div>
                <div class="mc-mini-wp-row flex-start">
                    <div class="mc-mini-wp-pic flex-center" style="--grade-bg:url(${gradeBg(mainWp.star)})">
                        <img src="${mainWp.icon}"/>
                    </div>
                    ${altHtml}
                </div>
            </div>`;

            let teamHtml = '';
            if (info.teammates && info.teammates.length > 0) {
                teamHtml = `
            <div class="role-team-recommend role-overview__team">
                <div class="role-team-recommend-title">队友推荐</div>
                <div class="flex-align-center">
                    ${info.teammates.map((tm, i) => {
                        if (!tm.main) return '';
                        return `
                    <div class="mc-mini-team-item flex-align-center">
                        ${i > 0 ? '<div class="mc-mini-team-sep"></div>' : ''}
                        <div class="flex-align-end">
                            <div class="mc-mini-team-pic flex-center" style="--grade-bg:url(${gradeBg(tm.main.star)})">
                                <img src="${tm.main.icon}"/>
                            </div>
                            ${tm.spares.length > 0 ? `
                            <div>
                                <div class="mc-mini-team-spare-label">备选</div>
                                <div class="flex-align-center">
                                ${tm.spares.slice(0, 2).map(s => `
                                <div class="mc-mini-team-pic mc-mini-team-pic-small flex-center" style="--grade-bg:url(${gradeBg(s.star)})">
                                    <img src="${s.icon}"/>
                                </div>`).join('')}
                                </div>
                            </div>` : ''}
                        </div>
                    </div>`;
                    }).join('')}
                </div>
            </div>`;
            }

            weaponTeamSection = `
            <div class="role-overview__weapon-team">
                ${weaponHtml}
                ${teamHtml}
            </div>`;
        }

        // ===== 角色简介 =====
        let introSection = '';
        if (info.roleDesc) {
            introSection = `
        <div class="introduction">
            <div class="introduction-tab flex">
                <div class="introduction-tab-title active">
                    <div class="introduction-tab-title-label">角色简介</div>
                    <img class="line" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQ4AAAAnCAYAAAD+ZabvAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkYxQjhBMDdBQzcyQTExRUZCOEIzOEVGRDM2QkVBMTdEIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkYxQjhBMDdCQzcyQTExRUZCOEIzOEVGRDM2QkVBMTdEIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RjFCOEEwNzhDNzJBMTFFRkI4QjM4RUZEMzZCRUExN0QiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RjFCOEEwNzlDNzJBMTFFRkI4QjM4RUZEMzZCRUExN0QiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4j1lKtAAAHsElEQVR42qxaa2xU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"/>
                </div>
                ${info.desc ? `<div class="introduction-tab-title"><div class="introduction-tab-title-label">攻略简介</div></div>` : ''}
            </div>
            <div class="introduction-wrapper">
                <div class="introduction-content">
                    <div>${this._richText(info.roleDesc)}</div>
                    ${info.desc ? `<div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(170,155,106,.15)"><div style="color:#aa9b6a;font-size:14px;margin-bottom:6px">攻略简介</div>${this._richText(info.desc)}</div>` : ''}
                </div>
            </div>
        </div>`;
        }

        // ===== 属性推荐 =====
        let attrSection = '';
        if (info.attrs && info.attrs.length > 0) {
            attrSection = `
        <div class="attribute module" id="attribute">
            <div class="attribute-title">
                <div class="attribute-title-info flex-align-center">
                    <img class="attribute-title-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkYxQjhBMDdBQzcyQTExRUZCOEIzOEVGRDM2QkVBMTdEIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkYxQjhBMDdCQzcyQTExRUZCOEIzOEVGRDM2QkVBMTdEIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RjFCOEEwNzhDNzJBMTFFRkI4QjM4RUZEMzZCRUExN0QiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RjFCOEEwNzlDNzJBMTFFRkI4QjM4RUZEMzZCRUExN0QiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4j1lKtAAAHsElEQVR42qxaa2xUVRA+e3fZbUsfgDwULRVUIo8Y/AGCPMJD0FjBBAUN8RWVxKjhjxJ8VTAY/WFMIAjBEMJTUFKq0YhSlBCMaKFJkUiUhyAmBQGh9EG7rftwpv0OHY7n3r13t5N82e7dOXNm5szMOWduQzvWvegopUoI/JlWXaQ/Y4QOwmXlTjx2NGE84Q7CMMIQQj9CAXhaIeMvwinCCcLPhF8JjR6ybyD0IrTje0h8pnhsBAo8gc92MTgPjF+4GFBEmE+YQxhBuBFCE8C/hnJ9CP0J4+Csvwm/Eb4k7CA0W+YoI5Tj77h4HoPsrREIK4a1momtDhO+Ihx18Q5PWE3YS2ggtBCSWD0HBkbB2wH+FJzCsgsJfWFss8scR8AzWzhFO7dzngiEtkP5uJi0ivCDEMaC7sLkSYxrhdBiKJZG2LCnD8HLCqszhfAPxmjeNJx1K4zWso/AKaz093hWjjk7IJN1TkUMiyNYnmpD+ccI7yK2dfzJmFQid3j8NsLvwgBejccJCzCxbZwSeci58hbhMzzfBxlTxdzXFFZi2QvBXG1MwIk5SKyOF+0iPGfE7Ak84zx40IeMQZhT0teEfBQLvQqdSiuhfA2SyqT3kajvEeo9Jm4Hb9zyWxy/tXuMr8ccI8AriT2/E+FVpFfREUt8nPC5WM5lhE8Jo4TwNwnTCatcyh8n4xkPBc+4JGwjZE7HHNpJo6DDO/iehBGn4fBOAzjpzoNRe4eXeylin3OhAlVKwdBFhAmEj1B9NPVGArtRf/BoaoGMCZB5XNT/CszNOrxNeF44aTvhEusenjdnLGf+HyLhOFG2ojooxN00wkyEwS94zhXlG8Ie8I5GArMTvnUx4HXCJFSuzYSXCeshS9PThNVI+Hzx/D7CAcKfMOIcO4BX4ArhrNhsVokdVNLdhI2E3YSJ4nkt4VnCZEIlPFlhJHwUzxaBZzLG1AqeiZC9EXOZVADd+uA7V6orZhmdAU960SyAJ1qOo4FCAZhHeJTwKpTYJ1Z1MH6vtFQ4Nu4ZH9VpNHTcaZZRTWEo0iZ2TZNCOHZMRFh9bPxeidCaLOQfRzxftcibCVl1SOa0hUeX+Xzo2K0MHeaUcf5JIUZDLgZI48PYWXOhAlSXhAeP3LUdWaa1hwZCyCXL7uhGSdUzFMQBHaJKsfMuaAOexBKzAcPxYyKA4Bhqd4NPfj5X3ZxhU7OteBLheBtC9MMIavMD2IGHIn6LA3gmBP61hNd8jllCeIHQ5GOlZag1oZw2QOdNbMAYwp28HPDKsCxD4V7kUDwDXx54S4Ag1B+JXA+dx3BCjEVMtSF5W7I04BZcQDJRGXizoRbo2AadxzqI+RTg5JCMfOYf4INvAHizJUfoO9xB3HdkKJl+iJd2pA++kcYRIRsKQeehbEBpwIrjReN6iMcPsc6luiOR6iGhR3uIxw+xziWOuCDnSj/iZJmJ1oM3V2Kd85we2lFZxhuo05moCbw9Mq+DDcvJUdAWwv4A/PsxRuVYjVod3MbCOQi6gGN1UFqOsdkS63zewf0ykoOgD8SdIAidwthsiXU+7eCiHcsyketw/cuWVkNGNgnMOp9xIEB35FIBN7Ql2NazpTbICLKBpaAr61zn4F5ajxNlkFXYhgt9rrQHsoJ4vxg617IBxwg/4YzutxpdxD3W7W6gAv5WAZl+q09f6HzMwZa8HQL8bmq2xB2CrkOheFYMaCoEz5AsEzoNHS9C54T2+F70ZvJ95ACH3ErL8zWEl4yLe5lxxL4KnjWW8SuNNotbDuRD173KEjKZlOcEWiybqyBuQpVbduJSwNyJyzHGvO8u9nEuC5nxZH732hNWil6Ppmm4TmoDYx4rEBMKrsVYSftcVlfWfsfLgMseR+uTlh2XvbtBdTWHdczHPFYgJnKiCGNLLTv0SY8j9CXTgBK0VXQDapNHzW8wlNlgeLi36u6pKsu9t5e6vrlbBhnS6AaPvWGj6m4AD9bHafbEI7hj8vK+QvjOGMhGVRnPVqHNZ5bJqBGvMmajllI6A7IkVVkcuRu6cSW6iTCXq5o+jbI18+Eh3uGeUl1vEJnO4vgribvKC11iNGrpqEkDbDm2EDIl8Zzn8PcR6NQOB8xH1LTqd1LcruYXePMwgAfy61N+UbdMdXevme4nrPDYZCJBklDQCshWwnFLsWHNxcm1F6rXcOh8bbIkHnCLhdvtu5BI3DySb2J4pdZ5HL/D2Gi8ekJeY1n2eOEwvr1VIi84FGfD0S26mjkiVhPYaPg1zyxRlZKiM7bDUjUkFYmCYKOBomLZqBRzFIiyrAvHQ6qri63fR4eUsdzaCI6zmWA8YPRz+PeDOEWmLW2VRIZrZRPuwxHLKTYkZAxQ179r4z7oFIxJSL11TEaNO4GDysTLqt8X12MHDYvNqC3g3ZaVn2QJnXwxb1Jd3/RlxR8Wv+eJatf5pj6NStQoBupD0zSE0VHV/T8QckUWoLcahjF8HOC3JzUuBtwDx0ShNCt7WHW9HbWdRvmNzFSsXFyU5Bh0Tkeg+CeiZWeGhVuzthmT90NscgEYhCJQI5LWrPmLcQ8/hBU5rNz/V+I8Nq82l/Zio+65X1TBKY58OIjvbMjtonYri9wt2CRPKu9/4XEb/z/6T4ABAE8C/aiJQjudAAAAAElFTkSuQmCC"/>
                    <div>属性推荐</div>
                </div>
            </div>
            <div class="attribute-content">
                <div class="attribute-content-title">推荐LV.<span class="attribute-content-title-level">90</span>属性数据</div>
                <table class="attribute-table">
                    <thead><tr><th>属性</th><th>推荐数值</th></tr></thead>
                    <tbody>${info.attrs.map(a => `
                        <tr>
                            <td><div class="flex-align-center"><img class="attribute-table-icon" src="${a.icon}"/><div>${esc(a.name)}</div></div></td>
                            <td><div class="flex-align-center"><span class="attribute-table-operation defaultFont">≥</span><div>${a.value}</div></div></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
        }

        // ===== 共鸣链推荐 =====
        let resonanceSection = '';
        if (info.resonances && info.resonances.length > 0) {
            const items = info.resonances.map(r => {
                const isAlt = r.status === 2;
                const tagText = r.status === 1 ? '推荐' : (r.status === 2 ? '备选' : '');
                return `
                <div class="resonance-info flex-align-center">
                    <div class="resonance-logo flex-center${isAlt ? ' unselect-logo' : ''}"><img src="${r.icon}"/></div>
                    <div class="resonance-text">
                        ${tagText ? `<div class="resonance-text-recommend">${tagText}</div>` : ''}
                        <div class="resonance-text-title">${r.seq}链 · ${esc(r.name)}</div>
                        <div class="resonance-text-content">${esc(r.desc)}</div>
                    </div>
                </div>`;
            }).join('');
            resonanceSection = `
        <div class="module resonance" id="resonance">
            <div class="resonance-title flex-align-center">
                <img class="resonance-title-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjRFRjU0RTY5QzhEQjExRUZCNjk5ODlDNDMwN0VBQUQ4IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjRFRjU0RTZBQzhEQjExRUZCNjk5ODlDNDMwN0VBQUQ4Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NEVGNTRFNjdDOERCMTFFRkI2OTk4OUM0MzA3RUFBRDgiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6NEVGNTRFNjhDOERCMTFFRkI2OTk4OUM0MzA3RUFBRDgiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6ElNjRAAAFFUlEQVR42tyZC4gVZRTH773u6taulmutbib0InpAW1SWJb2p7IFFQSFFYQ9IiEAKLCgIDU0MCioCS7SC2A0KN7VWKopKzUKL3IrerrWlqanbuubu3dv/wG9oGL6ZO3N3Z7rrgT937p1vvvn+55zvnPOdm29bOieXgYwX/krzBYVcNnJx2i/IisjthwqRGw8FIrOFfEIyNn5U2kSOEY6NOfZw4W4fodqYz80QimkT6RYeEk6KMfY+YRrX1wm3lhlfJzwp7MnKtdqE14VzHffMJU4VHhaWBO69LDwgnBwy7zzhQmFd0gXVVEhkvfCPsFh4RvhS2CU0Cn8I9wphCWoh4xZh1QPCccKVwtXC85UsqFIiJWGDcD4LM3fbKbQKbwpzhbXCmsBz/cI1wofslzuEc4Qm4aDQK3yVddTqRZvbhXphovABJA1vOyLVFb4xtvD3hTHCDjL/YNJNPlQieaxRz6L6cK3dgXHtQgfXK4SPA/d/RBklvGOscGmlRPK+z7hyGXthO5YYBYJzmIaf4PpZvvvlaD6PIFRvFCaAivZIDSYtxrTGJuFdcspsNupRwvHCT4HxHwl/C5875jpDOFLoJAqu4vfapDwKmHWAz3FCc0RWrcWddvtyygLyRTeWckmr47d63OhVkuZKnzIPxPSSOs8YBZ8LDBJSG4TzHBHN3OAqCAelk8VMCtHmSsdvzQSEp1i4y/KnhcxnrtjC8cBkILhYI/K9MFq4k5BaJLKMJ3z2hmhnn/AK43YE7n0WEsJXRGjbs45VBN/6goJZYQoe8Hu5PGIanorPDzKBTdpTxtRbQzR4CsHBL7/E2JM9VAEnEK49Im8E92JU+G1n7/ShjX4iS1OZl/c7flsSovFyMoVA0cO8ptRfHQElksheXMsbVwORMxNGFCs/zo6or6Iq59NRpreP87h+ooQ4iCYacJcB0OKraOPIQj4fTJCALWpeRBSt80Un84yupLVWARJbeHgf4xs4j0wXvsD0YWJF4Q1c3yU85tgrQTmMqDlZ+IHFey49xpFUyxIZTWG41RFyv2aR5sPfRfh7G9r0FNOBRcNkIknSItKn7E/v2XHca6Iciu1aB4kspZD7pq2f0ZJrnvnCWY5M/mhElVGL8jp9JDw330OV0J10jwzE8GUz+34H2evZEy55hJImmPzyLLKnzPFhryvjD1fzoRSIUu0+l3KVFR2BwrDkC69J35daF2VZzHFLq7Ud1EAFe0nM8TOF1yIslzmRPMdXC8U3JzjXFOiqbGbPFP5PIo1YwarbEyucw+qw1RScY7Mm0kzZblXtTUNoYvhD7yxyx5wY9dyQuiiTaSZM41wyIYVAYf2w58hB73D0bY1RDTiJ1KDxFgrEC7ielMuu6d2IhWZx8OpmD65jT22BXDGKSIkk10XC20ZJMp0aKEuxhX7iy/a/QWB/HIsUqWV2Oe5N5Vw+g+o0LbF+13schTen0WncCBaxV8yXLx9GAqtoH23IMvyuxzLzc0P/f3AnxeTMSkgMRx7p54xhQeGtCudo4/kFCWqt1EqULkLz/bn4vds++mG3sImrptYyAtYWfTrmePtD54VqLBo9mUcfKnj+98s3wuPVWv36D2TXCn8GTpuebHMcrKqSSI6+022BCtmTe+hNjQgiJmsdh6xluf/+LxkxRHLsA69zb2fxuWm9KG0iXWRrc63lNA5GJBGTxbxneZovyYKIVa32N8OmkU7E5KW0X5AVkRfTfsG/AgwAI8MwoffKxVQAAAAASUVORK5CYII="/>
                <div>共鸣链推荐</div>
            </div>
            <div class="resonance-content">
                ${items}
                ${info.resRec ? `<div class="skeleton-suggestion"><img class="mc-corner-diamonds" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD4AAAAjCAYAAADMibkBAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkFGNDQ0NDhEQzhFMzExRUZCREU2RDcwMTI3NENDM0Y3IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkFGNDQ0NDhFQzhFMzExRUZCREU2RDcwMTI3NENDM0Y3Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QUY0NDQ0OEJDOEUzMTFFRkJERTZENzAxMjc0Q0MzRjciIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QUY0NDQ0OENDOEUzMTFFRkJERTZENzAxMjc0Q0MzRjciLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6cLypnAAADgUlEQVR42uSZeYhPURTHf7MgS0goa2NN1jAjDA3ZIrLNMLKXpGyhoaZkGtvwh0mDsQwaf2gWW03TlL2EyD6Wf1AmRBjDWKbB/Hxvfaduz1t/987vqd+pT+/37uvdc8+9555z7vtFFe5dEfBROoOPoCbciqMD/koSGOiHYr8NHwFGRaLh48AkPxTH+mh0L9AH9ABtQGWkrPhCXhuB6ZHi6sLTFkv3S/9HwxMaQG8y6CrdjwZDNPafoMPw9Zo9Q/SVbtK+WaOOuaCLiuEtwUwwXOOghFsPMGmfASZq0jENTFExfBZoAlI1Dag9yLJ5vo/6VGQw6O00ZjvDo8AaaZVaKw5I9JcH2jqkuB2KelbxOoaT4NnwZOnFFiBNcUDpdEEnWQfmh6ijP1gk3Wd6NbwVyDa0bbDYm25kJdjqwTOOuZwkWWJArqEomwpS3BouOjgFOhnaxd47A9p5jOCZ3LtRHt5rTF1ejo57LOr+I2YLZjS8GSgC4y067wmugG4uBtIdnFdIU7FcQbEIHRwmN0uKR2bee5EHon8Mj2YEf8irnfQDd8Fq0NzkuZjdA+AZDyGqMhu8ADkmwSoRXAebXGSTq2B7vcfGpEyOF9F6F8hwmFlZmjJqdgT3QDVnNo1GJ3HL6BJRzw/j2T0InrOwyuZBx20MSGTmeCpWuopuEgeOuuzkHBUuB2/Y9gVsY2yYJzrXaHgh6AtGMvBV073juJX+uOjjNoinR5fLe1wcC5dxEoI2HezmyxUWz3+BAjAIbAF1Cga/43k9lVvHKDWcbJEBftj0c5Yeet8uqufYpJ587qegi0H/ZkRPdhiUlYh4M5QB0knKwBKLcd3ixP10k8czGDRkeekxvcizPcGj8eVgLHjr4Z1icNjQ9h3MAbVuC5ggS7+goaIK9WvoDQ6gzqV7iwPG5xCrwyrpfqfVlrQrWR+AUv5+BEoUA1QpB2InYqIXgNch6qhkVglwAvaHejrLla7BgLqIPf/Y5rmIIZcUdRziWE8aVt+T4aLi+QROa0pLYq+ttVmtjRp0VDB1Faucx2sZ5T9ozMmXwQWT9myNekpMgrPnT08HG+Cbm/HM/Y0HGV2Sx3pCyfD3DWC4qJufSPfH7fZjCOI4Zj+/q+dLv0+EW7mfhhdJhdGdcCv38y+kV0xtZX4o9/tPQxF5r0Wi4TdZzgYiydXrDzBf/VD8V4ABAKforGnuLPqnAAAAAElFTkSuQmCC">${this._richText(info.resRec)}</div>` : ''}
            </div>
        </div>`;
        }

        // ===== 攻略详情 =====
        let strategySection = '';
        if (info.synopsis || info.detail) {
            const synPlain = this._plainText(info.synopsis);
            const detPlain = this._plainText(info.detail);

            const isDup = synPlain && detPlain && (synPlain === detPlain || detPlain.includes(synPlain) || synPlain.includes(detPlain));
            const detailHtml = [];
            if (info.synopsis) detailHtml.push(`<div>${this._richText(info.synopsis)}</div>`);
            if (info.detail && !isDup) detailHtml.push(`<div>${this._richText(info.detail)}</div>`);
            strategySection = `
        <div class="strategy module" id="guideDetails">
            <div class="strategy-title">
                <div class="strategy-title-info flex-align-center">
                    <img class="strategy-title-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAArCAYAAAAZvYo3AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkYyQ0MwMTc4QzlCQzExRUZBM0I1ODMwQ0UwRkZCMERFIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkYyQ0MwMTc5QzlCQzExRUZBM0I1ODMwQ0UwRkZCMERFIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6RjJDQzAxNzZDOUJDMTFFRkEzQjU4MzBDRTBGRkIwREUiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6RjJDQzAxNzdDOUJDMTFFRkEzQjU4MzBDRTBGRkIwREUiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz5QtBu6AAADfklEQVR42tyYSWgUQRSGpzuTTJzRGGdc45rgEsWIiguKxIMLOYkgKIKi4kFQUFA8BTypF8WDoCKCiIiKoB7UCGrQgCC4oLgQt0SRoEQT1ySTSSbT/iV/h6Lo6a5ORht88JE00131V733annGhRNbQxo2HowGI0Ec5IEw+AE+gxbwBvzi+yYoAl2gw63hsMtvM8EyMBtUghKXd3vAQ3IX3AdfQBmFvAOfdAXMBQfAAlAQ0jMxI/OJmNKP4BTYD0aBKs7GDQrrNVNpZC24Axb76Fw1g+6qBhdBKzhDV2wHiWwCjoCzIOrS+DfwAbwCbznSLpf3q/iucONlumYjGKgKOAy2ODSQBLVgA5gBpjAgy8EkMAFMBQvBQXam2nBQA0pBHSgGm2z3CwGrwTblIzGqQ2A6A/E0eCYFViXJgEZwD+ymyFXgkdJenMH5E7xmQE+zBaxQXCFSaznYxcYt6bd5oIEjEbx0EH6JAXxU+a2EmSVc2G272mTwyfaAjTtZmfI8Mct73Qw41QYwjuz//wjoUV7qdAmqtI9ssChEXS/s/qJqFugsTvWgTXqu9RBhOogaJAkwwj5z/AWjuZjPjX1YJ4ooJOo12mzWQvpqdp8xHQGLmMeWZuOF4JxGbGi7oIKLj66AwRoCDDkIvQS0c13QFZDRzI6QvRx7CcjnpqQrIOIjFsT6U+glQKxsKR8COjV3S3tNiHsJuOZzW87z4QLxt9hLwNfQ37OMjoAY9/KI5tS2cWfUcYGWAJGG66WPvBqO8HDaopEpWi4QjV33MQMd0m6XExe08iiVS5NdEDdDwVr+vxZgcHHrTcUgZsBwOzD89wKMoAVYyo5pBSHACjoGQkELSMlxEISA714CunLYWdohC5KqAPUQUdqP2oBsSxw2MdHXWDkTTIeDZAVvQNU8C+T56FQUH9aA86yGON0Zo8wE0XcszFLKSqUwIS6he8Ee8J6Nia25mVfsJA+0YoTDwAhWVebw2cnqWEMq5/1B7Am3RSM3eUUXqocqHwlXTCb9sZNgB++FZdzmb4HHpnTJnAWO5TjiRTFiHdjM56XgKTguOlfvBU2scF0FO1lMSPTxsNnAE/U+Hs9ivGHVs4xjuV3Fa8gYzko5KyPjwBAWFqIMqDRPzuIY9oQ85yhTUh8Zh7KNZy2giVxhpwlepwpIhgLaeRpudlkLshY2fgswAEUYyRKHBUo4AAAAAElFTkSuQmCC"/>
                    <div>攻略详情</div>
                </div>
            </div>
            <div class="introduction-wrap">
                <div class="introduction-content">
                    ${detailHtml.join('\n')}
                </div>
            </div>
        </div>`;
        }

        // ===== 独立声骸推荐 =====
        let standaloneEchoSection = '';
        if (info.echo && info.echo.main) {
            const renderEchoRow = (ed, tagText) => {
                if (!ed) return '';
                const attrs = (ed.attrs || []).map(a => `
                    <div class="skill-list flex-align-center">
                        <div class="skill-glade">${a.cost}</div>
                        <div class="mc-skill-line"></div>
                        <div class="s-name flex-align-center">${esc(a.mainName)}</div>
                    </div>`).join('');
                const mainSet = (ed.sets || [])[0];
                const setBlocks = (ed.sets || []).map(s => `
                    <div class="mc-echo-set-block">
                        <div class="mc-echo-set-subtitle">${esc(s.name)}(${s.set}/5)</div>
                        <div class="mc-echo-set-desc">${esc(s.desc)}</div>
                    </div>`).join('');
                return `
                <div class="skeleton-content-data flex mc-echo-row">
                    <div class="mc-echo-tag ${tagText === '推荐' ? 'mc-echo-tag-rec' : 'mc-echo-tag-alt'}">${tagText}</div>
                    <div class="data-skeleton flex-column-center">
                        <div class="data-skeleton-title">首位声骸</div>
                        <div class="data-skeleton-img flex-center"><img src="${ed.icon}"/></div>
                        <div class="data-skeleton-name">${esc(ed.name)}</div>
                    </div>
                    <div class="line"></div>
                    <div class="data-skill">
                        <div class="skill-cost">COST 12/12</div>
                        <div class="skill-content">${attrs}</div>
                    </div>
                    <div class="line"></div>
                    <div class="data-resonance">
                        ${mainSet ? `<div class="mc-echo-set-header flex-align-center"><img class="mc-echo-set-icon" src="${mainSet.icon}"/><div class="mc-echo-set-name">${esc(mainSet.name)}</div></div>` : ''}
                        ${setBlocks}
                    </div>
                </div>`;
            };
            const rows = [renderEchoRow(info.echo.main, '推荐'), renderEchoRow(info.echo.spare, '备选')].filter(Boolean).join('');
            standaloneEchoSection = `
        <div class="module" id="echo">
            <div class="skeleton-title">
                <div class="flex-align-center">
                    <img class="skeleton-title-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADEAAAArCAYAAADR0WDhAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjYwOUREODkxQzc0ODExRUY4RjJERUUxOUE1N0I5NkQ3IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjYwOUREODkyQzc0ODExRUY4RjJERUUxOUE1N0I5NkQ3Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NjA5REQ4OEZDNzQ4MTFFRjhGMkRFRTE5QTU3Qjk2RDciIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6NjA5REQ4OTBDNzQ4MTFFRjhGMkRFRTE5QTU3Qjk2RDciLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz4wN4jLAAAFxUlEQVR42sSYa2xURRTHd8u2TYsKUdRootCGQK1GkYrVqNgYgkaCDyxGEBWFio+ihKCWgNFgfQDV8CyGlioFEfuhCiQKRCMfNBUsxgfEBwbEF62ALhAxlD48J/ndZBzn3t3u3k1P8s/dvec1587MOWcm2lT3WMSH+gnGCLZF+p7GCj4SdLmYWQGKqjBKMK2PA3hIUOoXgFIsgYE1gp8E3YI3+iCABwWrBEOChLISGDkk2CyoE0zthfOsFP2ZdD9+tzCOlINQep39US+4Lwn5AYJHfXiPw09EUwQN+F2V6hczSTdUpeBLltTkANkcQTPOXRSFnxNgY5LgTcFXgpn4TzsIpZWCOxhco+AeH7nFgpsEf/nwj8J/1Yd/t2Adfm4XrEhn7broV8EJHKwXTLT4BcxYJOBLe+81rxdaPLW3Afsn8BcJOwil/UYNUYflBq/MsHe2j/45ht8y4325EYDSgUgIWcSPDljpWR1PwPkwgzdSMNDSHch7j4ahp/pvWel+fyaD+Nr6ny14W7BPUGW81z1zWFCNj2r+TzJknhH8iH5OAj+hBrHdZ50X+BTSedSZeT6FdYjP/tmeySA+FbT2UmdcL+Vb8ZOxIJRmCE5mqM04if1IpoP4QrArQ0Hsxn7GgxhvpcduNnYqtA99j27AfsaDWGD9f4R0uaSXdpagN8NhP5rJIK4XjLDefc5zdrJtAnKzLX2P1P51YQQR5UCUbb2/0yHrBdUjeIKuN4hWI9fD/8sdMuWOejTKb4ZcQWgPs4cvddriHXPIzzWqcw990RqfABpYfj1GFZ/vkPvT+n+a8ex19Gz/CSJP8I6gieZsrs9+eFgQt9qHnYJ7BcUUvlcELZZuC+8LkJuMntmuxLG/wOG7Ct0mxplnH0+1h3mPA7l5LHVRHWcCPfhMFwxmIOsTLKNrBT/48A5y6FoZ0MYfxPdMWnZtMm/Rs7c3E88bASitTTCgo/RDOmNL06wNy7FTHRCARxuM32O8GdMgLrKaN6XzfIxk8xViRo1oTDOItUatiLHmYwlaeXOJDdcgSgS/WMzNLI8CxwabSveZz7v2NIP4g2c+dnVvdToOXOsYl73ErshiLxSyxibwZf/G2Dc8TWpkHxTz/zer/+9gufktw1PW+cT7gEXYrbd0vHFMYVwazF3Mio67ycxOuh7fFTwAUzd3f5QqDLlNgiOCm63qq9TGQAaxJG/khqSM/4Nov3+39CJsUn2/1XhXgf/+pOdCrnKazTTst/aOkHm+Eyyiwu4hTf6DwWnwdInVMtBuAolwCDrssN1Gq92PbOSNYzr7o9PIZl4H8JSgJtW2o4a7ohxmxqvgywQXCOYYV54TLUexgNvGGuS9q8knBeeTqbwEUo/fyqAAku2d9PJqo+AS7kW9ffAyqXmckal2WllH5T7maWaxXUZGulXwErN6yLh/Laaw1YbVAC7jOcfQeZGk0MxsZTnS9IUsM32e6+jPKtHfRJ3wxuTNcFI1KNkgPqOCDzWasy4O/vP5kq0skTxmrdSycQ1fNxe53eg9i50uo8kcSvpsCTOIHvoVpaeNbrKbW7+L6U6X0/9oo3amZeMMksNxNuxq9BYbAUSNwrvRaBRDO0/UUgNKIv+/IT9GC17EHVI0oMVX/nDk4xZf0/tVRsYL/VD0s2Chkd9LHTJxNuUsHxuz4McdvKuNurEIfxk52b0g+EBwlmAH90muq/qljrujD3026gDs7OD3Vp9WPLQgdJpvY0PmkFG0d9pGutV24FLy/GuOmpMNX+WeQ68dO7mk7fEs26QpFuk9dfLlttDfX0YbP9a6P3qfPimXZwXpNN9hcy/8lhTGk9Jth5l2S/iipyxePqk4l/+5fH07gA70R6YaQLpBeIPQ9Xul4JMUrkRHoN+RziDSDcKjbwWjaQrbEsi2IzcavbQprCC8gthAtV5IUTPpOO+LkOsOy3GYQZi1oopqrM/veQ7mGQ/b4b8CDAB5WVE3OD3SbwAAAABJRU5ErkJggg=="/>
                    <div>声骸推荐</div>
                </div>
            </div>
            <div class="skeleton-content">
                <div class="skeleton-content-title">推荐声骸</div>
                ${rows}
                ${info.echoRec ? `<div class="skeleton-suggestion"><img class="mc-corner-diamonds" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD4AAAAjCAYAAADMibkBAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOkFGNDQ0NDhEQzhFMzExRUZCREU2RDcwMTI3NENDM0Y3IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOkFGNDQ0NDhFQzhFMzExRUZCREU2RDcwMTI3NENDM0Y3Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6QUY0NDQ0OEJDOEUzMTFFRkJERTZENzAxMjc0Q0MzRjciIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6QUY0NDQ0OENDOEUzMTFFRkJERTZENzAxMjc0Q0MzRjciLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6cLypnAAADgUlEQVR42uSZeYhPURTHf7MgS0goa2NN1jAjDA3ZIrLNMLKXpGyhoaZkGtvwh0mDsQwaf2gWW03TlL2EyD6Wf1AmRBjDWKbB/Hxvfaduz1t/987vqd+pT+/37uvdc8+9555z7vtFFe5dEfBROoOPoCbciqMD/koSGOiHYr8NHwFGRaLh48AkPxTH+mh0L9AH9ABtQGWkrPhCXhuB6ZHi6sLTFkv3S/9HwxMaQG8y6CrdjwZDNPafoMPw9Zo9Q/SVbtK+WaOOuaCLiuEtwUwwXOOghFsPMGmfASZq0jENTFExfBZoAlI1Dag9yLJ5vo/6VGQw6O00ZjvDo8AaaZVaKw5I9JcH2jqkuB2KelbxOoaT4NnwZOnFFiBNcUDpdEEnWQfmh6ijP1gk3Wd6NbwVyDa0bbDYm25kJdjqwTOOuZwkWWJArqEomwpS3BouOjgFOhnaxd47A9p5jOCZ3LtRHt5rTF1ejo57LOr+I2YLZjS8GSgC4y067wmugG4uBtIdnFdIU7FcQbEIHRwmN0uKR2bee5EHon8Mj2YEf8irnfQDd8Fq0NzkuZjdA+AZDyGqMhu8ADkmwSoRXAebXGSTq2B7vcfGpEyOF9F6F8hwmFlZmjJqdgT3QDVnNo1GJ3HL6BJRzw/j2T0InrOwyuZBx20MSGTmeCpWuopuEgeOuuzkHBUuB2/Y9gVsY2yYJzrXaHgh6AtGMvBV073juJX+uOjjNoinR5fLe1wcC5dxEoI2HezmyxUWz3+BAjAIbAF1Cga/43k9lVvHKDWcbJEBftj0c5Yeet8uqufYpJ587qegi0H/ZkRPdhiUlYh4M5QB0knKwBKLcd3ixP10k8czGDRkeekxvcizPcGj8eVgLHjr4Z1icNjQ9h3MAbVuC5ggS7+goaIK9WvoDQ6gzqV7iwPG5xCrwyrpfqfVlrQrWR+AUv5+BEoUA1QpB2InYqIXgNch6qhkVglwAvaHejrLla7BgLqIPf/Y5rmIIZcUdRziWE8aVt+T4aLi+QROa0pLYq+ttVmtjRp0VDB1Faucx2sZ5T9ozMmXwQWT9myNekpMgrPnT08HG+Cbm/HM/Y0HGV2Sx3pCyfD3DWC4qJufSPfH7fZjCOI4Zj+/q+dLv0+EW7mfhhdJhdGdcCv38y+kV0xtZX4o9/tPQxF5r0Wi4TdZzgYiydXrDzBf/VD8V4ABAKforGnuLPqnAAAAAElFTkSuQmCC"/>${this._richText(info.echoRec)}</div>` : ''}
            </div>
        </div>`;
        }

        // ===== 独立技能加点推荐 =====
let standaloneSkillSection = '';
        if (info.skillArc && info.skillArc.length > 0) {

            const arcPos = {
                '常态攻击': { left: 80, top: 215 },
                '共鸣技能': { left: 164, top: 146 },
                '共鸣回路': { left: 269, top: 100 },
                '共鸣解放': { left: 368, top: 146 },
                '变奏技能': { left: 454, top: 213 }
            };
            const arcIcons = info.skillArc.map(s => {
                const pos = arcPos[s.type] || { left: 0, top: 0 };
                return `
                <div class="mc-arc-item" style="left:${pos.left}px;top:${pos.top}px">
                    <div class="skill-list__icon-wrapper flex-center">
                        <div class="skill-list__icon-inner flex-center"><img src="${s.icon}"/></div>
                    </div>
                    <div class="mc-arc-label">${esc(s.type)}</div>
                </div>`;
            }).join('');
            // 延奏技能/谐度破坏
            const keynoteItems = (info.keynoteSkills || []).map(s => `
                <div class="keynote-item flex-column-center">
                    <div class="keynote-item-logo flex-center"><img src="${s.icon}"/></div>
                    <div class="keynote-item-name">${esc(s.type)}</div>
                </div>`).join('');

            // 加点顺序行
            const fixedItems = (info.fixedSkills || []).map(s => `
                <div class="fixed-item flex-column-center">
                    <div class="fixed-item-logo flex-center"><div class="skill-list__icon-inner flex-center"><img src="${s.icon}"/></div></div>
                    <div class="fixed-item-name">固有技能</div>
                </div>`).join('');
            const seqItems = (info.skills || []).map((s, i) => `
                ${i > 0 ? '<div class="mc-seq-arrow">&gt;</div>' : ''}
                <div class="mc-seq-item flex-column-center">
                    <div class="skill-list__icon-wrapper flex-center">
                        <div class="skill-list__icon-inner flex-center"><img src="${s.icon}"/></div>
                    </div>
                    <div class="mc-seq-label">${esc(s.type)}</div>
                </div>`).join('');


            standaloneSkillSection = `
        <div class="module" id="skill">
            <div class="skill mc-skill-body">
                <div class="skill-title">
                    <div class="flex-align-center">
                        <img class="skill-title-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAAAqCAYAAAAQ0R0WAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjhFM0M3MEY4QzhCNTExRUY4Q0NEOTQ5MkE5MUE2N0MwIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjhFM0M3MEY5QzhCNTExRUY4Q0NEOTQ5MkE5MUE2N0MwIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6OEUzQzcwRjZDOEI1MTFFRjhDQ0Q5NDkyQTkxQTY3QzAiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6OEUzQzcwRjdDOEI1MTFFRjhDQ0Q5NDkyQTkxQTY3QzAiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz6SDdX4AAAHxklEQVR42syaa4iU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"/>
                        <div>技能加点推荐</div>
                    </div>
                </div>
                <div class="mc-arc-area">
                    ${arcIcons}
                    <div class="keynote-item-container flex-justify-center">${keynoteItems}</div>
                </div>
                <div class="mc-seq-wrap">
                    <div class="mc-seq-title">加点顺序<span class="mc-seq-title-sub">固有技能优先加点</span></div>
                    <div class="mc-seq-row flex-align-center">
                        <div class="mc-seq-fixed-group flex-align-center">${fixedItems}</div>
                        ${seqItems}
                    </div>
                </div>
            </div>
        </div>`;
        }

        // ===== 独立武器推荐 =====
        let standaloneWeaponSection = '';
        if (info.weapons && info.weapons.length > 0) {
            const weaponItems = info.weapons.map(w => {
                const tagText = w.status === 1 ? '推荐' : (w.status === 2 ? '备选' : '');
                return `
                <div class="weapon-content-item">
                    <div class="weapon-content-item-img flex-center" style="--grade-bg:url(${gradeBg(w.star)})">
                        <img src="${w.icon}"/>
                    </div>
                    <div class="weapon-content-item-text">
                        ${tagText ? `<div class="weapon-content-item-tip">${tagText}</div>` : ''}
                        <div class="weapon-content-item-title">${esc(w.name)}</div>
                        <div class="weapon-content-item-star flex-align-center">${S(w.star, 15.83)}</div>
                    </div>
                </div>`;
            }).join('');
            standaloneWeaponSection = `
        <div class="module" id="weapon">
            <div class="weapon-title">
                <div class="flex-align-center">
                    <img class="weapon__title-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACsAAAAnCAYAAACWn7G7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjYwMUU2RTc4QzhFNTExRUZCRjI5QzYyNDFCMjNDNTRBIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjYwMUU2RTc5QzhFNTExRUZCRjI5QzYyNDFCMjNDNTRBIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6NjAxRTZFNzZDOEU1MTFFRkJGMjlDNjI0MUIyM0M1NEEiIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6NjAxRTZFNzdDOEU1MTFFRkJGMjlDNjI0MUIyM0M1NEEiLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7KdQBMAAAE5UlEQVR42syYeWwUZRiHp9OWQ2grClEkNqkKalVMRDHGeCQYRY3iiWe8UavGELV4W0yNF1aOJogQVFRMhUpUQoz8QeIBimRjAPECkYiRKGKxVimtLf7e5Nnky2R295tld+ObPOl2Znb2N+/3Xt+ULVlwV+DYAnGb+FtsFxvFYrFO7BD7guJZKI4XR4pacZA4WLwpPrcLKiJf2MLfIeIYuFJ0iU/FfeKbAos8QowXo8XRohzh/WKP+DV9YVTsxgw3HCominoxWawtkNATxb2iRvQi0gTu5fy/4kfX9a6tyXHzWpbkmgIItSVvQENaaEqsd7y7Kxonru12niqbvS6ei/m+r00QjWKgGCy+Ei+I50UPuWGr/n02sWYtHj9mN5om7kkoskxcL27Bm4PESn5zHSt3nOjjIb7LJXaJ+NPzx2eL8xOIvVhcLv4hiS1HXhHdnD8Xb4c45MtcYi1m5iUQ8J54zKMsnUFl2UlCbYr8ztlgSVUt2vkcZKoGaXtIHCJu8hBbKZrFKPEANTrOo5fgQRPyiZhPfpiGy7jGQuNAsQonBD5izW4l4aZ6evhOPHiHc8yK+s1iHKFVJdrEcuIy4P7jOW8hsBSvxi5PJusnY1MJQuJ2McX5fyS12TJ8hPhAvOsINY+eglMsNN7OJDTwKD0WM6eJZQla7UtiBqtmJalV/E4Nb3Ouu0JcJDpZeju/IlcJymW9ZHCTmO5xfTmxax69kIzeCfbwB4gbqbWddMf2bB719axrT7JMvnaB83A/k0zDOHaW6KDOtlIu+wspNqAJrExw/cPiCef/4VSZXpJthUeLz1usxd554mXP6wewIq+y/Jtp0xvIg6VJfrwiyM/uJhbnej6w1euxNIavxVanawXF8mza+vDuswm+cxKNIMhH6P6ITdujCZfyWjGT8CiZWEuOQ/k8mQnMd+qaSmLVlEJsnXicynA4x2Yw+u32vMc54jPuVTSx9Sy9eXVMZNBZnGCOMDtWvFEssYOpApV0oj56vWuLxIsJ7nk6u9eqQoodhUerKXfdiEo5oVHP50Ymr17Pe1/HSDiyEHV2HD8+CG/+xg7hJ6ckTeHcQuqvlahvxUeegk+mUdSx7c/Ls6PJ9IF40/ZEjzhCzZsPEiI2u17qfPdjvOxrwwmJynzFdvOkISPiAIQH9PgGzpczQUWn+5lMYL72izPrJha7nS7VwShny/S0OJPyNZSev4uen4rpdC3svXJtQlOUw/79SbDNjHWbWKIqbjqEmF+P8K1Z7tHOEN+ZYUdiQ/mpucbEbGLNYyfw+Q88uoMu1EE4/MCLib88Htrekd0Qc7yJNzy2CodlC5tMYkeQSI2RkjKP3WsNguf6DM2Ovc9byvQg8454yjk/i264jK1OTrFjedo6hExntAt5y9hMq2yijCWxfZS3CQhvcLbzs4jtgKqyNjo/hDGvH6eROF3sSm0rchTLn87Y2Qzi+ZrtDiaxLwsIqYmRa8bQEWPFDuP1Yw/7pTKSaSGTfl9QPOviXfC2mJcji9IjZegU92bipIdjNey3PgxKZ1dFJrcyknK1JV/Inup++v5e4qeaIaUtKK19wUuPDTHteFVIrJi4PXQic/lb4jWOldq2kNDLI8drQ94AriEETOgzMReW2jqJ19XOsZYK6uYc2uE2dp//F7uavLFXUq3/CTAAKbAikBFaxO0AAAAASUVORK5CYII="/>
                    <div>武器推荐</div>
                </div>
            </div>
            <div class="weapon__content">
                <div class="weapon__content-title">推荐武器</div>
                <div class="weapon-content-list">${weaponItems}</div>
                ${info.wpRec ? `<div class="skeleton-suggestion"><img class="mc-corner-diamonds" src="${CORNER_DIAMONDS}">${this._richText(info.wpRec)}</div>` : ''}
            </div>
        </div>`;
        }

        // ===== 独立队友推荐 =====
        let standaloneTeamSection = '';
        if (info.teammates && info.teammates.length > 0) {
            const teamItems = info.teammates.map((tm) => {
                if (!tm.main) return '';
                // 四列固定渲染
                const weaponCol = `
                    <div class="mc-tm-item">${tm.weapon ? `
                        <div class="mc-tm-hd">武器</div>
                        <div class="mc-tm-gear-img" style="--grade-bg:url(${FIVE_BG})"><img src="${tm.weapon.icon}"/></div>
                        <div class="mc-tm-gear-name">${esc(tm.weapon.name)}</div>` : ''}
                    </div>`;
                const echoCol = `
                    <div class="mc-tm-item">${tm.echo ? `
                        <div class="mc-tm-hd">声骸</div>
                        <div class="mc-tm-echo-img"><img src="${tm.echo.icon}"/></div>
                        <div class="mc-tm-gear-name">${esc(tm.echo.name)}</div>` : ''}
                    </div>`;
                const set0 = (tm.echo && tm.echo.sets && tm.echo.sets[0]) ? tm.echo.sets[0] : null;
                const attrsRows = ((tm.echo && tm.echo.attrs) || []).map(a => `
                            <div class="mc-tm-attr"><span class="mc-tm-cost">${a.cost}</span><span class="mc-tm-line"></span><span class="mc-tm-attr-name">${esc(a.mainName)}</span></div>`).join('');
                const skillCol = `
                    <div class="mc-tm-skill">
                        ${set0 ? `<div class="mc-tm-hd mc-tm-hd-set">${set0.icon ? `<img src="${set0.icon}"/>` : ''}<span>${esc(set0.name)}</span></div>` : ''}
                        <div class="mc-tm-attrs">${attrsRows}</div>
                    </div>`;
                const spares = (tm.spares || []).map(s => `
                            <div class="mc-tm-backup-img" style="--grade-bg:url(${gradeBg(s.star)})"><img src="${s.icon}"/></div>`).join('');
                // 备选列始终显示
                const backupCol = `
                    <div class="mc-tm-backup">
                        <div class="mc-tm-hd">备选</div>
                        <div class="mc-tm-backup-imgs">${spares}</div>
                    </div>`;
                return `
                <div class="mc-tm-card">
                    <div class="mc-tm-member">
                        <img src="${tm.main.icon}"/>
                        <div class="mc-tm-member-grad"></div>
                        <div class="mc-tm-member-info">
                            <div class="mc-tm-member-name">${tm.main.element ? `<img class="mc-tm-member-elem" src="${tm.main.element}"/>` : ''}<span>${esc(tm.main.name)}</span></div>
                            <div class="mc-tm-member-star">${S(tm.main.star, 16)}</div>
                        </div>
                    </div>
                    <div class="mc-tm-body">
                        ${weaponCol}
                        ${echoCol}
                        ${skillCol}
                        ${backupCol}
                    </div>
                </div>`;
            }).join('');
            standaloneTeamSection = `
        <div class="module" id="partyMember">
            <div class="team-title">
                <div class="flex-align-center">
                    <img class="team-title-logo" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAArCAYAAACJrvP4AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyNpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDYuMC1jMDAyIDc5LjE2NDM2MCwgMjAyMC8wMi8xMy0wMTowNzoyMiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDIxLjEgKFdpbmRvd3MpIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjgwQzM0Q0U3QzlBNzExRUZCMzlEODFDMDBENEM2Njc3IiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjgwQzM0Q0U4QzlBNzExRUZCMzlEODFDMDBENEM2Njc3Ij4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6ODBDMzRDRTVDOUE3MTFFRkIzOUQ4MUMwMEQ0QzY2NzciIHN0UmVmOmRvY3VtZW50SUQ9InhtcC5kaWQ6ODBDMzRDRTZDOUE3MTFFRkIzOUQ4MUMwMEQ0QzY2NzciLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz552GRhAAAD9ElEQVR42qyYe2hPYRjHz/ntwtgMIxkhIcqlxEZJFpPLohiSLJfQ3HLLJTXJZSWESExmoVxWlIh/5JJ7ioSYlbCLIbMZ22+24/vU99Tbcd73/H6bpz7t/H6/97zfc573eZ73eWdfKFhuGawrKAHJIAtc1Yw7ARaDetAHfPYbFLLM9hN85XWtYZw7pgLU6AaFAt7qMJ9UbAuI84yxwXSQw8+pYA/oGI1Yf3ANLAIx/G4SOAe6K+P6gWPKd23ASrAtUrFEUAhG+Pw2A1xQHuAo6OYzbg3IiERsIkg3uPcDaOJ1mWHcWTDEJCafV4BYzQTyVgvBZK7PboOYuHaVSUyCYrDm5jtgDh9G1nMZ+ALqDIKjTWLxPhHn2iEwW3mbGLqz3iAWr37wukue8gfo5HPjUpAG2oJmrpcDfhvE6kxvVkPXWJrAcfPnF3jNa5NYhUnsD3hnBVsleMukbjKMexgU+rcjEPvOtZL1TdKMkd+fB4m9AeEAsfeslUmapHZd+CxIbIA3inwsmS4cbMjJfx7ET+xjwDpY3HbCzDudVQcFSF9W8KCtZxwYzxraZKggUsjb6fJMCugsUMUcspQEdjixXPcEZ5h315kWDRzrKH+3UyPPT+wAKObiqzfFU6iZ99gUFVdtBCcZoY5yXyNIUHdtr5i4ZgEz373RpohNHO5bVWwFchhUzXS/w79t6ML1OjHJjZGG+qjaZY6bR7f62Tc1jbyBcJqLf15zcyPHZIO5oIdGqJpbkTz4C92bid1nvZujmSSPSW0p6+h96AfgVKQ9SHuD+xKV6wbWUz8PRN3KeU22lxTPFuXnnc7RiA3VfC+h3EX5nK6Zo3c0Ylma72M9bUOOZlyqX+8Y0pSZIQZXrmYUSm85QTMmxtvs6MSWcjKdyXoUMSd3GrajDd43Dylt9HBwnN2sHRAoUmmugJusiwdZrlTrAApAPhjkivVia3YXLIlAyLVh4AYTfC3PBc0+3dVm5l1xiCWnA8M6WoujqEz6WJNz7mabLNFVCsaATWAXP9dwItXNtlKYbRZaaWhyuW6jNDknCb4OHHF/zGBLLZPfAxe5y4ZZkpoUFznKdRknsxkwjiYyM8WVIraVJPDH+WAqm9V6CoY5qbvthLnnSVDsYw+Zz/zK9Yn4aWCsjWOuY7XOKtia72UpK9G1dyGr9SZFYIdyli43HXOf/gfBIqWTfmwSy9Wd7iO0F1xz125pUuC1iD1hRXjTAqFa9izqw771HKMcnu0y3TV71UIxmfST57uXPsdfcW15iIfySwzPaC2Fh/g0z6Gj0vPvC0nqQsmz/SxXpUqVsJSWTL1WK4jF5J7C62zl3kdgIP9p47CyzPwrwACqaPBFb8xZwwAAAABJRU5ErkJggg=="/>
                    <div>队友推荐</div>
                </div>
            </div>
            <div class="mc-tm-panel">
                ${teamItems}
            </div>
        </div>`;
        }


        let botName = 'Yunzai-Bot';
        let yunzaiVer = '';
        let pluginVer = '';
        try {
            const yPkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
            yunzaiVer = yPkg.version || '';
            if (yPkg.name === 'miao-yunzai') botName = 'Miao-Yunzai';
            else if (Array.isArray(global.Bot?.uin)) botName = 'TRSS-Yunzai';
        } catch {}
        try {
            const pPkg = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'package.json'), 'utf8'));
            pluginVer = pPkg.version || '';
        } catch {}
        const copyright = `Created By ${botName}<span class="version">${yunzaiVer}</span> & waves-plugin<span class="version">${pluginVer}</span> &《鸣潮》|攻略站`;

        // ===== 组装完整 HTML =====
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<style>
html{background:#1b1b1b;min-height:100%}
${officialCSS}
/* ===== 主容器居中 ===== */
.main{width:872.13px;margin:0 auto}
/* ===== 版权信息 ===== */
#copyright{text-align:center;font-size:20px;font-weight:bold;color:#fff;text-shadow:2px 2px 2px #000;padding:20px 0}
#copyright .version{color:#d3bc8e}
/* ===== 角色概览布局 ===== */
.role-overview{display:flex;width:872.13px}
.role-overview__info{width:545.08px;margin-left:11.43px;padding-top:0.88px}
.role-overview__weapon-team{display:flex}
.role-overview__weapon{flex:1}
.role-overview__team{flex:1}
/* ===== 自定义元素样式 ===== */
.mc-mini-wp-row{display:flex;align-items:center;gap:8px;margin-top:8px}
.mc-mini-wp-pic{width:59.78px;height:59.78px;background:var(--grade-bg) no-repeat;background-size:100% 100%;flex-shrink:0;box-sizing:border-box}
.mc-mini-wp-pic img{width:100%;height:100%;object-fit:contain}
.mc-mini-wp-pic-small{width:43.96px;height:43.96px}
.mc-mini-wp-alt{margin-left:4px}
.mc-mini-wp-alt-label{font-size:12px;color:#adadad;margin-bottom:3px;text-align:center}
.mc-mini-team-item{position:static}
.mc-mini-team-sep{width:1px;height:40px;background:rgba(170,155,106,.3);margin:0 10px}
.mc-mini-team-pic{position:static;width:52.75px;height:52.75px;background:var(--grade-bg) no-repeat;background-size:100% 100%;margin-right:8px;flex-shrink:0;box-sizing:border-box}
.mc-mini-team-pic img{width:100%;height:100%;object-fit:contain}
.mc-mini-team-pic-small{width:38px;height:38px;margin-right:4px}
.mc-mini-team-spare-label{font-size:11px;color:#adadad;margin-bottom:3px}
/* 独立武器推荐列表行 */
/* 独立队友推荐列表行 */
/* ===== 队友推荐 ===== */
.mc-tm-panel{background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:100% 100%;width:866.42px;padding:18.46px 19.34px;border:1px solid #867357;border-radius:0 0 13.19px 0;border-top:none;box-sizing:border-box}
.mc-tm-card{position:relative;display:flex;align-items:stretch;width:816.75px;height:149.9px;background:url(https://mcguide.kurogames.com/assets/team-bg-DZ9FGg1j.webp) no-repeat;background-size:100% 100%;margin-bottom:14.51px;box-sizing:border-box}
.mc-tm-card:last-child{margin-bottom:0}
.mc-tm-member{position:relative;width:197px;flex-shrink:0;align-self:stretch}
/* 立绘：透明立绘 */
.mc-tm-member>img{position:absolute;left:50%;bottom:5px;transform:translateX(-50%);height:167.9px;width:auto;z-index:0}
.mc-tm-member-grad{position:absolute;left:0;bottom:5px;width:100%;height:80px;background:linear-gradient(to top,#1c1719 8%,transparent 100%);z-index:1}
.mc-tm-member-info{position:absolute;left:0;bottom:8px;width:100%;z-index:2}
.mc-tm-member-name{display:flex;align-items:center;justify-content:center;gap:5px;font-size:17.58px;color:#ece5d8;text-align:center;margin-bottom:3px;text-shadow:0 1px 3px #000}
.mc-tm-member-elem{width:18px;height:18px;flex-shrink:0;filter:drop-shadow(0 1px 2px #000)}
.mc-tm-member-star{display:flex;justify-content:center}
.mc-tm-member-star img{width:16px;height:16px}
/* 固定列网格 */
.mc-tm-body{flex:1;display:grid;grid-template-columns:80px 80px 1fr 130px;align-items:start;padding:14px 14px 14px 20px;gap:20px;box-sizing:border-box}
.mc-tm-item{display:flex;flex-direction:column;align-items:center;min-width:0}
.mc-tm-hd{border-radius:2.2px;border:0.88px solid #d4b17a;background:rgba(27,25,22,.4);font-size:13.19px;color:#ece5d8;min-width:59.78px;text-align:center;height:18px;line-height:18px;padding:0 10px;box-sizing:border-box;white-space:nowrap}
.mc-tm-gear-img{width:55px;height:55px;background:var(--grade-bg) no-repeat;background-size:100% 100%;margin:10px 0 6px;box-sizing:border-box}
.mc-tm-gear-img img{width:100%;height:100%}
.mc-tm-echo-img{position:relative;width:55px;height:55px;border-radius:50%;border:solid 1.32px #ffe1b6;margin:10px 0 6px;display:flex;align-items:center;justify-content:center;box-sizing:border-box;overflow:hidden}
.mc-tm-echo-img img{width:50px;height:50px;border-radius:50%}
.mc-tm-echo-img:before{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:50px;height:50px;background:url(https://mcguide.kurogames.com/assets/header-border-C7i_3hDA.webp) no-repeat;background-size:100%;z-index:2}
.mc-tm-gear-name{font-size:13.19px;color:#ece5d8;text-align:center;max-width:90px;line-height:1.3}
.mc-tm-skill{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
.mc-tm-hd-set{display:flex;align-items:center;gap:5px;color:#ece5d8;max-width:100%;margin-bottom:8px}
.mc-tm-hd-set img{width:15px;height:15px}
.mc-tm-hd-set span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mc-tm-attrs{display:flex;flex-direction:column;gap:1px}
.mc-tm-attr{display:flex;align-items:center;font-size:13.19px;color:#ece5d8;line-height:18px;height:18px}
.mc-tm-cost{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;background:#0b0d0a;border:0.88px solid #c2b294;border-radius:2px;color:#aa9b6a;font-size:11px;box-sizing:border-box;flex-shrink:0}
.mc-tm-line{width:1.76px;height:12.3px;background:#ece5d8;margin:0 8px;flex-shrink:0}
.mc-tm-attr-name{white-space:nowrap}
.mc-tm-backup{display:flex;flex-direction:column;align-items:stretch;flex-shrink:0}
.mc-tm-backup .mc-tm-hd{min-width:118px}
.mc-tm-backup-imgs{display:flex;gap:8px;margin-top:10px;min-width:118px}
.mc-tm-backup-img{width:55px;height:55px;background:var(--grade-bg) no-repeat;background-size:100% 100%;box-sizing:border-box}
.mc-tm-backup-img img{width:100%;height:100%}
/* 声骸推荐详细 */
.mc-echo-row{position:relative;margin-bottom:16px}
.mc-echo-row:last-child{margin-bottom:0}
.mc-echo-tag{position:absolute;top:-1px;left:14px;font-size:13px;padding:3px 14px;border-radius:0 0 4px 4px;z-index:2}
.mc-echo-tag-rec{background:#d4b17a;color:#0b0d0a}
.mc-echo-tag-alt{background:#5b544a;color:#ece5d8}
.data-resonance{display:flex;flex-direction:column}
.mc-echo-set-header{margin-bottom:10px}
.mc-echo-set-icon{width:28px;height:28px;border-radius:50%;margin-right:8px;flex-shrink:0}
.mc-echo-set-name{font-size:17px;color:#ece5d8;font-weight:600}
.mc-echo-set-block{margin-bottom:14px}
.mc-echo-set-block:last-child{margin-bottom:0}
.mc-echo-set-subtitle{font-size:14px;color:#ece5d8;margin-bottom:6px}
.mc-echo-set-desc{font-size:13.5px;color:#cabaa3;line-height:1.7}
.mc-skill-line{width:1.32px;height:10.55px;background-color:#ece5d8;margin:1.76px 5.28px 0;flex-shrink:0}
.skeleton-content-data .data-skill .skill-cost{line-height:16.94px!important;box-sizing:border-box}
/* ===== 技能加点推荐 =====*/
.mc-skill-body{position:relative;overflow:hidden}
.module#skill .skill{background-size:100% auto!important;background-position:top!important}
.module#skill .skill-title{background:none!important;height:40.88px!important}
.mc-arc-area{height:224px}
.fixed-item-logo{position:relative}
.mc-arc-item{position:absolute;display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%)}
.mc-arc-item .skill-list__icon-wrapper{width:65.94px;height:62.09px}
.mc-arc-item .skill-list__icon-inner{width:57.15px;height:57.15px}
.mc-arc-item .skill-list__icon-inner img{width:46.7px;height:42.31px}
.mc-arc-label{font-size:13.19px;color:#ece5d8;margin-top:8px;white-space:nowrap}
.keynote-item-container{display:flex;top:188px!important}
.mc-seq-wrap{padding:16px 18.9px 0}
.mc-seq-title{font-size:15px;color:#aa9b6a;margin-bottom:12px}
.mc-seq-title-sub{font-size:14px;color:#ece5d8;margin-left:10px}
.mc-seq-row{flex-wrap:wrap;row-gap:16px}
.mc-seq-item{margin-right:0}
.mc-seq-fixed-group{display:flex;align-items:center;gap:12px;margin-right:30px}
.mc-seq-fixed-group .fixed-item{min-width:auto;margin-top:0}
.mc-seq-fixed-group .fixed-item-name{width:auto}
.mc-seq-label{font-size:13.19px;color:#ece5d8;margin-top:8px;white-space:nowrap}
.mc-seq-arrow{font-size:20px;color:#aa9b6a;font-weight:600;margin:0 14px;flex-shrink:0}
.mc-seq-arrow-first{margin:0 14px}
.fixed-item-name{color:#ece5d8!important}
.skeleton-content-data .skill-glade{background-color:#0b0d0a;border-radius:1.76px;width:14.95px;height:14.95px;text-align:center;line-height:14.95px;border:0.44px solid #c2b294;box-sizing:border-box;font-size:14.07px;color:#aa9b6a;flex-shrink:0}
.skeleton-content-data .s-name{width:auto;height:23.74px;line-height:23.74px;font-size:14.07px;color:#ece5d8;white-space:nowrap}
.skeleton-content-data .skill-list{margin:0 0 8px 22.42px!important}
.mc-skill-grid{display:grid;grid-template-columns:repeat(3,auto);column-gap:16px;row-gap:8px}
.mc-skill-grid .skill-list{margin:0!important}
.mc-mini-attr-title{font-size:15.83px;color:#aa9b6a;width:149.46px;height:19.34px;line-height:19.34px;background:none}
/* ===== 角色简介区域 ===== */
.introduction{position:relative;width:865.98px}
.introduction-tab{width:865.54px;background:url(https://mcguide.kurogames.com/assets/introduction-bg-sHRaG7qk.webp) no-repeat;background-size:100% 201.33px;height:43.96px}
.introduction-tab-title{width:120.01px;transition:all .3s ease;text-align:center;position:relative;font-size:17.58px;line-height:41.76px;height:41.76px;color:#767068;cursor:pointer}
.introduction-tab-title.active{color:#facc89}
.introduction-tab-title.active .line{display:block}
.introduction-tab-title .line{display:none;position:absolute;bottom:0;left:0;width:100%;height:auto}
.introduction-tab-title-label{width:120.01px;padding:0 4.4px;font-size:17.58px;line-height:41.76px}
.introduction .introduction-wrapper{width:865.54px;background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:100% 100%;border:1px solid #867357;border-radius:0 0 13.19px 0;padding:0 0 0.88px;box-sizing:border-box}
.introduction .introduction-content{padding:21.54px 24.62px 17.58px;font-size:15.83px;color:#ece5d8;line-height:26.38px;overflow:hidden}
/* ===== 属性推荐区域 ===== */
.attribute{width:100%}
.attribute-title{background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;font-size:19.34px;width:100%;height:61.54px;padding-top:10.55px;color:#ece5d8;box-sizing:border-box}
.attribute-title-logo{width:21.1px;height:21.1px;margin:0 7.03px 0 17.58px}
.attribute-content{background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:100% 100%;width:866.42px;padding:18.46px 19.34px;border:1px solid #867357;border-radius:0 0 13.19px 0;border-top:none;box-sizing:border-box}
.attribute-content .attribute-table{width:864.22px;margin-left:-12.31px;border-collapse:collapse}
.attribute-content .attribute-table th{background-color:rgba(61, 57, 40, .3);font-size:14.07px;color:#ece5d8;padding:7.03px 5.28px;text-align:left;font-weight:600}
.attribute-content .attribute-table td{padding:7.03px 5.28px;font-size:14.07px;color:#ece5d8}
/* ===== 共鸣链区域 ===== */
.key-resonance-chain{position:relative;border:0.44px solid #867357;width:816.75px;min-height:101.98px;margin-left:5.28px;font-size:14.07px;border-radius:0 0 13.19px 0;color:#ece5d8;padding:19.34px 15.83px 0.88px;box-sizing:border-box}
.key-resonance-chain__title{width:99%;overflow:hidden}
/* ===== 攻略详情区域 ===== */
.strategy{width:871.69px;margin-bottom:21.98px}
.strategy-title{background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;font-size:19.34px;width:100%;height:61.54px;padding-top:10.55px;color:#ece5d8;box-sizing:border-box}
.strategy-title-logo{width:21.1px;height:21.1px;margin:0 7.03px 0 17.58px}
.strategy .introduction-wrap{width:865.98px;border-radius:0 0 13.19px 0;border:1px solid #867357;border-top:none}
.strategy .introduction-content{width:866.42px;min-height:182.87px;padding:21.54px 24.62px 17.58px;font-size:15.83px;color:#ece5d8;line-height:26.38px;overflow:visible;background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:100% 100%}
/* ===== 模块间距 ===== */
.module{margin-bottom:31.65px}
/* ===== 独立声骸推荐区域 ===== */
.skeleton-title{background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;font-size:19.34px;width:100%;height:61.54px;padding-top:10.55px;color:#ece5d8;box-sizing:border-box}
.skeleton-title-logo{width:21.1px;height:21.1px;margin:0 7.03px 0 17.58px}
.skeleton-title-finish{width:24px;height:24px;margin-left:auto;margin-right:17.58px}
.skeleton-content{background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:100% 100%;width:866.42px;border:1px solid #867357;border-radius:0 0 13.19px 0;border-top:none;box-sizing:border-box}
.skeleton-content-title{font-size:15.83px;color:#aa9b6a;margin-bottom:8.79px}
.skeleton-content-data{display:flex;flex-wrap:nowrap}
.skeleton-content-data .data-skill,.skeleton-content-data .data-resonance{margin-left:8.79px}
.skeleton-suggestion{padding:8.79px 19.34px;font-size:14.07px;color:#adadad;line-height:26.38px}
.skeleton-content .skeleton-suggestion{margin:8.79px 0 4.4px 24.18px;width:817.19px;border:0.44px solid #867357;box-shadow:inset -3px 0 0 -2px #867357;border-radius:0 0 8.79px 0;box-sizing:border-box;position:relative}
.resonance-content .skeleton-suggestion{margin:12px 8px 4.4px 8px;border:0.44px solid #867357;box-shadow:inset -3px 0 0 -2px #867357;border-radius:0 0 8.79px 0;box-sizing:border-box;position:relative}
.mc-corner-diamonds{position:absolute;top:-7.47px;right:42.2px;width:27.25px;height:15.39px}
/* ===== 独立技能加点推荐区域 ===== */
.skill-title{background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;font-size:19.34px;width:100%;height:61.54px;padding-top:10.55px;color:#ece5d8;box-sizing:border-box}
.skill-title-logo{width:auto;height:21.1px;margin:0 7.03px 0 17.58px}
.skill-title-finish{width:24px;height:24px;margin-left:auto;margin-right:17.58px}
.skill-add-list{display:flex;justify-content:center;gap:8.79px;margin-bottom:17.58px}
.skill-add-item{display:flex;flex-direction:column;align-items:center;width:131.88px}
.skill-add-item-icon{width:65.94px;height:65.94px;border-radius:50%;border:1.76px solid #ac8839;background:rgba(58,42,26,.5);display:flex;align-items:center;justify-content:center}
.skill-add-item-icon img{width:52.75px;height:52.75px}
.skill-add-item-type{font-size:14.07px;color:#ece5d8;margin-top:4.4px}
.skill-add-item-name{font-size:12.31px;color:#adadad;margin-top:2.2px}
.fixed-skill-title{font-size:15.83px;color:#aa9b6a;margin:17.58px 0 8.79px}
.fixed-skill-list{display:flex;flex-wrap:wrap;gap:8.79px}
.fixed-skill-item{display:flex;align-items:center;padding:4.4px 8.79px;background:rgba(170,155,106,.06);border-radius:3.52px;font-size:14.07px;color:#ece5d8}
.fixed-skill-item .skill-icon{width:35.17px;height:35.17px;margin-right:8.79px}
/* ===== 独立武器推荐区域 ===== */
.weapon-title{background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;font-size:19.34px;width:100%;height:61.54px;padding-top:10.55px;color:#ece5d8;box-sizing:border-box}
.weapon__title-logo{width:21.1px;height:21.1px;margin:0 7.03px 0 17.58px}
.weapon__title-finish{width:24px;height:24px;margin-left:auto;margin-right:17.58px}
.weapon__content{background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:100% 100%;width:866.42px;padding:18.46px 19.34px;border:1px solid #867357;border-radius:0 0 13.19px 0;border-top:none;box-sizing:border-box}
.weapon__content-title{font-size:17.58px;color:#aa9b6a;margin-bottom:13.19px}
/* 武器推荐 */
.weapon-content-list{display:flex;flex-wrap:wrap;gap:14px 30px}
.weapon-content-item{display:flex;align-items:center}
.weapon-content-item-img{width:59.78px;height:59.78px;background:var(--grade-bg) no-repeat;background-size:100% 100%;flex-shrink:0;box-sizing:border-box;margin-right:-0.88px}
.weapon-content-item-img img{width:100%;height:100%}
.weapon-content-item-text{width:122.2px;height:59.34px;padding:4.4px 0 0 11px;background:url(https://mcguide.kurogames.com/assets/weapon-bg-BdI34pFD.webp) no-repeat;background-size:100% 100%;display:flex;flex-direction:column;box-sizing:border-box;overflow:hidden}
.weapon-content-item-tip{font-size:13.19px;color:#5b544a;height:16.7px;line-height:16.7px;white-space:nowrap}
.weapon-content-item-title{font-size:15.83px;color:#010101;height:22px;line-height:22px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.weapon-content-item-star{display:flex;align-items:center;margin-top:0}
.weapon-content-item-star img{width:15.83px;height:15.83px;margin-right:1px}
.weapon__content .skeleton-suggestion{margin:12px 0 4.4px 0;border:0.44px solid #867357;box-shadow:inset -3px 0 0 -2px #867357;border-radius:0 0 8.79px 0;box-sizing:border-box;position:relative}
/* ===== 独立队友推荐区域 ===== */
.team-title{background:url(https://mcguide.kurogames.com/assets/attribute-bg-CHgMEARJ.webp) no-repeat;background-size:100% 320.9px;font-size:19.34px;width:100%;height:61.54px;padding-top:10.55px;color:#ece5d8;box-sizing:border-box}
.team-title-logo{width:21.1px;height:21.1px;margin:0 7.03px 0 17.58px}
.team-list{background:url(https://mcguide.kurogames.com/assets/bg-color-B25A2DN-.png) no-repeat;background-size:100% 100%;width:866.42px;padding:18.46px 19.34px;border:1px solid #867357;border-radius:0 0 13.19px 0;border-top:none;box-sizing:border-box}
.team-item{display:flex;align-items:flex-start;padding:13.19px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.team-item-img{width:87.92px;height:87.92px;background:url(https://mcguide.kurogames.com/assets/five-bg-Dra9qiQC.webp) no-repeat center/cover;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:4.4px;margin-right:17.58px}
.team-item-img img{width:70.33px;height:70.33px}
.team-item-title{font-size:15.83px;color:#ece5d8;margin-bottom:4.4px}
.team-item-name{font-size:14.07px;color:#adadad;margin-bottom:8.79px}
.team-backup{display:flex;flex-wrap:wrap;gap:4.4px}
.team-backup-title{font-size:12.31px;color:#adadad;margin-bottom:4.4px}
.team-backup-img{width:52.75px;height:52.75px;background:url(https://mcguide.kurogames.com/assets/five-bg-Dra9qiQC.webp) no-repeat center/cover;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:3.52px}
.team-backup-img img{width:43.96px;height:43.96px}
.team-backup-img-item{width:35.17px;height:35.17px;background:url(https://mcguide.kurogames.com/assets/five-bg-Dra9qiQC.webp) no-repeat center/cover;display:flex;align-items:center;justify-content:center;flex-shrink:0;border-radius:3.52px}
.team-backup-img-item img{width:26.38px;height:26.38px}
</style>
</head>
<body style="background:#1b1b1b;color:#ece5d8;width:872.13px;margin:0;font-family:'Microsoft YaHei','PingFang SC','Helvetica Neue',sans-serif;font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased">
<div class="main">
<div class="role-overview">
${roleCard}
<div class="role-overview__info">
${skeletonSection}
${skillSection}
${weaponTeamSection}
</div>
</div>
${introSection}
${attrSection}
${standaloneEchoSection}
${standaloneSkillSection}
${resonanceSection}
${standaloneWeaponSection}
${standaloneTeamSection}
${strategySection}
<div id="copyright">${copyright}</div>
</div>
</body>
</html>`;
    }

    async getRoleList() {
        const now = Date.now();
        if (this.roleCache && (now - this.roleCacheTime) < this.CACHE_TTL) return this.roleCache;
        try {
            const resp = await guideApi.get(`${GUIDE_SERVER}/role/avatar/list`);
            if (resp.data.code === 200) { this.roleCache = resp.data.data; this.roleCacheTime = now; return this.roleCache; }
            logger.mark(logger.blue('[WAVES PLUGIN]'), logger.cyan('获取《鸣潮》|攻略站 角色列表失败'), logger.red(resp.data.msg));
            return [];
        } catch (error) { return []; }
    }

    async getRoleGbId(name) {
        const list = await this.getRoleList();
        for (const r of list) {
            for (const t of (r.texts || [])) {
                if (t.language === 'zh-Hans' && t.name === name) return { roleGbId: r.roleGbId, roleData: r };
            }
        }
        return null;
    }

    async getGuideList(roleGbId) {
        try {
            const resp = await guideApi.get(`${GUIDE_SERVER}/introduction/list`, { params: { roleGbId } });
            if (resp.data.code === 200) {
                return (resp.data.data || []).map(item => {
                    let title = '', source = '', desc = '';
                    for (const t of (item.texts || [])) {
                        if (t.language === 'zh-Hans') { title = t.introductionName || ''; source = t.introductionSource || ''; desc = t.introductionDescription || ''; break; }
                    }
                    return { guideId: item.id, title, source, desc, illustrationUrl: item.role?.illustrationPictureUrl || '', cardUrl: item.role?.cardPictureUrl || '', roleName: (item.role?.texts || []).find(t => t.language === 'zh-Hans')?.name || '', likeCount: item.likeCount || 0, collectCount: item.collectCount || 0 };
                });
            }
            return [];
        } catch (error) { return []; }
    }

    async getCommunityGuides(name) {
        const roleInfo = await this.getRoleGbId(name);
        if (!roleInfo) return { guides: [], roleData: null };
        return { guides: await this.getGuideList(roleInfo.roleGbId), roleData: roleInfo.roleData };
    }
}

export default new CommunityGuide();