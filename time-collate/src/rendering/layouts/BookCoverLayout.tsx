import React from 'react';
import type { Book } from '../../types';
import { GeneratedCover } from '../../features/editor/components/GeneratedCover';

interface BookCoverLayoutProps {
    book: Book;
    readOnly?: boolean;
}

/**
 * @description 书籍总封面排版 - 画布同源纯展示组件 (WYSIWYG 100% 对齐)
 * 已彻底收拢，不论是自设计封面还是物理图片封面，统统交由统一的 GeneratedCover 组件呈现。
 */
export const BookCoverLayout: React.FC<BookCoverLayoutProps> = ({ book, readOnly = false }) => {
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
