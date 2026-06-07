import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBookStore } from '../../../store';
import { SpreadNavigator } from '../components/SpreadNavigator';
import { BottomTray } from '../../book/components/BottomTray';
import { ConfirmModal } from '../../common/components/ConfirmModal';
import { BookRenderer } from '../../../rendering/BookRenderer';
import { FlipBook } from '../../../rendering/FlipBook';
import { ThemeProvider } from '../../../rendering/ThemeManager';
import { ZoomableCanvas, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, type ZoomableCanvasRef } from '../components/ZoomableCanvas';
import { PhotoInspector } from '../components/PhotoInspector';
import { AccordionSection } from '../components/AccordionSection';
import { BookCoverLayout } from '../../../rendering/layouts/BookCoverLayout';
import { PrefaceLayout } from '../../../rendering/layouts/PrefaceLayout';
import { getBookService } from '../../../services/serviceFactory';
import { ExportProgressModal } from '../../common/components/ExportProgressModal';
import { 
    ZoomIn, 
    ZoomOut, 
    BookOpen, 
    Share2,
    Undo2,
    Redo2,
    ChevronLeft,
    ChevronRight,
    Layout,
    Plus,
    Trash2,
    Upload,
    Settings,
    Info,
    MoreHorizontal,
    Palette,
    Sparkles
} from 'lucide-react';
import { PAGE_SIZES, type PageSize } from '../../../rendering/PhysicalConstants';
import { ShareModal } from '../../common/components/ShareModal';
import { useAuthStore } from '../../../store/useAuthStore';
import axios from 'axios';
import { parseCoverUrl } from '../components/GeneratedCover';
import { PREFACE_TEMPLATES, compilePrefaceText } from '../../../rendering/constants/prefaceTemplates';

const bookService = getBookService();
import { 
    getSlotText, 
    getSlotStyle, 
    updateSlotText, 
    updateSlotStyle, 
    parsePageContent,
    getPageAtmosphere,
    getPageFontFamily,
    getPageDecorations,
    updatePageAtmosphere,
    updatePageFontFamily,
    updatePageDecorations,
    type TextSlotData,
    type Decoration
} from '../../../utils/textSlotHelper';
import { STICKER_OPTIONS, STICKER_ASSETS } from '../../../rendering/StickerAssets';

