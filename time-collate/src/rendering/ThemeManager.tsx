import React, { createContext, useContext, type ReactNode } from 'react';
import { useBookStore } from '../store';

export type ThemeType = 'classic' | 'modern' | 'warm' | 'magazine';

// #region 主题配置接口
interface ThemeConfig {
    /** 字体 */
    fontFamily: string;
    /** 主色 */
    primaryColor: string;
    /** 次要色 */
    secondaryColor: string;
    /** 强调色 */
    accentColor: string;
    /** 背景色 */
    backgroundColor: string;
    /** 边框色 */
    borderColor: string;
    /** 渐变背景（可选） */
    backgroundGradient?: string;
    /** 标题样式 */
    titleStyle: {
        fontWeight: string;
        letterSpacing: string;
        textTransform?: string;
    };
    /** 主题描述 */
    description: string;
    /** 装饰元素配置 */
    decorations: ThemeDecoration[];
}

/** 装饰元素配置 */
interface ThemeDecoration {
    /** 装饰类型 */
    type: 'svg' | 'emoji' | 'shape';
    /** 内容（SVG 路径或 emoji） */
    content: string;
    /** 位置 */
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'random';
    /** 大小 */
    size: string;
    /** 透明度（0-1） */
    opacity: number;
    /** 旋转角度 */
    rotation?: number;
}
// #endregion

// #region 主题装饰 SVG
const DECORATIONS = {
    // 经典主题 - 优雅的书法装饰
    classic: {
        flourish: `<svg viewBox="0 0 200 100" fill="currentColor"><path d="M10,50 Q50,10 100,50 T190,50" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="100" cy="50" r="5"/></svg>`,
        corner: `<svg viewBox="0 0 100 100" fill="currentColor"><path d="M0,100 Q0,0 100,0" stroke="currentColor" stroke-width="3" fill="none"/><circle cx="90" cy="10" r="4"/></svg>`,
        divider: `<svg viewBox="0 0 200 20" fill="currentColor"><line x1="0" y1="10" x2="80" y2="10" stroke="currentColor" stroke-width="1"/><circle cx="100" cy="10" r="3"/><line x1="120" y1="10" x2="200" y2="10" stroke="currentColor" stroke-width="1"/></svg>`,
    },
    // 现代主题 - 几何图形
    modern: {
        grid: `<svg viewBox="0 0 100 100" fill="none"><rect x="10" y="10" width="80" height="80" stroke="currentColor" stroke-width="1"/><rect x="30" y="30" width="40" height="40" stroke="currentColor" stroke-width="1"/></svg>`,
        circle: `<svg viewBox="0 0 100 100" fill="none"><circle cx="50" cy="50" r="45" stroke="currentColor" stroke-width="1"/><circle cx="50" cy="50" r="25" stroke="currentColor" stroke-width="1"/></svg>`,
        lines: `<svg viewBox="0 0 100 100" fill="none"><line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" stroke-width="1"/><line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" stroke-width="1"/><line x1="0" y1="80" x2="100" y2="80" stroke="currentColor" stroke-width="1"/></svg>`,
    },
    // 温馨主题 - 可爱的手绘风
    warm: {
        heart: `<svg viewBox="0 0 100 100" fill="currentColor"><path d="M50,90 C20,60 0,40 25,20 C40,10 50,25 50,25 C50,25 60,10 75,20 C100,40 80,60 50,90Z"/></svg>`,
        star: `<svg viewBox="0 0 100 100" fill="currentColor"><polygon points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40"/></svg>`,
        flower: `<svg viewBox="0 0 100 100" fill="currentColor"><circle cx="50" cy="50" r="10"/><ellipse cx="50" cy="25" rx="12" ry="20"/><ellipse cx="50" cy="75" rx="12" ry="20"/><ellipse cx="25" cy="50" rx="20" ry="12"/><ellipse cx="75" cy="50" rx="20" ry="12"/></svg>`,
        cloud: `<svg viewBox="0 0 100 60" fill="currentColor"><ellipse cx="30" cy="40" rx="25" ry="18"/><ellipse cx="50" cy="30" rx="20" ry="15"/><ellipse cx="70" cy="40" rx="28" ry="20"/></svg>`,
    },
    // 杂志主题 - 大胆的图形
    magazine: {
        bolt: `<svg viewBox="0 0 100 100" fill="currentColor"><polygon points="60,5 25,50 45,50 40,95 75,50 55,50"/></svg>`,
        triangle: `<svg viewBox="0 0 100 100" fill="currentColor"><polygon points="50,10 90,90 10,90"/></svg>`,
        splash: `<svg viewBox="0 0 100 100" fill="currentColor"><path d="M50,10 L60,40 L90,35 L70,55 L85,85 L50,70 L15,85 L30,55 L10,35 L40,40 Z"/></svg>`,
    },
};
// #endregion

