import React, { useMemo } from 'react';
import { useBookStore, getVirtualChapters } from '../../../store';
import { ZoomableCanvas, MIN_ZOOM, MAX_ZOOM, type ZoomableCanvasRef } from './ZoomableCanvas';
import { BookCoverLayout } from '../../../rendering/layouts/BookCoverLayout';
import { PrefaceLayout } from '../../../rendering/layouts/PrefaceLayout';
import { BookRenderer } from '../../../rendering/BookRenderer';
import { PhotoInspector } from './PhotoInspector';
import { ZoomControls } from './ZoomControls';
import { PAGE_SIZES } from '../../../rendering/PhysicalConstants';
import { BookOpen, ChevronLeft } from 'lucide-react';

interface CanvasAreaProps {
    activeChapterId: string | null;
    activePageId: string | null;
    isEditingCover: boolean;
    isEditingPreface: boolean;
    isDrawerOpen: boolean;
    setIsDrawerOpen: (val: boolean) => void;
    isFullscreenPreview: boolean;
    showGridOverlay: boolean;
    previewScale: number;
    setPreviewScale: (val: number) => void;
    canvasRef: React.RefObject<ZoomableCanvasRef>;
    handleZoomIn: () => void;
    handleZoomOut: () => void;
}

/**
 * @description 主视口 Zoomable Canvas 画布渲染区域 (已实现切片订阅与解耦，提升重渲染性能)
 */