// 高清系统推荐预设素材库
const PRESET_PHOTOS = [
    { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80', caption: '优胜美地山谷' },
    { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80', caption: '金色晚霞海滩' },
    { url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&auto=format&fit=crop&q=80', caption: '晨曦迷雾森林' },
    { url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80', caption: '旅行的指路针' },
    { url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80', caption: '午后惬意咖啡' },
    { url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80', caption: '温暖治愈猫咪' }
];

/**
 * @description 完全体 Canvas WYSIWYG 编辑器页面
 * 支持对开本(Spread View)、双击内联编辑文本、图片微调浮窗、可折叠属性面板
 */
export function Editor() {
    const { bookId } = useParams<{ bookId: string }>();
    const navigate = useNavigate();
    
    // Zustand Store State & Actions
    const { 
        currentBook, 
        loadBook, 
        isLoading, 
        updateBookSettings,
        editorMode,
        setEditorMode,
        setActivePhotoEdit,
        activePhotoEdit,
        activeTextEdit,
        setActiveTextEdit,
        updatePhotoSettings,
        historyPast,
        historyFuture,
        undo,
        redo,
        updateChapter,
        updatePage,
        addPageToChapter,
        addMockPhotoToPage,
        deletePhotoFromPage,
        templates,
        loadTemplates,
    } = useBookStore();

    // Editor UI States
    const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
    const [activePageId, setActivePageId] = useState<string | null>(null);
    const [isEditingCover, setIsEditingCover] = useState(true); // 默认进入封面编辑
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);
    const [isBottomTrayCollapsed, setIsBottomTrayCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<'page' | 'background'>('page');
    const [stickerSubTab, setStickerSubTab] = useState<'stickers' | 'stamps'>('stickers');
    const [showGridOverlay, setShowGridOverlay] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // 折叠面板状态（Accordion）
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        chapterInfo: true,
        templates: true,
        stickers: false,
    });
    const toggleSection = useCallback((key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // 章节标题/日期防抖本地状态
    const [localChapterTitle, setLocalChapterTitle] = useState('');
    const [localChapterDate, setLocalChapterDate] = useState('');
    
    const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);
    const [isReadMode, setIsReadMode] = useState(false);
    const [showEmptyContentModal, setShowEmptyContentModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [previewScale, setPreviewScale] = useState(DEFAULT_ZOOM);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [isGeneratingShare, setIsGeneratingShare] = useState(false);
    const [activeExportJobId, setActiveExportJobId] = useState<string | null>(null);
    const [exportTypeTitle, setExportTypeTitle] = useState<string>('');
    
    const canvasRef = useRef<ZoomableCanvasRef>(null);

    // 加载书籍与排版模板
    useEffect(() => {
        if (bookId) {
            loadBook(bookId);
        }
        loadTemplates();
    }, [bookId, loadBook, loadTemplates]);

    // 初始化状态，确保 activeChapterId 和 activePageId 的连贯性
    useEffect(() => {
        if (currentBook) {
            if (isEditingCover) {
                setActiveChapterId(null);
                setActivePageId(null);
            } else if (!activeChapterId && currentBook.chapters.length > 0) {
                setActiveChapterId(currentBook.chapters[0].id);
                if (currentBook.chapters[0].pages.length > 0) {
                    setActivePageId(currentBook.chapters[0].pages[0].id);
                }
            }
        }
    }, [isEditingCover, currentBook]);

    // 当章节变化时，自动选择其第一个页面
    useEffect(() => {
        if (currentBook && activeChapterId) {
            const chapter = currentBook.chapters.find(c => c.id === activeChapterId);
            if (chapter && chapter.pages.length > 0) {
                const pageExistsInChapter = chapter.pages.some(p => p.id === activePageId);
                if (!pageExistsInChapter) {
                    setActivePageId(chapter.pages[0].id);
                }
            }
        }
    }, [activeChapterId]);

    // 当选中的编辑照片或文本槽位变化时，自动切换侧边栏并确保抽屉打开
    useEffect(() => {
        if (activePhotoEdit || activeTextEdit) {
            setActiveTab('page');
            setIsDrawerOpen(true);
        }
    }, [activePhotoEdit, activeTextEdit]);

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

    // 监听编辑模式变化：浏览模式（hand）下自动折叠侧边栏和底部栏；编辑模式（select）下自动展开
    useEffect(() => {
        if (isSpacePressed.current) return;
        if (editorMode === 'hand') {
            setIsDrawerOpen(false);
            setIsBottomTrayCollapsed(true);
        } else if (editorMode === 'select') {
            setIsDrawerOpen(true);
            setIsBottomTrayCollapsed(false);
        }
    }, [editorMode]);

    // 监听空图片插槽被点击的自定义事件 (WYSIWYG 交互)
    useEffect(() => {
        const handleEmptySlotClick = async (e: any) => {
            const { chapterId, pageId, slotIndex } = e.detail;
            const choosePreset = window.confirm("点击确定选择上传本地图片，点击取消自动注入一张高清推荐风景图（适配Headless测试）：");
            if (choosePreset) {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (event: any) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        await useBookStore.getState().uploadPhotoToPage(chapterId, pageId, file, slotIndex);
                    }
                };
                input.click();
            } else {
                const randomPreset = PRESET_PHOTOS[Math.floor(Math.random() * PRESET_PHOTOS.length)];
                await addMockPhotoToPage(chapterId, pageId, randomPreset.url, randomPreset.caption, slotIndex);
            }
        };

        window.addEventListener('timecollate-empty-slot-click', handleEmptySlotClick);
        return () => {
            window.removeEventListener('timecollate-empty-slot-click', handleEmptySlotClick);
        };
    }, []);

    // ESC 键退出全屏预览
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreenPreview) {
                setIsFullscreenPreview(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreenPreview]);

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
                    if (historyFuture.length > 0) redo();
                } else {
                    if (historyPast.length > 0) undo();
                }
            } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                if (historyFuture.length > 0) redo();
            }
        };

        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [historyPast.length, historyFuture.length, undo, redo, setEditorMode]);

    // 缩放控制
    const handleZoomIn = useCallback(() => canvasRef.current?.zoomIn(), []);
    const handleZoomOut = useCallback(() => canvasRef.current?.zoomOut(), []);
    const handleZoomReset = useCallback(() => canvasRef.current?.resetZoom(), []);

    // 导航回调
    const handleSelectChapter = useCallback((chapterId: string) => {
        setIsEditingCover(false);
        setActiveChapterId(chapterId);
        setActivePhotoEdit(null);
    }, [setActivePhotoEdit]);

    const handleSelectCover = useCallback(() => {
        setIsEditingCover(true);
        setActiveChapterId(null);
        setActivePageId(null);
        setActivePhotoEdit(null);
    }, [setActivePhotoEdit]);

    const handleBack = useCallback(() => navigate('/'), [navigate]);

    // 生成分享链接
    const handleShare = async () => {
        if (!bookId) return;
        setIsGeneratingShare(true);
        try {
            const response = await axios.post(`/books/${bookId}/share`);
            if (response.data.success) {
                setShareUrl(response.data.data.shareUrl);
                setIsShareModalOpen(true);
            }
        } catch (error) {
            console.error('Failed to generate share link:', error);
            alert('生成分享链接失败，请稍后再试');
        } finally {
            setIsGeneratingShare(false);
        }
    };

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



    const handleAddSticker = (stickerContent: string) => {
        if (!activePage || !activeChapter) return;
        const currentDecorations = getPageDecorations(activePage.content);
        
        const asset = STICKER_ASSETS[stickerContent];
        const decorationType = asset?.category === 'stamps' ? 'stamp' : 'sticker';
        
        const newSticker: Decoration = {
            id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: decorationType,
            content: stickerContent,
            x: 50,
            y: 50,
            size: decorationType === 'stamp' ? 36 : 28,
            rotate: 0,
        };
        
        const updatedDecorations = [...currentDecorations, newSticker];
        const updatedContent = updatePageDecorations(activePage.content, updatedDecorations);
        
        updatePage(activeChapter.id, activePage.id, { content: updatedContent });
    };

    // 计算当前页面的对开 Spread 布局
    const activeChapter = useMemo(() => {
        if (!currentBook) return null;
        return currentBook.chapters.find(c => c.id === activeChapterId) || currentBook.chapters[0];
    }, [currentBook, activeChapterId]);

    // 解析当前书籍的封面设计配置，以便获取嵌入的真实底图/插画
    const parsedCover = useMemo(() => {
        if (!currentBook) return null;
        return parseCoverUrl(currentBook.coverUrl, currentBook.title);
    }, [currentBook?.coverUrl, currentBook?.title]);

    // 同步本地编辑状态到当前活跃章节（用于防抖输入）
    useEffect(() => {
        if (activeChapter) {
            setLocalChapterTitle(activeChapter.title);
            setLocalChapterDate(activeChapter.date);
        }
    }, [activeChapter?.id]);

    const activePage = useMemo(() => {
        if (!activeChapter) return null;
        return activeChapter.pages.find(p => p.id === activePageId) || activeChapter.pages[0];
    }, [activeChapter, activePageId]);

    const spreadPages = useMemo(() => {
        if (isEditingCover || !activeChapter) return null;
        const pages = activeChapter.pages;
        const activeIdx = pages.findIndex(p => p.id === activePageId);
        const pageIndex = activeIdx !== -1 ? activeIdx : 0;
        
        const isEven = pageIndex % 2 === 0;
        const leftIdx = isEven ? pageIndex : pageIndex - 1;
        const rightIdx = leftIdx + 1;
        
        return {
            left: pages[leftIdx] || null,
            right: pages[rightIdx] || null,
            leftIndex: leftIdx,
            rightIndex: rightIdx
        };
    }, [isEditingCover, activeChapter, activePageId]);

    const selectedPhoto = useMemo(() => {
        if (!activePhotoEdit || !currentBook) return null;
        for (const chap of currentBook.chapters) {
            if (chap.id === activePhotoEdit.chapterId) {
                const page = chap.pages.find(p => p.id === activePhotoEdit.pageId);
                if (page) {
                    return page.photos.find(p => p.id === activePhotoEdit.photoId) || null;
                }
            }
        }
        return null;
    }, [activePhotoEdit, currentBook]);

    const selectedTextSlot = useMemo(() => {
        if (!activeTextEdit || !currentBook) return null;
        const chapter = currentBook.chapters.find(c => c.id === activeTextEdit.chapterId);
        const page = chapter?.pages.find(p => p.id === activeTextEdit.pageId);
        if (!page) return null;

        // Find template elements for default base styles
        const template = templates.find((t) => t.id === page.layout);
        const element = template?.layoutSchema.elements.find(e => e.id === activeTextEdit.slotId);

        return {
            text: getSlotText(page.content, activeTextEdit.slotId),
            style: getSlotStyle(page.content, activeTextEdit.slotId, {
                fontSize: element?.style.fontSize,
                fontWeight: element?.style.fontWeight as any,
                lineHeight: element?.style.lineHeight,
            }),
            rawStyle: parsePageContent(page.content).slots[activeTextEdit.slotId]?.style || {}
        };
    }, [activeTextEdit, currentBook, templates]);

    const updateSelectedTextSlot = useCallback((updates: { text?: string; style?: Partial<TextSlotData['style']> }) => {
        if (!activeTextEdit || !currentBook) return;
        const { chapterId, pageId, slotId } = activeTextEdit;
        const chapter = currentBook.chapters.find(c => c.id === chapterId);
        const page = chapter?.pages.find(p => p.id === pageId);
        if (!page) return;

        let content = page.content || '';
        if (updates.text !== undefined) {
            content = updateSlotText(content, slotId, updates.text);
        }
        if (updates.style !== undefined) {
            content = updateSlotStyle(content, slotId, updates.style);
        }

        updatePage(chapterId, pageId, { content });
    }, [activeTextEdit, currentBook, updatePage]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-xl text-gray-400 animate-pulse font-medium">正在加载时光集...</div>
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
                    返回大厅
                </button>
            </div>
        );
    }

    const dimensions = PAGE_SIZES[currentBook.pageSize] || PAGE_SIZES.A4;
    const { width: baseWidth, height: baseHeight } = dimensions;

    const floatingBottomClass = isFullscreenPreview
        ? 'bottom-6'
        : isBottomTrayCollapsed
            ? 'bottom-[64px]'
            : 'bottom-[184px]';

    return (
        <ThemeProvider theme={currentBook.theme || 'classic'}>
            <div className="flex h-screen w-full overflow-hidden bg-[#F6F6F8] text-gray-900 font-sans select-none flex-col">
                
                {/* 0. TopBar Header */}
                {!isFullscreenPreview && (
                    <div id="editor-top-bar" className="h-14 w-full bg-white border-b border-gray-200/80 px-6 flex items-center justify-between z-30 shadow-sm flex-shrink-0">
                        {/* Left Section: Back & Title */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleBack}
                                className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                ← 返回大厅
                            </button>
                            <div className="h-4 w-px bg-gray-200" />
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={currentBook.title}
                                    onChange={(e) => updateBookSettings({ title: e.target.value })}
                                    className="text-sm font-black text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-600 focus:outline-none bg-transparent transition-colors px-1 max-w-[160px]"
                                    title="双击或点击编辑书名"
                                    placeholder="未命名回忆书"
                                />
                                <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
                                    已实时保存
                                </span>
                            </div>
                        </div>

                        {/* Center Section: Core Canvas Toolbar / Mode Toggle Slider capsule */}
                        <div className="bg-gray-100 p-0.5 rounded-full flex items-center gap-0.5 shadow-inner relative w-48 select-none">
                            {/* Slide background */}
                            <div 
                                className="absolute top-0.5 bottom-0.5 rounded-full bg-white shadow-sm transition-all duration-300"
                                style={{
                                    left: editorMode === 'select' ? 'calc(50% + 2px)' : '2px',
                                    width: 'calc(50% - 4px)'
                                }}
                            />
                            <button
                                onClick={() => setEditorMode('hand')}
                                className={`flex-1 py-1.5 text-center text-[10px] font-black uppercase tracking-wider relative z-10 transition-colors ${
                                    editorMode === 'hand' ? 'text-indigo-600 font-extrabold' : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                浏览模式
                            </button>
                            <button
                                onClick={() => setEditorMode('select')}
                                className={`flex-1 py-1.5 text-center text-[10px] font-black uppercase tracking-wider relative z-10 transition-colors ${
                                    editorMode === 'select' ? 'text-indigo-600 font-extrabold' : 'text-gray-500 hover:text-gray-900'
                                }`}
                            >
                                编辑模式
                            </button>
                        </div>

                        {/* Right Section: Actions */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={undo}
                                disabled={historyPast.length === 0}
                                className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-full text-gray-500 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer shadow-sm"
                                title="撤销操作 (Ctrl + Z)"
                            >
                                <Undo2 size={13} />
                            </button>
                            <button
                                onClick={redo}
                                disabled={historyFuture.length === 0}
                                className="p-2 border border-gray-200 bg-white hover:bg-gray-50 rounded-full text-gray-500 disabled:opacity-30 disabled:hover:bg-white transition-all cursor-pointer shadow-sm"
                                title="重做操作 (Ctrl + Y)"
                            >
                                <Redo2 size={13} />
                            </button>

                            <div className="w-px h-4 bg-gray-200" />

                            {/* 3D Preview Toggle */}
                            <button
                                onClick={() => {
                                    const hasContent = currentBook?.chapters.some(c => c.pages.length > 0);
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

                            {/* Share Publication */}
                            <button
                                onClick={handleShare}
                                disabled={isGeneratingShare}
                                className="bg-indigo-600 text-white shadow-sm px-4 py-1.5 rounded-full hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs font-bold"
                            >
                                <Share2 size={13} className={isGeneratingShare ? 'animate-pulse' : ''} />
                                <span>{isGeneratingShare ? '生成中...' : '发布分享'}</span>
                            </button>

                            {/* More Actions Dropdown Menu */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                                    className="p-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-full transition-colors cursor-pointer shadow-sm flex items-center justify-center"
                                    title="更多操作"
                                >
                                    <MoreHorizontal size={13} />
                                </button>
                                {showMoreMenu && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                                        <div className="absolute right-0 mt-1.5 w-40 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <button
                                                onClick={() => {
                                                    setShowGridOverlay(!showGridOverlay);
                                                    setShowMoreMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                            >
                                                {showGridOverlay ? '隐藏辅助网格' : '显示辅助网格'}
                                            </button>
                                            <div className="h-px bg-gray-100 my-1" />
                                            <button
                                                onClick={async () => {
                                                    if (!bookId) return;
                                                    setShowMoreMenu(false);
                                                    try {
                                                        const token = useAuthStore.getState().token;
                                                        const response = await fetch(`/api/export/${bookId}?type=pdf`, {
                                                            method: 'POST',
                                                            headers: {
                                                                'Authorization': `Bearer ${token}`
                                                            }
                                                        });
                                                        if (!response.ok) throw new Error('导出请求失败');
                                                        const data = await response.json();
                                                        if (data.success && data.jobId) {
                                                            setActiveExportJobId(data.jobId);
                                                            setExportTypeTitle('正在准备高清 PDF 交付物');
                                                        } else {
                                                            throw new Error(data.error || '获取任务失败');
                                                        }
                                                    } catch (error) {
                                                        console.error('PDF export failed:', error);
                                                        alert(`触发导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
                                                    }
                                                }}
                                                className="w-full text-left px-4 py-2 text-[10px] font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                                            >
                                                导出为 PDF 格式
                                            </button>
                                            <div className="h-px bg-gray-100 my-1" />
                                            <button
                                                onClick={() => {
                                                    if (confirm('确认清空当前回忆书所有页面吗？')) {
                                                        alert('清空功能执行完成');
                                                    }
                                                    setShowMoreMenu(false);
                                                }}
                                                className="w-full text-left px-4 py-2 text-[10px] font-bold text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                                清空书籍所有页面
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
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
                            isEditingCover={isEditingCover}
                            onSelectChapter={handleSelectChapter}
                            onSelectPage={(chapterId, pageId) => {
                                setIsEditingCover(false);
                                setActiveChapterId(chapterId);
                                setActivePageId(pageId);
                            }}
                            onSelectCover={handleSelectCover}
                            onUnlock={() => setShowUnlockModal(true)}
                        />
                    )}

                    {/* Column 2: Zoomable Canvas Panel */}
                    <div className={`flex-1 bg-[#DEDEE2] relative overflow-hidden flex flex-col transition-all duration-300 ${
                        isFullscreenPreview ? 'absolute inset-0 z-50' : ''
                    }`}>
                        
                        {/* Collapsed Drawer floating toggle trigger button */}
                        {!isDrawerOpen && !isFullscreenPreview && (
                            <button
                                onClick={() => setIsDrawerOpen(true)}
                                className="absolute top-1/2 right-0 -translate-y-1/2 z-30 bg-white/95 border border-r border-gray-200 shadow-xl py-4 px-1.5 rounded-l-xl text-gray-500 hover:text-indigo-600 transition-all hover:bg-white flex items-center"
                                title="展开属性面板"
                            >
                                <ChevronLeft size={14} />
                            </button>
                        )}

                        {/* Canvas Floating Header Title */}
                        <div className="absolute top-6 left-6 z-20 bg-white/95 backdrop-blur-md shadow-lg px-4 py-2 rounded-full border border-gray-200/50 flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                {isEditingCover ? '物理书籍外壳 - 封面与序言' : '物理书籍外壳 - 章节对开双页'}
                            </span>
                        </div>

                        {/* Canvas Zoomable Wrapper with Spread rendering */}
                        <div className="flex-1 overflow-hidden">
                            <ZoomableCanvas
                                ref={canvasRef}
                                scale={previewScale}
                                onScaleChange={setPreviewScale}
                                isFullscreen={isFullscreenPreview}
                            >
                                {isEditingCover ? (
                                    /* Leather book casing for Cover & Preface */
                                    <div 
                                        className="relative flex p-5 bg-gradient-to-r from-[#1B0F0B] via-[#2F1D17] to-[#1B0F0B] rounded-[24px] shadow-[0_35px_80px_-15px_rgba(0,0,0,0.65)] border border-amber-950/30 select-none animate-in zoom-in-95 duration-300"
                                        style={{
                                            width: `calc(${baseWidth * 2}mm + 40px)`,
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
                                        {/* Soft spine crease on leather casing */}
                                        <div className="absolute left-1/2 top-0 bottom-0 w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/45 to-transparent pointer-events-none z-[3]" />
                                        
                                        {/* Inner pages block */}
                                        <div className="flex-1 flex gap-0 relative z-10 bg-white rounded-lg shadow-2xl overflow-hidden border border-black/10">
                                            {/* Left Page: Cover */}
                                            <div 
                                                className="bg-white relative overflow-hidden flex flex-col transition-all duration-300 border-r border-gray-100" 
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
                                            
                                            {/* Right Page: Preface */}
                                            <div 
                                                className="bg-white relative overflow-hidden flex flex-col transition-all duration-300 border-l border-gray-100" 
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
                                                        {/* 装饰水印 */}
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
                                                                    const store = useBookStore.getState();
                                                                    store.updateBookSettings({ showPreface: true });
                                                                }}
                                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-medium shadow-md shadow-indigo-150 hover:shadow-lg transition-all flex items-center gap-1.5"
                                                            >
                                                                启用序言页
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Middle spine shadow overlay on top of pages */}
                                            <div className="absolute left-1/2 top-0 bottom-0 w-[24px] -translate-x-1/2 bg-gradient-to-r from-black/10 via-black/25 to-black/10 pointer-events-none z-[19] print:hidden" />
                                            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-black/30 pointer-events-none z-[20] print:hidden" />
                                        </div>
                                    </div>
                                ) : (
                                    spreadPages && (
                                        /* Leather book casing for Spread Pages */
                                        <div 
                                            className="relative flex p-5 bg-gradient-to-r from-[#1B0F0B] via-[#2F1D17] to-[#1B0F0B] rounded-[24px] shadow-[0_35px_80px_-15px_rgba(0,0,0,0.65)] border border-amber-950/30 select-none animate-in zoom-in-95 duration-300"
                                            style={{
                                                width: `calc(${baseWidth * 2}mm + 40px)`,
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
                                            {/* Soft spine crease on leather casing */}
                                            <div className="absolute left-1/2 top-0 bottom-0 w-10 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/45 to-transparent pointer-events-none z-[3]" />

                                            {/* Inner pages block */}
                                            <div className="flex-1 flex gap-0 relative z-10 bg-white rounded-lg shadow-2xl overflow-hidden border border-black/10">
                                                {/* Left Page */}
                                                {spreadPages.left && (
                                                    <div 
                                                        onClick={() => {
                                                            setActivePageId(spreadPages.left.id);
                                                            setActivePhotoEdit(null);
                                                            setActiveTextEdit(null);
                                                        }}
                                                        className={`bg-white relative overflow-hidden transition-all duration-300 cursor-pointer flex-1 border-r border-gray-100 ${
                                                            activePageId === spreadPages.left.id ? 'scale-[1.001]' : 'hover:scale-[1.0005]'
                                                        }`} 
                                                        style={{ 
                                                            width: `${baseWidth}mm`, 
                                                            height: `${baseHeight}mm`
                                                        }}
                                                    >
                                                        <BookRenderer
                                                            page={spreadPages.left}
                                                            pageSize={currentBook.pageSize}
                                                            chapterTitle={activeChapter?.title}
                                                            chapterDate={activeChapter?.date}
                                                            chapterIndex={currentBook.chapters.findIndex(c => c.id === activeChapter?.id)}
                                                            book={currentBook}
                                                            side="left"
                                                        />
                                                        {activePageId === spreadPages.left.id && (
                                                            <div className="absolute inset-0 border-4 border-indigo-600 z-[100] pointer-events-none rounded-sm" />
                                                        )}
                                                        <div className="absolute top-4 left-4 bg-black/60 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full z-20 pointer-events-none">
                                                            左页 (第 {spreadPages.leftIndex + 1} 页)
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Right Page (or Placeholder template) */}
                                                {spreadPages.right ? (
                                                    <div 
                                                        onClick={() => {
                                                            setActivePageId(spreadPages.right.id);
                                                            setActivePhotoEdit(null);
                                                            setActiveTextEdit(null);
                                                        }}
                                                        className={`bg-white relative overflow-hidden transition-all duration-300 cursor-pointer flex-1 border-l border-gray-100 ${
                                                            activePageId === spreadPages.right.id ? 'scale-[1.001]' : 'hover:scale-[1.0005]'
                                                        }`} 
                                                        style={{ 
                                                            width: `${baseWidth}mm`, 
                                                            height: `${baseHeight}mm`
                                                        }}
                                                    >
                                                        <BookRenderer
                                                            page={spreadPages.right}
                                                            pageSize={currentBook.pageSize}
                                                            chapterTitle={activeChapter?.title}
                                                            chapterDate={activeChapter?.date}
                                                            chapterIndex={currentBook.chapters.findIndex(c => c.id === activeChapter?.id)}
                                                            book={currentBook}
                                                            side="right"
                                                        />
                                                        {activePageId === spreadPages.right.id && (
                                                            <div className="absolute inset-0 border-4 border-indigo-600 z-[100] pointer-events-none rounded-sm" />
                                                        )}
                                                        <div className="absolute top-4 left-4 bg-black/60 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full z-20 pointer-events-none">
                                                            右页 (第 {spreadPages.rightIndex + 1} 页)
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Append right page trigger template */
                                                    <div 
                                                        onClick={async () => {
                                                            if (activeChapter) {
                                                                const newPageId = await addPageToChapter(activeChapter.id);
                                                                if (newPageId) setActivePageId(newPageId);
                                                            }
                                                        }}
                                                        className="shadow-inner bg-black/[0.02] border-l border-gray-100 hover:bg-white/40 transition-all flex flex-col items-center justify-center gap-3 cursor-pointer group flex-1" 
                                                        style={{ width: `${baseWidth}mm`, height: `${baseHeight}mm` }}
                                                    >
                                                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow group-hover:scale-110 transition-all border border-gray-100">
                                                            <Plus className="text-gray-400 group-hover:text-indigo-600 stroke-[2.5]" size={20} />
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-xs font-bold text-gray-500 group-hover:text-indigo-600 transition-colors">添加右页对开</p>
                                                            <p className="text-[10px] text-gray-400 mt-1">在当前章节的右侧页面追加排版页</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Middle spine shadow overlay on top of pages */}
                                                <div className="absolute left-1/2 top-0 bottom-0 w-[24px] -translate-x-1/2 bg-gradient-to-r from-black/10 via-black/25 to-black/10 pointer-events-none z-[19] print:hidden" />
                                                <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-black/30 pointer-events-none z-[20] print:hidden" />
                                            </div>
                                        </div>
                                    )
                                )}
                            </ZoomableCanvas>
                        </div>

                        {/* Floating Inspector Panel for Photos */}
                        <PhotoInspector />

                        {/* Floating Zoom Control Bubble & Paper Size Overlay Footer */}
                        <div className={`absolute right-6 z-20 flex items-center gap-2 transition-all duration-300 ease-in-out ${floatingBottomClass}`}>
                            <div className="bg-white/95 backdrop-blur-md shadow-lg px-4 py-2 rounded-full border border-gray-200/50 text-[9px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <span>纸张尺寸: {currentBook.pageSize}</span>
                                <span className="text-gray-300">|</span>
                                <span>{baseWidth}x{baseHeight}mm</span>
                            </div>
                            <div className="bg-white/95 backdrop-blur-md shadow-lg p-1 rounded-full border border-gray-200/50 flex items-center gap-1">
                                <button
                                    onClick={handleZoomOut}
                                    className="p-1.5 text-gray-500 hover:text-indigo-600 disabled:opacity-30 hover:bg-gray-100 rounded-full transition-all"
                                    title="缩小"
                                    disabled={previewScale <= MIN_ZOOM}
                                >
                                    <ZoomOut size={13} />
                                </button>
                                <button
                                    onClick={handleZoomReset}
                                    className="px-2 text-[10px] font-bold text-gray-600 min-w-[45px] text-center font-mono hover:bg-gray-100 py-0.5 rounded transition-all"
                                    title="重置缩放"
                                >
                                    {Math.round(previewScale * 100)}%
                                </button>
                                <button
                                    onClick={handleZoomIn}
                                    className="p-1.5 text-gray-500 hover:text-indigo-600 disabled:opacity-30 hover:bg-gray-100 rounded-full transition-all"
                                    title="放大"
                                    disabled={previewScale >= MAX_ZOOM}
                                >
                                    <ZoomIn size={13} />
                                </button>
                            </div>
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

                        {/* BottomTray (照片素材栏) */}
                        {!isFullscreenPreview && (
                            <BottomTray
                                activeChapterId={activeChapterId}
                                activePageId={activePageId}
                                isCollapsed={isBottomTrayCollapsed}
                                onCollapseChange={setIsBottomTrayCollapsed}
                            />
                        )}
                    </div>

                    {/* Column 3: Collapsible RightPanel (Inspector) */}
                    {!isFullscreenPreview && (
                        <div 
                            id="editor-right-sidebar"
                            className={`border-l border-gray-200/80 bg-white flex flex-col shadow-sm transition-all duration-300 ease-in-out z-10 relative ${
                                isDrawerOpen ? 'w-[320px]' : 'w-0 overflow-hidden opacity-0 border-l-0'
                            }`}
                        >
                            {/* Drawer Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                                <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                                    <Settings size={14} className="text-indigo-600" />
                                    回忆排版工坊
                                </span>
                                <button 
                                    onClick={() => setIsDrawerOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* Tab Headers */}
                            <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
                                <button
                                    onClick={() => {
                                        setActiveTab('page');
                                    }}
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-b-2 ${
                                        activeTab === 'page' 
                                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10' 
                                            : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <Layout size={13} />
                                    版面与组件
                                </button>
                                <button
                                    onClick={() => {
                                        setActiveTab('background');
                                    }}
                                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-b-2 ${
                                        activeTab === 'background' 
                                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10' 
                                            : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <Palette size={13} />
                                    背景与风格
                                </button>
                            </div>

                            {/* Scrollable Tab Content */}
                            <div className="flex-1 overflow-y-auto p-5 editor-panel-scrollbar">
                                {/* PAGE TAB */}
                                {activeTab === 'page' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {/* Photo Slot Inspector Overlay */}
                                        {activePhotoEdit && selectedPhoto ? (
                                            <div className="space-y-5 text-xs text-gray-600">
                                                <button 
                                                    onClick={() => setActivePhotoEdit(null)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 mb-2 bg-indigo-50/50 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-100/50 w-fit"
                                                >
                                                    <ChevronLeft size={13} />
                                                    返回版面设置
                                                </button>
                                                
                                                <div className="border-t border-gray-100 pt-3 space-y-4">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        所选图片属性
                                                    </div>

                                                    {/* Preview thumbnail */}
                                                    <div className="w-full aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50 relative group">
                                                        <img 
                                                            src={selectedPhoto.url} 
                                                            alt="Selected" 
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-white text-[10px] font-bold">选中编辑状态</span>
                                                        </div>
                                                    </div>

                                                    {/* 1. Scale Slider */}
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                                                            <span>缩放倍率 (Zoom)</span>
                                                            <span className="text-indigo-600 font-mono">{(selectedPhoto.scale || 1.0).toFixed(2)}x</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="1.0"
                                                            max="3.0"
                                                            step="0.05"
                                                            value={selectedPhoto.scale || 1.0}
                                                            onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { scale: parseFloat(e.target.value) })}
                                                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                        />
                                                    </div>

                                                    {/* 2. X Offset Slider */}
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                                                            <span>水平偏移 (Offset X)</span>
                                                            <span className="text-indigo-600 font-mono">{selectedPhoto.xOffset !== undefined ? selectedPhoto.xOffset : 50}%</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            step="1"
                                                            value={selectedPhoto.xOffset !== undefined ? selectedPhoto.xOffset : 50}
                                                            onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { xOffset: parseInt(e.target.value) })}
                                                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                        />
                                                    </div>

                                                    {/* 3. Y Offset Slider */}
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                                                            <span>垂直偏移 (Offset Y)</span>
                                                            <span className="text-indigo-600 font-mono">{selectedPhoto.yOffset !== undefined ? selectedPhoto.yOffset : 50}%</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            step="1"
                                                            value={selectedPhoto.yOffset !== undefined ? selectedPhoto.yOffset : 50}
                                                            onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { yOffset: parseInt(e.target.value) })}
                                                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                                        />
                                                    </div>

                                                    {/* 4. Caption */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">图片描述 (Caption)</span>
                                                        <input
                                                            type="text"
                                                            placeholder="写点描述记录此刻..."
                                                            value={selectedPhoto.caption || ''}
                                                            onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { caption: e.target.value })}
                                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none text-xs text-gray-700 focus:border-indigo-600 focus:bg-white transition-colors"
                                                        />
                                                    </div>

                                                    {/* 5. Physical Style Selection */}
                                                    <div className="flex flex-col gap-1.5 pt-1">
                                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">相框样式 (Frame Style)</span>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {[
                                                                { id: 'normal', name: '无边框' },
                                                                { id: 'rounded', name: '精致圆角' },
                                                                { id: 'polaroid', name: '拍立得' },
                                                                { id: 'film', name: '复古胶片' }
                                                            ].map(styleOpt => {
                                                                const isOptSelected = (selectedPhoto.styleType || 'normal') === styleOpt.id;
                                                                return (
                                                                    <button
                                                                        key={styleOpt.id}
                                                                        onClick={() => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { styleType: styleOpt.id as any })}
                                                                        className={`py-2 px-1 border rounded-xl font-bold text-center text-[10px] transition-all ${
                                                                            isOptSelected
                                                                                ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                                                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                                        }`}
                                                                    >
                                                                        {styleOpt.name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* 6. Color Filter Selection */}
                                                    <div className="flex flex-col gap-1.5 pt-1">
                                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">艺术滤镜 (Photo Filter)</span>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {[
                                                                { id: 'none', name: '原色' },
                                                                { id: 'warm', name: '温暖午后' },
                                                                { id: 'fresh', name: '日系清新' },
                                                                { id: 'retro', name: '摩登复古' }
                                                            ].map(filterOpt => {
                                                                const isOptSelected = (selectedPhoto.filterType || 'none') === filterOpt.id;
                                                                return (
                                                                    <button
                                                                        key={filterOpt.id}
                                                                        onClick={() => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { filterType: filterOpt.id as any })}
                                                                        className={`py-2 px-1 border rounded-xl font-bold text-center text-[10px] transition-all ${
                                                                            isOptSelected
                                                                                ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                                                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                                        }`}
                                                                    >
                                                                        {filterOpt.name}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                                                        <button
                                                            onClick={async () => {
                                                                const choosePreset = window.confirm("点击确定选择上传本地图片，点击取消自动替换为一张精美的推荐风景图：");
                                                                if (choosePreset) {
                                                                    const input = document.createElement('input');
                                                                    input.type = 'file';
                                                                    input.accept = 'image/*';
                                                                    input.onchange = async (e: any) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            try {
                                                                                const newPhoto = await bookService.uploadPhoto(file);
                                                                                await updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, {
                                                                                    url: newPhoto.url,
                                                                                    ossKey: newPhoto.ossKey,
                                                                                    width: newPhoto.width,
                                                                                    height: newPhoto.height,
                                                                                    scale: 1.0,
                                                                                    xOffset: 50,
                                                                                    yOffset: 50
                                                                                });
                                                                            } catch (err) {
                                                                                console.error(err);
                                                                            }
                                                                        }
                                                                    };
                                                                    input.click();
                                                                } else {
                                                                    const randomPreset = PRESET_PHOTOS[Math.floor(Math.random() * PRESET_PHOTOS.length)];
                                                                    await updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, {
                                                                        url: randomPreset.url,
                                                                        scale: 1.0,
                                                                        xOffset: 50,
                                                                        yOffset: 50
                                                                    });
                                                                }
                                                            }}
                                                            className="flex-1 py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-bold border border-gray-200/80 transition-colors text-center text-xs text-ellipsis overflow-hidden whitespace-nowrap"
                                                        >
                                                            替换图片
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (window.confirm('确定要删除这张图片吗？')) {
                                                                    await deletePhotoFromPage(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId);
                                                                    setActivePhotoEdit(null);
                                                                }
                                                            }}
                                                            className="py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold border border-red-100 transition-colors text-xs"
                                                        >
                                                            删除
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : activeTextEdit && selectedTextSlot ? (
                                            <div className="space-y-5 text-xs text-gray-600">
                                                <button 
                                                    onClick={() => setActiveTextEdit(null)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 mb-2 bg-indigo-50/50 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-100/50 w-fit"
                                                >
                                                    <ChevronLeft size={13} />
                                                    返回版面设置
                                                </button>

                                                <div className="border-t border-gray-100 pt-3 space-y-4">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        所选文本属性
                                                    </div>

                                                    {/* Text Content Textarea */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">文本内容 (Text Content)</span>
                                                        <textarea
                                                            rows={4}
                                                            placeholder="写点什么呢..."
                                                            value={selectedTextSlot.text}
                                                            onChange={(e) => updateSelectedTextSlot({ text: e.target.value })}
                                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none text-xs text-gray-700 focus:border-indigo-600 focus:bg-white transition-colors resize-y font-normal"
                                                        />
                                                    </div>

                                                    {/* Font Size Selector */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">字体大小 (Font Size)</span>
                                                        <select
                                                            value={selectedTextSlot.rawStyle.fontSize || ''}
                                                            onChange={(e) => updateSelectedTextSlot({ style: { fontSize: e.target.value || undefined } })}
                                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none text-xs font-semibold text-gray-700 focus:border-indigo-600 focus:bg-white transition-colors cursor-pointer"
                                                        >
                                                            <option value="">默认 (Default)</option>
                                                            <option value="9pt">超小 (9pt)</option>
                                                            <option value="10pt">小 (10pt)</option>
                                                            <option value="12pt">标准 (12pt)</option>
                                                            <option value="14pt">中等 (14pt)</option>
                                                            <option value="16pt">大 (16pt)</option>
                                                            <option value="18pt">超大 (18pt)</option>
                                                            <option value="24pt">标题 (24pt)</option>
                                                            <option value="28pt">大标题 (28pt)</option>
                                                            <option value="32pt">超大标题 (32pt)</option>
                                                        </select>
                                                    </div>

                                                    {/* Text Alignment */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">对齐方式 (Alignment)</span>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[
                                                                { value: 'left', label: '居左' },
                                                                { value: 'center', label: '居中' },
                                                                { value: 'right', label: '居右' }
                                                            ].map(align => (
                                                                <button
                                                                    key={align.value}
                                                                    onClick={() => updateSelectedTextSlot({ style: { textAlign: align.value } })}
                                                                    className={`py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                                                        (selectedTextSlot.rawStyle.textAlign || 'left') === align.value
                                                                            ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
                                                                            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                                                    }`}
                                                                >
                                                                    {align.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Font Weights & Styles */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">字体样式 (Font Styles)</span>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button
                                                                onClick={() => updateSelectedTextSlot({ 
                                                                    style: { 
                                                                        fontWeight: selectedTextSlot.rawStyle.fontWeight === 'bold' ? 'normal' : 'bold' 
                                                                    } 
                                                                })}
                                                                className={`py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                                                    selectedTextSlot.rawStyle.fontWeight === 'bold'
                                                                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20 font-bold'
                                                                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                加粗 (Bold)
                                                            </button>
                                                            <button
                                                                onClick={() => updateSelectedTextSlot({ 
                                                                    style: { 
                                                                        fontStyle: selectedTextSlot.rawStyle.fontStyle === 'italic' ? 'normal' : 'italic' 
                                                                    } 
                                                                })}
                                                                className={`py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                                                    selectedTextSlot.rawStyle.fontStyle === 'italic'
                                                                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20 italic'
                                                                        : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                斜体 (Italic)
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Colors */}
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">字体颜色 (Color)</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {[
                                                                { value: '', label: '默认', color: 'transparent', border: 'border-gray-300' },
                                                                { value: 'var(--theme-primary)', label: '主色', color: 'var(--theme-primary)' },
                                                                { value: 'var(--theme-secondary)', label: '辅色', color: 'var(--theme-secondary)' },
                                                                { value: 'var(--theme-accent)', label: '强调', color: 'var(--theme-accent)' },
                                                                { value: '#000000', label: '纯黑', color: '#000000' },
                                                                { value: '#4b5563', label: '深灰', color: '#4b5563' },
                                                                { value: '#9ca3af', label: '浅灰', color: '#9ca3af' },
                                                                { value: '#ef4444', label: '红色', color: '#ef4444' },
                                                                { value: '#f59e0b', label: '橙色', color: '#f59e0b' },
                                                                { value: '#10b981', label: '绿色', color: '#10b981' },
                                                                { value: '#3b82f6', label: '蓝色', color: '#3b82f6' }
                                                            ].map(col => (
                                                                <button
                                                                    key={col.label}
                                                                    onClick={() => updateSelectedTextSlot({ style: { color: col.value || undefined } })}
                                                                    className={`w-6 h-6 rounded-full border transition-all relative flex items-center justify-center ${
                                                                        selectedTextSlot.rawStyle.color === col.value || (!selectedTextSlot.rawStyle.color && col.value === '')
                                                                            ? 'ring-2 ring-indigo-500 scale-110'
                                                                            : 'hover:scale-105'
                                                                    } ${col.border || 'border-transparent'}`}
                                                                    style={{ backgroundColor: col.color }}
                                                                    title={col.label}
                                                                >
                                                                    {col.value === '' && <span className="text-[8px] text-gray-400">×</span>}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Default Section: Layout templates, stickers, page navigator, and chapter info */
                                            <div className="space-y-4">
                                                {/* Chapter Info or Cover Media */}
                                                {isEditingCover ? (
                                                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200/50 space-y-4 backdrop-blur-md bg-white/70 border border-white/50 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)]">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                            封面底图素材管理
                                                        </div>
                                                        {parsedCover?.image ? (
                                                            <div className="relative group rounded-xl overflow-hidden aspect-[4/3] bg-gray-50 border border-gray-200">
                                                                <img src={parsedCover.image} className="w-full h-full object-cover" alt="封面" />
                                                                <button
                                                                    onClick={() => {
                                                                        if (currentBook.coverUrl?.startsWith('design://')) {
                                                                            const newCoverUrl = `design://?layout=${parsedCover.layout}&bg=${parsedCover.bgId}`;
                                                                            updateBookSettings({ coverUrl: newCoverUrl, coverOssKey: undefined });
                                                                        } else {
                                                                            updateBookSettings({ coverUrl: '', coverOssKey: undefined });
                                                                        }
                                                                    }}
                                                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 text-white text-xs font-bold transition-opacity"
                                                                >
                                                                    <Trash2 size={14} />
                                                                    移除图片
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div 
                                                                onClick={() => {
                                                                    const input = document.createElement('input');
                                                                    input.type = 'file';
                                                                    input.accept = 'image/*';
                                                                    input.onchange = async (event: any) => {
                                                                        const file = event.target.files?.[0];
                                                                        if (file) {
                                                                            const uploaded = await bookService.uploadPhoto(file);
                                                                            const layout = parsedCover?.layout || 'classic';
                                                                             const bgId = parsedCover?.bgId || 'cotton-white';
                                                                             const newCoverUrl = `design://?layout=${layout}&bg=${bgId}&image=${encodeURIComponent(uploaded.url)}&ossKey=${encodeURIComponent(uploaded.ossKey || '')}`;
                                                                             updateBookSettings({ coverUrl: newCoverUrl, coverOssKey: uploaded.ossKey || undefined });
                                                                        }
                                                                    };
                                                                    input.click();
                                                                }}
                                                                className="border-2 border-dashed border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/10 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center gap-2 text-gray-400 hover:text-indigo-600"
                                                            >
                                                                <Upload size={20} />
                                                                <span className="text-xs font-bold">选择上传封面大图</span>
                                                            </div>
                                                        )}
                                                        <div className="text-[9px] text-gray-400 leading-normal flex items-start gap-1">
                                                            <Info size={11} className="mt-0.5 flex-shrink-0" />
                                                            <span>封面与序言采用特定对称美学排版，直接双击画布上文字即可编辑。</span>
                                                        </div>
                                                    </div>
                                                ) : activeChapter ? (
                                                    <AccordionSection
                                                        title="当前章节基础信息"
                                                        icon={<Settings size={14} />}
                                                        isOpen={openSections.chapterInfo}
                                                        onToggle={() => toggleSection('chapterInfo')}
                                                    >
                                                        <div className="space-y-3 pt-2">
                                                            <div>
                                                                <label className="block text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-1">章节名称</label>
                                                                <input
                                                                    type="text"
                                                                    value={localChapterTitle}
                                                                    onChange={(e) => {
                                                                        setLocalChapterTitle(e.target.value);
                                                                        updateChapter(activeChapter.id, { title: e.target.value });
                                                                    }}
                                                                    className="w-full text-xs font-bold bg-white border border-gray-200/80 rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all"
                                                                    placeholder="章节标题"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-1">记录日期</label>
                                                                <input
                                                                    type="date"
                                                                    value={localChapterDate}
                                                                    onChange={(e) => {
                                                                        setLocalChapterDate(e.target.value);
                                                                        updateChapter(activeChapter.id, { date: e.target.value });
                                                                    }}
                                                                    className="w-full text-xs font-bold bg-white border border-gray-200/80 rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] transition-all cursor-pointer"
                                                                />
                                                            </div>
                                                        </div>
                                                    </AccordionSection>
                                                ) : null}

                                                {/* Choose Page layout templates (if not cover) */}
                                                {!isEditingCover && activePage && (
                                                    <AccordionSection
                                                        title="选择页面排版模板"
                                                        icon={<Layout size={14} />}
                                                        isOpen={openSections.templates}
                                                        onToggle={() => toggleSection('templates')}
                                                    >
                                                        <div className="grid grid-cols-1 gap-2 pt-2">
                                                            {templates.map((tpl) => {
                                                                const isSelected = activePage.layout === tpl.id;
                                                                return (
                                                                    <div
                                                                        key={tpl.id}
                                                                        onClick={() => updatePage(activeChapter!.id, activePage.id, { layout: tpl.id })}
                                                                        className={`p-2.5 rounded-xl cursor-pointer border transition-all flex items-center justify-between group/tpl hover:translate-y-[-1px] active:scale-[0.99] duration-200 ${
                                                                            isSelected 
                                                                                ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 shadow-sm font-semibold'
                                                                                : 'border-gray-200/60 hover:border-gray-300 hover:bg-gray-50 text-gray-700 bg-white'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            {/* Mini visual wireframe representation */}
                                                                            <div className="w-8 h-8 rounded border border-gray-200 bg-gray-50 flex-shrink-0 grid grid-cols-2 gap-[2px] p-[3px] group-hover/tpl:border-gray-300 transition-colors">
                                                                                {Array.from({ length: Math.max(1, tpl.photoCount) }).map((_, i) => (
                                                                                    <div 
                                                                                        key={i} 
                                                                                        className={`rounded-[1px] ${
                                                                                            isSelected ? 'bg-indigo-400' : 'bg-gray-300'
                                                                                        } ${tpl.photoCount === 1 ? 'col-span-2 row-span-2' : ''}`} 
                                                                                    />
                                                                                ))}
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-xs font-bold">{tpl.name}</span>
                                                                                <span className="text-[9px] text-gray-400 mt-0.5">
                                                                                    {tpl.category === 'classic' ? '经典文艺' : tpl.category === 'warm' ? '温馨手账' : '杂志艺术'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-[9px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">
                                                                            {tpl.photoCount}图
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </AccordionSection>
                                                )}



                                                {/* Stickers panel (if not cover) */}
                                                {!isEditingCover && activePage && (
                                                    <AccordionSection
                                                        title="手账贴纸与复古印章"
                                                        icon={<Sparkles size={14} />}
                                                        isOpen={openSections.stickers}
                                                        onToggle={() => toggleSection('stickers')}
                                                    >
                                                        <div className="pt-2">
                                                            {/* 贴纸与印章分类选项卡 */}
                                                            <div className="flex p-0.5 bg-amber-100/40 border border-amber-900/10 rounded-lg mb-2.5 text-[10px]">
                                                                <button
                                                                    onClick={() => setStickerSubTab('stickers')}
                                                                    className={`flex-1 py-1 rounded text-center font-medium transition-all cursor-pointer ${
                                                                        stickerSubTab === 'stickers'
                                                                            ? 'bg-amber-800 text-white shadow-sm'
                                                                            : 'text-amber-900/60 hover:text-amber-900/90'
                                                                    }`}
                                                                >
                                                                    彩色贴纸
                                                                </button>
                                                                <button
                                                                    onClick={() => setStickerSubTab('stamps')}
                                                                    className={`flex-1 py-1 rounded text-center font-medium transition-all cursor-pointer ${
                                                                        stickerSubTab === 'stamps'
                                                                            ? 'bg-amber-800 text-white shadow-sm'
                                                                            : 'text-amber-900/60 hover:text-amber-900/90'
                                                                    }`}
                                                                >
                                                                    复古印记
                                                                </button>
                                                            </div>

                                                            {/* 素材抽屉区，采用牛皮纸微复古质感背景 */}
                                                            <div className="p-2.5 bg-[#FAF6EE] border border-[#E7DECD] rounded-xl max-h-[220px] overflow-y-auto shadow-inner">
                                                                <div className="grid grid-cols-4 gap-2">
                                                                    {STICKER_OPTIONS
                                                                        .filter(opt => opt.category === stickerSubTab)
                                                                        .map((opt) => {
                                                                            const isStamp = opt.category === 'stamps';
                                                                            return (
                                                                                <button
                                                                                    key={opt.id}
                                                                                    onClick={() => handleAddSticker(opt.id)}
                                                                                    className={`sticker-btn aspect-square w-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all p-1.5 cursor-pointer rounded-lg hover:bg-amber-50/50 ${
                                                                                        isStamp 
                                                                                            ? 'text-amber-900 hover:text-red-700' 
                                                                                            : 'text-gray-700'
                                                                                    }`}
                                                                                    title={opt.name}
                                                                                >
                                                                                    {opt.render({ className: "w-full h-full" })}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </AccordionSection>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* BACKGROUND TAB */}
                                {activeTab === 'background' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200 text-xs text-gray-600">
                                        
                                        {/* Block A: Global Book Paper Size */}
                                        <div className="space-y-2">
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                全局纸张规格
                                            </div>
                                            <select
                                                value={currentBook.pageSize}
                                                onChange={(e) => updateBookSettings({ pageSize: e.target.value as PageSize })}
                                                className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 outline-none text-gray-700 transition-colors cursor-pointer"
                                            >
                                                {Object.entries(PAGE_SIZES).map(([key, val]) => (
                                                    <option key={key} value={key}>{val.name} ({val.width}x{val.height}mm)</option>
                                                ))}
                                            </select>
                                         </div>

                                         {/* Block A.2: Preface Toggle and Quotes */}
                                         <div className="space-y-3 border-t border-gray-100 pt-4">
                                             <div className="flex items-center justify-between">
                                                 <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                     启用序言页
                                                 </div>
                                                 <label className="relative inline-flex items-center cursor-pointer">
                                                     <input
                                                         type="checkbox"
                                                         checked={currentBook.showPreface !== false}
                                                         onChange={(e) => updateBookSettings({ showPreface: e.target.checked })}
                                                         className="sr-only peer"
                                                     />
                                                     <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                                 </label>
                                             </div>

                                             {currentBook.showPreface !== false && (
                                                 <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                                     <div>
                                                         <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                                                             引言 / 序言内容
                                                         </label>
                                                         <textarea
                                                             value={currentBook.preface || ''}
                                                             onChange={(e) => updateBookSettings({ preface: e.target.value })}
                                                             className="w-full h-20 resize-none text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-600 focus:bg-white transition-all leading-relaxed animate-in fade-in duration-200"
                                                             placeholder="在这里输入作品的引言、寄语或序言（或双击画布文字编辑）..."
                                                         />
                                                     </div>

                                                     <div className="space-y-1.5">
                                                         <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                                             金句模板库 (一键套用)
                                                         </span>
                                                         <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                                                             {PREFACE_TEMPLATES.map((tpl) => (
                                                                 <button
                                                                     key={tpl.id}
                                                                     onClick={() => {
                                                                         const compiled = compilePrefaceText(tpl.content, currentBook);
                                                                         updateBookSettings({ preface: compiled });
                                                                     }}
                                                                     className="p-2 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl text-left transition-all duration-150 group cursor-pointer"
                                                                     title={tpl.content}
                                                                 >
                                                                     <div className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-700">
                                                                         {tpl.name}
                                                                     </div>
                                                                     <div className="text-[9px] text-slate-400 line-clamp-1 group-hover:text-indigo-400 mt-0.5">
                                                                         {tpl.content.replace(/\n/g, ' ')}
                                                                     </div>
                                                                 </button>
                                                             ))}
                                                         </div>
                                                     </div>
                                                 </div>
                                             )}
                                         </div>

                                        {/* Block B: Global Theme */}
                                        <div className="space-y-2 border-t border-gray-100 pt-4">
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                整书视觉主题
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { id: 'classic', name: '经典雅致', desc: 'Classic Traditional' },
                                                    { id: 'modern', name: '现代简约', desc: 'Sleek Modern' },
                                                    { id: 'warm', name: '温馨时光', desc: 'Warm Memory' },
                                                    { id: 'magazine', name: '时尚杂志', desc: 'Style Magazine' }
                                                ].map(themeOpt => {
                                                    const isThemeSelected = currentBook.theme === themeOpt.id;
                                                    return (
                                                        <button
                                                            key={themeOpt.id}
                                                            onClick={() => updateBookSettings({ theme: themeOpt.id as any })}
                                                            className={`p-3 rounded-xl border text-left transition-all ${
                                                                isThemeSelected
                                                                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50/50'
                                                            }`}
                                                        >
                                                            <div className="font-bold text-xs">{themeOpt.name}</div>
                                                            <div className="text-[8px] text-gray-400 mt-0.5 font-mono">{themeOpt.desc}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Block C: Page Atmosphere Tones (if not cover) */}
                                        {!isEditingCover && activePage && (
                                            <div className="space-y-2 border-t border-gray-100 pt-4">
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    当前画面氛围预设
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { id: 'default', name: '无/默认' },
                                                        { id: 'travel', name: '旅行明信片' },
                                                        { id: 'retro', name: '复古怀旧' },
                                                        { id: 'film', name: '暗调胶片' },
                                                        { id: 'notebook', name: '手账信笺' },
                                                        { id: 'summer', name: '盛夏微风' }
                                                    ].map((atm) => {
                                                        const currentAtmosphere = getPageAtmosphere(activePage.content);
                                                        const isSelected = currentAtmosphere === atm.id;
                                                        return (
                                                            <button
                                                                key={atm.id}
                                                                onClick={() => {
                                                                    const updatedContent = updatePageAtmosphere(activePage.content, atm.id);
                                                                    updatePage(activeChapter!.id, activePage.id, { content: updatedContent });
                                                                }}
                                                                className={`py-2 px-1 text-[9px] font-bold rounded-xl border text-center transition-all ${
                                                                    isSelected
                                                                        ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 shadow-sm'
                                                                        : 'border-gray-200/60 hover:bg-gray-50 text-gray-600'
                                                                }`}
                                                            >
                                                                {atm.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Block D: Typography Style (if not cover) */}
                                        {!isEditingCover && activePage && (
                                            <div className="space-y-2 border-t border-gray-100 pt-4">
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    当前排版字体
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { id: 'sans', name: '现代黑体' },
                                                        { id: 'serif', name: '优雅衬线' },
                                                        { id: 'handwriting', name: '硬笔手写' }
                                                    ].map((fnt) => {
                                                        const currentFont = getPageFontFamily(activePage.content);
                                                        const isSelected = currentFont === fnt.id;
                                                        return (
                                                            <button
                                                                key={fnt.id}
                                                                onClick={() => {
                                                                    const updatedContent = updatePageFontFamily(activePage.content, fnt.id);
                                                                    updatePage(activeChapter!.id, activePage.id, { content: updatedContent });
                                                                }}
                                                                className={`py-2 px-1 text-[9px] font-bold rounded-xl border text-center transition-all ${
                                                                    isSelected
                                                                        ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 shadow-sm'
                                                                        : 'border-gray-200/60 hover:bg-gray-50 text-gray-600'
                                                                }`}
                                                            >
                                                                {fnt.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Block E: Guides & Grid Overlay Switch */}
                                        <div className="space-y-2.5 border-t border-gray-100 pt-4">
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                辅助网格与线
                                            </div>
                                            <button
                                                onClick={() => setShowGridOverlay(!showGridOverlay)}
                                                className={`w-full py-2.5 px-4 rounded-xl border font-bold text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                                    showGridOverlay 
                                                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' 
                                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all ${
                                                    showGridOverlay ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent border-gray-300'
                                                }`}>
                                                    {showGridOverlay && <div className="w-1 h-1 bg-white rounded-full" />}
                                                </div>
                                                <span>{showGridOverlay ? '辅助网格层：开启' : '辅助网格层：关闭'}</span>
                                            </button>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3D Flip Book reader layer */}
                {isReadMode && (
                    <FlipBook
                        book={currentBook}
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

                {/* Share publication modal */}
                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    shareUrl={shareUrl}
                    bookTitle={currentBook.title}
                />

                {/* 导出进度显示模态框 */}
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