// #region 主题配置
const THEMES: Record<ThemeType, ThemeConfig> = {
    classic: {
        fontFamily: '"Noto Serif SC", "Playfair Display", Georgia, serif',
        primaryColor: '#2C2C2C',
        secondaryColor: '#5A5A5A',
        accentColor: '#B8860B', // 金色
        backgroundColor: '#FFFEF8',
        backgroundGradient: 'linear-gradient(135deg, #FFFEF8 0%, #FFF8E7 100%)',
        borderColor: '#D4C4A8',
        titleStyle: {
            fontWeight: '600',
            letterSpacing: '0.05em',
        },
        description: '经典雅致',
        decorations: [
            { type: 'svg', content: DECORATIONS.classic.corner, position: 'top-left', size: '80px', opacity: 0.15, rotation: 0 },
            { type: 'svg', content: DECORATIONS.classic.corner, position: 'top-right', size: '80px', opacity: 0.15, rotation: 90 },
            { type: 'svg', content: DECORATIONS.classic.corner, position: 'bottom-left', size: '80px', opacity: 0.15, rotation: -90 },
            { type: 'svg', content: DECORATIONS.classic.corner, position: 'bottom-right', size: '80px', opacity: 0.15, rotation: 180 },
            { type: 'svg', content: DECORATIONS.classic.flourish, position: 'center', size: '200px', opacity: 0.08, rotation: 0 },
        ],
    },
    modern: {
        fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
        primaryColor: '#111827',
        secondaryColor: '#4B5563',
        accentColor: '#2563EB', // 蓝色
        backgroundColor: '#FFFFFF',
        backgroundGradient: 'linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 100%)',
        borderColor: '#E5E7EB',
        titleStyle: {
            fontWeight: '700',
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
        },
        description: '现代简约',
        decorations: [
            { type: 'svg', content: DECORATIONS.modern.grid, position: 'top-right', size: '150px', opacity: 0.1, rotation: 0 },
            { type: 'svg', content: DECORATIONS.modern.circle, position: 'bottom-left', size: '120px', opacity: 0.08, rotation: 0 },
            { type: 'svg', content: DECORATIONS.modern.lines, position: 'top-left', size: '100px', opacity: 0.12, rotation: 45 },
        ],
    },
    warm: {
        fontFamily: '"Ma Shan Zheng", "ZCOOL XiaoWei", cursive',
        primaryColor: '#5D4037',
        secondaryColor: '#8D6E63',
        accentColor: '#FF6B35', // 暖橙色
        backgroundColor: '#FFF9F0',
        backgroundGradient: 'linear-gradient(135deg, #FFF9F0 0%, #FFE8D6 50%, #FFDAB9 100%)',
        borderColor: '#FFCBA4',
        titleStyle: {
            fontWeight: '400',
            letterSpacing: '0.1em',
        },
        description: '温馨时光',
        decorations: [
            { type: 'svg', content: DECORATIONS.warm.heart, position: 'top-right', size: '80px', opacity: 0.2, rotation: 0 },
            { type: 'svg', content: DECORATIONS.warm.star, position: 'top-left', size: '60px', opacity: 0.15, rotation: 15 },
            { type: 'svg', content: DECORATIONS.warm.flower, position: 'bottom-right', size: '90px', opacity: 0.15, rotation: -10 },
            { type: 'svg', content: DECORATIONS.warm.cloud, position: 'bottom-left', size: '100px', opacity: 0.12, rotation: 0 },
            { type: 'svg', content: DECORATIONS.warm.flower, position: 'top-right', size: '48px', opacity: 0.3, rotation: 20 },
            { type: 'svg', content: DECORATIONS.warm.star, position: 'bottom-left', size: '36px', opacity: 0.25, rotation: 0 },
        ],
    },
    magazine: {
        fontFamily: '"Oswald", "Bebas Neue", Impact, sans-serif',
        primaryColor: '#DC2626', // 大红
        secondaryColor: '#1F2937',
        accentColor: '#FBBF24', // 金黄
        backgroundColor: '#FAFAFA',
        backgroundGradient: 'linear-gradient(135deg, #FAFAFA 0%, #F5F5F5 100%)',
        borderColor: '#E5E5E5',
        titleStyle: {
            fontWeight: '900',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
        },
        description: '时尚杂志',
        decorations: [
            { type: 'svg', content: DECORATIONS.magazine.bolt, position: 'top-right', size: '100px', opacity: 0.15, rotation: -15 },
            { type: 'svg', content: DECORATIONS.magazine.triangle, position: 'bottom-left', size: '120px', opacity: 0.12, rotation: 0 },
            { type: 'svg', content: DECORATIONS.magazine.splash, position: 'top-left', size: '110px', opacity: 0.1, rotation: 45 },
        ],
    },
};
// #endregion

