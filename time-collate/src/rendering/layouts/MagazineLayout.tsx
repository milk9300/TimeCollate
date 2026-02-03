import React from 'react';
import type { Chapter, Page } from '../../types';

interface LayoutProps {
    chapter: Chapter;
    page?: Page;
    chapterIndex?: number;
}

// 根据 pageId 哈希判断是否镜像
const shouldMirror = (id: string): boolean => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % 2 === 1;
};

/**
 * @description 时尚杂志排版
 * 支持左右镜像变体，严格高度约束避免溢出
 */
export const MagazineLayout: React.FC<LayoutProps> = ({ chapter, page, chapterIndex = 0 }) => {
    const currentPage = page || chapter.pages?.[0];
    // 限制最多3张侧边小图
    const photos = (currentPage?.photos || []).slice(0, 4);
    const content = currentPage?.content || '';

    const mirrored = shouldMirror(currentPage?.id || '');
    const volumeNum = (chapterIndex + 1).toString().padStart(2, '0');

    return (
        <div className="w-full h-full p-[10mm] relative overflow-hidden bg-white flex flex-col">
            {/* 顶栏 - 固定高度 */}
            <header className="flex justify-between items-end border-b-2 border-black pb-3 mb-3 flex-shrink-0">
                <h2 className="text-[28pt] font-black uppercase tracking-tighter leading-none">
                    MEMORIES
                </h2>
                <span className="text-[8pt] font-bold italic tracking-widest">{chapter.date}</span>
            </header>

            {/* 主内容区 - 使用 CSS Grid 严格约束高度 */}
            <div
                className={`flex-1 min-h-0 grid gap-3 overflow-hidden`}
                style={{
                    gridTemplateColumns: mirrored ? '1fr 2fr' : '2fr 1fr',
                    gridTemplateRows: '1fr'
                }}
            >
                {/* 主图 */}
                <div className={`bg-gray-100 relative overflow-hidden ${mirrored ? 'order-2' : 'order-1'}`}>
                    {photos[0] ? (
                        <img src={photos[0].url} className="w-full h-full object-cover" alt="主图" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">暂无图片</div>
                    )}

                    {/* 叠加文字块 */}
                    <div className={`absolute bottom-[15%] ${mirrored ? 'left-0' : 'right-0'} bg-black text-white p-4 w-[65%] shadow-xl z-20`}>
                        <p className="text-[9pt] leading-relaxed italic opacity-90 line-clamp-3">
                            {content || "杂志级静物摄影排版，通过大胆的色块对冲与留白展现生活美学。"}
                        </p>
                    </div>
                </div>

                {/* 侧边小图列 - 使用 grid 均分高度 */}
                <div
                    className={`grid gap-2 overflow-hidden ${mirrored ? 'order-1' : 'order-2'}`}
                    style={{ gridTemplateRows: `repeat(${Math.max(photos.length - 1, 1)}, 1fr)` }}
                >
                    {photos.slice(1, 4).map((photo) => (
                        <div key={photo.id} className="overflow-hidden shadow-md">
                            <img src={photo.url} className="w-full h-full object-cover" alt="细节" />
                        </div>
                    ))}

                    {/* 装饰条 */}
                    {photos.length <= 2 && (
                        <div className="flex items-center justify-center border-t-2 border-black mt-auto">
                            <div className="text-[12pt] font-bold text-black transform -rotate-90 py-4">
                                VOL.{volumeNum}
                            </div>
                        </div>
                    )}
                </div>

                {/* 背景大填充字 */}
                <div className={`absolute ${mirrored ? '-right-8' : '-left-8'} bottom-[25%] text-[120pt] font-black text-gray-100 ${mirrored ? 'rotate-90' : '-rotate-90'} pointer-events-none -z-10 select-none`}>
                    LIFE
                </div>
            </div>
        </div>
    );
};