export const CanvasArea: React.FC<CanvasAreaProps> = ({
    activeChapterId,
    activePageId,
    isEditingCover,
    isEditingPreface,
    isDrawerOpen,
    setIsDrawerOpen,
    isFullscreenPreview,
    showGridOverlay,
    previewScale,
    setPreviewScale,
    canvasRef,
    handleZoomIn,
    handleZoomOut
}) => {
    // 1. 切片订阅，仅当编辑器属性或模式变化时触发相应更新
    const currentBook = useBookStore(state => state.currentBook);
    const editorMode = useBookStore(state => state.editorMode);
    const setActivePhotoEdit = useBookStore(state => state.setActivePhotoEdit);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);
    
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
            className={`flex-1 bg-[#DEDEE2] relative overflow-hidden flex flex-col transition-all duration-300 ${
                isFullscreenPreview ? 'absolute inset-0 z-50' : ''
            }`}
        >
            {/* Collapsed Drawer floating toggle trigger button */}
            {!isDrawerOpen && !isFullscreenPreview && (
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="absolute top-1/2 right-0 -translate-y-1/2 z-30 bg-white/95 border border-r border-gray-200/80 shadow-xl py-4 px-1.5 rounded-l-xl text-gray-500 hover:text-indigo-600 transition-all hover:bg-white flex items-center cursor-pointer"
                    title="展开属性面板"
                >
                    <ChevronLeft size={14} />
                </button>
            )}

            {/* Canvas Zoomable Wrapper with Spread rendering */}
            <div className="flex-1 overflow-hidden">
                <ZoomableCanvas
                    ref={canvasRef}
                    scale={previewScale}
                    onScaleChange={setPreviewScale}
                    isFullscreen={isFullscreenPreview}
                >
                    {isEditingCover ? (
                        /* Leather book casing for Cover */
                        <div
                            className="relative flex p-5 bg-gradient-to-r from-[#1B0F0B] via-[#2F1D17] to-[#1B0F0B] rounded-[24px] shadow-[0_35px_80px_-15px_rgba(0,0,0,0.65)] border border-amber-950/30 select-none animate-in zoom-in-95 duration-300"
                            style={{
                                width: `calc(${baseWidth}mm + 40px)`,
                                height: `calc(${baseHeight}mm + 40px)`
                            }}
                        >
                            {/* Grid overlay under pages */}
                            {showGridOverlay && (
                                <div
                                    className="absolute inset-0 pointer-events-none z-[1] opacity-15"
                                    style={{
                                        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1.5px)',
                                        backgroundSize: '16px 16px'
                                    }}
                                />
                            )}
                            {/* Subtle leather texture simulation */}
                            <div
                                className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay z-[2] rounded-[24px]"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                                }}
                            />

                            {/* Inner pages block */}
                            <div className="flex-1 flex gap-0 relative z-10 bg-white rounded-lg shadow-2xl overflow-hidden border border-black/10">
                                {/* Cover Page */}
                                <div
                                    className="bg-white relative overflow-hidden flex flex-col transition-all duration-300"
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
                            </div>
                        </div>
                    ) : isEditingPreface ? (
                        /* Leather book casing for Preface */
                        <div
                            className="relative flex p-5 bg-gradient-to-r from-[#1B0F0B] via-[#2F1D17] to-[#1B0F0B] rounded-[24px] shadow-[0_35px_80px_-15px_rgba(0,0,0,0.65)] border border-amber-950/30 select-none animate-in zoom-in-95 duration-300"
                            style={{
                                width: `calc(${baseWidth}mm + 40px)`,
                                height: `calc(${baseHeight}mm + 40px)`
                            }}
                        >
                            {/* Grid overlay under pages */}
                            {showGridOverlay && (
                                <div
                                    className="absolute inset-0 pointer-events-none z-[1] opacity-15"
                                    style={{
                                        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1.5px)',
                                        backgroundSize: '16px 16px'
                                    }}
                                />
                            )}
                            {/* Subtle leather texture simulation */}
                            <div
                                className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay z-[2] rounded-[24px]"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                                }}
                            />

                            {/* Inner pages block */}
                            <div className="flex-1 flex gap-0 relative z-10 bg-white rounded-lg shadow-2xl overflow-hidden border border-black/10">
                                {/* Preface Page */}
                                <div
                                    className="bg-white relative overflow-hidden flex flex-col transition-all duration-300"
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
                                    {currentBook?.showPreface !== false ? (
                                        <PrefaceLayout book={currentBook} />
                                    ) : (
                                        <div className="w-full h-full p-[25mm] relative overflow-hidden bg-slate-50 flex flex-col items-center justify-center select-none text-center">
                                            <div className="absolute top-[10%] opacity-[0.015] select-none pointer-events-none">
                                                <span className="text-[100pt] font-black italic tracking-widest uppercase">Preface</span>
                                            </div>
                                            <div className="relative z-10 w-full max-w-[85%] flex flex-col items-center justify-center">
                                                <div className="w-12 h-12 mb-6 rounded-full bg-slate-100/80 flex items-center justify-center text-slate-400 border border-slate-200/50">
                                                    <BookOpen size={20} />
                                                </div>
                                                <h3 className="text-slate-700 font-medium text-sm mb-2 tracking-wider">序言页已禁用</h3>
                                                <p className="text-slate-450 text-[11px] leading-relaxed mb-6 max-w-[220px] text-slate-400">
                                                    禁用后，序言页将不参与 3D 翻页书展示与 PDF 导出编译。
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        useBookStore.getState().updateBookSettings({ showPreface: true });
                                                    }}
                                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-medium shadow-md shadow-indigo-150 hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    启用序言页
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        activePage && (
                            /* Leather book casing for Single Page */
                            <div
                                className="relative flex p-5 bg-gradient-to-r from-[#1B0F0B] via-[#2F1D17] to-[#1B0F0B] rounded-[24px] shadow-[0_35px_80px_-15px_rgba(0,0,0,0.65)] border border-amber-950/30 select-none animate-in zoom-in-95 duration-300"
                                style={{
                                    width: `calc(${baseWidth}mm + 40px)`,
                                    height: `calc(${baseHeight}mm + 40px)`
                                }}
                            >
                                {/* Grid overlay under pages */}
                                {showGridOverlay && (
                                    <div
                                        className="absolute inset-0 pointer-events-none z-[1] opacity-15"
                                        style={{
                                            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1.5px)',
                                            backgroundSize: '16px 16px'
                                        }}
                                    />
                                )}
                                {/* Subtle leather texture simulation */}
                                <div
                                    className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay z-[2] rounded-[24px]"
                                    style={{
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                                    }}
                                />

                                {/* Inner page block */}
                                <div className="flex-1 flex gap-0 relative z-10 bg-white rounded-lg shadow-2xl overflow-hidden border border-black/10">
                                    <div
                                        onClick={() => {
                                            setActivePhotoEdit(null);
                                            setActiveTextEdit(null);
                                        }}
                                        className="bg-white relative overflow-hidden transition-all duration-300 cursor-pointer flex-1"
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
                            </div>
                        )
                    )}
                </ZoomableCanvas>
            </div>

            {/* Floating Inspector Panel for Photos */}
            {!isLivePreview && <PhotoInspector />}

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
            <div className={`absolute left-6 z-20 bg-white/95 backdrop-blur-md shadow-lg px-4 py-2 rounded-full border border-gray-200/50 text-[9px] text-gray-400 flex items-center gap-3 transition-all duration-300 ease-in-out ${floatingBottomClass}`}>
                <span>Ctrl + 滚轮 缩放</span>
                <span className="text-gray-300">|</span>
                <span>V 选择编辑</span>
                <span className="text-gray-300">|</span>
                <span>H 拖拽画布</span>
                <span className="text-gray-300">|</span>
                <span>ESC 退出全屏</span>
            </div>

            {isFullscreenPreview && (
                <div className="absolute bottom-16 left-6 z-20 bg-black/60 backdrop-blur shadow-sm px-4 py-2 rounded-full text-[10px] font-medium text-white/80 animate-bounce">
                    按 ESC 退出全屏预览
                </div>
            )}
        </div>
    );
};
