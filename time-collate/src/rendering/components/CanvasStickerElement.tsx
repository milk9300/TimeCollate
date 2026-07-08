import React from 'react';
import type { StickerElement, CanvasElement } from '../../types';
import { STICKER_ASSETS } from '../StickerAssets';
import { useAssetStore } from '../../store/useAssetStore';
import { useBookStore } from '../../store';
import { getVirtualDimensions } from '../PhysicalConstants';
import { CanvaSelectionFrame } from '../../features/editor/components/CanvaSelectionFrame';
import { useCanvasElementTransform } from '../../features/editor/hooks/useCanvasElementTransform';
import { isGradientColor, parseGradient } from '../../utils/colorUtils';

interface CanvasStickerElementProps {
    element: StickerElement;
    chapterId: string;
    pageId: string;
    readOnly?: boolean;
    onUpdate: (updates: Partial<StickerElement>) => void;
    onDragEnd?: () => void;
    canvasRef: React.RefObject<HTMLDivElement | null>;
    siblingElements: CanvasElement[];
}

/**
 * @description V2.0 Canvas自由画布贴纸组件
 * 根据绝对百分比定位，并渲染 SVG/PNG 贴纸，支持混色滤镜、阴影效果与 Canva 旋转框。
 */
export const CanvasStickerElement: React.FC<CanvasStickerElementProps> = ({
    element,
    chapterId,
    pageId,
    readOnly = false,
    onUpdate,
    onDragEnd,
    canvasRef,
    siblingElements
}) => {
    const editorMode = useBookStore(state => state.editorMode);
    const activeStickerEdit = useBookStore(state => state.activeStickerEdit);
    const setActiveStickerEdit = useBookStore(state => state.setActiveStickerEdit);
    const assetCache = useAssetStore(state => state.assetCache);

    const isSelected = activeStickerEdit?.stickerId === element.id && activeStickerEdit?.pageId === pageId;
    const stickerId = element.stickerConfig?.stickerId || '';
    const asset = stickerId ? STICKER_ASSETS[stickerId] : undefined;
    const cachedAsset = stickerId ? assetCache[stickerId] : undefined;

    const { handleMouseDown } = useCanvasElementTransform(
        element,
        canvasRef,
        siblingElements,
        onUpdate as any,
        onDragEnd
    );

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly || editorMode === 'hand') return;
        e.stopPropagation();
        setActiveStickerEdit({
            chapterId,
            pageId,
            stickerId: element.id
        });
    };

    const currentBook = useBookStore(state => state.currentBook);
    const pageSize = currentBook?.pageSize || 'A4';
    const { virtualWidth, virtualHeight } = getVirtualDimensions(pageSize);

    // 绝对定位样式
    const boxStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${(element.x / virtualWidth) * 100}%`,
        top: `${(element.y / virtualHeight) * 100}%`,
        width: `${(element.width / virtualWidth) * 100}%`,
        height: `${(element.height / virtualHeight) * 100}%`,
        transform: `translate(-50%, -50%) rotate(${element.rotate || 0}deg)`,
        zIndex: isSelected ? 9999 : (element.zIndex || 20),
        userSelect: 'none',
        pointerEvents: readOnly ? 'none' : 'auto',
        ...(() => {
            const isStamp = element.stickerConfig?.stickerId?.includes('stamp') || 
                (asset && asset.category === 'stamps') || 
                (cachedAsset && cachedAsset.metadata?.category === 'stamps');
            const isSticker = element.stickerConfig?.stickerId?.includes('sticker') || 
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
        })()
    };

    const renderContent = () => {
        let contentColor = element.stickerConfig?.colorTint || '';
        
        // 兜底自带印章等的主题色/默认色
        if (!contentColor && asset && asset.category === 'stamps') {
            if (asset.id === 'stamp-wax-seal') {
                contentColor = '#a82525';
            } else if (asset.id === 'stamp-mail') {
                contentColor = '#1d4ed8';
            } else {
                contentColor = 'var(--theme-accent, #a82525)';
            }
        } else if (!contentColor && cachedAsset && cachedAsset.metadata?.category === 'stamps') {
            if (cachedAsset.id === 'stamp-wax-seal') {
                contentColor = '#a82525';
            } else if (cachedAsset.id === 'stamp-mail') {
                contentColor = '#1d4ed8';
            } else {
                contentColor = 'var(--theme-accent, #a82525)';
            }
        }
        if (!contentColor) {
            contentColor = 'var(--theme-primary)';
        }

        const isGrad = isGradientColor(contentColor);
        const grad = isGrad ? parseGradient(contentColor) : null;

        const renderSvgWithColor = (svgNode: React.ReactNode) => {
            if (isGrad && grad) {
                const safeId = `sticker-grad-${element.id.replace(/[^a-zA-Z0-9]/g, '')}`;
                const safeClass = `s-wrapper-${element.id.replace(/[^a-zA-Z0-9]/g, '')}`;
                return (
                    <div className={`${safeClass} w-full h-full relative`}>
                        <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
                            <defs>
                                <linearGradient id={safeId} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor={grad.from} />
                                    <stop offset="100%" stopColor={grad.to} />
                                </linearGradient>
                            </defs>
                        </svg>
                        <style dangerouslySetInnerHTML={{ __html: `
                            .${safeClass} svg path:not([fill="none"]),
                            .${safeClass} svg circle:not([fill="none"]),
                            .${safeClass} svg polygon:not([fill="none"]),
                            .${safeClass} svg rect:not([fill="none"]) {
                                fill: url(#${safeId}) !important;
                            }
                            .${safeClass} svg line,
                            .${safeClass} svg path[stroke]:not([stroke="none"]),
                            .${safeClass} svg circle[stroke]:not([stroke="none"]),
                            .${safeClass} svg polygon[stroke]:not([stroke="none"]),
                            .${safeClass} svg rect[stroke]:not([stroke="none"]) {
                                stroke: url(#${safeId}) !important;
                            }
                        `}} />
                        {svgNode}
                    </div>
                );
            }
            return (
                <div style={{ width: '100%', height: '100%', color: contentColor }}>
                    {svgNode}
                </div>
            );
        };

        if (asset) {
            return renderSvgWithColor(asset.render({ style: { width: '100%', height: '100%' } }));
        }

        if (cachedAsset) {
            if (cachedAsset.material_type === 'sticker' && cachedAsset.metadata?.svg) {
                return renderSvgWithColor(
                    <div 
                        style={{ width: '100%', height: '100%' }}
                        className="dynamic-svg-sticker"
                        dangerouslySetInnerHTML={{ __html: cachedAsset.metadata.svg }}
                    />
                );
            } else if (cachedAsset.file_url) {
                const imageUrl = `${cachedAsset.file_url}${cachedAsset.file_url.includes('?') ? '&' : '?'}cors=1`;
                if (isGrad) {
                    return (
                        <div
                            style={{
                                width: '100%',
                                height: '100%',
                                background: contentColor,
                                WebkitMaskImage: `url("${imageUrl}")`,
                                maskImage: `url("${imageUrl}")`,
                                WebkitMaskSize: 'contain',
                                maskSize: 'contain',
                                WebkitMaskRepeat: 'no-repeat',
                                maskRepeat: 'no-repeat',
                                WebkitMaskPosition: 'center',
                                maskPosition: 'center',
                            }}
                        />
                    );
                }
                return (
                    <img
                        src={imageUrl}
                        alt={cachedAsset.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        draggable={false}
                        crossOrigin="anonymous"
                    />
                );
            }
        }

        return <div className="text-[8px] text-gray-400">贴纸 {stickerId}</div>;
    };

    return (
        <div
            style={boxStyle}
            onClick={handleClick}
            onMouseDown={(e) => {
                if (editorMode === 'select') {
                    e.stopPropagation();
                    setActiveStickerEdit({
                        chapterId,
                        pageId,
                        stickerId: element.id
                    });
                    handleMouseDown(e, 'move');
                }
            }}
            className="group/canvas-sticker"
            data-element-id={element.id}
            data-element-type="sticker"
        >
            {renderContent()}

            {isSelected && !readOnly && (
                <CanvaSelectionFrame
                    showCornerHandles={true}
                    showEdgeHandles="none"
                    showRotate={true}
                    onRotateStart={(e) => handleMouseDown(e, 'rotate')}
                    onResizeStart={(e, dir) => handleMouseDown(e, 'resize', dir)}
                />
            )}
        </div>
    );
};
