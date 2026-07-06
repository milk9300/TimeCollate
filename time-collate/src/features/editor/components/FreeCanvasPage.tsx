import React, { useRef, useEffect } from 'react';
import type { Page, Chapter, CanvasElement, PhotoFrameElement, TextElement, StickerElement, ShapeElement } from '../../../types';
import { useBookStore } from '../../../store';
import { useAssetStore } from '../../../store/useAssetStore';
import { getVirtualDimensions } from '../../../rendering/PhysicalConstants';
import { CanvasPhotoFrameElement } from '../../../rendering/components/CanvasPhotoFrameElement';
import { CanvasTextElement } from '../../../rendering/components/CanvasTextElement';
import { CanvasStickerElement } from '../../../rendering/components/CanvasStickerElement';
import { CanvasShapeElement } from '../../../rendering/components/CanvasShapeElement';
import { adaptV1ToV2 } from '../../../utils/canvasMigrationAdapter';
import { getPageAtmosphere } from '../../../utils/textSlotHelper';

// #region Helper Functions
/**
 * 获取图片的自然宽高，带超时保护
 */
const getImageDimensions = (url: string, timeoutMs: number = 3000): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
        const img = new Image();
        let timer: any = null;

        const cleanUp = () => {
            if (timer) clearTimeout(timer);
            img.onload = null;
            img.onerror = null;
        };

        img.onload = () => {
            cleanUp();
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };

        img.onerror = () => {
            cleanUp();
            resolve({ width: 250, height: 200 }); // 加载出错 fallback
        };

        timer = setTimeout(() => {
            cleanUp();
            resolve({ width: 250, height: 200 }); // 超时 fallback
        }, timeoutMs);

        img.src = url;
    });
};

/**
 * 根据原始尺寸自适应计算出画布初始大小
 */
const calculateInitialSize = (originalWidth?: number, originalHeight?: number, maxLimit: number = 300) => {
    const w = originalWidth || 250;
    const h = originalHeight || 200;
    const ratio = w / h;

    let finalWidth = 250;
    let finalHeight = 200;

    if (ratio > 1) {
        // 宽图
        finalWidth = maxLimit;
        finalHeight = Math.round(maxLimit / ratio);
    } else {
        // 长图或方图
        finalHeight = maxLimit;
        finalWidth = Math.round(maxLimit * ratio);
    }

    return { width: finalWidth, height: finalHeight };
};
// #endregion

interface FreeCanvasPageProps {
    chapter?: Chapter;
    page: Page;
    scale: number;
    isCover?: boolean;
}

/**
 * @description 自由画布编辑内核组件 (FreeCanvasPage)
 * 纯自由交互画布，支持物理背景渲染、对齐线吸附、资产拖拽放置、多选/单选管理及键盘快捷微调。
 */
