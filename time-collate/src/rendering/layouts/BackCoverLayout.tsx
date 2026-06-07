import React from 'react';
import type { Book } from '../../types';
import { buildCoverConfig } from '../book-cover-engine/coverHelper';

interface BackCoverLayoutProps {
    book?: Book;
}

/**
 * @description 封底布局 - 画布同源纯展示组件 (100% 视觉对齐)
 */
export const BackCoverLayout: React.FC<BackCoverLayoutProps> = ({ book }) => {
    // 1. 如果没有传入 book 实例，使用默认的极简底纹
    const config = book ? buildCoverConfig(book) : null;
    const bgValue = config ? config.backCover.background.value : 'var(--theme-bg, #FAF8E7)';
    
    const accentColor = config ? config.backCover.elements[0]?.style.color || 'var(--theme-accent)' : 'var(--theme-accent)';
    const textColor = config ? config.backCover.elements[1]?.style.color || 'var(--theme-primary)' : 'var(--theme-primary)';
    const subColor = config ? config.backCover.elements[3]?.style.color || 'var(--theme-border)' : 'var(--theme-border)';

    return (
        <div 
            className="w-full h-full p-[25mm] relative overflow-hidden flex flex-col items-center justify-center text-center select-none"
            style={{ backgroundColor: bgValue }}
        >
            {/* 精装书壳右侧铰链折痕与书背阴影模拟 */}
            <>
                <div className="absolute right-[14px] inset-y-0 w-[5px] bg-gradient-to-l from-black/15 via-transparent to-white/10 pointer-events-none z-[25]" />
                <div className="absolute right-0 inset-y-0 w-[14px] bg-gradient-to-l from-black/[0.12] via-black/[0.04] to-transparent pointer-events-none z-[25]" />
                <div className="absolute right-0 inset-y-0 w-[2px] bg-black/15 pointer-events-none z-[25]" />
                
                <div className="absolute inset-y-0 left-0 w-[3px] bg-black/10 pointer-events-none z-[25]" />
                <div className="absolute inset-x-0 top-0 h-[3px] bg-white/10 pointer-events-none z-[25]" />
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/15 pointer-events-none z-[25]" />
            </>

            {/* 背景装饰：极淡的圆形弧线，象征圆满或循环 */}
            <div className="absolute inset-0 border-[80mm] border-[var(--theme-accent)] opacity-[0.02] rounded-full translate-x-[20%] translate-y-[20%] pointer-events-none" />

            <div className="relative z-10 space-y-12 flex flex-col items-center">
                {/* 装饰图标：三个点，象征未完待续 */}
                <div className="flex justify-center gap-3 mb-6 opacity-25">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
                </div>

                <div className="space-y-6">
                    <p
                        className="text-[18pt] font-light tracking-[0.3em] leading-relaxed"
                        style={{
                            color: textColor,
                            fontFamily: 'var(--theme-font)'
                        }}
                    >
                        我们的故事
                    </p>
                    <p
                        className="text-[22pt] font-bold tracking-[0.5em]"
                        style={{
                            color: accentColor,
                            fontFamily: 'var(--theme-font)'
                        }}
                    >
                        还没有结束...
                    </p>
                </div>

                <div className="pt-12 flex flex-col items-center gap-4">
                    <div className="w-8 h-px" style={{ backgroundColor: subColor }} />
                    <span className="text-[7pt] tracking-[0.8em] uppercase" style={{ color: '#D1D5DB' }}>
                        To Be Continued
                    </span>
                </div>
            </div>

            {/* 极简底部标识 */}
            <div className="absolute bottom-12 text-[8pt] tracking-widest font-light" style={{ color: '#E5E7EB' }}>
                Created with TimeCollate
            </div>
        </div>
    );
};
