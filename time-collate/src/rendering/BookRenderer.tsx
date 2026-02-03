import React, { useRef, useState, useEffect, useMemo } from 'react';
import { PAGE_SIZES, PRINT_CONSTANTS, type PageSize } from './PhysicalConstants';
import type { Page, Chapter } from '../types';
import { LayoutRegistry } from './LayoutRegistry';

interface BookRendererProps {
    page: Page;
    pageSize: PageSize;
    chapterTitle?: string;
    chapterDate?: string;
    chapterIndex?: number;  // 新增：章节序号（从0开始）
    scale?: number;
}

/**
 * @description 核心书籍渲染器
 * 增强版：支持多种纸张尺寸、纸张质感模拟、多重阴影厚度感
 */
export const BookRenderer: React.FC<BookRendererProps> = ({
    page,
    pageSize,
    chapterTitle,
    chapterDate,
    chapterIndex = 0,
    scale: manualScale
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [autoScale, setAutoScale] = useState(1);

    // 根据 pageSize 获取实际物理尺寸
    const dimensions = useMemo(() => PAGE_SIZES[pageSize] || PAGE_SIZES.A4, [pageSize]);
    const { width: baseWidth, height: baseHeight } = dimensions;

    useEffect(() => {
        if (manualScale !== undefined) return;

        const calculateScale = () => {
            const parent = containerRef.current?.parentElement;
            if (!parent) return;

            const parentWidth = parent.clientWidth;
            const parentHeight = parent.clientHeight;

            const padding = 100; // 增加 padding 以适配多重阴影
            const availableWidth = parentWidth - padding;
            const availableHeight = parentHeight - padding;

            const MM_TO_PX = 3.7795;
            const pageWidthPx = baseWidth * MM_TO_PX;
            const pageHeightPx = baseHeight * MM_TO_PX;

            const scaleW = availableWidth / pageWidthPx;
            const scaleH = availableHeight / pageHeightPx;

            setAutoScale(Math.min(scaleW, scaleH));
        };

        calculateScale();
        window.addEventListener('resize', calculateScale);

        const parent = containerRef.current?.parentElement;
        const resizeObserver = new ResizeObserver(calculateScale);
        if (parent) {
            resizeObserver.observe(parent);
        }

        return () => {
            window.removeEventListener('resize', calculateScale);
            resizeObserver.disconnect();
        };
    }, [baseWidth, baseHeight, manualScale]);

    const finalScale = manualScale ?? autoScale;

    const compatibleChapter: Chapter = {
        id: page.id,
        title: chapterTitle || '',
        date: chapterDate || '',
        pages: [page]
    };

    const layoutProps = {
        chapter: compatibleChapter,
        page: page,
        chapterIndex: chapterIndex
    };

    return (
        <div
            ref={containerRef}
            className="flex items-center justify-center w-full h-full overflow-hidden bg-[#F0F0F0] perspective-[1000px]"
        >
            <div
                style={{
                    width: `${baseWidth}mm`,
                    height: `${baseHeight}mm`,
                    transform: `scale(${finalScale})`,
                    transformOrigin: 'center center',
                    // 多层级联阴影：模拟纸张真实厚度和环境光
                    boxShadow: `
                        0 1px 2px rgba(0,0,0,0.05), 
                        0 2px 4px rgba(0,0,0,0.05), 
                        0 4px 8px rgba(0,0,0,0.05), 
                        0 8px 16px rgba(0,0,0,0.05), 
                        0 16px 32px rgba(0,0,0,0.05)
                    `,
                    backgroundColor: '#FFFFFF',
                    position: 'relative',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden'
                }}
                className="flex flex-col"
            >
                {/* 1. 纸张纹理层 (Noise Texture) */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03] z-[1]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* 2. 纸张边缘高光模拟 */}
                <div className="absolute inset-0 border-[0.5px] border-black/5 pointer-events-none z-[100]" />

                {/* 3. 安全边距指示 (仅供参考) */}
                <div
                    style={{
                        position: 'absolute',
                        inset: `${PRINT_CONSTANTS.SAFE_ZONE}mm`,
                        border: '1px dashed rgba(60, 132, 244, 0.15)',
                        pointerEvents: 'none',
                        zIndex: 100
                    }}
                />

                {/* 4. 动态布局渲染 */}
                <div className="flex-1 w-full h-full relative z-[2]">
                    {React.createElement(LayoutRegistry.getRenderer(page.layout), layoutProps)}
                </div>

                {/* 5. 页码与装饰 */}
                <div className="absolute bottom-6 left-0 right-0 text-center z-[3]">
                    <div className="inline-block px-4 py-1 border-y border-gray-100">
                        <span className="text-[7pt] text-gray-300 tracking-[0.3em] font-light italic">
                            {page.id.slice(0, 4).toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* 6. 书缝阴影模拟 (如果是对开页逻辑) */}
                <div className="absolute left-0 inset-y-0 w-12 bg-gradient-to-r from-black/[0.02] to-transparent pointer-events-none z-[10]" />
            </div>
        </div>
    );
};
