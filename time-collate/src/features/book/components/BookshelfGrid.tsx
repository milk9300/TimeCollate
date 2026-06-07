import React from 'react';

// #region 样式与常量定义
interface ShelfStyle {
    top: string;
    front: string;
    shadow: string;
}

const shelfStyles: Record<'walnut' | 'oak' | 'glass', ShelfStyle> = {
    walnut: {
        top: 'h-2 bg-gradient-to-r from-[#8C6239] via-[#A67C52] to-[#8C6239] border-t border-[#D9A066]/20 rounded-t-[1px]',
        front: 'h-3.5 bg-gradient-to-r from-[#5C3A21] via-[#734A26] to-[#5C3A21] border-t border-[#A67C52]/20 shadow-[0_6px_12px_rgba(0,0,0,0.35)]',
        shadow: 'absolute top-full left-0 right-0 h-10 bg-gradient-to-b from-black/35 via-black/10 to-transparent pointer-events-none'
    },
    oak: {
        top: 'h-2 bg-gradient-to-r from-[#E6C280] via-[#F5D79E] to-[#E6C280] border-t border-white/20 rounded-t-[1px]',
        front: 'h-3.5 bg-gradient-to-r from-[#B8860B] via-[#CD853F] to-[#B8860B] border-t border-[#E6C280]/20 shadow-[0_6px_10px_rgba(139,92,26,0.18)]',
        shadow: 'absolute top-full left-0 right-0 h-8 bg-gradient-to-b from-amber-900/15 via-amber-950/5 to-transparent pointer-events-none'
    },
    glass: {
        top: 'h-2 bg-white/20 backdrop-blur-md border-t border-white/30 rounded-t-[2px]',
        front: 'h-3 bg-white/10 backdrop-blur-md border-t border-white/20 border-b border-black/10 shadow-[0_4px_12px_rgba(255,255,255,0.05)]',
        shadow: 'absolute top-full left-0 right-0 h-12 bg-gradient-to-b from-indigo-500/12 via-indigo-500/3 to-transparent pointer-events-none shadow-[0_12px_24px_rgba(99,102,241,0.15)]'
    }
};
// #endregion

interface BookshelfGridProps {
    children: React.ReactNode;
    theme?: 'walnut' | 'oak' | 'glass';
    gap?: number;      // 水平网格列间距 (px)
    rowGap?: number;   // 垂直网格行间距 (px)
    colsClass?: string; // 响应式网格列定义 (e.g. grid-cols-2 md:grid-cols-3)
}

/**
 * @description 3D 拟物化/现代书架布局包裹网格组件
 * 书架横梁在网格单元层级渲染（绝对定位），确保同一行所有卡片共享统一的水平书架线
 */
export const BookshelfGrid: React.FC<BookshelfGridProps> = ({
    children,
    theme = 'walnut',
    gap = 32,
    rowGap = 64,
    colsClass = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
}) => {
    // 过滤出有效的子节点，防止空渲染干扰布局
    const validChildren = React.Children.toArray(children).filter(Boolean);

    return (
        <div 
            className={`w-full ${colsClass}`}
            style={{
                columnGap: `${gap}px`,
                rowGap: `${rowGap}px`,
                paddingBottom: '40px' // 为最底一排书架的下垂阴影预留呼吸空间
            }}
        >
            {validChildren.map((child, index) => {
                return (
                    <div 
                        key={index}
                        className="relative flex flex-col justify-end pt-4 pb-[22px] animate-in fade-in slide-in-from-bottom-6 duration-500"
                        style={{
                            // 延时交错入场动画效果
                            animationDelay: `${index * 80}ms`
                        }}
                    >
                        {/* 书卡容器层 (位于书架上方) */}
                        <div className="relative z-20 w-full">
                            {child}
                        </div>

                        {/* 单书格拼接书架层 (z-index 10) - 绝对定位在单元格底部 */}
                        <div 
                            className="absolute bottom-0 z-10 pointer-events-none flex flex-col w-auto select-none"
                            style={{
                                left: `-${gap / 2}px`,
                                right: `-${gap / 2}px`,
                            }}
                        >
                            {/* 书架顶面 */}
                            <div className={shelfStyles[theme].top} />
                            {/* 书架正面 */}
                            <div className={shelfStyles[theme].front} />
                            {/* 下垂投影 */}
                            <div className={shelfStyles[theme].shadow} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
