import React from 'react';
import type { Chapter, Page } from '../../types';

interface LayoutProps {
    chapter: Chapter;
    page?: Page;
}

/**
 * @description 智能网格排版
 * 根据图片数量自动选择最佳排列方式：
 * - 1-4 张：精致并排逻辑（各有特殊处理）
 * - 5-9 张：紧凑九宫格/矩阵逻辑
 */
export const GridLayout: React.FC<LayoutProps> = ({ chapter, page }) => {
    const currentPage = page || chapter.pages?.[0];
    const photos = (currentPage?.photos || []).slice(0, 9); // 支持最多9张
    const content = currentPage?.content || '';
    const photoCount = photos.length;

    // #region 1-4张：精致并排布局
    const renderRefinedLayout = () => {
        if (photoCount === 0) {
            return (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300 text-sm">
                    暂无图片
                </div>
            );
        }

        if (photoCount === 1) {
            return (
                <div className="w-full h-full overflow-hidden">
                    <img
                        src={photos[0].url}
                        className="w-full h-full object-cover"
                        alt={photos[0].caption || '照片'}
                    />
                </div>
            );
        }

        if (photoCount === 2) {
            return (
                <div className="w-full h-full flex gap-[3mm]">
                    <div className="flex-[2] overflow-hidden">
                        <img src={photos[0].url} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <img src={photos[1].url} className="w-full h-full object-cover" alt="" />
                    </div>
                </div>
            );
        }

        if (photoCount === 3) {
            return (
                <div className="w-full h-full flex gap-[3mm]">
                    <div className="flex-[1.5] overflow-hidden">
                        <img src={photos[0].url} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="flex-1 flex flex-col gap-[3mm]">
                        <div className="flex-1 overflow-hidden">
                            <img src={photos[1].url} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <img src={photos[2].url} className="w-full h-full object-cover" alt="" />
                        </div>
                    </div>
                </div>
            );
        }

        // 4张：瀑布流式布局
        return (
            <div className="w-full h-full flex gap-[3mm]">
                <div className="flex-1 flex flex-col gap-[3mm]">
                    <div className="flex-[1.2] overflow-hidden">
                        <img src={photos[0].url} className="w-full h-full object-cover" alt="" />
                    </div>
                    {photos[2] && (
                        <div className="flex-1 overflow-hidden">
                            <img src={photos[2].url} className="w-full h-full object-cover" alt="" />
                        </div>
                    )}
                </div>
                <div className="flex-1 flex flex-col gap-[3mm]">
                    {photos[1] && (
                        <div className="flex-1 overflow-hidden">
                            <img src={photos[1].url} className="w-full h-full object-cover" alt="" />
                        </div>
                    )}
                    {photos[3] && (
                        <div className="flex-[1.2] overflow-hidden">
                            <img src={photos[3].url} className="w-full h-full object-cover" alt="" />
                        </div>
                    )}
                </div>
            </div>
        );
    };
    // #endregion

    // #region 5-9张：紧凑九宫格布局
    const renderCompactGrid = () => {
        // 根据图片数量计算网格列数
        const getCols = () => {
            if (photoCount <= 6) return 3; // 2行
            return 3; // 3行
        };

        const cols = getCols();

        return (
            <div
                className="w-full h-full grid gap-[2mm]"
                style={{
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gridAutoRows: '1fr'
                }}
            >
                {photos.map((photo, index) => (
                    <div
                        key={photo.id}
                        className="overflow-hidden relative group"
                    >
                        <img
                            src={photo.url}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            alt={photo.caption || `照片 ${index + 1}`}
                        />
                        {/* 序号角标 */}
                        <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-[8px] font-bold text-gray-600">
                            {index + 1}
                        </div>
                    </div>
                ))}
            </div>
        );
    };
    // #endregion

    // 根据数量选择渲染模式
    const renderPhotos = () => {
        if (photoCount <= 4) {
            return renderRefinedLayout();
        }
        return renderCompactGrid();
    };

    return (
        <div className="w-full h-full p-[12mm] flex flex-col font-sans overflow-hidden">
            {/* 标题区域 */}
            <div className="flex-shrink-0 mb-[6mm]">
                <h2 className="text-[22pt] font-black text-gray-900 tracking-tight mb-1 line-clamp-1">
                    {chapter.title}
                </h2>
                <div className="flex items-center gap-3">
                    <div className="text-[8pt] font-bold tracking-widest text-cta uppercase">{chapter.date}</div>
                    <div className="h-[0.5px] flex-1 bg-gray-200" />
                    {photoCount > 4 && (
                        <div className="text-[7pt] text-gray-400 font-mono">
                            {photoCount} 图 · 九宫格模式
                        </div>
                    )}
                </div>
            </div>

            {/* 图片区域 */}
            <div className="flex-1 min-h-0 overflow-hidden rounded-sm">
                {renderPhotos()}
            </div>

            {/* 正文区域 */}
            {content && (
                <div className="flex-shrink-0 mt-[6mm] pt-[4mm] border-t border-gray-100">
                    <p className="text-[9pt] text-gray-500 leading-[1.5] line-clamp-2">
                        {content}
                    </p>
                </div>
            )}
        </div>
    );
};
