import React, { useMemo, useState, useEffect } from 'react';
import { PAGE_SIZES, PRINT_CONSTANTS, type PageSize } from './PhysicalConstants';
import type { Page, Chapter, Book } from '../types';
import { LayoutRegistry } from './LayoutRegistry';
import { ThemeDecorations } from './ThemeManager';
import { useBookStore, getVirtualChapters } from '../store';
import { 
    getPageAtmosphere, 
    getPageFontFamily, 
    getPageDecorations, 
    getPageBackgroundImage,
    updatePageDecorations, 
    updatePageBackgroundImage,
    parsePageContent,
    type Decoration 
} from '../utils/textSlotHelper';
import { STICKER_ASSETS } from './StickerAssets';
import { useAssetStore } from '../store/useAssetStore';

interface BookRendererProps {
    page: Page;
    pageSize: PageSize;
    chapterTitle?: string;
    chapterDate?: string;
    chapterIndex?: number;  // 章节序号（从0开始）
    book?: Book;           // 完整书籍信息，用于封面渲染
    side?: 'left' | 'right'; // 指定左右页以渲染物理阴影
    readOnly?: boolean; // 新增：是否只读模式
}

/**
 * @description 核心书籍渲染器
 * 渲染真实物理尺寸的页面（使用 mm 单位），
 * 支持 100% 数据驱动的氛围、字体以及修饰性贴纸组件渲染与拖动调节。
 */
