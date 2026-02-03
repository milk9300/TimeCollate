import React from 'react';
import type { Chapter, Page } from '../../types';

interface LayoutProps {
    chapter: Chapter;
    page?: Page;
}

// 基于字符串生成伪随机数（0-1）
const seededRandom = (seed: string, index: number): number => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) {
        h = ((h << 5) - h) + seed.charCodeAt(i) + index * 31;
        h |= 0;
    }
    return (Math.abs(h) % 1000) / 1000;
};

/**
 * @description 手账/日记排版
 * 视觉逻辑：模仿纸质笔记本，强调文字书写感，图片作为插画穿插
 * 约束：右侧图片区域最多显示2张，确保不溢出
 */
export const JournalLayout: React.FC<LayoutProps> = ({ chapter, page }) => {
    const currentPage = page || chapter.pages?.[0];
    const pageId = currentPage?.id || 'default';
    // 限制最多2张图片以避免溢出
    const photos = (currentPage?.photos || []).slice(0, 2);
    const content = currentPage?.content || '';

    // 生成随机化的胶带位置和角度
    const tape1Rotate = -12 + (seededRandom(pageId, 100) - 0.5) * 20;
    const tape2Rotate = 45 + (seededRandom(pageId, 101) - 0.5) * 30;
    const tape1Right = 15 + seededRandom(pageId, 102) * 15;
    const tape2Right = 2 + seededRandom(pageId, 103) * 10;

    return (
        <div className="w-full h-full p-[18mm] relative overflow-hidden bg-[#FFFEFA]">
            {/* 网格底纹背景 */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '10mm 10mm' }}
            />

            <div className="relative z-10 flex flex-col h-full overflow-hidden">
                {/* 顶部页眉 */}
                <header className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-3 flex-shrink-0">
                    <div className="w-8 h-8 bg-[var(--theme-accent)] rounded-full flex items-center justify-center text-white font-bold text-xs">
                        D
                    </div>
                    <div>
                        <h2 className="text-[14pt] font-black text-[var(--theme-primary)]">{chapter.title}</h2>
                        <span className="text-[7pt] text-gray-400 font-mono tracking-widest">{chapter.date}</span>
                    </div>
                </header>

                {/* 内容区域 - 使用 overflow-hidden 强制裁切 */}
                <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
                    {/* 左侧文字区 */}
                    <div className="flex-[3] relative overflow-hidden">
                        <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-red-100" />
                        <p className="text-[11pt] text-gray-700 leading-[1.7] font-serif whitespace-pre-wrap line-clamp-[12]">
                            {content || "在这里写下关于这一页的故事..."}
                        </p>
                    </div>

                    {/* 右侧图片贴纸区 - 严格高度约束 */}
                    <div className="flex-[2] flex flex-col gap-4 items-center relative overflow-hidden">
                        {photos.map((photo, i) => {
                            const rotation = (seededRandom(pageId, i) - 0.5) * 6;

                            return (
                                <div
                                    key={photo.id}
                                    className="w-[90%] flex-1 min-h-0 max-h-[45%] p-1.5 bg-white shadow-md border border-gray-100 overflow-hidden"
                                    style={{ transform: `rotate(${rotation}deg)` }}
                                >
                                    <img
                                        src={photo.url}
                                        className="w-full h-full object-cover grayscale-[0.15] hover:grayscale-0 transition-all"
                                        alt="手账照片"
                                    />
                                </div>
                            );
                        })}

                        {/* 装饰胶带 */}
                        <div
                            className="absolute top-0 w-10 h-3 bg-blue-100/50 blur-[0.3px]"
                            style={{ right: `${tape1Right}%`, transform: `rotate(${tape1Rotate}deg)` }}
                        />
                        <div
                            className="absolute bottom-[15%] w-8 h-2.5 bg-yellow-100/50 blur-[0.3px]"
                            style={{ right: `${tape2Right}%`, transform: `rotate(${tape2Rotate}deg)` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
