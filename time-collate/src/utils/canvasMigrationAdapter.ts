import type { Page, Chapter, CanvasElement, CanvasBackgroundConfig, PhotoFrameElement, TextElement, StickerElement, Book } from '../types';
import { getSlotText, getSlotStyle, parsePageContent, getPageDecorations, getPageBackgroundImage, getPageAtmosphere } from './textSlotHelper';
import { getPhotoForSlot } from './slotHelper';
import { getVirtualDimensions } from '../rendering/PhysicalConstants';
import type { PageSize } from '../rendering/PhysicalConstants';

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
    template: any,
    pageSize: PageSize = 'A4'
): { elements: CanvasElement[]; background: CanvasBackgroundConfig } {
    if (page.elements && page.elements.length > 0) {
        return {
            elements: page.elements,
            background: page.background || template?.layoutSchema?.background || {}
        };
    }

    if (!template || !template.layoutSchema) {
        return { elements: [], background: {} };
    }
    const { virtualWidth, virtualHeight } = getVirtualDimensions(pageSize);
    const { layoutSchema } = template;
    const parsedContent = parsePageContent(page.content);
    const overrides = parsedContent.elementOverrides || {};

    // 1. 转换排版插槽元素 (文本、图片)
    const elements: CanvasElement[] = layoutSchema.elements.map((el: any) => {
        // 读取槽位覆盖样式
        const override = overrides[el.id] || {};
        const left = Math.round((parsePercent(override.left ?? (el.x !== undefined ? el.x / 10 : undefined) ?? el.style?.left, 0) / 100) * virtualWidth);
        const top = Math.round((parsePercent(override.top ?? (el.y !== undefined ? el.y / 14.14 : undefined) ?? el.style?.top, 0) / 100) * virtualHeight);
        const width = Math.round((parsePercent(override.width ?? (el.width !== undefined ? el.width / 10 : undefined) ?? el.style?.width, 0) / 100) * virtualWidth);
        const height = Math.round((parsePercent(override.height ?? (el.height !== undefined ? el.height / 14.14 : undefined) ?? el.style?.height, 0) / 100) * virtualHeight);

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
            } = el.style || {};

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
                zIndex: el.style?.zIndex ?? 10,
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
                zIndex: el.style?.zIndex ?? 10,
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
        const sizeVirtualWidth = dec.size ? Math.round((dec.size / 300) * virtualWidth) : Math.round(0.1 * virtualWidth);
        elements.push({
            id: dec.id || `sticker-${Date.now()}-${idx}`,
            type: 'sticker',
            x: Math.round((dec.x / 100) * virtualWidth),
            y: Math.round((dec.y / 100) * virtualHeight),
            width: sizeVirtualWidth,
            height: sizeVirtualWidth,
            rotate: dec.rotate || 0,
            zIndex: 20 + idx,
            stickerConfig: {
                stickerId: dec.content,
                imageUrl: ''
            }
        } as StickerElement);
    });

    // 3. 构建背景
    const atmosphere = getPageAtmosphere(page.content);
    let atmosphereBg = '#FFFFFF';
    if (atmosphere === 'travel') atmosphereBg = '#FAF5EC';
    else if (atmosphere === 'retro') atmosphereBg = '#ECE3D3';
    else if (atmosphere === 'film') atmosphereBg = '#18181B';
    else if (atmosphere === 'notebook') atmosphereBg = '#FDFCF7';

    const background: CanvasBackgroundConfig = {
        color: layoutSchema.background?.color || atmosphereBg,
        gridPattern: !!layoutSchema.background?.gridPattern,
        backgroundImage: getPageBackgroundImage(page.content)
    };

    return { elements, background };
}

/**
 * @description 自动将已有 Book 数据中 Canvas 页面组件的百分比坐标转换为虚拟绝对坐标
 */
export function migrateBookToVirtualCoords(book: Book): Book {
    if (!book || (book as any).coordinateSystem === 'virtual') {
        return book;
    }

    const { virtualWidth, virtualHeight } = getVirtualDimensions(book.pageSize || 'A4');
    const migratedPages = book.pages.map(page => {
        if (!page.elements || page.elements.length === 0) return page;

        // 双重校验：若任何一个元素坐标显著超出 100，说明已经是虚拟坐标系数据，直接跳过此页
        const alreadyVirtual = page.elements.some(el => el.x > 100 || el.width > 100 || el.y > 100 || el.height > 100);
        if (alreadyVirtual) return page;

        const migratedElements = page.elements.map(el => {
            // 对于贴纸 (Stickers)，原有的 x, y 为百分比
            return {
                ...el,
                x: Math.round((el.x / 100) * virtualWidth),
                y: Math.round((el.y / 100) * virtualHeight),
                width: Math.round((el.width / 100) * virtualWidth),
                height: Math.round((el.height / 100) * virtualHeight)
            };
        });

        return {
            ...page,
            elements: migratedElements
        };
    });

    return {
        ...book,
        pages: migratedPages,
        coordinateSystem: 'virtual'
    } as any;
}

