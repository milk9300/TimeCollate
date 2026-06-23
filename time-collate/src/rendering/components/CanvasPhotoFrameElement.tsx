import React, { useRef, useState, useEffect } from 'react';
import type { PhotoFrameElement, CanvasElement } from '../../types';
import { useBookStore } from '../../store';
import { useAssetStore } from '../../store/useAssetStore';
import { getVirtualDimensions } from '../PhysicalConstants';
import { getBookService } from '../../services/serviceFactory';
import { Plus, Check, Crop, Sliders } from 'lucide-react';
import { getThumbnailUrl } from '../../utils/cdn';
import { CanvaSelectionFrame } from '../../features/editor/components/CanvaSelectionFrame';
import { useCanvasElementTransform } from '../../features/editor/hooks/useCanvasElementTransform';

const bookService = getBookService();

interface CanvasPhotoFrameElementProps {
    element: PhotoFrameElement;
    chapterId: string;
    pageId: string;
    readOnly?: boolean;
    onUpdate: (updates: Partial<PhotoFrameElement>) => void;
    canvasRef: React.RefObject<HTMLDivElement | null>;
    siblingElements: CanvasElement[];
}

const filterStyles: Record<string, string> = {
    none: 'none',
    warm: 'sepia(0.35) saturate(1.2) hue-rotate(-10deg) contrast(1.05)',
    fresh: 'saturate(1.3) brightness(1.05) contrast(0.95)',
    retro: 'contrast(1.1) brightness(0.9) sepia(0.15) saturate(0.85)'
};

/**
 * @description V2.0 Canvas自由画布照片框组件
 * 支持高保真物理边框 (Polaroid, Film, Rounded, Normal) 与色彩滤镜。
 * 拖拽其他照片或资源库照片放开自动替换；双击进入内联裁剪编辑模式，支持鼠标拖拽平移偏移量 (xOffset, yOffset) 与滑动缩放。
 */
