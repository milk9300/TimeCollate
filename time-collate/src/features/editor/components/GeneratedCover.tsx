import React, { useMemo } from 'react';

// #region 配置与常量定义

export interface BackgroundConfig {
    id: string;
    name: string;
    value: string; // CSS background 值 (可以是十六进制颜色或 linear-gradient)
    textColor: string; // 适配的主文字颜色
    accentColor: string; // 适配的强调色
    subColor: string; // 次要文字颜色
}

export const COVER_PRESET_BACKGROUNDS: BackgroundConfig[] = [
    { 
        id: 'cotton-white', 
        name: '棉麻暖白', 
        value: '#FAF8E7', 
        textColor: '#3A2E2B', 
        accentColor: '#C08A3E', 
        subColor: '#8C7A76' 
    },
    { 
        id: 'slate-blue', 
        name: '雅致石蓝', 
        value: '#1E293B', 
        textColor: '#F8FAFC', 
        accentColor: '#38BDF8', 
        subColor: '#94A3B8' 
    },
    { 
        id: 'forest-green', 
        name: '深林古绿', 
        value: '#1A332B', 
        textColor: '#ECFDF5', 
        accentColor: '#34D399', 
        subColor: '#A7F3D0' 
    },
    { 
        id: 'vintage-red', 
        name: '复古书红', 
        value: '#6B1D1D', 
        textColor: '#FEF2F2', 
        accentColor: '#FCA5A5', 
        subColor: '#FCA5A5' 
    },
    { 
        id: 'peach-summer', 
        name: '蜜桃初夏', 
        value: 'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)', 
        textColor: '#3A151D', 
        accentColor: '#D946EF', 
        subColor: '#6B21A8' 
    },
    { 
        id: 'aurora-violet', 
        name: '极光幽紫', 
        value: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)', 
        textColor: '#FFFFFF', 
        accentColor: '#F59E0B', 
        subColor: '#E0E7FF' 
    },
    { 
        id: 'glacier-mist', 
        name: '冰川雾霭', 
        value: 'linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%)', 
        textColor: '#1E293B', 
        accentColor: '#4F46E5', 
        subColor: '#475569' 
    },
    { 
        id: 'sunset-orange', 
        name: '夕阳流云', 
        value: 'linear-gradient(135deg, #F6D365 0%, #FDA085 100%)', 
        textColor: '#3C1B10', 
        accentColor: '#E11D48', 
        subColor: '#9F1239' 
    },
];

export const COVER_PRESET_LAYOUTS = [
    { id: 'classic', name: '经典精装' },
    { id: 'minimal', name: '大字极简' },
    { id: 'modern', name: '现代主义' },
    { id: 'art', name: '几何艺术' },
];

export interface CoverDesignParsed {
    isDesign: boolean;
    layout: 'classic' | 'minimal' | 'modern' | 'art';
    bgId: string;
    bgValue: string;
    textColor: string;
    accentColor: string;
    subColor: string;
    image?: string;
    ossKey?: string;
}

/**
 * 解析统一的 design:// 封面配置协议，支持物理图片作为其中一个配置项融入设计
 */