export const BookRenderer: React.FC<BookRendererProps> = ({
    page,
    pageSize,
    chapterTitle,
    chapterDate,
    chapterIndex = 0,
    book,
    side,
    readOnly = false,
}) => {
    const editorMode = useBookStore(state => state.editorMode);
    const updatePage = useBookStore(state => state.updatePage);
    const assetCache = useAssetStore(state => state.assetCache);

    // 氛围与字体解析
    const atmosphere = getPageAtmosphere(page.content);
    const fontFamily = getPageFontFamily(page.content);
    const decorations = getPageDecorations(page.content);
    const customBgImage = getPageBackgroundImage(page.content);

    // 拖动临时状态和选中状态
    const [dragState, setDragState] = useState<{ id: string; x: number; y: number } | null>(null);
    const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
    const [snapLines, setSnapLines] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

    // 根据 pageSize 获取实际物理尺寸
    const dimensions = useMemo(() => PAGE_SIZES[pageSize] || PAGE_SIZES.A4, [pageSize]);
    const { width: baseWidth, height: baseHeight } = dimensions;

    // 获取当前布局对应的模板 Schema，用于磁吸参考点计算
    const templates = useBookStore(state => state.templates || []);
    const template = useMemo(() => {
        return templates.find(t => t.id === page.layout);
    }, [templates, page.layout]);

    // 计算页面内所有对齐线磁吸目标百分比坐标
    const snapTargets = useMemo(() => {
        const targetsX: number[] = [50]; // 默认加入页面中轴线
        const targetsY: number[] = [50];

        // 页面左右与上下安全边距
        const innerLeft = (12 / baseWidth) * 100;
        const innerRight = 100 - (12 / baseWidth) * 100;
        const innerTop = (14 / baseHeight) * 100;
        const innerBottom = 100 - (12 / baseHeight) * 100;

        targetsX.push(innerLeft, innerRight);
        targetsY.push(innerTop, innerBottom);

        // 如果存在当前排版模板，加入各个插槽的左右边界及中心点
        if (template && template.layoutSchema && template.layoutSchema.elements) {
            const innerWidth = ((baseWidth - 24) / baseWidth) * 100;
            const innerHeight = ((baseHeight - 26) / baseHeight) * 100;

            const parsedContent = parsePageContent(page.content);
            const overrides = parsedContent.elementOverrides || {};

            template.layoutSchema.elements.forEach(el => {
                const override = overrides[el.id] || {};
                const elLeft = parseFloat(override.left ?? el.style.left) || 0;
                const elWidth = parseFloat(override.width ?? el.style.width) || 0;
                const elTop = parseFloat(override.top ?? el.style.top) || 0;
                const elHeight = parseFloat(override.height ?? el.style.height) || 0;

                const leftPct = innerLeft + (elLeft / 100) * innerWidth;
                const rightPct = innerLeft + ((elLeft + elWidth) / 100) * innerWidth;
                const centerXPct = innerLeft + ((elLeft + elWidth / 2) / 100) * innerWidth;

                const topPct = innerTop + (elTop / 100) * innerHeight;
                const bottomPct = innerTop + ((elTop + elHeight) / 100) * innerHeight;
                const centerYPct = innerTop + ((elTop + elHeight / 2) / 100) * innerHeight;

                targetsX.push(leftPct, rightPct, centerXPct);
                targetsY.push(topPct, bottomPct, centerYPct);
            });
        }

        // 加入页面上其它贴纸的坐标
        decorations.forEach(dec => {
            targetsX.push(dec.x);
            targetsY.push(dec.y);
        });

        return { x: targetsX, y: targetsY };
    }, [template, baseWidth, baseHeight, decorations, page.content]);

    const realChapter = useMemo(() => {
        if (!book) return null;
        const chapters = getVirtualChapters(book.pages || []);
        for (const chap of chapters) {
            if (chap.pages.some(p => p.id === page.id)) {
                return chap;
            }
        }
        return null;
    }, [book, page.id]);

    const activeChapter = useMemo<Chapter>(() => {
        if (realChapter) return realChapter;
        return {
            id: page.id,
            title: chapterTitle || '',
            date: chapterDate || '',
            pages: [page]
        };
    }, [realChapter, page, chapterTitle, chapterDate]);

    // 字体映射
    const fontValue = useMemo(() => {
        if (fontFamily && fontFamily.startsWith('font-')) {
            const cachedAsset = assetCache[fontFamily];
            if (cachedAsset) {
                return `"${cachedAsset.name}", "Inter", sans-serif`;
            }
        }
        switch (fontFamily) {
            case 'serif':
                return '"Noto Serif SC", "Playfair Display", Georgia, serif';
            case 'handwriting':
                return '"Ma Shan Zheng", "Kaiti", "ZCOOL XiaoWei", cursive';
            case 'sans':
            default:
                return '"Inter", "SF Pro Display", -apple-system, sans-serif';
        }
    }, [fontFamily, assetCache]);

    // 氛围视觉配置
    const atmosphereStyle = useMemo(() => {
        switch (atmosphere) {
            case 'travel':
                return {
                    bg: '#FAF5EC',
                    primaryColor: '#5C4033',
                    accentColor: '#C08A3E',
                    filter: 'sepia(0.1) contrast(1.02) saturate(0.95)',
                    photoBorder: '1px solid #FAF5EC',
                    photoShadow: '0 4px 10px rgba(0,0,0,0.12)',
                    photoPadding: '12px 12px 28px 12px', // Postcard 明信片风格
                    photoBg: '#FFFFFF',
                };
            case 'retro':
                return {
                    bg: '#ECE3D3',
                    primaryColor: '#4A3525',
                    accentColor: '#8B5A2B',
                    filter: 'sepia(0.5) contrast(0.9) brightness(0.95)',
                    photoBorder: '1px solid rgba(0,0,0,0.15)',
                    photoShadow: '0 3px 8px rgba(0,0,0,0.18)',
                    photoPadding: '6px',
                    photoBg: '#FFFFFF',
                };
            case 'film':
                return {
                    bg: '#18181B',
                    primaryColor: '#E4E4E7',
                    accentColor: '#F43F5E',
                    filter: 'contrast(1.15) saturate(0.85) grayscale(0.05)',
                    photoBorder: '2px solid #000000',
                    photoShadow: '0 8px 16px rgba(0,0,0,0.5)',
                    photoPadding: '4px',
                    photoBg: '#000000',
                };
            case 'notebook':
                return {
                    bg: '#FDFCF7',
                    primaryColor: '#27272A',
                    accentColor: '#3B82F6',
                    filter: 'none',
                    photoBorder: '1px dashed #D4D4D8',
                    photoShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    photoPadding: '8px',
                    photoBg: '#FFFFFF',
                };
            case 'summer':
                return {
                    bg: 'linear-gradient(135deg, #FFF8F0 0%, #FFF0F0 50%, #FFE5F0 100%)',
                    primaryColor: '#1E293B',
                    accentColor: '#F97316',
                    filter: 'brightness(1.04) saturate(1.18) contrast(1.02)',
                    photoBorder: '4px solid #FFFFFF',
                    photoShadow: '0 6px 15px rgba(249,115,22,0.12)',
                    photoPadding: '8px',
                    photoBg: '#FFFFFF',
                };
            case 'default':
            default:
                return null;
        }
    }, [atmosphere]);

    // 动态键盘删除贴纸绑定
    useEffect(() => {
        if (readOnly || !activeStickerId) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const newDecorations = decorations.filter(d => d.id !== activeStickerId);
                const updatedContent = updatePageDecorations(page.content, newDecorations);
                updatePage(activeChapter.id, page.id, { content: updatedContent });
                setActiveStickerId(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeStickerId, decorations, page.content, page.id, activeChapter.id, updatePage, readOnly]);
 
    // 动态注入自定义字体文件 @font-face
    useEffect(() => {
        if (!fontFamily || !fontFamily.startsWith('font-')) return;
        const cachedAsset = assetCache[fontFamily];
        if (!cachedAsset || !cachedAsset.file_url) return;

        const fontId = `font-face-${fontFamily}`;
        if (document.getElementById(fontId)) return;

        const style = document.createElement('style');
        style.id = fontId;
        style.innerHTML = `
            @font-face {
                font-family: '${cachedAsset.name}';
                src: url('${cachedAsset.file_url}') format('woff2'),
                     url('${cachedAsset.file_url}') format('woff'),
                     url('${cachedAsset.file_url}') format('truetype');
                font-weight: normal;
                font-style: normal;
                font-display: swap;
            }
        `;
        document.head.appendChild(style);
    }, [fontFamily, assetCache]);

    // 贴纸拖拽控制逻辑
    const handleStickerMouseDown = (e: React.MouseEvent, dec: Decoration) => {
        if (readOnly || editorMode !== 'select') return;
        e.stopPropagation();
        e.preventDefault();
        setActiveStickerId(dec.id);

        const container = e.currentTarget.parentElement;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startDecX = dec.x;
        const startDecY = dec.y;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            // 转化为百分比偏移
            const pctDeltaX = (deltaX / rect.width) * 100;
            const pctDeltaY = (deltaY / rect.height) * 100;

            const finalX = Math.max(0, Math.min(100, startDecX + pctDeltaX));
            const finalY = Math.max(0, Math.min(100, startDecY + pctDeltaY));

            // 磁吸计算：在 5px 阈值内
            const snapThresholdX = (5 / rect.width) * 100;
            const snapThresholdY = (5 / rect.height) * 100;

            let snappedX = finalX;
            let snappedY = finalY;
            let activeSnapLineX: number | null = null;
            let activeSnapLineY: number | null = null;

            // X 轴磁吸计算（过滤掉贴纸本身的初始坐标防止自吸附）
            const otherXTargets = snapTargets.x.filter(tx => Math.abs(tx - startDecX) > 0.01);
            for (const tx of otherXTargets) {
                if (Math.abs(finalX - tx) < snapThresholdX) {
                    snappedX = tx;
                    activeSnapLineX = tx;
                    break;
                }
            }

            // Y 轴磁吸计算
            const otherYTargets = snapTargets.y.filter(ty => Math.abs(ty - startDecY) > 0.01);
            for (const ty of otherYTargets) {
                if (Math.abs(finalY - ty) < snapThresholdY) {
                    snappedY = ty;
                    activeSnapLineY = ty;
                    break;
                }
            }

            setDragState({ id: dec.id, x: snappedX, y: snappedY });
            setSnapLines({ x: activeSnapLineX, y: activeSnapLineY });
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            setSnapLines({ x: null, y: null });

            setDragState(prev => {
                if (prev && prev.id === dec.id) {
                    const newDecorations = decorations.map(d =>
                        d.id === dec.id ? { ...d, x: prev.x, y: prev.y } : d
                    );
                    const updatedContent = updatePageDecorations(page.content, newDecorations);
                    updatePage(activeChapter.id, page.id, { content: updatedContent });
                }
                return null;
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // 微调贴纸（旋转、大小、删除）
    const handleAdjustSticker = (id: string, action: 'rotate' | 'size' | 'delete', value: number) => {
        let newDecorations = [...decorations];
        if (action === 'delete') {
            newDecorations = newDecorations.filter(d => d.id !== id);
            setActiveStickerId(null);
        } else {
            newDecorations = newDecorations.map(d => {
                if (d.id === id) {
                    if (action === 'rotate') {
                        return { ...d, rotate: ((d.rotate || 0) + value) % 360 };
                    } else if (action === 'size') {
                        return { ...d, size: Math.max(8, (d.size || 16) + value) };
                    }
                }
                return d;
            });
        }
        const updatedContent = updatePageDecorations(page.content, newDecorations);
        updatePage(activeChapter.id, page.id, { content: updatedContent });
    };

    const handlePageClick = () => {
        setActiveStickerId(null);
    };

    const layoutProps = {
        chapter: activeChapter,
        page: page,
        chapterIndex: chapterIndex,
        book: book,
        readOnly: readOnly
    };

    // 组装合并样式
    const mergedStyle = useMemo<React.CSSProperties>(() => {
        return {
            width: `${baseWidth}mm`,
            height: `${baseHeight}mm`,
            fontFamily: fontValue,
            position: 'relative',
            overflow: 'hidden',
            background: customBgImage 
                ? `url(${customBgImage}) center/cover no-repeat` 
                : (atmosphereStyle?.bg || 'var(--theme-bg-gradient, var(--theme-bg, #FFFFFF))'),
            color: atmosphereStyle?.primaryColor || 'var(--theme-text)',
            '--theme-font': fontValue,
            '--theme-primary': atmosphereStyle?.primaryColor || 'var(--theme-primary, #1A1A1A)',
            '--theme-accent': atmosphereStyle?.accentColor || 'var(--theme-accent, #6366F1)',
            '--theme-secondary': atmosphereStyle?.primaryColor ? `${atmosphereStyle.primaryColor}df` : 'var(--theme-text-secondary, #4B5563)',
            '--theme-bg': customBgImage ? '#FFFFFF' : (atmosphereStyle ? (atmosphereStyle.bg.startsWith('linear') ? '#FFFFFF' : atmosphereStyle.bg) : 'var(--theme-bg, #FFFFFF)'),
            '--photo-filter': atmosphereStyle?.filter || 'none',
            '--photo-border': atmosphereStyle?.photoBorder || 'none',
            '--photo-shadow': atmosphereStyle?.photoShadow || 'none',
            '--photo-padding': atmosphereStyle?.photoPadding || '0px',
            '--photo-bg': atmosphereStyle?.photoBg || 'transparent',
        } as any;
    }, [baseWidth, baseHeight, fontValue, atmosphereStyle, customBgImage]);

    return (
        <div
            className="flex items-center justify-center select-none"
            style={{
                width: `${baseWidth}mm`,
                height: `${baseHeight}mm`,
            }}
            onClick={handlePageClick}
        >
            <div
                style={mergedStyle}
                className="flex flex-col shadow-lg print:shadow-none transition-colors duration-300"
                onDragOver={(e) => {
                    if (readOnly || editorMode !== 'select') return;
                    if (e.dataTransfer.types.includes('stickerId') || e.dataTransfer.types.includes('backgroundImageUrl')) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'copy';
                    }
                }}
                onDrop={(e) => {
                    if (readOnly || editorMode !== 'select') return;
                    
                    const bgUrl = e.dataTransfer.getData('backgroundImageUrl');
                    if (bgUrl) {
                        e.preventDefault();
                        const updatedContent = updatePageBackgroundImage(page.content, bgUrl);
                        updatePage(activeChapter.id, page.id, { content: updatedContent });
                        return;
                    }

                    const stickerId = e.dataTransfer.getData('stickerId');
                    if (!stickerId) return;
                    e.preventDefault();
                    
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    
                    const asset = STICKER_ASSETS[stickerId];
                    const cachedAsset = assetCache[stickerId];
                    if (!asset && !cachedAsset) return;
                    
                    let decorationType: 'date' | 'sticker' | 'tape' | 'stamp' | 'botanical' = 'sticker';
                    let size = 28;
                    if (asset) {
                        decorationType = asset.category === 'stamps' ? 'stamp' : 'sticker';
                        size = decorationType === 'stamp' ? 36 : 28;
                    } else if (cachedAsset) {
                        decorationType = cachedAsset.metadata?.category === 'stamps' ? 'stamp' : 'sticker';
                        size = decorationType === 'stamp' ? 36 : 28;
                    }
                    
                    const newSticker: Decoration = {
                        id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        type: decorationType,
                        content: stickerId,
                        x: Math.max(0, Math.min(100, x)),
                        y: Math.max(0, Math.min(100, y)),
                        size,
                        rotate: 0,
                    };
                    
                    const newDecorations = [...decorations, newSticker];
                    const updatedContent = updatePageDecorations(page.content, newDecorations);
                    updatePage(activeChapter.id, page.id, { content: updatedContent });
                }}
            >
                {/* 1. 纸张纹理层 (Noise Texture) */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03] z-[2] print:hidden"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    }}
                />

                {/* 信纸氛围划线/网格背景模拟 */}
                {atmosphere === 'notebook' && (
                    <div 
                        className="absolute inset-0 pointer-events-none opacity-[0.08] z-[1]"
                        style={{
                            backgroundSize: '100% 28px',
                            backgroundImage: 'linear-gradient(to bottom, #000 1px, transparent 1px)'
                        }}
                    />
                )}

                {/* 2. 纸张边缘高光模拟 */}
                <div className="absolute inset-0 border-[0.5px] border-black/5 pointer-events-none z-[100] print:hidden" />

                {/* 3. 安全边距指示 */}
                {!readOnly && (
                    <div
                        style={{
                            position: 'absolute',
                            inset: `${PRINT_CONSTANTS.SAFE_ZONE}mm`,
                            border: '1px dashed rgba(60, 132, 244, 0.12)',
                            pointerEvents: 'none',
                            zIndex: 100
                        }}
                        className="print:hidden"
                    />
                )}

                {/* 3.1 磁吸辅助对齐线 */}
                {snapLines.x !== null && (
                    <div 
                        className="absolute top-0 bottom-0 border-l border-red-500 border-dashed z-[99] pointer-events-none"
                        style={{ left: `${snapLines.x}%` }}
                    />
                )}
                {snapLines.y !== null && (
                    <div 
                        className="absolute left-0 right-0 border-t border-red-500 border-dashed z-[99] pointer-events-none"
                        style={{ top: `${snapLines.y}%` }}
                    />
                )}

                {/* 4. 动态布局渲染 */}
                <div className="flex-1 w-full h-full relative z-[5]">
                    {React.createElement(LayoutRegistry.getRenderer(page.layout), layoutProps)}
                </div>

                {/* 5. 拖动装饰贴纸渲染 */}
                {decorations.map((dec) => {
                    const isDragging = dragState && dragState.id === dec.id;
                    const x = isDragging ? dragState.x : dec.x;
                    const y = isDragging ? dragState.y : dec.y;
                    const isSelected = !readOnly && activeStickerId === dec.id;

                    return (
                        <div
                            key={dec.id}
                            style={{
                                position: 'absolute',
                                left: `${x}%`,
                                top: `${y}%`,
                                transform: `translate(-50%, -50%) rotate(${dec.rotate || 0}deg)`,
                                fontSize: `${dec.size || 16}pt`,
                                userSelect: 'none',
                                pointerEvents: !readOnly && editorMode === 'select' ? 'auto' : 'none',
                                cursor: !readOnly && editorMode === 'select' ? 'move' : 'default',
                                transition: isDragging ? 'none' : 'transform 0.1s ease',
                                ...((() => {
                                    const asset = STICKER_ASSETS[dec.content];
                                    const cachedAsset = assetCache[dec.content];
                                    const isStamp = dec.type === 'stamp' || 
                                        (asset && asset.category === 'stamps') || 
                                        (cachedAsset && cachedAsset.metadata?.category === 'stamps');
                                    const isSticker = dec.type === 'sticker' || 
                                        (asset && asset.category === 'stickers') || 
                                        (cachedAsset && cachedAsset.material_type === 'sticker');
                                    
                                    if (isStamp) {
                                        return {
                                            mixBlendMode: 'multiply',
                                            filter: 'url(#distress-filter)',
                                            opacity: 0.88
                                        } as React.CSSProperties;
                                    } else if (isSticker) {
                                        return {
                                            filter: 'drop-shadow(0px 0px 0.75px #ffffff) drop-shadow(0px 0px 1.5px #ffffff) drop-shadow(1.5px 2px 2.5px rgba(0, 0, 0, 0.16))'
                                        } as React.CSSProperties;
                                    }
                                    return {};
                                })())
                            }}
                            className={`z-[20] select-none ${
                                isSelected ? 'ring-2 ring-indigo-500 ring-offset-1 rounded-sm' : ''
                            }`}
                            onMouseDown={(e) => handleStickerMouseDown(e, dec)}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {(() => {
                                const asset = STICKER_ASSETS[dec.content];
                                if (asset) {
                                    let contentColor = 'var(--theme-primary)';
                                    if (asset.category === 'stamps') {
                                        if (asset.id === 'stamp-wax-seal') {
                                            contentColor = '#a82525';
                                        } else if (asset.id === 'stamp-mail') {
                                            contentColor = '#1d4ed8';
                                        } else {
                                            contentColor = 'var(--theme-accent, #a82525)';
                                        }
                                    }
                                    return (
                                        <div 
                                            style={{ 
                                                width: `${dec.size || 16}pt`, 
                                                height: `${dec.size || 16}pt`,
                                                color: contentColor
                                            }}
                                        >
                                            {asset.render({})}
                                        </div>
                                    );
                                }
                                
                                // Fallback to database loaded materials cache
                                const cachedAsset = assetCache[dec.content];
                                if (cachedAsset) {
                                    let contentColor = 'var(--theme-primary)';
                                    if (cachedAsset.metadata?.category === 'stamps') {
                                        if (cachedAsset.id === 'stamp-wax-seal') {
                                            contentColor = '#a82525';
                                        } else if (cachedAsset.id === 'stamp-mail') {
                                            contentColor = '#1d4ed8';
                                        } else {
                                            contentColor = 'var(--theme-accent, #a82525)';
                                        }
                                    }
                                    
                                    if (cachedAsset.material_type === 'sticker' && cachedAsset.metadata?.svg) {
                                        return (
                                            <div 
                                                style={{ 
                                                    width: `${dec.size || 16}pt`, 
                                                    height: `${dec.size || 16}pt`,
                                                    color: contentColor
                                                }}
                                                className="dynamic-svg-sticker"
                                                dangerouslySetInnerHTML={{ __html: cachedAsset.metadata.svg }}
                                            />
                                        );
                                    } else if (cachedAsset.file_url) {
                                        return (
                                            <img
                                                src={cachedAsset.file_url}
                                                alt={cachedAsset.name}
                                                style={{ 
                                                    width: `${dec.size || 16}pt`, 
                                                    height: `${dec.size || 16}pt`,
                                                    objectFit: 'contain'
                                                }}
                                                draggable={false}
                                            />
                                        );
                                    }
                                }

                                return dec.content;
                            })()}

                            {/* 浮动调节工具条 */}
                            {!readOnly && editorMode === 'select' && isSelected && !isDragging && (
                                <div 
                                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-[30] flex items-center bg-slate-900/95 backdrop-blur-sm text-white rounded-md shadow-xl border border-slate-700/60 p-0.5 gap-0.5 text-[8px] pointer-events-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => handleAdjustSticker(dec.id, 'rotate', -15)}
                                        className="w-5 h-5 flex items-center justify-center hover:bg-slate-800 rounded text-gray-200 font-bold"
                                        title="逆时针旋转"
                                    >
                                        ↺
                                    </button>
                                    <button
                                        onClick={() => handleAdjustSticker(dec.id, 'rotate', 15)}
                                        className="w-5 h-5 flex items-center justify-center hover:bg-slate-800 rounded text-gray-200 font-bold"
                                        title="顺时针旋转"
                                    >
                                        ↻
                                    </button>
                                    <div className="w-[1px] h-3 bg-slate-700/50" />
                                    <button
                                        onClick={() => handleAdjustSticker(dec.id, 'size', 3)}
                                        className="w-5 h-5 flex items-center justify-center hover:bg-slate-800 rounded text-gray-200 font-bold"
                                        title="放大"
                                    >
                                        +
                                    </button>
                                    <button
                                        onClick={() => handleAdjustSticker(dec.id, 'size', -3)}
                                        className="w-5 h-5 flex items-center justify-center hover:bg-slate-800 rounded text-gray-200 font-bold"
                                        title="缩小"
                                    >
                                        -
                                    </button>
                                    <div className="w-[1px] h-3 bg-slate-700/50" />
                                    <button
                                        onClick={() => handleAdjustSticker(dec.id, 'delete', 0)}
                                        className="w-5 h-5 flex items-center justify-center hover:bg-slate-800 rounded text-red-400 hover:text-red-300 font-bold"
                                        title="删除贴纸"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* 6. 主题装饰层 */}
                <ThemeDecorations />

                {/* 7. 页码设计 */}
                <div className="absolute bottom-6 left-0 right-0 text-center z-[10]">
                    <div className="inline-block px-4 py-0.5 border-y border-black/[0.04] print:border-transparent">
                        <span className="text-[7pt] opacity-30 tracking-[0.3em] font-light italic">
                            {page.id.slice(0, 4).toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* 8. 物理书脊、折痕、叠纸阴影与纸张层叠厚度模拟 */}
                {page.layout !== 'book-cover' && page.layout !== 'back-cover' && (
                    side === 'left' ? (
                        <>
                            <div className="absolute right-0 inset-y-0 w-16 bg-gradient-to-l from-black/[0.08] via-black/[0.03] to-transparent pointer-events-none z-[15] print:hidden" />
                            <div className="absolute right-0 inset-y-0 w-px bg-black/[0.06] pointer-events-none z-[16] print:hidden" />
                            
                            {/* 左侧书页外边缘的纸张叠层与厚度模拟 */}
                            <div className="absolute left-0 inset-y-0 w-[4px] bg-gradient-to-r from-black/10 to-transparent pointer-events-none z-[25] print:hidden" />
                            <div className="absolute left-[1px] inset-y-0 w-[2px] bg-white/70 border-r border-black/10 pointer-events-none z-[25] print:hidden" />
                            <div className="absolute left-[3px] inset-y-0 w-[1px] bg-white/40 border-r border-black/5 pointer-events-none z-[25] print:hidden" />
                        </>
                    ) : side === 'right' ? (
                        <>
                            <div className="absolute left-0 inset-y-0 w-16 bg-gradient-to-r from-black/[0.08] via-black/[0.03] to-transparent pointer-events-none z-[15] print:hidden" />
                            <div className="absolute left-0 inset-y-0 w-px bg-black/[0.06] pointer-events-none z-[16] print:hidden" />

                            {/* 右侧书页外边缘的纸张叠层与厚度模拟 */}
                            <div className="absolute right-0 inset-y-0 w-[4px] bg-gradient-to-l from-black/10 to-transparent pointer-events-none z-[25] print:hidden" />
                            <div className="absolute right-[1px] inset-y-0 w-[2px] bg-white/70 border-l border-black/10 pointer-events-none z-[25] print:hidden" />
                            <div className="absolute right-[3px] inset-y-0 w-[1px] bg-white/40 border-l border-black/5 pointer-events-none z-[25] print:hidden" />
                        </>
                    ) : (
                        <div className="absolute left-0 inset-y-0 w-12 bg-gradient-to-r from-black/[0.02] to-transparent pointer-events-none z-[15] print:hidden" />
                    )
                )}

                {/* SVG Filter for distressed stamps */}
                <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
                    <defs>
                        <filter id="distress-filter">
                            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
                            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                    </defs>
                </svg>
            </div>
        </div>
    );
};
