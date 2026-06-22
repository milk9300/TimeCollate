import React, { useMemo, useState } from 'react';
import { useBookStore, getVirtualChapters } from '../../../store';
import { ZoomableCanvas, MIN_ZOOM, MAX_ZOOM, type ZoomableCanvasRef } from './ZoomableCanvas';
import { BookCoverLayout } from '../../../rendering/layouts/BookCoverLayout';
import { PrefaceLayout } from '../../../rendering/layouts/PrefaceLayout';
import { BookRenderer } from '../../../rendering/BookRenderer';
import { PhotoInspector } from './PhotoInspector';
import { ZoomControls } from './ZoomControls';
import { PAGE_SIZES } from '../../../rendering/PhysicalConstants';
import { BookOpen, HelpCircle } from 'lucide-react';
import { CanvasFloatingToolbar } from './CanvasFloatingToolbar';

interface CanvasAreaProps {
    activeChapterId: string | null;
    activePageId: string | null;
    isDrawerOpen: boolean;
    setIsDrawerOpen: (val: boolean) => void;
    isFullscreenPreview: boolean;
    previewScale: number;
    setPreviewScale: (val: number) => void;
    canvasRef: React.RefObject<ZoomableCanvasRef | null>;
    handleZoomIn: () => void;
    handleZoomOut: () => void;
}

/**
 * @description 主视口 Zoomable Canvas 画布渲染区域 (已实现切片订阅与解耦，提升重渲染性能)
 */
