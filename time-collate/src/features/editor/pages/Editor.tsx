import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBookStore, getVirtualChapters } from '../../../store';
import { useAssetStore } from '../../../store/useAssetStore';
import { editorFacade } from '../runtime/EditorFacade';
import { historyObserver } from '../runtime/services/HistoryObserver';
import { SpreadNavigator } from '../components/SpreadNavigator';
import { ConfirmModal } from '../../common/components/ConfirmModal';
import { FlipBook } from '../../../rendering/FlipBook';
import { ThemeProvider } from '../../../rendering/ThemeManager';
import { ExportProgressModal } from '../../common/components/ExportProgressModal';
import { CanvasArea } from '../components/CanvasArea';
import { TopContextualToolbar } from '../components/TopContextualToolbar';
import { RightEditorDock } from '../components/RightEditorDock';
import { RightEditorDrawer } from '../components/RightEditorDrawer';
import { UploadProgressBar } from '../components/UploadProgressBar';
import { MobilePromo } from '../components/MobilePromo';
import { DEFAULT_ZOOM } from '../components/ZoomableCanvas';
import type { ZoomableCanvasRef } from '../components/ZoomableCanvas';
import {
    BookOpen,
    Undo2,
    Redo2,
    Loader2
} from 'lucide-react';
import { parseCoverUrl } from '../components/GeneratedCover';
import { getBookService } from '../../../services/serviceFactory';
import type { Book, Template, Page } from '../../../types';
import axios from 'axios';

const bookService = getBookService();

/**
 * @description 完全体 Canvas WYSIWYG 编辑器页面 (已解耦组件树并实现切片订阅，以保证 60 FPS 体验)
 */
