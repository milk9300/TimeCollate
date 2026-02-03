import React from 'react';
import type { Chapter, Page } from '../../types';

interface LayoutProps {
    chapter: Chapter;
    page?: Page;
    chapterIndex?: number;  // 新增：章节序号
}

/**
 * @description 开启篇章页布局
 * 设计重点：大面积留白、几何装饰、巨型数字/标题，适合每一章的第一页
 */
export const CoverLayout: React.FC<LayoutProps> = ({ chapter, page, chapterIndex = 0 }) => {
    const currentPage = page || chapter.pages?.[0];
    const photo = currentPage?.photos?.[0];

    // 动态生成章节序号（01, 02, 03...）
    const formattedIndex = (chapterIndex + 1).toString().padStart(2, '0');

    return (
        <div className="w-full h-full p-[15mm] relative overflow-hidden bg-[var(--theme-bg)] flex flex-col justify-end">
            {/* 背景装饰图形 */}
            <div className="absolute top-0 right-0 w-[60%] h-[40%] bg-[var(--theme-accent)] opacity-[0.03] rounded-bl-full translate-x-10 -translate-y-10" />

            {/* 章节序号或大装饰 - 动态 */}
            <div className="absolute top-[20%] left-[10%] text-[120pt] font-black text-[var(--theme-accent)] opacity-5 leading-none select-none">
                {formattedIndex}
            </div>

            <div className="relative z-10">
                {/* 标题 */}
                <h1 className="text-[42pt] font-black text-[var(--theme-primary)] mb-6 leading-[1.1] tracking-tighter">
                    {chapter.title}
                </h1>

                {/* 副标题与日期 */}
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-12 h-0.5 bg-[var(--theme-accent)]" />
                    <span className="text-[10pt] font-bold text-[var(--theme-accent)] tracking-[0.3em] uppercase">
                        {chapter.date}
                    </span>
                </div>

                {/* 底部摘要文字 */}
                <div className="max-w-[80%] border-l-4 border-[var(--theme-border)] pl-6 py-2">
                    <p className="text-[11pt] text-[var(--theme-secondary)] italic leading-relaxed line-clamp-3">
                        {currentPage?.content || "开启一段新的回忆记录..."}
                    </p>
                </div>
            </div>

            {/* 如果有图，作为底部背景遮罩或浮动小图 */}
            {photo && (
                <div className="absolute top-[10%] left-[40%] w-[50%] aspect-[3/4] p-[2mm] bg-white shadow-2xl rotate-3">
                    <img src={photo.url} className="w-full h-full object-cover" alt="封面图" />
                </div>
            )}
        </div>
    );
};
