import type { Page, Chapter, CanvasElement, CanvasBackgroundConfig, PhotoFrameElement, TextElement, StickerElement } from '../types';
import { getSlotText, getSlotStyle, parsePageContent, getPageDecorations, getPageBackgroundImage } from './textSlotHelper';
import { getPhotoForSlot } from './slotHelper';

function parsePercent(val: string | number | undefined, defaultVal = 0): number {
    if (val === undefined) return defaultVal;
    if (typeof val === 'number') return val;
    const parsed = parseFloat(val.replace('%', ''));
    return isNaN(parsed) ? defaultVal : parsed;
}

/**
 * @description 历史遗留 V1.0 页面降级适配器
 * 将 V1.0 模板插槽 + 用户照片/文本槽 + 拖动贴纸，在内存中动态组装并还原为 V2.0 自由画布元素数组。
 */
export function adaptV1ToV2(
    page: Page,
    chapter: Chapter,
    template: any
): { elements: CanvasElement[]; background: CanvasBackgroundConfig } {
    if (!template || !template.layoutSchema) {
        return { elements: [], background: {} };
    }

    const { layoutSchema } = template;
    const parsedContent = parsePageContent(page.content);
    const overrides = parsedContent.elementOverrides || {};

    // 1. 转换排版插槽元素 (文本、图片)
    const elements: CanvasElement[] = layoutSchema.elements.map((el: any) => {
        // 读取槽位覆盖样式
        const override = overrides[el.id] || {};
        const left = parsePercent(override.left ?? el.style.left, 0);
        const top = parsePercent(override.top ?? el.style.top, 0);
        const width = parsePercent(override.width ?? el.style.width, 0);
        const height = parsePercent(override.height ?? el.style.height, 0);

        if (el.type === 'text') {
            let content = '';
            let role: 'chapter-title' | 'chapter-date' | 'page-content' | 'none' = 'none';

            if (el.role === 'chapter-title') {
                content = chapter.title;
                role = 'chapter-title';
            } else if (el.role === 'chapter-date') {
                content = chapter.date || '';
                role = 'chapter-date';
            } else {
                content = getSlotText(page.content, el.id);
                role = 'page-content';
            }

            // 合并文本样式，剥离定位属性以防在内部元素上重复布局
            const {
                left: _l, top: _t, width: _w, height: _h,
                borderRadius, borderColor, borderWidth, borderStyle,
                backgroundColor, boxShadow, zIndex, padding,
                ...typographyStyle
            } = el.style;

            // 获取槽位特定的特定内联样式覆盖
            const textStyle = getSlotStyle(page.content, el.id, typographyStyle);

            return {
                id: el.id,
                type: 'text',
                x: left,
                y: top,
                width: width,
                height: height,
                rotate: 0,
                zIndex: el.style.zIndex ?? 10,
                role,
                textConfig: {
                    content,
                    fontFamily: textStyle.fontFamily as string || 'sans',
                    fontSize: textStyle.fontSize as string || '12pt',
                    fontWeight: textStyle.fontWeight as string || 'normal',
                    color: textStyle.color as string || '#334155',
                    textAlign: (textStyle.textAlign as any) || 'left',
                    lineHeight: parseFloat(textStyle.lineHeight as string) || 1.6,
                    letterSpacing: textStyle.letterSpacing as string || '0px'
                }
            } as TextElement;
        } else {
            // photo type
            const slotIndex = el.slotIndex ?? 0;
            const photo = getPhotoForSlot(page.photos, slotIndex);

            return {
                id: el.id,
                type: 'photo-frame',
                x: left,
                y: top,
                width: width,
                height: height,
                rotate: 0,
                zIndex: el.style.zIndex ?? 10,
                photo: photo ? {
                    id: photo.id,
                    url: photo.url,
                    ossKey: photo.ossKey,
                    scale: photo.scale ?? 1.0,
                    xOffset: photo.xOffset ?? 50,
                    yOffset: photo.yOffset ?? 50,
                    styleType: photo.styleType || 'normal',
                    filterType: photo.filterType || 'none',
                    caption: photo.caption || '',
                    assetId: photo.assetId,
                    width: photo.width,
                    height: photo.height
                } : null,
                placeholder: `photo-placeholder-${slotIndex}`
            } as PhotoFrameElement;
        }
    });

    // 2. 转换贴纸 (decorations)
    const decorations = getPageDecorations(page.content);
    decorations.forEach((dec, idx) => {
        elements.push({
            id: dec.id || `sticker-${Date.now()}-${idx}`,
            type: 'sticker',
            x: dec.x,
            y: dec.y,
            width: dec.size ? (dec.size / 300) * 100 : 10, // 粗略转换大小为百分比坐标
            height: dec.size ? (dec.size / 300) * 100 : 10,
            rotate: dec.rotate || 0,
            zIndex: 20 + idx,
            stickerConfig: {
                stickerId: dec.content,
                imageUrl: ''
            }
        } as StickerElement);
    });

    // 3. 构建背景
    const background: CanvasBackgroundConfig = {
        color: layoutSchema.background?.color || '#FFFFFF',
        gridPattern: !!layoutSchema.background?.gridPattern,
        backgroundImage: getPageBackgroundImage(page.content)
    };

    return { elements, background };
}