export function Editor() {
    const { bookId, templateId } = useParams<{ bookId: string; templateId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // 0. 如果是 templateId 独立模板编辑器路径，重定向至工作台
    useEffect(() => {
        if (templateId) {
            alert('模板独立编辑器已废弃。现在您可以在具体的书籍/相册页编辑中，直接点击右上角“将当前页发布为页面模板”发布或修改模板。');
            navigate('/workbench', { replace: true });
        }
    }, [templateId, navigate]);

    // 1. Zustand Store 切片状态与操作，防止不必要的多余重渲染
    const currentBook = useBookStore(state => state.currentBook);
    const loadBook = useBookStore(state => state.loadBook);
    const isLoading = useBookStore(state => state.isLoading);
    const error = useBookStore(state => state.error);
    const updateBookSettings = useBookStore(state => state.updateBookSettings);
    const editorMode = useBookStore(state => state.editorMode);
    const setEditorMode = useBookStore(state => state.setEditorMode);
    const editorScope = useBookStore(state => state.editorScope);
    const setEditorScope = useBookStore(state => state.setEditorScope);
    const activeFrontPage = useBookStore(state => state.activeFrontPage);
    const setActiveFrontPage = useBookStore(state => state.setActiveFrontPage);
    const setActivePhotoEdit = useBookStore(state => state.setActivePhotoEdit);
    const loadAssetCache = useAssetStore(state => state.loadAssetCache);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);
    const activePhotoEdit = useBookStore(state => state.activePhotoEdit);
    const activeTextEdit = useBookStore(state => state.activeTextEdit);
    const historyPast = useBookStore(state => state.historyPast);
    const historyFuture = useBookStore(state => state.historyFuture);
    const undo = useBookStore(state => state.undo);
    const redo = useBookStore(state => state.redo);
    const loadTemplates = useBookStore(state => state.loadTemplates);
    const saveStatus = useBookStore(state => state.saveStatus);
    const triggerSaveBook = useBookStore(state => state.triggerSaveBook);
    const flushSaveBook = useBookStore(state => state.flushSaveBook);

    const enableCommandHistory = useBookStore(state => state.enableCommandHistory);
    const commandCanUndo = useBookStore(state => state.commandCanUndo);
    const commandCanRedo = useBookStore(state => state.commandCanRedo);

    // 2. 派生虚拟章节信息
    const chapters = useMemo(() => {
        if (!currentBook || !currentBook.pages) return [];
        return getVirtualChapters(currentBook.pages);
    }, [currentBook]);

    // 3. 编辑器 UI 本地交互状态
    const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const isDrawerOpen = useBookStore(state => state.isDrawerOpen);
    const setIsDrawerOpen = useBookStore(state => state.setIsDrawerOpen);
    const rightActiveTab = useBookStore(state => state.rightActiveTab);
    const setRightActiveTab = useBookStore(state => state.setRightActiveTab);
    const isLivePreview = editorMode === 'hand';

    const isFullscreenPreview = false;
    const [isReadMode, setIsReadMode] = useState(false);
    const [showEmptyContentModal, setShowEmptyContentModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [previewScale, setPreviewScale] = useState(DEFAULT_ZOOM);
    const [activeExportJobId, setActiveExportJobId] = useState<string | null>(null);
    const [exportTypeTitle, setExportTypeTitle] = useState<string>('');
    const [isMobile, setIsMobile] = useState(false);

    const canvasRef = useRef<ZoomableCanvasRef>(null);

    // 4. 设备检测与拦截推广推广页
    useEffect(() => {
        const checkDevice = () => {
            const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
            const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
            const isMobileUA = mobileRegex.test(userAgent);
            const isSmallScreen = window.innerWidth < 768;
            setIsMobile(isMobileUA || isSmallScreen);
        };
        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    // 正式激活新历史栈热切换上线测试
    useEffect(() => {
        editorFacade.setEnableCommandHistory(true);
        historyObserver.clear();
        return () => {
            editorFacade.setEnableCommandHistory(false);
            historyObserver.clear();
        };
    }, []);

    // 5. 挂载时加载书籍与排版模板，卸载时强制同步保存
    // 关键修复: loadBook 完成后立即在 .then() 中处理 pageId 定位，
    // 彻底消除 loadBook 的 editorScope:'cover' 硬编码与 queryPageId effect 之间的竞态。
    const pageIdNavPendingRef = useRef(false);
    const queryPageId = searchParams.get('pageId');

    useEffect(() => {
        useBookStore.setState({ currentBook: null });
        
        // 如果 URL 携带 pageId，在 loadBook 之前就标记 pending，防止初始化 effect 抢跑
        if (queryPageId) {
            pageIdNavPendingRef.current = true;
        }
        
        if (bookId) {
            loadBook(bookId).then(() => {
                // loadBook 完成后立即检查 pageId，不等待 React effect 调度
                if (queryPageId) {
                    const state = useBookStore.getState();
                    const pageDocs = state.documents.filter(d => d.type === 'page');
                    const targetDoc = pageDocs.find(d => d.id === queryPageId);
                    
                    if (targetDoc) {
                        // 直接在 Zustand store 中同步设置目标页面，绕过 editorScope:'cover' 默认值
                        useBookStore.setState({
                            editorScope: 'chapters',
                            activeDocumentId: queryPageId,
                        });
                    }
                    
                    // 解除 pending 标记
                    pageIdNavPendingRef.current = false;
                }
            });
        }
        loadTemplates();
        loadAssetCache();
    }, [bookId, loadBook, loadTemplates, loadAssetCache]);

    useEffect(() => {
        return () => {
            flushSaveBook(); // 强制写入最后一秒钟 of debounce changes
        };
    }, [flushSaveBook]);

    // 6. 初始化状态，确保 activeChapterId 和 activePageId 的连贯性
    useEffect(() => {
        if (currentBook) {
            // 如果正在等待 pageId 导航完成（或刚刚完成），跳过初始化逻辑
            if (pageIdNavPendingRef.current) return;

            if (editorScope === 'cover') {
                setActiveChapterId(null);
                setActivePageId(null);
            } else if (!activeChapterId && chapters.length > 0) {
                setActiveChapterId(chapters[0].id);
                if (chapters[0].pages.length > 0) {
                    setActivePageId(chapters[0].pages[0].id);
                }
            }
        }
    }, [editorScope, currentBook, chapters]);

    // 当章节变化时，自动选择其第一个页面
    useEffect(() => {
        if (currentBook && activeChapterId) {
            const chapter = chapters.find(c => c.id === activeChapterId);
            if (chapter && chapter.pages.length > 0) {
                const pageExistsInChapter = chapter.pages.some(p => p.id === activePageId);
                if (!pageExistsInChapter) {
                    setActivePageId(chapter.pages[0].id);
                }
            }
        }
    }, [activeChapterId, chapters]);

    // 监控 URL query 参数 pageId，在 loadBook 完成后精准定位到对应章节和页面
    useEffect(() => {
        if (currentBook && queryPageId && chapters.length > 0) {
            const chapter = chapters.find(c => c.pages.some(p => p.id === queryPageId));
            if (chapter) {
                // 设置 React 本地页面状态（章节 + 页面选中）
                setEditorScope('chapters');
                setActiveChapterId(chapter.id);
                setActivePageId(queryPageId);
                
                // 同步设置 Zustand store 的 activeDocumentId，确保画布立即渲染目标页面
                useBookStore.setState({ activeDocumentId: queryPageId });
                
                // 清除 URL 参数，避免页面刷新或重复激活
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('pageId');
                setSearchParams(newParams, { replace: true });
            }
            // 无论是否找到目标页面，均解除 pending 标记
            pageIdNavPendingRef.current = false;
        }
    }, [currentBook, queryPageId, chapters, searchParams, setSearchParams, setEditorScope]);

    // Legacy activePhotoEdit hook removed to respect new Canva inspector workflow

    // 当视图切换到「书封」时，不主动开启侧边栏，由用户触发（点击右侧 dock 选项卡）

    const isSpacePressed = useRef(false);

    // 监听空格键按下状态，用于在快捷键临时切手形模式时避免收起侧边栏
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ') {
                isSpacePressed.current = true;
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === ' ') {
                isSpacePressed.current = false;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // 监听编辑模式变化：浏览模式（hand）下自动折叠侧边栏，避免遮挡画布预览；编辑模式下由用户手动开启侧边栏
    useEffect(() => {
        if (isSpacePressed.current) return;
        if (editorMode === 'hand') {
            setIsDrawerOpen(false);
        }
    }, [editorMode]);

    // 快捷键绑定 (V: 选择, H: 拖拽, Ctrl+Z: 撤销, Ctrl+Y: 重做)
    useEffect(() => {
        const handleKeys = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

            if (e.key.toLowerCase() === 'v' && !isCmdOrCtrl) {
                setEditorMode('select');
            } else if (e.key.toLowerCase() === 'h' && !isCmdOrCtrl) {
                setEditorMode('hand');
            } else if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    if (enableCommandHistory ? commandCanRedo : historyFuture.length > 0) redo();
                } else {
                    if (enableCommandHistory ? commandCanUndo : historyPast.length > 0) undo();
                }
            } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                if (enableCommandHistory ? commandCanRedo : historyFuture.length > 0) redo();
            }
        };

        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [historyPast.length, historyFuture.length, commandCanUndo, commandCanRedo, enableCommandHistory, undo, redo, setEditorMode]);

    // 缩放控制
    const handleZoomIn = useCallback(() => canvasRef.current?.zoomIn(), []);
    const handleZoomOut = useCallback(() => canvasRef.current?.zoomOut(), []);

    // 导航回调
    const handleSelectChapter = useCallback((chapterId: string) => {
        setEditorScope('chapters');
        setActiveChapterId(chapterId);
        setActivePhotoEdit(null);
    }, [setActivePhotoEdit, setEditorScope]);

    const handleSelectCover = useCallback(() => {
        setEditorScope('cover');
        setActiveFrontPage('cover');
        setActiveChapterId(null);
        setActivePageId(null);
        setActivePhotoEdit(null);
    }, [setActivePhotoEdit, setEditorScope, setActiveFrontPage]);


    const handleBack = useCallback(() => navigate('/workbench'), [navigate]);

    // 解锁发布书籍
    const handleUnlock = async () => {
        if (!currentBook) return;
        try {
            await updateBookSettings({ status: 'private' });
            setShowUnlockModal(false);
        } catch (error) {
            console.error('Failed to unlock book:', error);
            alert('解锁失败，请重试');
        }
    };
 
    const isUndoDisabled = enableCommandHistory ? !commandCanUndo : historyPast.length === 0;
    const isRedoDisabled = enableCommandHistory ? !commandCanRedo : historyFuture.length === 0;

    if (isMobile) {
        return <MobilePromo />;
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-xl text-gray-400 animate-pulse font-medium">正在加载时光集...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4 px-6 select-none">
                <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center text-xl shadow-xs border border-rose-100/50">
                    ⚠️
                </div>
                <h3 className="text-base font-black text-slate-800">无法加载模板编辑器</h3>
                <p className="text-xs font-semibold text-slate-400 max-w-sm text-center leading-relaxed">
                    {error}。您的账户可能在后端数据库中不具备管理员或设计师权限 (403 Forbidden)。
                </p>
                <button
                    onClick={() => {
                        useBookStore.setState({ error: null });
                        navigate('/workbench');
                    }}
                    className="mt-2 px-6 py-2.5 bg-[#3A4454] hover:bg-[#2C3539] text-white rounded-xl font-bold text-xs.5 shadow-sm cursor-pointer transition-all active:scale-95"
                >
                    返回工作台
                </button>
            </div>
        );
    }

    if (!currentBook) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 flex-col gap-4">
                <div className="text-xl text-gray-400">未找到该作品</div>
                <button
                    onClick={handleBack}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all cursor-pointer font-semibold"
                >
                    返回工作台
                </button>
            </div>
        );
    }

    return (
        <ThemeProvider theme="classic">
            <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900 font-sans select-none flex-col">

                {/* 0. TopBar Header */}
                {!isFullscreenPreview && (
                    <div id="editor-top-bar" className="h-14 w-full bg-white border-b border-gray-200/80 px-6 flex items-center justify-between z-30 shadow-sm flex-shrink-0">
                        {/* Left Section: Back & Cloud Save Status Lamp */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleBack}
                                className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 cursor-pointer flex-shrink-0"
                            >
                                ← 返回工作台
                            </button>
                            <div className="h-4 w-px bg-gray-200" />

                            {/* View Mode Selector Tab */}
                            <div className="flex bg-slate-100 p-0.5 rounded-full border border-slate-200/50 shadow-inner shrink-0 select-none">
                                <button
                                    onClick={() => setEditorScope('cover')}
                                    className={`px-3.5 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${editorScope === 'cover'
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                >
                                    书封
                                </button>
                                <button
                                    onClick={() => setEditorScope('chapters')}
                                    className={`px-3.5 py-0.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${editorScope === 'chapters'
                                            ? 'bg-white text-indigo-600 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                >
                                    内容
                                </button>
                            </div>

                            <div className="h-4 w-px bg-gray-200" />

                            {/* Cloud Sync Status Indicator Lamp */}
                            {saveStatus === 'saved' && (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    云端已同步
                                </span>
                            )}
                            {saveStatus === 'saving' && (
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                    <Loader2 size={10} className="animate-spin text-blue-500" />
                                    正在同步...
                                </span>
                            )}
                            {saveStatus === 'error' && (
                                <button
                                    onClick={triggerSaveBook}
                                    className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm cursor-pointer transition-colors"
                                    title="点击重新发起云端同步"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                    同步失败 (点击重试)
                                </button>
                            )}
                        </div>

                        {/* Right Section: Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={undo}
                                disabled={isUndoDisabled}
                                className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-full text-gray-500 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer shadow-sm"
                                title="撤销操作 (Ctrl + Z)"
                            >
                                <Undo2 size={13} />
                            </button>
                            <button
                                onClick={redo}
                                disabled={isRedoDisabled}
                                className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-full text-gray-500 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer shadow-sm"
                                title="重做操作 (Ctrl + Y)"
                            >
                                <Redo2 size={13} />
                            </button>

                            <div className="w-px h-4 bg-gray-200" />

                            {/* 3D Preview Toggle */}
                            <button
                                onClick={() => {
                                    const hasContent = chapters.some(c => c.pages.length > 0);
                                    if (hasContent) {
                                        setIsReadMode(true);
                                    } else {
                                        setShowEmptyContentModal(true);
                                    }
                                }}
                                className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-indigo-600 px-3.5 py-1.5 rounded-full transition-all text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                                <BookOpen size={13} />
                                <span>预览回忆书</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Sub-body: 3 Columns Layout */}
                <div className="flex-1 flex w-full overflow-hidden relative">

                    {/* Column 1: LeftSpreadNavigator */}
                    {!isFullscreenPreview && (
                        <SpreadNavigator
                            activeChapterId={activeChapterId}
                            activePageId={activePageId}
                            onSelectChapter={handleSelectChapter}
                            onSelectPage={(chapterId, pageId) => {
                                setEditorScope('chapters');
                                setActiveChapterId(chapterId);
                                setActivePageId(pageId);
                                setActivePhotoEdit(null);
                                setActiveTextEdit(null);
                            }}
                            onUnlock={() => setShowUnlockModal(true)}
                        />
                    )}

                    {/* Column 2: Zoomable Canvas Panel + Top Contextual Toolbar */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                        {!isFullscreenPreview && (
                            <TopContextualToolbar
                                activeChapterId={activeChapterId}
                                activePageId={activePageId}
                            />
                        )}
                        <CanvasArea
                            activeChapterId={activeChapterId}
                            activePageId={activePageId}
                            isDrawerOpen={isDrawerOpen}
                            setIsDrawerOpen={setIsDrawerOpen}
                            isFullscreenPreview={isFullscreenPreview}
                            previewScale={previewScale}
                            setPreviewScale={setPreviewScale}
                            canvasRef={canvasRef}
                            handleZoomIn={handleZoomIn}
                            handleZoomOut={handleZoomOut}
                        />
                    </div>

                    {/* Column 3: Collapsible RightPanel Dock & Drawer */}
                    {!isFullscreenPreview && (
                        <div className="flex h-full items-stretch shrink-0 z-20">
                            {isDrawerOpen && rightActiveTab && (
                                <RightEditorDrawer
                                    activeTab={rightActiveTab}
                                    activeChapterId={activeChapterId}
                                    activePageId={activePageId}
                                />
                            )}
                            <RightEditorDock
                                activeTab={rightActiveTab}
                                setActiveTab={setRightActiveTab}
                                isDrawerOpen={isDrawerOpen}
                                setIsDrawerOpen={setIsDrawerOpen}
                            />
                        </div>
                    )}
                </div>

                {/* Floating OSS Uploading Progress Board (挂载于主视口右下角/全屏外层) */}
                <UploadProgressBar />

                {/* 3D Flip Book reader layer */}
                {isReadMode && currentBook && (
                    <FlipBook
                        book={(() => {
                            const coverDoc = useBookStore.getState().documents.find(d => d.type === 'cover');
                            const coverPage: Page = coverDoc ? {
                                id: coverDoc.id || 'virtual-cover',
                                content: '',
                                photos: [],
                                templateId: 'book-cover',
                                pageType: 'cover',
                                elements: coverDoc.elements || [],
                                background: coverDoc.background || { color: '#FAF8E7' }
                            } : {
                                id: 'virtual-cover',
                                content: '',
                                photos: [],
                                templateId: 'book-cover',
                                pageType: 'cover',
                                elements: [],
                                background: { color: '#FAF8E7' }
                            };
                            return {
                                ...currentBook,
                                pages: [coverPage, ...(currentBook.pages || [])]
                            };
                        })()}
                        onClose={() => setIsReadMode(false)}
                    />
                )}

                {/* Empty notification modal */}
                <ConfirmModal
                    isOpen={showEmptyContentModal}
                    title="书籍内容为空"
                    message="当前书籍看起来还没写什么内容呢。请先在左侧新建章节与添加页面，然后再来体验 3D 翻页阅读吧！"
                    confirmText="去编辑"
                    cancelText="关闭"
                    type="info"
                    onConfirm={() => setShowEmptyContentModal(false)}
                    onCancel={() => setShowEmptyContentModal(false)}
                />

                {/* Lock editing notification modal */}
                <ConfirmModal
                    isOpen={showUnlockModal}
                    title="解锁编辑作品？"
                    message="当前作品已发布，直接编辑将导致作品状态变为“私有”，并从广场中撤回。编辑完成后您需要重新提交发布申请。确定要继续吗？"
                    confirmText="解锁并编辑"
                    cancelText="保持锁定"
                    type="danger"
                    onConfirm={handleUnlock}
                    onCancel={() => setShowUnlockModal(false)}
                />

                {/* Export Progress Modal */}
                {activeExportJobId && (
                    <ExportProgressModal
                        jobId={activeExportJobId}
                        title={exportTypeTitle}
                        onClose={() => setActiveExportJobId(null)}
                    />
                )}
            </div>
        </ThemeProvider>
    );
}
