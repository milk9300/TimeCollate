import React from 'react';
import type { Book } from '../../types';
import { buildCoverConfig } from '../book-cover-engine/coverHelper';
import { useBookStore } from '../../store';
import logoImg from '../../assets/logo.png';

interface BackCoverLayoutProps {
    book?: Book;
}

/**
 * 判断十六进制颜色是否为暗色
 */
const isDarkColor = (color: string): boolean => {
    if (!color) return false;
    let hex = color.trim();
    
    // 处理 CSS 变量提取 (例如 var(--theme-bg, #FAF8E7))
    if (hex.startsWith('var(')) {
        const matches = hex.match(/#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})/);
        if (matches) {
            hex = matches[0];
        } else {
            return false;
        }
    }
    
    if (hex.startsWith('#')) {
        hex = hex.slice(1);
    } else {
        return false;
    }
    
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
    } else {
        return false;
    }
    
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 140; // 亮度小于 140 视为暗色背景
};

/**
 * @description 封底布局 - 画布同源纯展示组件 (100% 视觉对齐)
 * 自动根据封面主题及书籍属性（作者、印制发布时间）渲染
 */
export const BackCoverLayout: React.FC<BackCoverLayoutProps> = ({ book }) => {
    // 优先从 Zustand Store 中读取正在编辑的封面文档（支持编辑器内背景色实时同步）
    const storeCoverDoc = useBookStore(state => state.documents?.find(d => d.type === 'cover'));

    // 1. 获取封面页实例并提取其背景色，实现封底背景色与封面 100% 同源
    const coverPage = React.useMemo(() => {
        if (storeCoverDoc) {
            return {
                id: storeCoverDoc.id,
                background: storeCoverDoc.background,
                elements: storeCoverDoc.elements,
                pageType: 'cover'
            };
        }
        if (!book || !book.pages) return null;
        return book.pages.find(p => p.pageType === 'cover') || null;
    }, [book, storeCoverDoc]);

    const config = book ? buildCoverConfig(book) : null;

    // 2. 确定封底背景色：优先从封面页 background.color 读取，若无则降级使用主题默认配置
    const bgValue = React.useMemo(() => {
        if (coverPage?.background?.color) {
            return coverPage.background.color;
        }
        return config ? config.backCover.background.value : 'var(--theme-bg, #FAF8E7)';
    }, [coverPage, config]);

    const isDark = React.useMemo(() => isDarkColor(bgValue), [bgValue]);

    // 3. 提取封面中的文字颜色，使封底排版配色完美匹配封面的自定义色彩
    const coverTextColors = React.useMemo(() => {
        if (!coverPage || !coverPage.elements) return null;
        const titleEl = coverPage.elements.find(el => el.role === 'cover-title') as any;
        const authorEl = coverPage.elements.find(el => el.role === 'cover-author') as any;
        return {
            titleColor: titleEl?.textConfig?.color || null,
            authorColor: authorEl?.textConfig?.color || null
        };
    }, [coverPage]);

    // 4. 根据背景明暗与封面文字色动态适配封底文本配色，保障易读度与高级感
    const textColor = React.useMemo(() => {
        if (coverTextColors?.authorColor) return coverTextColors.authorColor;
        if (coverTextColors?.titleColor) return coverTextColors.titleColor;
        return isDark ? '#FAF8E7' : '#1F2937';
    }, [coverTextColors, isDark]);

    const accentColor = React.useMemo(() => {
        if (coverTextColors?.titleColor) return coverTextColors.titleColor;
        return isDark ? '#C08A3E' : '#4F46E5';
    }, [coverTextColors, isDark]);

    const subColor = React.useMemo(() => {
        return isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)';
    }, [isDark]);

    // 格式化发布时间为中文年月日
    const publishDate = React.useMemo(() => {
        if (!book) return new Date().toLocaleDateString('zh-CN');
        const d = book.createdAt ? new Date(book.createdAt) : new Date();
        return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
    }, [book]);

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

            {/* 背景装饰：极淡的圆形弧线 */}
            <div className="absolute inset-0 border-[80mm] border-[var(--theme-accent)] opacity-[0.02] rounded-full translate-x-[20%] translate-y-[20%] pointer-events-none" />

            <div className="relative z-10 space-y-12 flex flex-col items-center">
                {/* 1. 项目 Logo 与产品理念 */}
                <div className="flex flex-col items-center gap-4">
                    <img 
                        src={logoImg} 
                        alt="拾光集 Logo" 
                        className="w-16 h-16 object-contain opacity-75 filter grayscale-[20%]"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    <div className="space-y-3 mt-3">
                        <p 
                            className="text-[11pt] tracking-[0.4em] font-semibold opacity-70 uppercase font-mono"
                            style={{ color: textColor }}
                        >
                            TimeCollate • 拾光集
                        </p>
                        <p 
                            className="text-[17pt] font-medium tracking-[0.2em] leading-relaxed"
                            style={{ color: accentColor, fontFamily: 'var(--theme-font)' }}
                        >
                            “ 将岁月的温度，装订成一本精致的物理手账 ”
                        </p>
                    </div>
                </div>

                {/* 分割线 */}
                <div className="w-12 h-px opacity-30" style={{ backgroundColor: subColor }} />

                {/* 2. 作品作者及印制时间 */}
                {book && (
                    <div className="space-y-3 mt-6 text-[13pt] font-light tracking-[0.15em] opacity-85">
                        <p style={{ color: textColor, fontFamily: 'var(--theme-font)' }}>
                            <span className="opacity-60">著 / </span>
                            <span className="font-semibold">{book.author || '未署名'}</span>
                        </p>
                        <p style={{ color: textColor, fontFamily: 'var(--theme-font)' }} className="text-[11pt]">
                            <span className="opacity-60">印制时间 / </span>
                            <span>{publishDate}</span>
                        </p>
                    </div>
                )}

                {/* 3. 未完待续标识 */}
                <div className="pt-8 flex flex-col items-center gap-4">
                    <div className="w-8 h-px opacity-25" style={{ backgroundColor: subColor }} />
                    <span className="text-[9pt] tracking-[0.6em] uppercase opacity-45 font-mono" style={{ color: textColor }}>
                        TO BE CONTINUED
                    </span>
                </div>
            </div>

            {/* 极简底部声明 */}
            <div className="absolute bottom-12 text-[8pt] tracking-widest font-light opacity-35 font-mono" style={{ color: textColor }}>
                Powered by TimeCollate Studio
            </div>
        </div>
    );
};
