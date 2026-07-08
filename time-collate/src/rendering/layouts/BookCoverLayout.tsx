import React from 'react';
import type { Book, Page, Chapter } from '../../types';
import { GeneratedCover } from '../../features/editor/components/GeneratedCover';
import { DynamicLayoutRenderer } from '../DynamicLayoutRenderer';

interface BookCoverLayoutProps {
    book: Book;
    page?: Page;
    chapter?: Chapter;
    readOnly?: boolean;
}

/**
 * @description 书籍总封面排版 - 画布同源纯展示组件 (WYSIWYG 100% 对齐)
 * 支持渲染 V2.0 用户自由画布设计的封面，或是退回 V1.0 系统预设生成的封面
 */
export const BookCoverLayout: React.FC<BookCoverLayoutProps> = ({ book, page, chapter, readOnly = false }) => {
    // 如果存在自定义的 V2 画布页面且有内容元素，则通过动态画布引擎渲染
    if (page && Array.isArray(page.elements) && page.elements.length > 0) {
        return (
            <div className="w-full h-full relative overflow-hidden select-none">
                {/* 精装书壳左侧铰链折痕与书背阴影模拟 */}
                {readOnly && (
                    <>
                        <div className="absolute left-[14px] inset-y-0 w-[5px] bg-gradient-to-r from-black/15 via-transparent to-white/10 pointer-events-none z-[25]" />
                        <div className="absolute left-0 inset-y-0 w-[14px] bg-gradient-to-r from-black/[0.12] via-black/[0.04] to-transparent pointer-events-none z-[25]" />
                        <div className="absolute left-0 inset-y-0 w-[2px] bg-black/15 pointer-events-none z-[25]" />
                        
                        <div className="absolute inset-y-0 right-0 w-[3px] bg-black/10 pointer-events-none z-[25]" />
                        <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10 pointer-events-none z-[25]" />
                        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/15 pointer-events-none z-[25]" />
                    </>
                )}
                <DynamicLayoutRenderer 
                    chapter={chapter || { id: page.id, title: '', date: '', pages: [page] }} 
                    page={page} 
                    readOnly={readOnly} 
                />
            </div>
        );
    }

    // 检测是否为物理生成的 WebP 整图封面（如 uploads 目录下的图片或 .webp 后缀图），直接渲染整图
    const isPhysicalCover = book.coverUrl && 
        !book.coverUrl.startsWith('design://') && 
        (
            book.coverUrl.includes('/cover.webp') || 
            book.coverUrl.toLowerCase().endsWith('.webp') ||
            book.coverUrl.includes('uploads/books/')
        );

    if (isPhysicalCover) {
        return (
            <div className="w-full h-full relative overflow-hidden select-none">
                {/* 精装书壳左侧铰链折痕与书背阴影模拟 */}
                {readOnly && (
                    <>
                        <div className="absolute left-[14px] inset-y-0 w-[5px] bg-gradient-to-r from-black/15 via-transparent to-white/10 pointer-events-none z-[25]" />
                        <div className="absolute left-0 inset-y-0 w-[14px] bg-gradient-to-r from-black/[0.12] via-black/[0.04] to-transparent pointer-events-none z-[25]" />
                        <div className="absolute left-0 inset-y-0 w-[2px] bg-black/15 pointer-events-none z-[25]" />
                        
                        <div className="absolute inset-y-0 right-0 w-[3px] bg-black/10 pointer-events-none z-[25]" />
                        <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10 pointer-events-none z-[25]" />
                        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/15 pointer-events-none z-[25]" />
                    </>
                )}
                <img 
                    src={book.coverUrl} 
                    alt={book.title} 
                    className="w-full h-full object-cover"
                />
            </div>
        );
    }

    return (
        <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center select-none">
            {/* 精装书壳左侧铰链折痕与书背阴影模拟 */}
            {readOnly && (
                <>
                    <div className="absolute left-[14px] inset-y-0 w-[5px] bg-gradient-to-r from-black/15 via-transparent to-white/10 pointer-events-none z-[25]" />
                    <div className="absolute left-0 inset-y-0 w-[14px] bg-gradient-to-r from-black/[0.12] via-black/[0.04] to-transparent pointer-events-none z-[25]" />
                    <div className="absolute left-0 inset-y-0 w-[2px] bg-black/15 pointer-events-none z-[25]" />
                    
                    <div className="absolute inset-y-0 right-0 w-[3px] bg-black/10 pointer-events-none z-[25]" />
                    <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10 pointer-events-none z-[25]" />
                    <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/15 pointer-events-none z-[25]" />
                </>
            )}

            <GeneratedCover
                title={book.title}
                author={book.author || ''}
                coverUrl={book.coverUrl}
                mode="full"
            />
        </div>
    );
};