export const CanvasPhotoFrameElement: React.FC<CanvasPhotoFrameElementProps> = ({
    element,
    chapterId,
    pageId,
    readOnly = false,
    onUpdate,
    canvasRef,
    siblingElements
}) => {
    const editorMode = useBookStore(state => state.editorMode);
    const activePhotoEdit = useBookStore(state => state.activePhotoEdit);
    const setActivePhotoEdit = useBookStore(state => state.setActivePhotoEdit);
    const assetCache = useAssetStore(state => state.assetCache);

    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isCropping, setIsCropping] = useState(false);

    // 裁剪微调状态
    const [cropScale, setCropScale] = useState(1.0);
    const [cropX, setCropX] = useState(50);
    const [cropY, setCropY] = useState(50);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cropContainerRef = useRef<HTMLDivElement>(null);

    const isSelected = activePhotoEdit?.photoId === element.id && activePhotoEdit?.pageId === pageId;

    const { handleMouseDown } = useCanvasElementTransform(
        element,
        canvasRef,
        siblingElements,
        onUpdate as any
    );

    useEffect(() => {
        if (element.photo) {
            setCropScale(element.photo.scale ?? 1.0);
            setCropX(element.photo.xOffset ?? 50);
            setCropY(element.photo.yOffset ?? 50);
        }
    }, [element.photo]);

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly || editorMode === 'hand') return;
        e.stopPropagation();

        if (element.photo) {
            setActivePhotoEdit({
                chapterId,
                pageId,
                photoId: element.id
            });
        } else {
            // 空插槽直接拉起文件上传
            fileInputRef.current?.click();
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (readOnly || !element.photo || editorMode === 'hand') return;
        e.stopPropagation();
        setIsCropping(true);
    };

    // 文件上传替换
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const uploaded = await bookService.uploadPhoto(file);
            onUpdate({
                photo: {
                    id: uploaded.id,
                    url: uploaded.url,
                    ossKey: uploaded.ossKey,
                    scale: 1.0,
                    xOffset: 50,
                    yOffset: 50,
                    styleType: element.photo?.styleType || 'normal',
                    filterType: element.photo?.filterType || 'none',
                    caption: uploaded.caption || file.name,
                    width: uploaded.width,
                    height: uploaded.height
                }
            });
        } catch (err) {
            console.error('Canvas photo upload failed:', err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Drag & Drop 处理
    const handleDragStart = (e: React.DragEvent) => {
        if (!element.photo) return;
        e.dataTransfer.setData('photoId', element.photo.id);
        e.dataTransfer.setData('sourcePageId', pageId);
        e.dataTransfer.setData('sourceElementId', element.id);
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (readOnly || editorMode !== 'select') return;
        if (e.dataTransfer.types.includes('stickerId')) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        if (readOnly || editorMode !== 'select') return;
        setIsDragOver(false);

        e.preventDefault();
        e.stopPropagation();

        // 场景 3: 如果拖入的是本地文件，直接上传并填充
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            setIsUploading(true);
            try {
                const uploaded = await bookService.uploadPhoto(file);
                onUpdate({
                    photo: {
                        id: uploaded.id,
                        url: uploaded.url,
                        ossKey: uploaded.ossKey,
                        scale: 1.0,
                        xOffset: 50,
                        yOffset: 50,
                        styleType: element.photo?.styleType || 'normal',
                        filterType: element.photo?.filterType || 'none',
                        caption: uploaded.caption || file.name,
                        width: uploaded.width,
                        height: uploaded.height
                    }
                });
            } catch (err) {
                console.error('Dropped file upload failed:', err);
            } finally {
                setIsUploading(false);
            }
            return;
        }

        const dragPhotoId = e.dataTransfer.getData('photoId');
        const textUrl = e.dataTransfer.getData('text/plain');
        
        if (!dragPhotoId && !textUrl) return;

        const sourceElementId = e.dataTransfer.getData('sourceElementId');
        const sourcePageId = e.dataTransfer.getData('sourcePageId');

        const store = useBookStore.getState();

        // 场景 1: 同页面跨照片框交换 (Swap)
        if (sourcePageId === pageId && sourceElementId && sourceElementId !== element.id) {
            const page = store.currentBook?.pages?.find(p => p.id === pageId);
            if (page && page.elements) {
                const sourceEl = page.elements.find(el => el.id === sourceElementId) as PhotoFrameElement;
                if (sourceEl && sourceEl.type === 'photo-frame') {
                    const tempPhoto = element.photo;
                    onUpdate({ photo: sourceEl.photo });
                    store.updatePage(chapterId, pageId, {
                        elements: page.elements.map(el => {
                            if (el.id === sourceElementId) {
                                return { ...el, photo: tempPhoto } as PhotoFrameElement;
                            }
                            return el;
                        })
                    });
                }
            }
            return;
        }

        // 场景 2: 从左侧素材面板或其它页面拖入
        // 2.1 优先尝试从全局 assetCache 获取素材信息
        if (dragPhotoId && assetCache[dragPhotoId]) {
            const cachedMaterial = assetCache[dragPhotoId];
            onUpdate({
                photo: {
                    id: cachedMaterial.id,
                    url: cachedMaterial.file_url,
                    scale: 1.0,
                    xOffset: 50,
                    yOffset: 50,
                    styleType: element.photo?.styleType || 'normal',
                    filterType: element.photo?.filterType || 'none',
                    caption: cachedMaterial.name || '',
                    width: cachedMaterial.metadata?.width,
                    height: cachedMaterial.metadata?.height
                }
            });
            return;
        }

        // 2.2 如果没有缓存，但能获取 textUrl，则直接作为 URL 使用
        if (textUrl && textUrl.startsWith('http')) {
            onUpdate({
                photo: {
                    id: dragPhotoId || `dragged-${Date.now()}`,
                    url: textUrl,
                    scale: 1.0,
                    xOffset: 50,
                    yOffset: 50,
                    styleType: element.photo?.styleType || 'normal',
                    filterType: element.photo?.filterType || 'none',
                    caption: '拖入图片'
                }
            });
        }
    };

    // 内联拖拽裁剪计算
    const handleCropMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        const container = cropContainerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const initialX = cropX;
        const initialY = cropY;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            // 根据缩放比与图片框尺寸，计算百分比位移
            const pctDx = (dx / rect.width) * 100 / Math.max(1, cropScale - 1);
            const pctDy = (dy / rect.height) * 100 / Math.max(1, cropScale - 1);

            // 平移限制在 0 - 100% 之间
            const nextX = Math.max(0, Math.min(100, initialX - pctDx));
            const nextY = Math.max(0, Math.min(100, initialY - pctDy));

            setCropX(nextX);
            setCropY(nextY);
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleSaveCrop = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsCropping(false);
        if (element.photo) {
            onUpdate({
                photo: {
                    ...element.photo,
                    scale: cropScale,
                    xOffset: cropX,
                    yOffset: cropY
                }
            });
        }
    };

    const photo = element.photo;

    const currentBook = useBookStore(state => state.currentBook);
    const pageSize = currentBook?.pageSize || 'A4';
    const { virtualWidth, virtualHeight } = getVirtualDimensions(pageSize);

    // 绝对定位尺寸
    const boxStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${(element.x / virtualWidth) * 100}%`,
        top: `${(element.y / virtualHeight) * 100}%`,
        width: `${(element.width / virtualWidth) * 100}%`,
        height: `${(element.height / virtualHeight) * 100}%`,
        transform: `rotate(${element.rotate || 0}deg)`,
        zIndex: element.zIndex || 10,
    };

    const borderStyle = photo?.styleType || 'normal';
    const filterType = photo?.filterType || 'none';
    const filterCSS = filterStyles[filterType] || 'none';

    const renderImage = () => (
        <img
            src={getThumbnailUrl(photo?.url || '', 800)}
            alt={photo?.caption || '图片'}
            className="w-full h-full object-cover pointer-events-none select-none"
            style={{
                transform: `scale(${photo?.scale ?? 1.0})`,
                objectPosition: `${photo?.xOffset ?? 50}% ${photo?.yOffset ?? 50}%`,
                transformOrigin: 'center center',
                filter: `var(--photo-filter, none) ${filterCSS !== 'none' ? filterCSS : ''}`,
                transition: 'transform 0.1s ease-out, object-position 0.1s ease-out, filter 0.2s ease-in-out'
            }}
        />
    );

    const renderStyledFrame = () => {
        // 未从云端获取或未填充图片时的空插槽样式
        if (!photo || !photo.url) {
            return (
                <div
                    className={`w-full h-full flex flex-col items-center justify-center border-2 border-dashed transition-all rounded-lg min-h-[80px] ${
                        isDragOver
                            ? 'border-indigo-600 bg-indigo-50/10 scale-[0.98]'
                            : 'border-gray-200 hover:border-indigo-500/50 hover:bg-indigo-50/[0.02]'
                    }`}
                >
                    {isUploading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                    ) : (
                        <div className="flex flex-col items-center gap-1 text-gray-400 group-hover/canvas-photo:text-indigo-600 transition-colors">
                            <Plus size={18} className="stroke-[2.5]" />
                            <span className="text-[9px] font-bold tracking-wider uppercase">
                                {isDragOver ? '松开填充' : '添加图片'}
                            </span>
                        </div>
                    )}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>
            );
        }

        if (borderStyle === 'polaroid') {
            return (
                <div className="w-full h-full bg-white p-[3mm] pb-[8mm] shadow-lg border border-gray-200/60 flex flex-col justify-between items-center transition-all">
                    <div className="w-full flex-1 overflow-hidden relative bg-gray-50">
                        {renderImage()}
                    </div>
                    <div className="mt-2 text-center text-[7pt] font-mono text-gray-500 italic max-w-full truncate px-1 pointer-events-none select-none">
                        {photo.caption || 'Polaroid Frame'}
                    </div>
                </div>
            );
        }

        if (borderStyle === 'film') {
            return (
                <div className="w-full h-full bg-neutral-950 p-[3mm] py-[4mm] shadow-xl flex flex-col justify-center items-center relative transition-all overflow-hidden border border-neutral-900">
                    <div className="absolute top-1 left-0 right-0 flex justify-around px-2 pointer-events-none opacity-60">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 bg-neutral-800 rounded-sm border border-neutral-700/30" />
                        ))}
                    </div>
                    <div className="w-full flex-1 overflow-hidden relative bg-neutral-900">
                        {renderImage()}
                    </div>
                    <div className="absolute bottom-1 left-0 right-0 flex justify-around px-2 pointer-events-none opacity-60">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 bg-neutral-800 rounded-sm border border-neutral-700/30" />
                        ))}
                    </div>
                </div>
            );
        }

        if (borderStyle === 'rounded') {
            return (
                <div className="w-full h-full rounded-2xl border border-gray-200/50 shadow-md overflow-hidden bg-gray-50 transition-all">
                    {renderImage()}
                </div>
            );
        }

        // normal
        return (
            <div
                className="w-full h-full overflow-hidden transition-all"
                style={{
                    padding: 'var(--photo-padding, 0px)',
                    border: 'var(--photo-border, 1px solid rgba(0,0,0,0.05))',
                    boxShadow: 'var(--photo-shadow, none)',
                    backgroundColor: 'var(--photo-bg, #fcfcfc)',
                }}
            >
                {renderImage()}
            </div>
        );
    };

    if (readOnly) {
        return (
            <div style={boxStyle} className="select-none pointer-events-none">
                {renderStyledFrame()}
            </div>
        );
    }

    return (
        <div
            style={boxStyle}
            onClick={handleClick}
            onDoubleClick={handleDoubleClick}
            onMouseDown={(e) => {
                if (editorMode === 'select' && !isCropping) {
                    handleMouseDown(e, 'move');
                }
            }}
            draggable={editorMode === 'select' && !isCropping && !!photo?.url}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`group/canvas-photo relative transition-all ${
                editorMode === 'select' ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-[#8b3dff]/40' : ''
            } ${isDragOver ? 'scale-[0.98] opacity-80' : ''}`}
            data-element-id={element.id}
            data-element-type="photo"
        >
            {renderStyledFrame()}

            {/* Canva 风格选中边框 */}
            {isSelected && !isDragOver && !isCropping && (
                <CanvaSelectionFrame
                    showCornerHandles={true}
                    showEdgeHandles="all"
                    showRotate={true}
                    onRotateStart={(e) => handleMouseDown(e, 'rotate')}
                    onResizeStart={(e, dir) => handleMouseDown(e, 'resize', dir)}
                />
            )}

            {/* 内联裁剪微调蒙板层 */}
            {isCropping && (
                <div
                    ref={cropContainerRef}
                    onMouseDown={handleCropMouseDown}
                    className="absolute inset-0 z-40 bg-black/40 cursor-move overflow-hidden flex flex-col justify-between"
                >
                    {/* 裁剪区指示 */}
                    <div className="absolute inset-[10%] border-2 border-dashed border-white pointer-events-none z-10 flex items-center justify-center">
                        <span className="text-[10px] text-white bg-black/50 px-2 py-0.5 rounded shadow">
                            双击或拖拽平移裁剪
                        </span>
                    </div>

                    {/* 渲染裁剪中真实拉伸大小的背景图 */}
                    <img
                        src={photo?.url || ''}
                        alt="裁剪预览"
                        className="absolute max-w-none pointer-events-none select-none opacity-90"
                        style={{
                            width: `${100 * cropScale}%`,
                            height: `${100 * cropScale}%`,
                            left: `${-((cropScale - 1) * cropX)}%`,
                            top: `${-((cropScale - 1) * cropY)}%`,
                        }}
                    />

                    {/* 底部滑块控制器 */}
                    <div
                        className="absolute bottom-2 inset-x-2 bg-black/75 rounded px-3 py-2 flex items-center gap-3 z-50 shadow-lg text-white"
                        onMouseDown={e => e.stopPropagation()} // 防止触发拖拽
                    >
                        <Crop size={14} className="opacity-80" />
                        <input
                            type="range"
                            min="1.0"
                            max="3.0"
                            step="0.05"
                            value={cropScale}
                            onChange={e => {
                                setCropScale(parseFloat(e.target.value));
                            }}
                            className="flex-1 accent-purple-500 h-1 rounded bg-white/20 appearance-none outline-none"
                        />
                        <span className="text-[10px] font-mono min-w-[30px] text-right">
                            {cropScale.toFixed(2)}x
                        </span>
                        <button
                            onClick={handleSaveCrop}
                            className="bg-purple-600 hover:bg-purple-500 active:bg-purple-700 p-1.5 rounded-full text-white transition-colors"
                        >
                            <Check size={12} className="stroke-[3]" />
                        </button>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
        </div>
    );
};
