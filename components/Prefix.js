import Config from "./Config.js";
const DEFAULT_TOKENS = ["鸣潮", "～", "~", "∽"];
const LEADING_PREFIX = /^\^(?:\((\?:)?([^()]*)\))/;
function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getCustomTokens() {
    const raw = Config.getConfig()?.custom_prefix;
    if (!raw) return [];
    return String(raw)
        .split(/[\s,，;；、]+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function isOverride() {
    return Config.getConfig()?.override_prefix === true;
}

export function getPrefixTokens() {
    const custom = getCustomTokens();
    if (custom.length === 0) return DEFAULT_TOKENS.slice();
    if (isOverride()) return custom;
    const tokens = DEFAULT_TOKENS.slice();
    for (const token of custom) {
        if (!tokens.includes(token)) tokens.push(token);
    }
    return tokens;
}

export function needPrefix() {
    return Config.getConfig()?.require_prefix !== false;
}

function currentSignature() {
    return `${needPrefix() ? 1 : 0}|${isOverride() ? 1 : 0}|${getPrefixTokens().join("\u0001")}`;
}

let prefixRegex = null;
let prefixRegexSignature = "";

export function hasPrefix(msg) {
    if (!msg) return false;
    const signature = currentSignature();
    if (signature !== prefixRegexSignature) {
        const alts = getPrefixTokens().map(escapeRegExp).join("|");
        prefixRegex = alts ? new RegExp(`^(?:#?(?:${alts}))`) : null;
        prefixRegexSignature = signature;
    }
    return prefixRegex ? prefixRegex.test(msg) : false;
}

export function isWavesCommand(msg) {
    return !needPrefix() || hasPrefix(msg);
}

const optionalCache = new Map();
let optionalCacheSignature = "";

export function resolveReg(reg) {
    if (reg == null) return reg;

    const isRegExp = reg instanceof RegExp;
    const source = isRegExp ? reg.source : String(reg);
    const match = source.match(LEADING_PREFIX);
    if (!match || !DEFAULT_TOKENS.some((token) => match[2].includes(token))) return reg;

    const needPrefixFlag = needPrefix();
    const custom = getCustomTokens();
    const customActive = custom.length > 0;
    if (!customActive && needPrefixFlag) return reg;

    const signature = currentSignature();
    if (optionalCacheSignature !== signature) {
        optionalCache.clear();
        optionalCacheSignature = signature;
    }
    const cacheKey = `${source}\u0000${isRegExp ? reg.flags : ""}`;
    if (optionalCache.has(cacheKey)) return optionalCache.get(cacheKey);

    let inner = match[2];
    if (customActive) {
        const customAlts = custom.map(escapeRegExp).join("|");
        inner = isOverride() ? customAlts : `${inner}|${customAlts}`;
    }

    const head = source.slice(match[0].length);
    const nonCapture = !!match[1];
    let group;
    if (needPrefixFlag) {
        group = nonCapture ? `(?:${inner})` : `(${inner})`;
    } else {
        group = nonCapture ? `(?:${inner}|(?!${inner}))` : `(${inner}|(?!${inner}))`;
    }

    const next = `^${group}${head}`;
    const resolved = isRegExp ? new RegExp(next, reg.flags) : next;

    optionalCache.set(cacheKey, resolved);
    return resolved;
}

export function applyPrefixRules(rule) {
    if (!Array.isArray(rule)) return;

    for (const item of rule) {
        if (!item || item.reg == null) continue;

        let original = item.reg;
        Object.defineProperty(item, "reg", {
            configurable: true,
            enumerable: true,
            get() {
                return resolveReg(original);
            },
            set(value) {
                original = value;
            },
        });
    }
}

export function withPrefixSupport(PluginClass) {
    if (typeof PluginClass !== "function") return PluginClass;

    const Wrapped = class extends PluginClass {
        constructor(...args) {
            super(...args);
            applyPrefixRules(this.rule);
        }
    };

    Object.defineProperty(Wrapped, "name", { value: PluginClass.name });
    return Wrapped;
}