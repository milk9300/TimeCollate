import React from 'react';

export interface Decoration {
    id: string;
    type: 'sticker' | 'tape' | 'stamp' | 'date' | 'botanical';
    content: string; // Emoji character, SVG or short text
    x: number;      // relative X coordinate in percentage (0 - 100)
    y: number;      // relative Y coordinate in percentage (0 - 100)
    size: number;   // size in scale/px
    rotate: number; // rotation in degrees
}

export interface TextSlotData {
    content: string;
    style?: {
        fontSize?: string;
        fontWeight?: string;
        fontStyle?: string;
        color?: string;
        textAlign?: string;
        fontFamily?: string;
    };
}

export interface PageContentJson {
    slots: Record<string, TextSlotData>;
    atmosphere?: string;
    fontFamily?: string;
    backgroundImage?: string; // 用户自定义的背景图片 url
    decorations?: Decoration[];
    elementOverrides?: Record<string, { left?: string; top?: string; width?: string; height?: string }>;
}

/**
 * 解析页面 Content
 * 如果是 JSON 格式则解析，否则将纯文本包裹为 default / page-content 槽位
 */
export const parsePageContent = (content: string): PageContentJson => {
    if (content && content.trim().startsWith('{') && content.trim().endsWith('}')) {
        try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === 'object' && parsed.slots) {
                return parsed as PageContentJson;
            }
        } catch (e) {
            // 解析失败时降级到普通字符串处理
        }
    }
    return {
        slots: {
            'page-content': { content: content || '' },
            'default': { content: content || '' }
        }
    };
};

/**
 * 获取指定槽位的文本内容
 */
export const getSlotText = (content: string, slotId: string, defaultText = ''): string => {
    const data = parsePageContent(content);
    return data.slots[slotId]?.content !== undefined ? data.slots[slotId].content : defaultText;
};

/**
 * 获取指定槽位的样式（与基础样式合并）
 */
export const getSlotStyle = (content: string, slotId: string, baseStyle: React.CSSProperties = {}): React.CSSProperties => {
    const data = parsePageContent(content);
    const slotStyle = data.slots[slotId]?.style || {};
    return {
        ...baseStyle,
        fontSize: slotStyle.fontSize || baseStyle.fontSize,
        fontWeight: slotStyle.fontWeight as any || baseStyle.fontWeight,
        fontStyle: slotStyle.fontStyle || baseStyle.fontStyle,
        color: slotStyle.color || baseStyle.color,
        textAlign: slotStyle.textAlign as any || baseStyle.textAlign,
        fontFamily: slotStyle.fontFamily || baseStyle.fontFamily,
    };
};

/**
 * 更新指定槽位的文本内容，返回 JSON 序列化字符串
 */
export const updateSlotText = (content: string, slotId: string, text: string): string => {
    const data = parsePageContent(content);
    if (!data.slots[slotId]) {
        data.slots[slotId] = { content: '' };
    }
    data.slots[slotId].content = text;
    // 双向镜射以防不同模板间字段不一致
    if (slotId === 'page-content') {
        data.slots['default'] = { ...data.slots['default'], content: text };
    } else if (slotId === 'default') {
        data.slots['page-content'] = { ...data.slots['page-content'], content: text };
    }
    return JSON.stringify(data);
};

/**
 * 更新指定槽位的样式覆写，返回 JSON 序列化字符串
 */
export const updateSlotStyle = (
    content: string, 
    slotId: string, 
    styleUpdates: Partial<TextSlotData['style']>
): string => {
    const data = parsePageContent(content);
    if (!data.slots[slotId]) {
        data.slots[slotId] = { content: '' };
    }
    data.slots[slotId].style = {
        ...(data.slots[slotId].style || {}),
        ...styleUpdates
    };
    return JSON.stringify(data);
};

/**
 * 获取页面氛围样式类别
 */
export const getPageAtmosphere = (content: string): string => {
    const data = parsePageContent(content);
    return data.atmosphere || 'default';
};

/**
 * 获取页面字体设定
 */
export const getPageFontFamily = (content: string): string => {
    const data = parsePageContent(content);
    return data.fontFamily || 'sans';
};

/**
 * 获取页面所有的拖拽装饰贴纸
 */
export const getPageDecorations = (content: string): Decoration[] => {
    const data = parsePageContent(content);
    return data.decorations || [];
};

/**
 * 更新页面氛围类别并返回 JSON 字符串
 */
export const updatePageAtmosphere = (content: string, atmosphere: string): string => {
    const data = parsePageContent(content);
    data.atmosphere = atmosphere;
    return JSON.stringify(data);
};

/**
 * 更新页面字体并返回 JSON 字符串
 */
export const updatePageFontFamily = (content: string, fontFamily: string): string => {
    const data = parsePageContent(content);
    data.fontFamily = fontFamily;
    return JSON.stringify(data);
};

/**
 * 更新页面拖拽装饰列表并返回 JSON 字符串
 */
export const updatePageDecorations = (content: string, decorations: Decoration[]): string => {
    const data = parsePageContent(content);
    data.decorations = decorations;
    return JSON.stringify(data);
};

/**
 * 更新元素坐标覆写并返回 JSON 字符串
 */
export const updateElementOverride = (
    content: string,
    elementId: string,
    styleUpdates: { left?: string; top?: string; width?: string; height?: string }
): string => {
    const data = parsePageContent(content);
    if (!data.elementOverrides) {
        data.elementOverrides = {};
    }
    data.elementOverrides[elementId] = {
        ...(data.elementOverrides[elementId] || {}),
        ...styleUpdates
    };
    return JSON.stringify(data);
};

/**
 * 获取自定义背景图 URL
 */
export const getPageBackgroundImage = (content: string): string | undefined => {
    const data = parsePageContent(content);
    return data.backgroundImage;
};

/**
 * 更新自定义背景图 URL 并在值为空时移除该字段
 */
export const updatePageBackgroundImage = (content: string, url: string | null): string => {
    const data = parsePageContent(content);
    if (url) {
        data.backgroundImage = url;
    } else {
        delete data.backgroundImage;
    }
    return JSON.stringify(data);
};

