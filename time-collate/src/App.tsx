import { useEffect, useState, useCallback } from 'react';
import './App.css';
import { useBookStore } from './store';
import { ChapterList } from './components/ChapterList';
import { ChapterEditor } from './components/ChapterEditor';
import { BookRenderer } from './rendering/BookRenderer';
import { ThemeProvider } from './rendering/ThemeManager';
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from 'lucide-react';
import { PAGE_SIZES } from './rendering/PhysicalConstants';

// 缩放常量
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.5;
const DEFAULT_ZOOM = 0.4;

function App() {
  const { currentBook, createBook, isLoading } = useBookStore();
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
  const [previewScale, setPreviewScale] = useState(DEFAULT_ZOOM);

  useEffect(() => {
    const init = async () => {
      await createBook('我的时光集', '时光记录者');
    };
    init();
  }, [createBook]);

  // 当章节变化时，自动选择第一个页面
  // 注意：只在 activeChapterId 变化时触发，不在 currentBook 变化时触发
  useEffect(() => {
    if (currentBook && activeChapterId) {
      const chapter = currentBook.chapters.find(c => c.id === activeChapterId);
      if (chapter && chapter.pages.length > 0) {
        // 检查当前 activePageId 是否属于这个章节
        const pageExistsInChapter = chapter.pages.some(p => p.id === activePageId);
        if (!pageExistsInChapter) {
          setActivePageId(chapter.pages[0].id);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapterId]);

  // ESC键退出全屏预览
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenPreview) {
        setIsFullscreenPreview(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenPreview]);

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    setPreviewScale(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPreviewScale(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleZoomReset = useCallback(() => {
    setPreviewScale(DEFAULT_ZOOM);
  }, []);

  // 章节选择处理
  const handleSelectChapter = useCallback((chapterId: string) => {
    setActiveChapterId(chapterId);
  }, []);

  // 页面切换处理
  const handlePageChange = useCallback((pageId: string) => {
    setActivePageId(pageId);
  }, []);

  if (isLoading || !currentBook) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-400 animate-pulse">正在进入拾光集...</div>
      </div>
    );
  }

  // 获取当前活动章节和页面
  const activeChapter = currentBook.chapters.find(c => c.id === activeChapterId) || currentBook.chapters[0];
  const activePage = activeChapter?.pages.find(p => p.id === activePageId) || activeChapter?.pages[0];

  return (
    <ThemeProvider theme={currentBook.theme || 'classic'}>
      <div className="flex h-screen w-full overflow-hidden bg-[#FBFBFB] text-gray-900">
        {/* Navigation Sidebar */}
        {!isFullscreenPreview && (
          <ChapterList
            activeChapterId={activeChapterId}
            onSelectChapter={handleSelectChapter}
          />
        )}

        {/* Main Content Area: Split View */}
        <main className="flex-1 flex overflow-hidden">
          {/* Left: Editor Panel */}
          {!isFullscreenPreview && (
            <div className="w-[400px] border-r border-gray-100 bg-white flex flex-col shadow-sm z-10">
              <ChapterEditor
                chapterId={activeChapterId}
                activePageId={activePageId}
                onPageChange={handlePageChange}
              />
            </div>
          )}

          {/* Right: Live Preview Panel */}
          <div className={`flex-1 bg-[#E8E8E8] relative overflow-hidden flex flex-col transition-all duration-300 ${isFullscreenPreview ? 'absolute inset-0 z-50' : ''}`}>
            {/* 顶部状态栏 */}
            <div className="absolute top-6 left-6 z-20 bg-white/80 backdrop-blur shadow-sm px-4 py-2 rounded-full border border-white/50 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">实时物理渲染引擎</span>
            </div>

            {/* 右上角工具栏 */}
            <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
              {/* 缩放控制 */}
              <div className="bg-white/80 backdrop-blur shadow-sm rounded-full border border-white/50 flex items-center overflow-hidden">
                <button
                  onClick={handleZoomOut}
                  className="p-2.5 hover:bg-gray-100 transition-colors border-r border-gray-200"
                  title="缩小"
                  disabled={previewScale <= MIN_ZOOM}
                >
                  <ZoomOut size={14} className="text-gray-500" />
                </button>
                <button
                  onClick={handleZoomReset}
                  className="px-3 py-2 hover:bg-gray-100 transition-colors text-[10px] font-bold text-gray-600 min-w-[50px]"
                  title="重置缩放"
                >
                  {Math.round(previewScale * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-2.5 hover:bg-gray-100 transition-colors border-l border-gray-200"
                  title="放大"
                  disabled={previewScale >= MAX_ZOOM}
                >
                  <ZoomIn size={14} className="text-gray-500" />
                </button>
              </div>

              {/* 全屏切换 */}
              <button
                onClick={() => setIsFullscreenPreview(!isFullscreenPreview)}
                className="bg-white/80 backdrop-blur shadow-sm p-2.5 rounded-full border border-white/50 hover:bg-white transition-colors group"
                title={isFullscreenPreview ? '退出全屏 (ESC)' : '全屏预览'}
              >
                {isFullscreenPreview ? (
                  <Minimize2 size={14} className="text-gray-500 group-hover:text-gray-700" />
                ) : (
                  <Maximize2 size={14} className="text-gray-500 group-hover:text-gray-700" />
                )}
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {activePage && (
                <BookRenderer
                  page={activePage}
                  pageSize={currentBook.pageSize}
                  chapterTitle={activeChapter?.title}
                  chapterDate={activeChapter?.date}
                  chapterIndex={currentBook.chapters.findIndex(c => c.id === activeChapter?.id)}
                  scale={previewScale}
                />
              )}
            </div>

            {/* 底部信息栏 */}
            <div className="absolute bottom-6 right-6 z-20 bg-white/80 backdrop-blur shadow-sm px-4 py-2 rounded-full border border-white/50 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              印刷预览 • {currentBook.pageSize} ({PAGE_SIZES[currentBook.pageSize].width}x{PAGE_SIZES[currentBook.pageSize].height}mm)
            </div>

            {/* 全屏模式提示 */}
            {isFullscreenPreview && (
              <div className="absolute bottom-6 left-6 z-20 bg-black/60 backdrop-blur shadow-sm px-4 py-2 rounded-full text-[10px] font-medium text-white/80">
                按 ESC 退出全屏预览
              </div>
            )}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
