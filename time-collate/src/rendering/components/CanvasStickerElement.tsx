import React from 'react';
import type { StickerElement, CanvasElement } from '../../types';
import { STICKER_ASSETS } from '../StickerAssets';
import { useAssetStore } from '../../store/useAssetStore';
import { useBookStore } from '../../store';
import { getVirtualDimensions } from '../PhysicalConstants';
import { CanvaSelectionFrame } from '../../features/editor/components/CanvaSelectionFrame';
import { useCanvasElementTransform } from '../../features/editor/hooks/useCanvasElementTransform';

interface CanvasStickerElementProps {
    element: StickerElement;
    chapterId: string;
    pageId: string;
    readOnly?: boolean;
    onUpdate: (updates: Partial<StickerElement>) => void;
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
        onUpdate as any
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
        zIndex: element.zIndex || 20,
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
        if (asset) {
            let contentColor = element.stickerConfig?.colorTint || 'var(--theme-primary)';
            if (!element.stickerConfig?.colorTint && asset.category === 'stamps') {
                if (asset.id === 'stamp-wax-seal') {
                    contentColor = '#a82525';
                } else if (asset.id === 'stamp-mail') {
                    contentColor = '#1d4ed8';
                } else {
                    contentColor = 'var(--theme-accent, #a82525)';
                }
            }
            return (
                <div style={{ width: '100%', height: '100%', color: contentColor }}>
                    {asset.render({})}
                </div>
            );
        }

        if (cachedAsset) {
            let contentColor = element.stickerConfig?.colorTint || 'var(--theme-primary)';
            if (!element.stickerConfig?.colorTint && cachedAsset.metadata?.category === 'stamps') {
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
                        style={{ width: '100%', height: '100%', color: contentColor }}
                        className="dynamic-svg-sticker"
                        dangerouslySetInnerHTML={{ __html: cachedAsset.metadata.svg }}
                    />
                );
            } else if (cachedAsset.file_url) {
                return (
                    <img
                        src={cachedAsset.file_url}
                        alt={cachedAsset.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        draggable={false}
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
