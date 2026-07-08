import React from 'react';
import type { Chapter, Page, CanvasElement } from '../types';
import { useBookStore } from '../store';
import { useMarketStore } from '../store/useMarketStore';
import { CanvasTextElement } from './components/CanvasTextElement';
import { CanvasPhotoFrameElement } from './components/CanvasPhotoFrameElement';
import { CanvasStickerElement } from './components/CanvasStickerElement';
import { CanvasShapeElement } from './components/CanvasShapeElement';
import { adaptV1ToV2 } from '../utils/canvasMigrationAdapter';
import { getVirtualDimensions } from './PhysicalConstants';

interface DynamicLayoutRendererProps {
    chapter: Chapter;
    page: Page;
    readOnly?: boolean;
}

/**
 * @description 统一画布渲染引擎
 * 自动识别 V2.0 自由画布页面与 V1.0 遗留排版页面。
 * 对于 V2.0，提供全出血（Full Bleed）底图背景及自由图层渲染；
 * 对于 V1.0，在内存中动态升维适配并保持安全版芯边距渲染，当用户触发任何编辑修改时自动落库升级为 V2.0。
 */
export const DynamicLayoutRenderer: React.FC<DynamicLayoutRendererProps> = ({ chapter, page, readOnly = false }) => {
    const templates = useBookStore((state) => state.templates);
    const marketTemplates = useMarketStore((state) => state.marketTemplates);
    const updatePage = useBookStore((state) => state.updatePage);
    const alignLines = useBookStore((state) => state.alignLines);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // 查询当前版面所关联的模板
    const template = templates.find((t) => t.id === page.templateId) || 
                      marketTemplates.find((t) => t.id === page.templateId);

    // 判断当前页面是否为 V2.0 画布页面
    const isV2 = Array.isArray(page.elements);

    const currentBook = useBookStore((state) => state.currentBook);
    const pageSize = currentBook?.pageSize || 'A4';
    const { virtualWidth, virtualHeight } = getVirtualDimensions(pageSize);

    // 内存对齐适配：如果是 legacy，运行适配器获得 V2.0 格式的数据结构
    const adapted = !isV2 ? adaptV1ToV2(page, chapter, template, pageSize) : null;
    const elements = isV2 ? page.elements! : (adapted?.elements || []);
    const background = isV2 ? page.background : adapted?.background;

    // 当用户更新组件时的回调处理 (如果是 V1 则会自动触发升级保存)
    const handleUpdateElement = (elementId: string, updates: Partial<CanvasElement>) => {
        const store = useBookStore.getState();
        let targetElements = isV2 ? page.elements! : (adapted?.elements || []);
        let targetBackground = isV2 ? page.background : adapted?.background;

        const original = targetElements.find(el => el.id === elementId);
        if (!original) return;

        let nextElements = targetElements;

        // 如果是成组元素的位移，则对组内所有元素应用等量 delta 平移
        if (original.groupId && (updates.x !== undefined || updates.y !== undefined)) {
            const dx = updates.x !== undefined ? updates.x - original.x : 0;
            const dy = updates.y !== undefined ? updates.y - original.y : 0;

            nextElements = targetElements.map(el => {
                if (el.id === elementId) {
                    return { ...el, ...updates } as CanvasElement;
                }
                if (el.groupId === original.groupId) {
                    return {
                        ...el,
                        x: el.x + dx,
                        y: el.y + dy
                    } as CanvasElement;
                }
                return el;
            });
        } else {
            nextElements = targetElements.map(el => {
                if (el.id === elementId) {
                    return { ...el, ...updates } as CanvasElement;
                }
                return el;
            });
        }

        // 统一提交更新到 Zustand 存储，对 V1.0 页面直接静默升级为 V2.0 格式持久化
        store.updatePage(chapter.id, page.id, {
            elements: nextElements,
            background: targetBackground,
        });
    };

    if (!template && !isV2) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--theme-bg)] text-gray-400 select-none p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
                <span className="text-xs font-medium">正在解析动态排版模板...</span>
            </div>
        );
    }

    // 计算背景样式 (支持自定义背景图 or 纯色填充)
    const bgStyle: React.CSSProperties = {
        background: background?.backgroundImage 
            ? `url(${background.backgroundImage}) center/cover no-repeat` 
            : (background?.color || 'var(--theme-bg)'),
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
    };

    const renderElements = () => {
        return elements.map((el) => {
            const onUpdate = (updates: any) => handleUpdateElement(el.id, updates);

            switch (el.type) {
                case 'text':
                    return (
                        <CanvasTextElement
                            key={el.id}
                            element={el}
                            chapterId={chapter.id}
                            pageId={page.id}
                            readOnly={readOnly}
                            onUpdate={onUpdate}
                            canvasRef={containerRef}
                            siblingElements={elements}
                        />
                    );
                case 'photo-frame':
                    return (
                        <CanvasPhotoFrameElement
                            key={el.id}
                            element={el}
                            chapterId={chapter.id}
                            pageId={page.id}
                            readOnly={readOnly}
                            onUpdate={onUpdate}
                            canvasRef={containerRef}
                            siblingElements={elements}
                        />
                    );
                case 'sticker':
                    return (
                        <CanvasStickerElement
                            key={el.id}
                            element={el}
                            chapterId={chapter.id}
                            pageId={page.id}
                            readOnly={readOnly}
                            onUpdate={onUpdate}
                            canvasRef={containerRef}
                            siblingElements={elements}
                        />
                    );
                case 'shape':
                    return (
                        <CanvasShapeElement
                            key={el.id}
                            element={el}
                            chapterId={chapter.id}
                            pageId={page.id}
                            readOnly={readOnly}
                            onUpdate={onUpdate}
                            canvasRef={containerRef}
                            siblingElements={elements}
                        />
                    );
                default:
                    return null;
            }
        });
    };

    return (
        <div 
            ref={containerRef}
            className="w-full h-full relative overflow-hidden select-none"
            style={bgStyle}
        >
            {/* 网格背景图装饰 */}
            {background?.gridPattern && (
                <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(var(--theme-secondary) 1px, transparent 1px), linear-gradient(90deg, var(--theme-secondary) 1px, transparent 1px)`,
                        backgroundSize: '10mm 10mm'
                    }}
                />
            )}

            {/* 元素渲染容器 */}
            {isV2 ? (
                // V2.0 自由画布：提供全 bleed 绘制区域，无任何固定页边距限制
                <div className="absolute inset-0">
                    {renderElements()}
                </div>
            ) : (
                // V1.0 历史遗留：使用原有的 12mm/14mm 边距包裹版芯，防止坐标拉伸飘移，实现完美向下兼容
                <div className="absolute inset-x-[12mm] top-[14mm] bottom-[12mm]">
                    {renderElements()}
                </div>
            )}

            {/* 对齐吸附辅助线 */}
            {!readOnly && alignLines.map((line: any, idx: number) => {
                if (line.type === 'v') {
                    return (
                        <div
                            key={`v-${idx}`}
                            className="absolute top-0 bottom-0 border-l border-dashed border-[#8b3dff] z-50 pointer-events-none"
                            style={{ left: `${(line.val / virtualWidth) * 100}%` }}
                        />
                    );
                } else {
                    return (
                        <div
                            key={`h-${idx}`}
                            className="absolute left-0 right-0 border-t border-dashed border-[#8b3dff] z-50 pointer-events-none"
                            style={{ top: `${(line.val / virtualHeight) * 100}%` }}
                        />
                    );
                }
            })}
        </div>
    );
};