export function parseCoverUrl(coverUrl: string | undefined, title: string): CoverDesignParsed {
    if (!coverUrl) {
        // 兜底哈希路由分配
        const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const defaultBg = COVER_PRESET_BACKGROUNDS[hash % COVER_PRESET_BACKGROUNDS.length];
        const layouts: Array<'classic' | 'minimal' | 'modern' | 'art'> = ['classic', 'minimal', 'modern', 'art'];
        const defaultLayout = layouts[hash % layouts.length];
        return {
            isDesign: true,
            layout: defaultLayout,
            bgId: defaultBg.id,
            bgValue: defaultBg.value,
            textColor: defaultBg.textColor,
            accentColor: defaultBg.accentColor,
            subColor: defaultBg.subColor
        };
    }

    // 后向兼容：如果是一个普通的物理图片 URL 链接 (非 design://)
    if (!coverUrl.startsWith('design://')) {
        return {
            isDesign: true,
            layout: 'classic',
            bgId: 'cotton-white',
            bgValue: COVER_PRESET_BACKGROUNDS[0].value,
            textColor: COVER_PRESET_BACKGROUNDS[0].textColor,
            accentColor: COVER_PRESET_BACKGROUNDS[0].accentColor,
            subColor: COVER_PRESET_BACKGROUNDS[0].subColor,
            image: coverUrl ? `${coverUrl}${coverUrl.includes('?') ? '&' : '?'}cors=1` : undefined,
            ossKey: ''
        };
    }

    try {
        const queryStr = coverUrl.split('?')[1] || '';
        const params = new URLSearchParams(queryStr);
        const layout = (params.get('layout') || 'classic') as any;
        const bgId = params.get('bg') || 'cotton-white';
        const rawImage = params.get('image') ? decodeURIComponent(params.get('image')!) : undefined;
        const image = rawImage ? `${rawImage}${rawImage.includes('?') ? '&' : '?'}cors=1` : undefined;
        const ossKey = params.get('ossKey') ? decodeURIComponent(params.get('ossKey')!) : undefined;

        const bgConfig = COVER_PRESET_BACKGROUNDS.find(b => b.id === bgId) || COVER_PRESET_BACKGROUNDS[0];

        return {
            isDesign: true,
            layout,
            bgId,
            bgValue: bgConfig.value,
            textColor: bgConfig.textColor,
            accentColor: bgConfig.accentColor,
            subColor: bgConfig.subColor,
            image,
            ossKey
        };
    } catch (e) {
        return {
            isDesign: true,
            layout: 'classic',
            bgId: 'cotton-white',
            bgValue: COVER_PRESET_BACKGROUNDS[0].value,
            textColor: COVER_PRESET_BACKGROUNDS[0].textColor,
            accentColor: COVER_PRESET_BACKGROUNDS[0].accentColor,
            subColor: COVER_PRESET_BACKGROUNDS[0].subColor
        };
    }
}

// #endregion

interface GeneratedCoverProps {
    title: string;
    author: string;
    coverUrl?: string;
    mode?: 'card' | 'full'; // 'card' 为列表页3:4缩略卡片，'full' 为大册真实封皮
}