export const CanvasArea: React.FC<CanvasAreaProps> = ({
    activeChapterId,
    activePageId,
    isDrawerOpen,
    setIsDrawerOpen,
    isFullscreenPreview,
    previewScale,
    setPreviewScale,
    canvasRef,
    handleZoomIn,
    handleZoomOut
}) => {
    const editorScope = useBookStore(state => state.editorScope);

    const isEditingCover = editorScope === 'cover';
    const [showTips, setShowTips] = useState(true);
    // 1. 切片订阅，仅当编辑器属性或模式变化时触发相应更新
    const currentBook = useBookStore(state => state.currentBook);
    const editorMode = useBookStore(state => state.editorMode);
    const setActivePhotoEdit = useBookStore(state => state.setActivePhotoEdit);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);
    const setActiveStickerEdit = useBookStore(state => state.setActiveStickerEdit);

    const isLivePreview = editorMode === 'hand';

    const chapters = useMemo(() => {
        if (!currentBook || !currentBook.pages) return [];
        return getVirtualChapters(currentBook.pages);
    }, [currentBook]);

    const activeChapter = chapters.find(c => c.id === activeChapterId) || null;
    const activePage = activeChapter?.pages.find(p => p.id === activePageId) || null;

    const dimensions = currentBook ? (PAGE_SIZES[currentBook.pageSize] || PAGE_SIZES.A4) : PAGE_SIZES.A4;
    const { width: baseWidth, height: baseHeight } = dimensions;

    const floatingBottomClass = 'bottom-6';

    if (!currentBook) return null;

    return (
        <div
            id="editor-canvas-container"
            className={`flex-1 bg-[#DEDEE2] relative overflow-hidden flex flex-col transition-all duration-300 ${isFullscreenPreview ? 'absolute inset-0 z-50' : ''
                }`}
        >

            {/* Canvas Zoomable Wrapper with Spread rendering */}
            <div className="flex-1 overflow-hidden">
                <ZoomableCanvas
                    ref={canvasRef}
                    scale={previewScale}
                    onScaleChange={setPreviewScale}
                    isFullscreen={isFullscreenPreview}
                >
                    {isEditingCover ? (
                        <div
                            className="relative bg-white rounded-lg shadow-2xl overflow-hidden border border-black/10 select-none animate-in zoom-in-95 duration-300 flex flex-col"
                            style={{
                                width: `${baseWidth}mm`,
                                height: `${baseHeight}mm`
                            }}
                        >
                            {/* 纸张纹理层 */}
                            <div
                                className="absolute inset-0 pointer-events-none opacity-[0.03] z-[2] print:hidden"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                                }}
                            />
                            <BookCoverLayout book={currentBook} />
                        </div>
                    ) : (
                        activePage && (
                            /* Inner page block */
                            <div
                                className="relative bg-white rounded-lg shadow-2xl overflow-hidden border border-black/10 select-none animate-in zoom-in-95 duration-300"
                                style={{
                                    width: `${baseWidth}mm`,
                                    height: `${baseHeight}mm`
                                }}
                            >
                                <div
                                    onClick={() => {
                                        setActivePhotoEdit(null);
                                        setActiveTextEdit(null);
                                        setActiveStickerEdit(null);
                                    }}
                                    className="bg-white relative overflow-hidden transition-all duration-300 cursor-pointer w-full h-full"
                                >
                                    {/* 纸张纹理层 */}
                                    <div
                                        className="absolute inset-0 pointer-events-none opacity-[0.03] z-[2] print:hidden"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                                        }}
                                    />
                                    <BookRenderer
                                        page={activePage}
                                        pageSize={currentBook.pageSize}
                                        chapterTitle={activeChapter?.title}
                                        chapterDate={activeChapter?.date}
                                        chapterIndex={chapters.findIndex(c => c.id === activeChapter?.id)}
                                        book={currentBook}
                                        side={(() => {
                                            const pageIndex = activeChapter?.pages.findIndex(p => p.id === activePageId) ?? 0;
                                            return pageIndex % 2 === 0 ? 'left' : 'right';
                                        })()}
                                        readOnly={isLivePreview}
                                        isCanvas={true}
                                    />
                                    <div className="absolute top-4 left-4 bg-black/60 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full z-20 pointer-events-none">
                                        第 {(() => {
                                            let idx = 1;
                                            for (const ch of chapters) {
                                                for (const p of ch.pages) {
                                                    if (p.id === activePage.id) return idx;
                                                    idx++;
                                                }
                                            }
                                            return 1;
                                        })()} 页
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </ZoomableCanvas>
            </div>

            {/* Floating Inspector Panel for Photos has been integrated to the right sidebar */}

            {/* Floating Zoom Control Bubble & Paper Size Overlay Footer */}
            <div className={`absolute right-6 z-20 flex items-center gap-2.5 transition-all duration-300 ease-in-out ${floatingBottomClass}`}>
                <ZoomControls
                    previewScale={previewScale}
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    onZoomToScale={(scale) => {
                        canvasRef.current?.zoomToScale(scale);
                        setPreviewScale(scale);
                    }}
                />
            </div>

            {/* Hotkeys tips */}
            <button
                onClick={() => setShowTips(!showTips)}
                className={`absolute left-6 z-20 bg-white/95 hover:bg-white backdrop-blur-md shadow-lg rounded-full border border-gray-200/50 text-gray-400 flex items-center transition-all duration-500 ease-in-out cursor-pointer hover:text-gray-600 ${floatingBottomClass} ${
                    showTips ? 'px-4 py-2 gap-3 h-8' : 'w-8 h-8 justify-center p-0'
                }`}
                title={showTips ? '点击收起快捷键提示' : '点击展开快捷键提示'}
            >
                <HelpCircle size={12} className={`text-gray-400 shrink-0 transition-transform duration-500 ${showTips ? 'rotate-180 text-indigo-500' : ''}`} />
                <div className={`flex items-center gap-3 transition-all duration-500 ease-in-out overflow-hidden text-[9px] ${
                    showTips ? 'max-w-[500px] opacity-100' : 'max-w-0 opacity-0 pointer-events-none'
                }`}>
                    <span className="whitespace-nowrap">滚轮 滑动 (Shift 左右)</span>
                    <span className="text-gray-300 shrink-0">|</span>
                    <span className="whitespace-nowrap">Ctrl + 滚轮 缩放</span>
                    <span className="text-gray-300 shrink-0">|</span>
                    <span className="whitespace-nowrap">V 选择编辑</span>
                    <span className="text-gray-300 shrink-0">|</span>
                    <span className="whitespace-nowrap">H / 空格 拖拽画布</span>
                </div>
            </button>

            {/* 全局随动悬浮工具栏 */}
            {!isLivePreview && <CanvasFloatingToolbar />}
        </div>
    );
};
