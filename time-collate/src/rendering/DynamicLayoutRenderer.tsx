import React from 'react';
import type { Chapter, Page } from '../types';
import { useBookStore } from '../store';
import { useMarketStore } from '../store/useMarketStore';
import { EditableText } from './components/EditableText';
import { EditablePhoto } from './components/EditablePhoto';
import { getSlotText, getSlotStyle, parsePageContent } from '../utils/textSlotHelper';
import { getPhotoForSlot } from '../utils/slotHelper';

interface DynamicLayoutRendererProps {
    chapter: Chapter;
    page: Page;
    readOnly?: boolean;
}

/**
 * @description 通用数据驱动排版渲染器 (JSON Schema 驱动)
 * 支持百分比绝对定位，完美融合现有的 WYSIWYG 内联文字编辑与图片微调功能
 */
export const DynamicLayoutRenderer: React.FC<DynamicLayoutRendererProps> = ({ chapter, page, readOnly = false }) => {
    // 从 Zustand store 获取加载缓存的动态模板列表
    const templates = useBookStore((state) => state.templates || []);
    const marketTemplates = useMarketStore((state) => state.marketTemplates || []);
    const template = templates.find((t) => t.id === page.layout) || 
                     marketTemplates.find((t) => t.id === page.layout);

    if (!template) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--theme-bg)] text-gray-400 select-none p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
                <span className="text-xs font-medium">正在解析动态排版模板...</span>
            </div>
        );
    }

    const { layoutSchema } = template;
    const bgStyle: React.CSSProperties = {
        backgroundColor: layoutSchema.background?.color || 'var(--theme-bg)',
    };

    return (
        <div 
            className="w-full h-full relative overflow-hidden select-none"
            style={bgStyle}
        >
            {/* 网格底纹装饰（根据 Schema 配置） */}
            {layoutSchema.background?.gridPattern && (
                <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(var(--theme-secondary) 1px, transparent 1px), linear-gradient(90deg, var(--theme-secondary) 1px, transparent 1px)`,
                        backgroundSize: '10mm 10mm'
                    }}
                />
            )}

            {/* 循环渲染 Schema 定义的所有插槽元素，套入页边安全边距容器，防止与翻页折角重叠 */}
            <div className="absolute inset-x-[12mm] top-[14mm] bottom-[12mm]">
                {layoutSchema.elements.map((element) => {
                    const parsedContent = parsePageContent(page.content);
                    const elementOverride = parsedContent.elementOverrides?.[element.id] || {};

                    const elementStyle: React.CSSProperties = {
                        position: 'absolute',
                        left: elementOverride.left ?? element.style.left,
                        top: elementOverride.top ?? element.style.top,
                        width: elementOverride.width ?? element.style.width,
                        height: elementOverride.height ?? element.style.height,
                        borderRadius: element.style.borderRadius,
                        borderColor: element.style.borderColor,
                        borderWidth: element.style.borderWidth,
                        borderStyle: element.style.borderStyle,
                        backgroundColor: element.style.backgroundColor,
                        boxShadow: element.style.boxShadow,
                        zIndex: element.style.zIndex ?? 10,
                        padding: element.style.padding,
                    };

                    if (element.type === 'text') {
                        // 解析文字角色对应的值
                        let value = '';
                        let editType: 'chapter-title' | 'chapter-date' | 'page-content' = 'page-content';
                        let slotId: string | undefined = undefined;
                        
                        if (element.role === 'chapter-title') {
                            value = chapter.title;
                            editType = 'chapter-title';
                        } else if (element.role === 'chapter-date') {
                            value = chapter.date || '';
                            editType = 'chapter-date';
                        } else {
                            slotId = element.id;
                            value = getSlotText(page.content, element.id);
                            editType = 'page-content';
                        }

                        // 组合自定义文本样式与用户覆盖样式，排除外围容器修饰样式以防重复应用
                        const { 
                            left, top, width, height, 
                            borderRadius, borderColor, borderWidth, borderStyle,
                            backgroundColor, boxShadow, zIndex, padding,
                            ...typographyStyle 
                        } = element.style;
                        const baseTextStyle: React.CSSProperties = {
                            ...typographyStyle,
                            fontWeight: element.style.fontWeight as any,
                        };
                        const textStyle = slotId 
                            ? getSlotStyle(page.content, slotId, baseTextStyle) 
                            : baseTextStyle;

                        return (
                            <div 
                                key={element.id} 
                                style={elementStyle} 
                                className="flex flex-col justify-start"
                            >
                                <EditableText
                                    value={value}
                                    chapterId={chapter.id}
                                    pageId={page.id}
                                    slotId={slotId}
                                    type={editType}
                                    className="w-full h-full focus:outline-none"
                                    style={textStyle}
                                    readOnly={readOnly}
                                    placeholder={
                                        element.role === 'page-content' 
                                            ? '双击记录此处的内心独白...' 
                                            : '请输入内容'
                                    }
                                />
                            </div>
                        );
                    }

                    if (element.type === 'photo') {
                        const slotIndex = element.slotIndex ?? 0;
                        const photo = getPhotoForSlot(page.photos, slotIndex);

                        return (
                            <div 
                                key={element.id} 
                                style={elementStyle} 
                                className="overflow-hidden"
                            >
                                <EditablePhoto
                                    photo={photo}
                                    chapterId={chapter.id}
                                    pageId={page.id}
                                    slotIndex={slotIndex}
                                    alt={element.id}
                                    className="w-full h-full"
                                    readOnly={readOnly}
                                    style={{
                                        objectFit: 'cover'
                                    }}
                                />
                            </div>
                        );
                    }

                    return null;
                })}
            </div>
        </div>
    );
};