export const GeneratedCover: React.FC<GeneratedCoverProps> = ({
    title,
    author,
    coverUrl,
    mode = 'card',
}) => {
    // 1. 渲染解析
    const config = useMemo(() => parseCoverUrl(coverUrl, title), [coverUrl, title]);
    const displayTitle = title || '我的时光集';
    const displayAuthor = author || '时光记录者';

    // 2. 字体映射设置
    const titleFont = config.layout === 'classic' || config.layout === 'minimal' 
        ? '"Noto Serif SC", "Playfair Display", Georgia, serif'
        : '"Inter", "SF Pro Display", sans-serif';

    // 3. 基础渐变及背景样式组装
    const bgStyle: React.CSSProperties = {
        background: config.bgValue,
        color: config.textColor,
        fontFamily: titleFont,
    };

    // 4. 根据模式控制布局尺寸
    const containerClasses = mode === 'card'
        ? 'w-full h-full p-4 relative flex flex-col items-center justify-between overflow-hidden select-none border border-black/5 rounded-2xl shadow-sm'
        : 'w-full h-full p-[20mm] relative flex flex-col items-center justify-between overflow-hidden select-none';

    // ==========================================
    // 经典书本排版 (Classic)
    // ==========================================
    const renderClassic = () => {
        if (mode === 'card') {
            return (
                <div className="flex-1 w-full h-full border rounded-sm flex flex-col items-center justify-center p-3 relative" style={{ borderColor: `${config.textColor}20` }}>
                    {/* 内层极细线 */}
                    <div className="absolute inset-1.5 border opacity-30" style={{ borderColor: `${config.textColor}15` }} />
                    {/* 古典护角 */}
                    <div className="absolute top-2 left-2 w-2 h-2 border-t border-l opacity-40" style={{ borderColor: config.textColor }} />
                    <div className="absolute top-2 right-2 w-2 h-2 border-t border-r opacity-40" style={{ borderColor: config.textColor }} />
                    <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l opacity-40" style={{ borderColor: config.textColor }} />
                    <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r opacity-40" style={{ borderColor: config.textColor }} />
                    
                    {config.image ? (
                        // 有配图：三层装裱卡纸相框
                        <div className="flex flex-col items-center justify-between w-full h-full z-10 py-1">
                            <div className="relative w-[58%] aspect-[3/4] mt-1 shrink-0">
                                <div className="absolute inset-0 p-1 bg-white/90 backdrop-blur-[1px] shadow-md border border-black/5">
                                    <div className="w-full h-full p-1 bg-neutral-50 shadow-[inset_0_2px_5px_rgba(0,0,0,0.08)] border border-black/5">
                                        <div className="w-full h-full relative overflow-hidden">
                                            <img src={config.image} className="w-full h-full object-cover" crossOrigin="anonymous" alt="封面配图" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-center w-full mt-2">
                                <div className="w-5 h-0.5 mx-auto opacity-40 mb-1.5" style={{ backgroundColor: config.accentColor }} />
                                <h3 className="font-bold text-[10px] tracking-wide leading-tight line-clamp-2 font-serif" style={{ color: config.textColor }}>
                                    {displayTitle}
                                </h3>
                                <p className="text-[8px] opacity-75 font-serif uppercase tracking-widest truncate mt-0.5" style={{ color: config.accentColor }}>
                                    {displayAuthor}
                                </p>
                            </div>
                        </div>
                    ) : (
                        // 无配图：纯文字设计经典版 + 菱形星章
                        <div className="text-center space-y-3 z-10 max-w-[85%] flex flex-col items-center justify-center">
                            <div className="relative w-7 h-7 flex items-center justify-center opacity-70">
                                <div className="absolute w-4.5 h-4.5 border rotate-45" style={{ borderColor: config.accentColor }} />
                                <span className="text-[8px] z-10" style={{ color: config.accentColor }}>✦</span>
                            </div>
                            <h3 className="font-bold text-xs tracking-wide leading-snug line-clamp-3 font-serif" style={{ color: config.textColor }}>
                                {displayTitle}
                            </h3>
                            <div className="w-5 h-[0.5px] opacity-35" style={{ backgroundColor: config.textColor }} />
                            <p className="text-[8px] opacity-75 font-serif uppercase tracking-widest truncate" style={{ color: config.accentColor }}>
                                {displayAuthor}
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        // Full 物理版心排版
        return (
            <div className="flex-1 w-full h-full border rounded-[1mm] flex flex-col items-center justify-center p-[10mm] relative" style={{ borderColor: `${config.textColor}20` }}>
                {/* 双重嵌套内框 */}
                <div className="absolute inset-[4mm] border opacity-30" style={{ borderColor: `${config.textColor}15` }} />
                <div className="absolute top-[6mm] left-[6mm] w-8 h-8 border-t-[0.5mm] border-l-[0.5mm] opacity-40" style={{ borderColor: config.textColor }} />
                <div className="absolute top-[6mm] right-[6mm] w-8 h-8 border-t-[0.5mm] border-r-[0.5mm] opacity-40" style={{ borderColor: config.textColor }} />
                <div className="absolute bottom-[6mm] left-[6mm] w-8 h-8 border-b-[0.5mm] border-l-[0.5mm] opacity-40" style={{ borderColor: config.textColor }} />
                <div className="absolute bottom-[6mm] right-[6mm] w-8 h-8 border-b-[0.5mm] border-r-[0.5mm] opacity-40" style={{ borderColor: config.textColor }} />

                {config.image ? (
                    // 有配图：三层装裱卡纸大相框
                    <div className="flex flex-col items-center justify-center w-full h-full z-10">
                        <div className="relative w-[62%] aspect-[3/4] mb-8 shrink-0">
                            <div className="absolute inset-0 p-[4mm] bg-white shadow-2xl border border-black/5">
                                <div className="w-full h-full p-[3mm] bg-neutral-50 shadow-[inset_0_4px_10px_rgba(0,0,0,0.1)] border border-black/5">
                                    <div className="w-full h-full relative overflow-hidden">
                                        <img src={config.image} className="w-full h-full object-cover grayscale-[0.05]" crossOrigin="anonymous" alt="封面" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="text-center w-full max-w-[80%]">
                            <div className="w-12 h-1 bg-[var(--theme-accent)] mx-auto mb-5 opacity-60" style={{ backgroundColor: config.accentColor }} />
                            <h1 className="text-[34pt] font-black leading-[1.2] tracking-tight max-w-[90%] line-clamp-3 font-serif" style={{ color: config.textColor }}>
                                {displayTitle}
                            </h1>
                            <p className="text-[12pt] font-bold uppercase tracking-[0.5em] mt-3" style={{ color: config.accentColor }}>
                                {displayAuthor}
                            </p>
                        </div>
                    </div>
                ) : (
                    // 无配图：大字经典文字封面 + 古典菱形纹章
                    <div className="text-center space-y-6 z-10 max-w-[80%] flex flex-col items-center justify-center">
                        <div className="relative w-16 h-16 flex items-center justify-center opacity-85">
                            <div className="absolute w-10 h-10 border-[1.5px] rotate-45" style={{ borderColor: config.accentColor }} />
                            <div className="absolute w-8 h-8 border rotate-45 opacity-60" style={{ borderColor: config.accentColor }} />
                            <span className="text-[16px] z-10" style={{ color: config.accentColor }}>✦</span>
                        </div>
                        <h1 className="text-[32pt] font-black tracking-normal leading-tight font-serif" style={{ color: config.textColor }}>
                            {displayTitle}
                        </h1>
                        <div className="h-[0.5px] w-12 opacity-50" style={{ backgroundColor: config.textColor }} />
                        <p className="text-[12pt] font-bold uppercase tracking-[0.4em] font-serif" style={{ color: config.accentColor }}>
                            {displayAuthor}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    // ==========================================
    // 大字极简排版 (Minimal)
    // ==========================================
    const renderMinimal = () => {
        if (mode === 'card') {
            return (
                <div className="flex-1 w-full h-full flex flex-col justify-between py-4 px-3 relative">
                    <div className="opacity-40 text-[6.5px] tracking-[0.4em] uppercase text-left pl-2">MEMORIES ARCHIVE</div>
                    
                    {config.image ? (
                        // 有图：极简非对称 4:5 竖版插图
                        <>
                            <div className="relative w-[52%] aspect-[4/5] ml-2 shrink-0 my-2">
                                <div className="absolute inset-0 rounded-sm overflow-hidden shadow-md border border-black/5">
                                    <img src={config.image} className="w-full h-full object-cover" crossOrigin="anonymous" alt="封面" />
                                </div>
                            </div>
                            <div className="pl-2 pr-4 flex flex-col items-start text-left mt-1">
                                <h3 className="font-extrabold text-[11px] tracking-wide leading-snug line-clamp-2 font-serif" style={{ color: config.textColor }}>
                                    {displayTitle}
                                </h3>
                                <div className="w-10 h-[0.5px] my-2 opacity-30" style={{ backgroundColor: config.textColor }} />
                                <p className="text-[7.5px] font-medium opacity-80 uppercase tracking-widest truncate w-full">
                                    {displayAuthor}
                                </p>
                            </div>
                        </>
                    ) : (
                        // 无图：大面积留白极简
                        <>
                            <div className="my-auto py-2 flex flex-col items-center">
                                <h3 className="font-black text-xs tracking-widest leading-snug line-clamp-3 font-serif" style={{ color: config.textColor }}>
                                    {displayTitle}
                                </h3>
                                <div className="w-8 h-[0.5px] mt-4 opacity-40" style={{ backgroundColor: config.textColor }} />
                            </div>
                            <div className="pb-1 text-[7.5px] font-medium opacity-85 uppercase tracking-[0.3em] truncate text-center">
                                {displayAuthor}
                            </div>
                        </>
                    )}
                </div>
            );
        }

        return (
            <div className="flex-1 w-full h-full flex flex-col justify-between py-[16mm] px-[8mm] text-left relative">
                <div className="text-[9pt] font-light tracking-[0.6em] opacity-40 uppercase pl-[6mm]">CHRONICLE ARCHIVE</div>
                
                {config.image ? (
                    // 有图：4:5 独立艺术画报风格
                    <>
                        <div className="relative w-[48%] aspect-[4/5] ml-[6mm] shrink-0 my-[6mm]">
                            <div className="absolute inset-0 rounded-[2mm] overflow-hidden shadow-xl border border-black/5">
                                <img src={config.image} className="w-full h-full object-cover" crossOrigin="anonymous" alt="插图" />
                            </div>
                        </div>
                        <div className="pl-[6mm] pr-[12mm] space-y-4">
                            <h1 className="text-[28pt] font-black tracking-wide leading-tight font-serif" style={{ color: config.textColor }}>
                                {displayTitle}
                            </h1>
                            <div className="w-16 h-[0.5px]" style={{ backgroundColor: config.textColor, opacity: 0.3 }} />
                            <div className="space-y-1">
                                <p className="text-[11pt] font-bold uppercase tracking-[0.4em]" style={{ color: config.textColor }}>
                                    {displayAuthor}
                                </p>
                                <p className="text-[7pt] opacity-35 tracking-widest uppercase">ALL RIGHTS RESERVED</p>
                            </div>
                        </div>
                    </>
                ) : (
                    // 无图：极致大字留白
                    <>
                        <div className="my-auto space-y-8 flex flex-col items-center justify-center text-center">
                            <h1 className="text-[34pt] font-black tracking-widest leading-tight font-serif max-w-[85%]" style={{ color: config.textColor }}>
                                {displayTitle}
                            </h1>
                            <div className="w-16 h-[0.5px]" style={{ backgroundColor: config.textColor, opacity: 0.3 }} />
                        </div>
                        <div className="space-y-2 text-center">
                            <p className="text-[12pt] font-bold uppercase tracking-[0.6em]" style={{ color: config.textColor }}>
                                {displayAuthor}
                            </p>
                            <p className="text-[7pt] opacity-35 tracking-widest uppercase">ALL RIGHTS RESERVED</p>
                        </div>
                    </>
                )}
            </div>
        );
    };

    // ==========================================
    // 现代主义排版 (Modern)
    // ==========================================
    const renderModern = () => {
        if (mode === 'card') {
            return (
                <div className="flex-1 w-full h-full flex flex-col justify-between p-3.5 text-left relative pl-5 overflow-hidden">
                    {/* 包豪斯十字网格背景线 */}
                    <div className="absolute left-4 top-0 bottom-0 w-[1px] opacity-15" style={{ backgroundColor: config.textColor }} />
                    <div className="absolute left-0 right-0 top-12 h-[1px] opacity-15" style={{ backgroundColor: config.textColor }} />
                    
                    {/* 精细双色条装饰 */}
                    <div className="absolute left-3.5 top-6 bottom-6 w-[2px] opacity-75" style={{ backgroundColor: config.accentColor }} />
                    <div className="absolute left-4.5 top-10 bottom-10 w-[1px] opacity-50" style={{ backgroundColor: config.accentColor }} />

                    <div className="pl-1 pt-1 z-10">
                        <span className="text-[7.5px] font-black uppercase tracking-widest block" style={{ color: config.accentColor }}>CHRONICLE</span>
                        <h3 className="font-black text-[13px] tracking-tight leading-[1.1] mt-1 line-clamp-2 max-w-[85%]" style={{ color: config.textColor }}>
                            {displayTitle}
                        </h3>
                    </div>

                    {config.image ? (
                        // 有图：右下偏心层叠重影框
                        <div className="relative w-[65%] aspect-[4/3] shrink-0 self-end mr-1 z-20 transform translate-y-1 my-2">
                            <div className="absolute inset-0 rounded-sm overflow-hidden border border-black/10 shadow-lg">
                                <img src={config.image} className="w-full h-full object-cover" crossOrigin="anonymous" alt="插画" />
                            </div>
                        </div>
                    ) : (
                        // 无图：巨幅年份水印重叠
                        <div className="absolute right-0 bottom-6 select-none pointer-events-none opacity-[0.06] font-black font-sans leading-none text-[65px] tracking-tighter" style={{ color: config.textColor }}>
                            2026
                        </div>
                    )}

                    <div className="pl-1 pb-1 z-10 flex justify-between items-end w-full">
                        <span className="text-[8px] font-black tracking-wide uppercase opacity-75">
                            {displayAuthor}
                        </span>
                        <span className="text-[6.5px] font-mono opacity-30">EST. 2026</span>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 w-full h-full flex flex-col justify-between py-[16mm] px-[10mm] text-left relative pl-[18mm] overflow-hidden">
                {/* 现代主义纵横细网格 */}
                <div className="absolute left-[12mm] top-0 bottom-0 w-[1px] opacity-20" style={{ backgroundColor: config.textColor }} />
                <div className="absolute left-0 right-0 top-[40mm] h-[1px] opacity-20" style={{ backgroundColor: config.textColor }} />
                
                {/* 侧边精细装饰线 */}
                <div className="absolute left-[10.5mm] top-[15mm] bottom-[15mm] w-[3mm] rounded-sm" style={{ backgroundColor: config.accentColor }} />
                <div className="absolute left-[15mm] top-[30mm] bottom-[30mm] w-[1px] opacity-30" style={{ backgroundColor: config.textColor }} />
                
                <div className="pt-4 z-10">
                    <span className="text-[11pt] font-black uppercase tracking-[0.4em]" style={{ color: config.accentColor }}>LIFE RECORDINGS</span>
                    <h1 className="text-[38pt] font-black tracking-tighter leading-[1.05] mt-6 uppercase break-words max-w-[90%]" style={{ color: config.textColor }}>
                        {displayTitle}
                    </h1>
                </div>

                {config.image ? (
                    // 有图：巨型下沉阴影叠盖
                    <div className="relative w-[66%] aspect-[4/3] shrink-0 my-6 self-end mr-2 z-20 transform translate-x-2">
                        <div className="absolute inset-0 rounded-[4mm] overflow-hidden border border-black/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
                            <img src={config.image} className="w-full h-full object-cover" crossOrigin="anonymous" alt="大封面" />
                        </div>
                    </div>
                ) : (
                    // 无图：巨幅年份大水印
                    <div className="absolute right-[-10mm] bottom-[15mm] select-none pointer-events-none opacity-[0.04] font-black font-sans leading-none text-[180pt] tracking-tighter" style={{ color: config.textColor }}>
                        2026
                    </div>
                )}

                <div className="pb-4 flex items-end justify-between z-10">
                    <div>
                        <p className="text-[14pt] font-black tracking-wider uppercase" style={{ color: config.textColor }}>
                            {displayAuthor}
                        </p>
                        <p className="text-[8pt] opacity-40 tracking-widest uppercase mt-1">EST. 2026 // TIME COLLATED</p>
                    </div>
                    <div className="w-14 h-14 rounded-full border-2 border-dashed flex items-center justify-center opacity-25" style={{ borderColor: config.textColor }}>
                        <span className="text-[9px] font-bold">TC</span>
                    </div>
                </div>
            </div>
        );
    };

    // ==========================================
    // 几何艺术排版 (Art)
    // ==========================================
    const renderArt = () => {
        if (mode === 'card') {
            return (
                <div className="flex-1 w-full h-full flex flex-col items-center justify-between p-3 text-center relative overflow-hidden">
                    {/* 三层背景重叠艺术色块 */}
                    <div className="absolute top-4 left-[28%] w-[44%] h-[48%] rounded-t-full opacity-[0.18] pointer-events-none" 
                         style={{ 
                             background: `linear-gradient(to bottom, ${config.accentColor}, transparent)`,
                             border: `1px solid ${config.accentColor}30`,
                             borderBottom: 'none'
                         }} />
                    <div className="absolute top-[20%] right-[22%] w-16 h-16 rounded-full opacity-[0.12] pointer-events-none" 
                         style={{ backgroundColor: config.textColor }} />
                    <div className="absolute top-[35%] left-[20%] w-10 h-10 transform rotate-[15deg] opacity-[0.08] pointer-events-none" 
                         style={{ backgroundColor: config.accentColor }} />
                    
                    {config.image ? (
                        // 有图：正圆框与背景几何发生相交叠加
                        <div className="relative w-[45%] aspect-square shrink-0 z-10 mt-3 mb-2">
                            <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-white shadow-md">
                                <img src={config.image} className="w-full h-full object-cover" crossOrigin="anonymous" alt="圆形插图" />
                            </div>
                        </div>
                    ) : (
                        // 无图：几何抽象画底纹
                        <div className="absolute top-[22%] left-[25%] w-[50%] h-[40%] rounded-t-full opacity-[0.22] pointer-events-none" 
                             style={{ 
                                 background: `linear-gradient(to bottom, ${config.accentColor}, ${config.textColor})`,
                             }} />
                    )}

                    {/* 毛玻璃卡片（四周环绕高光） */}
                    <div className="bg-white/40 dark:bg-black/35 backdrop-blur-[6px] border border-white/50 shadow-lg rounded-xl p-2.5 z-10 w-full mt-auto mb-1">
                        <h3 className="font-extrabold text-[11px] tracking-tight leading-snug line-clamp-2" style={{ color: config.textColor }}>
                            {displayTitle}
                        </h3>
                        <div className="w-4 h-0.5 mx-auto my-1.5 opacity-40" style={{ backgroundColor: config.textColor }} />
                        <p className="text-[7.5px] font-bold tracking-widest opacity-80 uppercase truncate">
                            {displayAuthor}
                        </p>
                    </div>
                </div>
            );
        }

        return (
            <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-[15mm] text-center relative overflow-hidden">
                {/* 大尺寸层叠艺术色块 */}
                <div className="absolute top-[10%] left-[28%] w-[44%] h-[45%] rounded-t-full opacity-[0.18] pointer-events-none" 
                     style={{ 
                         background: `linear-gradient(to bottom, ${config.accentColor}, transparent)`,
                         border: `2px solid ${config.accentColor}30`,
                         borderBottom: 'none'
                     }} />
                <div className="absolute top-[22%] right-[20%] w-[38mm] h-[38mm] rounded-full opacity-[0.1] pointer-events-none" 
                     style={{ backgroundColor: config.textColor }} />
                <div className="absolute top-[35%] left-[16%] w-[25mm] h-[25mm] transform rotate-[15deg] opacity-[0.08] pointer-events-none" 
                     style={{ backgroundColor: config.accentColor }} />

                {config.image ? (
                    // 有图：圆角流体艺术框
                    <div className="relative w-[50%] aspect-square shrink-0 mb-8 z-10 mt-[5mm]">
                        <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-white shadow-2xl">
                            <img src={config.image} className="w-full h-full object-cover" crossOrigin="anonymous" alt="圆形艺术照" />
                        </div>
                    </div>
                ) : (
                    // 无图：几何艺术海报叠加
                    <div className="absolute top-[26%] left-[30%] w-[40%] h-[40%] rounded-full opacity-[0.2] pointer-events-none transform rotate-45" 
                         style={{ 
                             background: `linear-gradient(to right, ${config.textColor}, transparent)`,
                         }} />
                )}

                {/* 毛玻璃艺术字版心 */}
                <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-[12px] border border-white/50 dark:border-white/10 rounded-[6mm] p-[10mm] shadow-2xl z-10 w-full max-w-[90%] space-y-6">
                    <span className="text-[9pt] font-black uppercase tracking-[0.5em] px-3.5 py-1 bg-white/70 dark:bg-black/20 rounded-full inline-block" style={{ color: config.accentColor }}>
                        COLLECTION
                    </span>
                    <h1 className="text-[32pt] font-black tracking-tight leading-tight" style={{ color: config.textColor }}>
                        {displayTitle}
                    </h1>
                    <div className="w-12 h-[1px] mx-auto opacity-40" style={{ backgroundColor: config.textColor }} />
                    <p className="text-[12pt] font-black uppercase tracking-[0.3em] font-mono" style={{ color: config.textColor }}>
                        {displayAuthor}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div style={bgStyle} className={containerClasses}>
            {/* 信纸微弱噪声纹理层以统一材质感 */}
            <div 
                className="absolute inset-0 pointer-events-none opacity-[0.03] z-[2]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                }}
            />
            {config.layout === 'classic' && renderClassic()}
            {config.layout === 'minimal' && renderMinimal()}
            {config.layout === 'modern' && renderModern()}
            {config.layout === 'art' && renderArt()}
        </div>
    );
};