// #region Context
interface ThemeContextType {
    theme: string;
    config: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
// #endregion

// #region ThemeProvider
export const ThemeProvider: React.FC<{ theme: string; children: ReactNode }> = ({ theme, children }) => {
    // 优先匹配内置主题
    let config = THEMES[theme as ThemeType];

    // 如果未匹配中内置主题，尝试从数据库加载的主题列表中匹配
    if (!config) {
        const customThemes = useBookStore.getState().themes || [];
        const found = customThemes.find(t => t.id === theme);
        if (found && found.themeSchema) {
            config = found.themeSchema;
        }
    }

    // 回退到经典雅致主题
    if (!config) {
        config = THEMES.classic;
    }

    return (
        <ThemeContext.Provider value={{ theme, config }}>
            <div
                style={{
                    '--theme-font': config.fontFamily,
                    '--theme-primary': config.primaryColor,
                    '--theme-secondary': config.secondaryColor,
                    '--theme-accent': config.accentColor,
                    '--theme-bg': config.backgroundColor,
                    '--theme-bg-gradient': config.backgroundGradient || config.backgroundColor,
                    '--theme-border': config.borderColor,
                    '--theme-title-weight': config.titleStyle.fontWeight,
                    '--theme-title-spacing': config.titleStyle.letterSpacing,
                } as React.CSSProperties}
                className="h-full w-full"
            >
                {children}
            </div>
        </ThemeContext.Provider>
    );
};
// #endregion

// #region useTheme Hook
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        // Zero-trust defensive fallback to prevent crashing when rendered outside of ThemeProvider
        return {
            theme: 'classic',
            config: THEMES.classic
        };
    }
    return context;
};
// #endregion

// #region 主题装饰组件
interface ThemeDecorationsProps {
    /** 装饰层叠加在哪个位置 */
    className?: string;
}

/**
 * @description 主题装饰层组件
 * 根据当前主题渲染装饰性元素，透明度高不影响内容
 */
export const ThemeDecorations: React.FC<ThemeDecorationsProps> = ({ className = '' }) => {
    const { config } = useTheme();

    const getPositionStyle = (position: ThemeDecoration['position']): React.CSSProperties => {
        switch (position) {
            case 'top-left':
                return { top: '15mm', left: '15mm' };
            case 'top-right':
                return { top: '15mm', right: '15mm' };
            case 'bottom-left':
                return { bottom: '25mm', left: '15mm' };
            case 'bottom-right':
                return { bottom: '25mm', right: '15mm' };
            case 'center':
                return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
            default:
                return {};
        }
    };

    return (
        <div className={`absolute inset-0 pointer-events-none overflow-hidden z-[150] ${className}`}>
            {config.decorations.map((decoration, index) => {
                const positionStyle = getPositionStyle(decoration.position);
                const rotateStyle = decoration.rotation ? `rotate(${decoration.rotation}deg)` : '';

                if (decoration.type === 'emoji') {
                    return (
                        <div
                            key={index}
                            className="absolute select-none"
                            style={{
                                ...positionStyle,
                                fontSize: decoration.size,
                                opacity: decoration.opacity,
                                transform: `${positionStyle.transform || ''} ${rotateStyle}`.trim(),
                            }}
                        >
                            {decoration.content}
                        </div>
                    );
                }

                // SVG 类型
                return (
                    <div
                        key={index}
                        className="absolute"
                        style={{
                            ...positionStyle,
                            width: decoration.size,
                            height: decoration.size,
                            opacity: decoration.opacity,
                            color: config.accentColor,
                            transform: `${positionStyle.transform || ''} ${rotateStyle}`.trim(),
                        }}
                        dangerouslySetInnerHTML={{ __html: decoration.content }}
                    />
                );
            })}
        </div>
    );
};
// #endregion

// #region 导出主题列表（供下拉选择）
export const THEME_OPTIONS: { value: ThemeType; label: string }[] = [
    { value: 'classic', label: '经典雅致 (Classic)' },
    { value: 'modern', label: '现代简约 (Modern)' },
    { value: 'warm', label: '温馨时光 (Warm)' },
    { value: 'magazine', label: '时尚杂志 (Magazine)' },
];
// #endregion