export const FreeCanvasPage: React.FC<FreeCanvasPageProps> = ({ chapter, page, scale, isCover = false }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const assetCache = useAssetStore(state => state.assetCache);
    
    // Zustand 状态与 Action 绑定
    const selectedElementIds = useBookStore(state => state.selectedElementIds);
    const setSelectedElementIds = useBookStore(state => state.setSelectedElementIds);
    const alignLines = useBookStore(state => state.alignLines);
    const updatePageElementsLocal = useBookStore(state => state.updatePageElementsLocal);
    const commitPageElements = useBookStore(state => state.commitPageElements);
    const updatePage = useBookStore(state => state.updatePage);
    const templates = useBookStore(state => state.templates);

    // 查询当前页面关联排版（主要是为了 Legacy V1 降级解析）
    const template = templates.find(t => t.id === page.templateId);

    // 解析尺寸
    const currentBook = useBookStore(state => state.currentBook);
    const pageSize = currentBook?.pageSize || 'A4';
    const { virtualWidth, virtualHeight } = getVirtualDimensions(pageSize);

    // 内存对齐：若非 V2 则动态适配
    const isV2 = Array.isArray(page.elements);
    const mockChapter: Chapter = { id: 'cover-chapter', title: currentBook?.title || '', date: currentBook?.author || '', pages: [] };
    const targetChapter = chapter || mockChapter;
    const adapted = !isV2 ? adaptV1ToV2(page, targetChapter, template, pageSize) : null;
    const elements = isV2 ? page.elements! : (adapted?.elements || []);
    
    // 防御性兼容：若已经是 V2 格式，但在之前的迁移或保存中丢失了氛围背景色（导致底色为纯白且白字看不清）
    // 我们在此处提取氛围作为 fallback，保证文字的可视对比度
    const atmosphere = getPageAtmosphere(page.content || '');
    let atmosphereBg = '#FFFFFF';
    if (atmosphere === 'travel') atmosphereBg = '#FAF5EC';
    else if (atmosphere === 'retro') atmosphereBg = '#ECE3D3';
    else if (atmosphere === 'film') atmosphereBg = '#18181B';
    else if (atmosphere === 'notebook') atmosphereBg = '#FDFCF7';

    const rawBg = isV2 ? page.background : adapted?.background;
    const background = {
        ...rawBg,
        color: (!rawBg?.color || rawBg.color === '#FFFFFF') ? atmosphereBg : rawBg.color
    };

    const chapterId = targetChapter.id;
    const pageId = page.id;

    // 监听键盘按键微调/删除元素
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedElementIds.length === 0) return;

            // 正在编辑文字时禁用键盘微移与删除
            const activeEl = document.activeElement;
            const isEditing = activeEl && (
                activeEl.tagName === 'INPUT' || 
                activeEl.tagName === 'TEXTAREA' || 
                activeEl.getAttribute('contenteditable') === 'true'
            );
            if (isEditing) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();

                // 批量删除元素
                const nextElements = elements.filter(el => !selectedElementIds.includes(el.id));
                commitPageElements(chapterId, pageId, nextElements);
                setSelectedElementIds([]);
                return;
            }

            const moveKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (moveKeys.includes(e.key)) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1; // 按住 Shift 键大步微移
                let dx = 0;
                let dy = 0;

                if (e.key === 'ArrowUp') dy = -step;
                if (e.key === 'ArrowDown') dy = step;
                if (e.key === 'ArrowLeft') dx = -step;
                if (e.key === 'ArrowRight') dx = step;

                const nextElements = elements.map(el => {
                    if (selectedElementIds.includes(el.id)) {
                        return {
                            ...el,
                            x: Math.max(0, Math.min(virtualWidth - el.width, el.x + dx)),
                            y: Math.max(0, Math.min(virtualHeight - el.height, el.y + dy))
                        };
                    }
                    return el;
                });

                // 微移过程直接 commit
                commitPageElements(chapterId, pageId, nextElements);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedElementIds, elements, chapterId, pageId, virtualWidth, virtualHeight, commitPageElements, setSelectedElementIds]);

    // 统一更新回调：拖拽/缩放中高频局部更新
    const handleUpdateElement = (elementId: string, updates: Partial<CanvasElement>) => {
        const original = elements.find(el => el.id === elementId);
        if (!original) return;

        let nextElements = elements;
        if (original.groupId && (updates.x !== undefined || updates.y !== undefined)) {
            const dx = updates.x !== undefined ? updates.x - original.x : 0;
            const dy = updates.y !== undefined ? updates.y - original.y : 0;

            nextElements = elements.map(el => {
                if (el.id === elementId) return { ...el, ...updates } as CanvasElement;
                if (el.groupId === original.groupId) {
                    return { ...el, x: el.x + dx, y: el.y + dy } as CanvasElement;
                }
                return el;
            });
        } else {
            nextElements = elements.map(el => {
                if (el.id === elementId) return { ...el, ...updates } as CanvasElement;
                return el;
            });
        }

        updatePageElementsLocal(chapterId, pageId, nextElements);
    };

    // 拖拽结束：提交更新至云端，写入 Undo 撤销栈
    const handleDragEnd = () => {
        const store = useBookStore.getState();
        const doc = store.documents?.find(d => d.id === page.id);
        const latestElements = doc?.elements || [];
        commitPageElements(chapterId, pageId, latestElements);
    };

    const isBgSelected = selectedElementIds.includes('page-background');

    // 背景样式
    const bgStyle: React.CSSProperties = {
        backgroundColor: background?.color || '#FFFFFF',
        backgroundImage: background?.backgroundImage ? `url(${background.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: isBgSelected 
            ? '0 0 0 3px rgba(139, 61, 255, 0.25), 0 25px 50px -12px rgba(0, 0, 0, 0.3)' 
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        outline: isBgSelected 
            ? '2px solid #8b3dff' 
            : '1px solid rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease-in-out'
    };

    // 空白点击：选中页面背景，同时清除具体的元素编辑状态 (文字/照片/贴图)
    const handleBackgroundMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // 只响应左键
        e.stopPropagation();
        setSelectedElementIds(['page-background']);
        
        const store = useBookStore.getState();
        store.setActiveTextEdit(null);
        store.setActivePhotoEdit(null);
        store.setActiveStickerEdit(null);
    };

    // 放置外部资产事件处理
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // 根据容器物理尺寸换算为虚拟绝对坐标
        const virtualX = Math.round((clickX / rect.width) * virtualWidth);
        const virtualY = Math.round((clickY / rect.height) * virtualHeight);

        const dragPhotoId = e.dataTransfer.getData('photoId');
        const dragPexelsPhotoJson = e.dataTransfer.getData('pexelsPhoto');
        const dragStickerId = e.dataTransfer.getData('stickerId');
        const dragBackgroundUrl = e.dataTransfer.getData('backgroundImageUrl');
        const textUrl = e.dataTransfer.getData('text/plain');

        // 计算新元素的 zIndex (最大值加 1)
        const maxZIndex = elements.reduce((max, el) => Math.max(max, el.zIndex || 10), 0);

        let newElement: CanvasElement | null = null;

        // 0. 处理 Pexels 拖入
        if (dragPexelsPhotoJson) {
            try {
                const pexelsPhoto = JSON.parse(dragPexelsPhotoJson);
                const imgW = pexelsPhoto.width || 300;
                const imgH = pexelsPhoto.height || 300;

                const size = calculateInitialSize(imgW, imgH, 300);
                const initialWidth = size.width;
                const initialHeight = size.height;

                newElement = {
                    id: `photo-${Date.now()}`,
                    type: 'photo-frame',
                    x: Math.max(0, Math.min(virtualWidth - initialWidth, virtualX - Math.round(initialWidth / 2))),
                    y: Math.max(0, Math.min(virtualHeight - initialHeight, virtualY - Math.round(initialHeight / 2))),
                    width: initialWidth,
                    height: initialHeight,
                    rotate: 0,
                    zIndex: maxZIndex + 1,
                    photo: {
                        id: pexelsPhoto.id,
                        url: pexelsPhoto.url, // 这里是 large URL
                        scale: 1.0,
                        xOffset: 50,
                        yOffset: 50,
                        styleType: 'normal',
                        filterType: 'none',
                        caption: `Photo by ${pexelsPhoto.photographer}`
                    }
                } as PhotoFrameElement;
            } catch (err) {
                console.error('Failed to parse Pexels photo drag data:', err);
            }
        }
        // 1. 处理贴纸拖入
        else if (dragStickerId) {
            newElement = {
                id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'sticker',
                x: virtualX,
                y: virtualY,
                width: 150,
                height: 150,
                rotate: 0,
                zIndex: maxZIndex + 1,
                stickerConfig: {
                    stickerId: dragStickerId,
                    imageUrl: ''
                }
            } as StickerElement;
        }
        // 2. 处理背景拖入 - 现改为作为常规图片框元素拖入
        else if (dragBackgroundUrl) {
            const dims = await getImageDimensions(dragBackgroundUrl);
            const size = calculateInitialSize(dims.width, dims.height, 300);
            const initialWidth = size.width;
            const initialHeight = size.height;

            newElement = {
                id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'photo-frame',
                x: Math.max(0, Math.min(virtualWidth - initialWidth, virtualX - Math.round(initialWidth / 2))),
                y: Math.max(0, Math.min(virtualHeight - initialHeight, virtualY - Math.round(initialHeight / 2))),
                width: initialWidth,
                height: initialHeight,
                rotate: 0,
                zIndex: maxZIndex + 1,
                photo: {
                    id: `bg-${Date.now()}`,
                    url: dragBackgroundUrl,
                    scale: 1.0,
                    xOffset: 50,
                    yOffset: 50,
                    styleType: 'normal',
                    filterType: 'none',
                    caption: '背景图'
                }
            } as PhotoFrameElement;
        }
        // 3. 从资产库拖入图片
        else if (dragPhotoId && assetCache[dragPhotoId]) {
            const asset = assetCache[dragPhotoId];
            let imgW = asset.metadata?.width;
            let imgH = asset.metadata?.height;

            if (!imgW || !imgH) {
                const dims = await getImageDimensions(asset.file_url);
                imgW = dims.width;
                imgH = dims.height;
            }

            const size = calculateInitialSize(imgW, imgH, 300);
            const initialWidth = size.width;
            const initialHeight = size.height;

            newElement = {
                id: `photo-${Date.now()}`,
                type: 'photo-frame',
                x: Math.max(0, Math.min(virtualWidth - initialWidth, virtualX - Math.round(initialWidth / 2))),
                y: Math.max(0, Math.min(virtualHeight - initialHeight, virtualY - Math.round(initialHeight / 2))),
                width: initialWidth,
                height: initialHeight,
                rotate: 0,
                zIndex: maxZIndex + 1,
                photo: {
                    id: asset.id,
                    url: asset.file_url,
                    scale: 1.0,
                    xOffset: 50,
                    yOffset: 50,
                    styleType: 'normal',
                    filterType: 'none',
                    caption: asset.name || '相册图片'
                }
            } as PhotoFrameElement;
        }
        // 4. 处理外链图片拖入
        else if (textUrl && textUrl.startsWith('http')) {
            const dims = await getImageDimensions(textUrl);
            const size = calculateInitialSize(dims.width, dims.height, 300);
            const initialWidth = size.width;
            const initialHeight = size.height;

            newElement = {
                id: `photo-${Date.now()}`,
                type: 'photo-frame',
                x: Math.max(0, Math.min(virtualWidth - initialWidth, virtualX - Math.round(initialWidth / 2))),
                y: Math.max(0, Math.min(virtualHeight - initialHeight, virtualY - Math.round(initialHeight / 2))),
                width: initialWidth,
                height: initialHeight,
                rotate: 0,
                zIndex: maxZIndex + 1,
                photo: {
                    id: `dragged-${Date.now()}`,
                    url: textUrl,
                    scale: 1.0,
                    xOffset: 50,
                    yOffset: 50,
                    styleType: 'normal',
                    filterType: 'none',
                    caption: '拖入图片'
                }
            } as PhotoFrameElement;
        }

        if (newElement) {
            const nextElements = [...elements, newElement];
            // 静默升级为 V2 格式落库
            if (!isV2) {
                updatePage(chapterId, page.id, {
                    elements: nextElements,
                    background: background
                });
            } else {
                commitPageElements(chapterId, pageId, nextElements);
            }
            setSelectedElementIds([newElement.id]);
        }
    };

    // 渲染具体组件列表
    const renderElements = () => {
        // zIndex 升序排序，使 zIndex 高的覆盖在上方
        const sorted = [...elements].sort((a, b) => (a.zIndex || 10) - (b.zIndex || 10));

        return sorted.map(el => {
            const onUpdate = (updates: any) => handleUpdateElement(el.id, updates);

            switch (el.type) {
                case 'text':
                    return (
                        <CanvasTextElement
                            key={el.id}
                            element={el as TextElement}
                            chapterId={chapterId}
                            pageId={page.id}
                            onUpdate={onUpdate}
                            onDragEnd={handleDragEnd}
                            canvasRef={containerRef}
                            siblingElements={elements}
                        />
                    );
                case 'photo-frame':
                    return (
                        <CanvasPhotoFrameElement
                            key={el.id}
                            element={el as PhotoFrameElement}
                            chapterId={chapterId}
                            pageId={page.id}
                            onUpdate={onUpdate}
                            onDragEnd={handleDragEnd}
                            canvasRef={containerRef}
                            siblingElements={elements}
                        />
                    );
                case 'sticker':
                    return (
                        <CanvasStickerElement
                            key={el.id}
                            element={el as StickerElement}
                            chapterId={chapterId}
                            pageId={page.id}
                            onUpdate={onUpdate}
                            onDragEnd={handleDragEnd}
                            canvasRef={containerRef}
                            siblingElements={elements}
                        />
                    );
                case 'shape':
                    return (
                        <CanvasShapeElement
                            key={el.id}
                            element={el as ShapeElement}
                            chapterId={chapterId}
                            pageId={page.id}
                            onUpdate={onUpdate}
                            onDragEnd={handleDragEnd}
                            canvasRef={containerRef}
                            siblingElements={elements}
                        />
                    );
                default:
                    return null;
            }
        });
    };

    return (
        <div
            ref={containerRef}
            style={bgStyle}
            onMouseDown={handleBackgroundMouseDown}
            onClick={(e) => e.stopPropagation()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="free-canvas-container select-none relative overflow-hidden"
        >
            {/* 选中背景时的边角指示器 */}
            {isBgSelected && (
                <div className="absolute top-2 right-2 bg-[#8b3dff] text-white text-[8px] font-bold px-2 py-0.5 rounded shadow-sm z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-200 canvas-editor-ui">
                    页面底板已选中
                </div>
            )}
            {/* 印刷专属提示与辅助线 (出血线) */}
            {isCover && (
                <div className="absolute inset-[15px] border border-dashed border-red-500/25 pointer-events-none z-30 canvas-editor-ui">
                    <div className="absolute top-1 left-2 text-[6px] text-red-500/40 font-black tracking-widest uppercase">
                        15mm 印刷出血线 (Bleed Line)
                    </div>
                </div>
            )}
            {/* 网格背景图装饰 */}
            {background?.gridPattern && (
                <div
                    className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(var(--theme-secondary) 1px, transparent 1px), linear-gradient(90deg, var(--theme-secondary) 1px, transparent 1px)`,
                        backgroundSize: '8mm 8mm'
                    }}
                />
            )}



            {/* 核心元素图层渲染 */}
            <div className="absolute inset-0">
                {renderElements()}
            </div>

            {/* 对齐吸附辅助线 */}
            {alignLines.map((line: any, idx: number) => {
                if (line.type === 'v') {
                    return (
                        <div
                            key={`v-${idx}`}
                            className="absolute top-0 bottom-0 border-l border-dashed border-[#8b3dff] z-50 pointer-events-none canvas-editor-ui"
                            style={{ left: `${(line.val / virtualWidth) * 100}%` }}
                        />
                    );
                } else {
                    return (
                        <div
                            key={`h-${idx}`}
                            className="absolute left-0 right-0 border-t border-dashed border-[#8b3dff] z-50 pointer-events-none canvas-editor-ui"
                            style={{ top: `${(line.val / virtualHeight) * 100}%` }}
                        />
                    );
                }
            })}
        </div>
    );
};
