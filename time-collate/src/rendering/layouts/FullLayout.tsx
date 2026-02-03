import React from 'react';
import type { Chapter, Page } from '../../types';
import { AlertTriangle } from 'lucide-react';

interface LayoutProps {
    chapter: Chapter;
    page?: Page;
}

// 低分辨率阈值（像素）
const LOW_RES_THRESHOLD = 1200;

/**
 * @description 全屏大图排版
 * 侧重于视觉冲击力，图片占满页宽，文字优雅覆盖或留白
 * 增强：低分辨率图片警告提示
 */
export const FullLayout: React.FC<LayoutProps> = ({ chapter, page }) => {
    const currentPage = page || chapter.pages?.[0];
    const photo = currentPage?.photos[0];
    const content = currentPage?.content || '';

    // 检测是否低分辨率（若存在 width/height 元数据）
    const isLowRes = photo && (
        (photo.width && photo.width < LOW_RES_THRESHOLD) ||
        (photo.height && photo.height < LOW_RES_THRESHOLD)
    );

    return (
        <div className="relative w-full h-full flex flex-col font-serif overflow-hidden">
            {/* Background/Main Image */}
            {photo ? (
                <div className="absolute inset-0 bg-gray-100">
                    <img
                        src={photo.url}
                        alt={photo.caption || '照片'}
                        className="w-full h-full object-cover"
                    />
                    {/* Subtle Overlay for readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30" />

                    {/* 低分辨率警告 */}
                    {isLowRes && (
                        <div className="absolute bottom-4 right-4 bg-amber-500/90 text-white px-3 py-1.5 rounded-full flex items-center gap-2 text-[8pt] font-bold shadow-lg z-30">
                            <AlertTriangle size={14} />
                            <span>分辨率较低</span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-300">
                    暂无图片
                </div>
            )}

            {/* Content Overlay */}
            <div className="relative mt-auto p-[25mm] text-white">
                <div className="max-w-prose">
                    <h2 className="text-[32pt] font-extrabold mb-4 leading-tight tracking-tight drop-shadow-lg">
                        {chapter.title}
                    </h2>
                    <div className="h-1 w-16 bg-white mb-6 drop-shadow-md" />
                    <p className="text-[14pt] leading-[1.6] drop-shadow-lg opacity-90">
                        {content}
                    </p>
                </div>
            </div>

            {/* Date floating element */}
            <div className="absolute top-[15mm] right-[15mm] flex flex-col items-end">
                <span className="text-[20pt] font-light tracking-[0.2em]">{chapter.date?.split('-')[2] || '01'}</span>
                <span className="text-[8pt] uppercase tracking-[0.5em] mt-[-5px]">
                    {chapter.date ? (new Date(chapter.date).getMonth() + 1) + '月' : '1月'}
                </span>
            </div>
        </div>
    );
};
