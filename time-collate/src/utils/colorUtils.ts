// #region Description
/**
 * @description 颜色转换辅助工具
 * 提供 HEX、RGB、HSV(HSB) 之间的相互转换，支持不透明度 (Alpha)
 * 具有强大的 Fail-Fast 容错和降级策略，确保任意输入均不崩溃
 */
// #endregion

export interface RGB {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface HSV {
    h: number;
    s: number;
    v: number;
}

export interface ColorState extends RGB, HSV {
    hex: string;
}

/**
 * 将数值限制在 [min, max] 范围内
 */
const clamp = (val: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, val));
};

/**
 * HEX 颜色转换为 RGBA
 * @param hex 颜色字符串 (如 #FFFFFF, #fff, #FFFFFF80, F00 等)
 * @returns RGBA 颜色对象，取值范围 r/g/b [0, 255]，a [0, 1]
 */
export const hexToRgb = (hex: string): RGB => {
    // 过滤掉所有非十六进制字符
    let cleaned = hex.trim().replace(/^#/, '').replace(/[^0-9a-fA-F]/g, '');

    // 格式容错与补全
    if (cleaned.length === 3) {
        cleaned = cleaned.split('').map(char => char + char).join('');
    } else if (cleaned.length === 4) {
        cleaned = cleaned.split('').map(char => char + char).join('');
    }

    if (cleaned.length !== 6 && cleaned.length !== 8) {
        // 解析失败，降级返回纯黑
        return { r: 0, g: 0, b: 0, a: 1 };
    }

    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    let a = 1;

    if (cleaned.length === 8) {
        a = parseInt(cleaned.slice(6, 8), 16) / 255;
    }

    return {
        r: clamp(r, 0, 255),
        g: clamp(g, 0, 255),
        b: clamp(b, 0, 255),
        a: clamp(a, 0, 1)
    };
};

/**
 * RGBA 转换为 HEX 字符串
 * @param r 红 [0, 255]
 * @param g 绿 [0, 255]
 * @param b 蓝 [0, 255]
 * @param a 透明度 [0, 1]
 * @returns 带有 # 前缀的 HEX 串 (如 #FF0000, #FF000080)
 */
export const rgbToHex = (r: number, g: number, b: number, a = 1): string => {
    const ir = clamp(Math.round(r), 0, 255);
    const ig = clamp(Math.round(g), 0, 255);
    const ib = clamp(Math.round(b), 0, 255);
    const ia = clamp(a, 0, 1);

    const hexR = ir.toString(16).padStart(2, '0').toUpperCase();
    const hexG = ig.toString(16).padStart(2, '0').toUpperCase();
    const hexB = ib.toString(16).padStart(2, '0').toUpperCase();

    if (ia >= 1) {
        return `#${hexR}${hexG}${hexB}`;
    } else {
        const hexA = Math.round(ia * 255).toString(16).padStart(2, '0').toUpperCase();
        return `#${hexR}${hexG}${hexB}${hexA}`;
    }
};

/**
 * RGB 转换为 HSV
 * @param r 红 [0, 255]
 * @param g 绿 [0, 255]
 * @param b 蓝 [0, 255]
 * @returns HSV 颜色对象，h [0, 360]，s [0, 100]，v [0, 100]
 */
export const rgbToHsv = (r: number, g: number, b: number): HSV => {
    const ir = clamp(r, 0, 255) / 255;
    const ig = clamp(g, 0, 255) / 255;
    const ib = clamp(b, 0, 255) / 255;

    const max = Math.max(ir, ig, ib);
    const min = Math.min(ir, ig, ib);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
        if (max === ir) {
            h = ((ig - ib) / delta) % 6;
        } else if (max === ig) {
            h = (ib - ir) / delta + 2;
        } else {
            h = (ir - ig) / delta + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : Math.round((delta / max) * 100);
    const v = Math.round(max * 100);

    return { h, s, v };
};

/**
 * HSV 转换为 RGB
 * @param h 色相 [0, 360]
 * @param s 饱和度 [0, 100]
 * @param v 明度 [0, 100]
 * @returns RGB 颜色对象，r/g/b [0, 255]
 */
export const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
    const ch = clamp(h, 0, 360);
    const cs = clamp(s, 0, 100) / 100;
    const cv = clamp(v, 0, 100) / 100;

    const c = cv * cs;
    const x = c * (1 - Math.abs(((ch / 60) % 2) - 1));
    const m = cv - c;

    let r = 0;
    let g = 0;
    let b = 0;

    if (ch >= 0 && ch < 60) {
        r = c; g = x; b = 0;
    } else if (ch >= 60 && ch < 120) {
        r = x; g = c; b = 0;
    } else if (ch >= 120 && ch < 180) {
        r = 0; g = c; b = x;
    } else if (ch >= 180 && ch < 240) {
        r = 0; g = x; b = c;
    } else if (ch >= 240 && ch < 300) {
        r = x; g = 0; b = c;
    } else if (ch >= 300 && ch <= 360) {
        r = c; g = 0; b = x;
    }

    return {
        r: clamp(Math.round((r + m) * 255), 0, 255),
        g: clamp(Math.round((g + m) * 255), 0, 255),
        b: clamp(Math.round((b + m) * 255), 0, 255)
    };
};

/**
 * 强大的通用颜色解析器，可容错解析任意常见颜色格式
 * @param colorStr 颜色输入字符串
 * @returns 解析得到的完整 ColorState 状态对象
 */
export const parseColor = (colorStr: string): ColorState => {
    const fallback: ColorState = {
        r: 255, g: 255, b: 255, a: 1,
        h: 0, s: 0, v: 100,
        hex: '#FFFFFF'
    };

    if (!colorStr) return fallback;

    const trimmed = colorStr.trim().toLowerCase();

    // 1. 处理 rgb() / rgba() 格式
    if (trimmed.startsWith('rgb')) {
        const matches = trimmed.match(/[\d.]+/g);
        if (matches && matches.length >= 3) {
            const r = clamp(parseInt(matches[0]), 0, 255);
            const g = clamp(parseInt(matches[1]), 0, 255);
            const b = clamp(parseInt(matches[2]), 0, 255);
            const a = matches.length >= 4 ? clamp(parseFloat(matches[3]), 0, 1) : 1;

            const hsv = rgbToHsv(r, g, b);
            const hex = rgbToHex(r, g, b, a);

            return { r, g, b, a, ...hsv, hex };
        }
    }

    // 2. 默认走 HEX 解析（内置强大的清洗逻辑）
    try {
        const rgb = hexToRgb(trimmed);
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b, rgb.a);

        return { ...rgb, ...hsv, hex };
    } catch {
        return fallback;
    }
};
