import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Loader2,
    BookOpen,
    Image as ImageIcon,
    Sparkles,
    Plus,
    Search,
    Heart,
    Eye,
    TrendingUp,
    FolderOpen,
    Trash2,
    Palette,
    Compass,
    ChevronLeft,
    ChevronRight,
    BarChart3
} from 'lucide-react';
import axios from 'axios';
import { getBookService } from '../../../services/serviceFactory';
import { MainLayout } from '../../common/components/MainLayout';
import { BookCard } from '../components/BookCard';
import { BookshelfGrid } from '../components/BookshelfGrid';
import { BookContextMenu } from '../components/BookContextMenu';
import { ConfirmModal } from '../../common/components/ConfirmModal';
import { BookEditModal } from '../components/BookEditModal';
import { AnnouncementModal } from '../../common/components/AnnouncementModal';
import { ExportProgressModal } from '../../common/components/ExportProgressModal';
import { useAuthStore } from '../../../store/useAuthStore';
import { ShareModal } from '../../common/components/ShareModal';
import type { Book } from '../../../types';

// 导入嵌入式子模块页面
import { Market } from './Market';
import { MyBookTemplates } from './MyBookTemplates';
import { MyLayouts } from './MyLayouts';
import { AssetCenter } from '../../assets/pages/AssetCenter';

const bookService = getBookService();

/**
 * Canva 式多功能工作台
 * 承载回忆书、设计模板、照片资源一站式管理
 */
export function Workbench() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuthStore();
    
    // 获取当前的主 tab (books | designs | resources)
    const activeTab = searchParams.get('tab') || 'books';
    // 设计 Tab 下的二级 Tab (pageTemplates | bookTemplates)
    const [designSubTab, setDesignSubTab] = useState<'pageTemplates' | 'bookTemplates'>('pageTemplates');
    const [pageTemplateSegment, setPageTemplateSegment] = useState<'preset' | 'my'>('preset');

    // 书籍列表数据与状态
    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 12;

    const [searchQuery, setSearchQuery] = useState('');
    const [showAnnouncement, setShowAnnouncement] = useState(false);
    const [announcementContent, setAnnouncementContent] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    
    // 右侧档案馆面板是否收起 (默认关闭)
    const [isArchiveCollapsed, setIsArchiveCollapsed] = useState(true);

    // 右键上下文菜单
    const [contextMenu, setContextMenu] = useState<{
        bookId: string;
        x: number;
        y: number;
        isFavorite?: boolean;
    } | null>(null);

    // 各项操作弹窗
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; bookId: string }>({ isOpen: false, bookId: '' });
    const [editModal, setEditModal] = useState<{ isOpen: boolean; bookId: string; initialData?: Partial<Book> }>({ isOpen: false, bookId: '' });
    const [activeExportJobId, setActiveExportJobId] = useState<string | null>(null);
    const [exportTypeTitle, setExportTypeTitle] = useState<string>('');

    // 分享状态
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [shareBookTitle, setShareBookTitle] = useState('');
    const [isGeneratingShare, setIsGeneratingShare] = useState(false);

    // 收藏书籍状态
    const [favoritedBooks, setFavoritedBooks] = useState<Book[]>([]);
    const [isFavLoading, setIsFavLoading] = useState(false);

    // 发布为模板状态
    const [publishTemplateModal, setPublishTemplateModal] = useState<{
        isOpen: boolean;
        bookId: string;
        bookTitle: string;
        templateTitle: string;
    }>({ isOpen: false, bookId: '', bookTitle: '', templateTitle: '' });
    const [isPublishingTemplate, setIsPublishingTemplate] = useState(false);

    // 初始化加载
    useEffect(() => {
        if (activeTab === 'books') {
            loadBooks(1);
            loadFavoritedBooks();
        }

        // 首次公告提示
        if (user && !user.hasSeenAnnouncement) {
            const checkAnnouncement = async () => {
                try {
                    const response = await axios.get('/auth/announcement');
                    if (response.data.success && response.data.data) {
                        setAnnouncementContent(response.data.data);
                        setShowAnnouncement(true);
                    }
                } catch (error) {
                    console.error('Failed to fetch announcement in workbench:', error);
                }
            };
            checkAnnouncement();
        }
    }, [user, activeTab]);

    // 处理从全局导航发起的新建 query param
    useEffect(() => {
        if (searchParams.get('create') === 'true') {
            setIsCreateOpen(true);
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('create');
            setSearchParams(nextParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const loadFavoritedBooks = async () => {
        if (!user) return;
        setIsFavLoading(true);
        try {
            const response = await bookService.getFavoritedBooks(user.id, 1, 30);
            setFavoritedBooks(response.items);
        } catch (error) {
            console.error('Failed to load favorited books in workbench:', error);
        } finally {
            setIsFavLoading(false);
        }
    };

    const loadBooks = async (pageNum: number) => {
        if (pageNum === 1) setIsLoading(true);
        else setLoadingMore(true);

        try {
            const response = await bookService.getBooks(pageNum, PAGE_SIZE);
            if (pageNum === 1) {
                setBooks(response.items);
            } else {
                setBooks(prev => [...prev, ...response.items]);
            }
            setHasMore(response.page < response.totalPages);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to load books:', error);
            if (pageNum === 1) setBooks([]);
        } finally {
            setIsLoading(false);
            setLoadingMore(false);
        }
    };

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            loadBooks(page + 1);
        }
    };

    // 进入编辑器
    const handleOpenBook = (bookId: string) => {
        navigate(`/editor/${bookId}`);
    };

    // 触发删除确认弹窗
    const handleDeleteBook = async (e: React.MouseEvent | null, bookId: string) => {
        if (e) e.stopPropagation();
        setDeleteConfirm({ isOpen: true, bookId });
    };

    // 执行实际删除逻辑
    const executeDelete = async () => {
        const { bookId } = deleteConfirm;
        setDeleteConfirm({ isOpen: false, bookId: '' });
        try {
            await bookService.deleteBook(bookId);
            setBooks(books.filter(b => b.id !== bookId));
        } catch (error) {
            console.error('Failed to delete book:', error);
            alert('删除失败');
        }
    };

    // 触发编辑弹窗
    const handleEditBook = (bookId: string) => {
        const book = books.find(b => b.id === bookId);
        if (book) {
            setEditModal({
                isOpen: true,
                bookId,
                initialData: {
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    coverUrl: book.coverUrl,
                    coverThumbnailUrl: book.coverThumbnailUrl,
                    coverOssKey: book.coverOssKey,
                    category: book.category,
                    status: book.status,
                    isPublic: book.isPublic
                }
            });
        }
    };

    // 保存编辑后的书籍信息
    const handleSaveBookInfo = async (updates: Partial<Book>) => {
        const { bookId } = editModal;
        try {
            const book = await bookService.getBook(bookId);
            if (book) {
                const updatedBook = { ...book, ...updates };
                await bookService.saveBook(updatedBook);
                setBooks(books.map(b => b.id === bookId ? { ...b, ...updates } : b));
            }
        } catch (error) {
            console.error('Failed to update book info:', error);
            throw error;
        }
    };

    const handleContextMenu = (e: React.MouseEvent, bookId: string, isFavorite: boolean = false) => {
        setContextMenu({
            bookId,
            x: e.clientX,
            y: e.clientY,
            isFavorite
        });
    };

    // 收藏/取消收藏
    const handleToggleFavorite = async (bookId: string) => {
        try {
            await axios.post('/interactions/favorite', { entityType: 'book', entityId: bookId });
            setFavoritedBooks(prev => prev.filter(b => b.id !== bookId));
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            alert('操作失败');
        }
    };

    // 更新书籍发布状态
    const handleUpdateBookStatus = async (bookId: string, newStatus: 'private' | 'pending' | 'published' | 'rejected') => {
        try {
            await bookService.updateStatus(bookId, newStatus);
            setBooks(books.map(b => b.id === bookId ? { ...b, status: newStatus } : b));
        } catch (error) {
            console.error('Failed to update book status:', error);
            throw error;
        }
    };

    // 生成分享链接
    const handleShareBook = async (bookId: string) => {
        const book = books.find(b => b.id === bookId);
        if (!book) return;
        setIsGeneratingShare(true);
        try {
            const response = await axios.post(`/books/${bookId}/share`);
            if (response.data.success) {
                setShareUrl(response.data.data.shareUrl);
                setShareBookTitle(book.title);
                setIsShareModalOpen(true);
            } else {
                throw new Error(response.data.message || '分享链接生成失败');
            }
        } catch (error) {
            console.error('Failed to generate share link:', error);
            alert('生成分享链接失败，请稍后再试');
        } finally {
            setIsGeneratingShare(false);
        }
    };

    const handlePublishTemplateTrigger = (bookId: string) => {
        const book = books.find(b => b.id === bookId);
        if (book) {
            setPublishTemplateModal({
                isOpen: true,
                bookId,
                bookTitle: book.title,
                templateTitle: book.title
            });
        }
    };

    const handleConfirmPublishTemplate = async () => {
        if (!publishTemplateModal.templateTitle.trim()) {
            alert('请输入模板名称');
            return;
        }
        setIsPublishingTemplate(true);
        try {
            await bookService.publishTemplate(publishTemplateModal.bookId, publishTemplateModal.templateTitle);
            alert('发布模板成功！您可以在“设计” - “我的模板”中查看和套用。');
            setPublishTemplateModal({ isOpen: false, bookId: '', bookTitle: '', templateTitle: '' });
        } catch (error) {
            console.error('Failed to publish template:', error);
            alert('发布模板失败，请稍后重试');
        } finally {
            setIsPublishingTemplate(false);
        }
    };

    const handleFinishCreate = async (bookData: Partial<Book>) => {
        setIsCreating(true);
        try {
            const newBook: Book = {
                id: crypto.randomUUID(),
                userId: user?.id || '',
                title: bookData.title || '我的时光集',
                author: user?.nickname || '时光记录者',
                coverUrl: bookData.coverUrl,
                isPublic: bookData.isPublic || false,
                category: bookData.category,
                createdAt: Date.now(),
                pages: [],
                theme: 'classic',
                pageSize: 'A4'
            };
            await bookService.saveBook(newBook);
            navigate(`/editor/${newBook.id}`);
        } catch (error) {
            console.error('Failed to create book:', error);
        } finally {
            setIsCreating(false);
            setIsCreateOpen(false);
        }
    };

    // 统计指标计算
    const totalBooksCount = books.length;
    const totalPagesCount = books.reduce((sum, b) => sum + (b.pageCount || b.pages?.length || 0), 0);
    const totalPhotosCount = books.reduce((sum, b) => sum + (b.photoCount || 0), 0);
    const totalViewsCount = books.reduce((sum, b) => sum + (b.views || 0), 0);
    const totalLikesCount = books.reduce((sum, b) => sum + (b.likes || 0), 0);

    // 搜索过滤后的本地书籍
    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 最近修改的前 4 本书 (最近使用)
    const recentBooks = [...books]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 4);

    // 动态计算书架网格列数，适应右侧档案馆的展开/收起状态
    const bookshelfColsClass = isArchiveCollapsed
        ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
        : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

    return (
        <MainLayout title="工作台" hideHeader={true}>
            <div className="flex h-full relative font-['Outfit',_sans-serif]">
                
                {/* 主创作区域 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8">
                    
                    {/* 1. Canva 式顶部渐变 Banner (仅在 回忆书 首页渲染) */}
                    {activeTab === 'books' && (
                        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#3A4454] via-[#2C3539] to-[#1F2527] py-6 px-8 sm:py-8 sm:px-12 text-white shadow-lg mb-6 select-none border border-slate-700/30">
                            {/* 磨砂光晕背景 */}
                            <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                            <div className="absolute left-1/4 -bottom-16 w-80 h-80 bg-black/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative z-10 max-w-3xl mx-auto text-center">
                                <h2 className="text-xl sm:text-2.5xl font-black mb-4 tracking-tight leading-tight flex items-center justify-center gap-2">
                                    今天你想记录什么，{user?.nickname || '创作人'}？
                                </h2>
                                
                                {/* 搜索输入框 */}
                                <div className="relative max-w-xl mx-auto mb-5 group">
                                    <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                                    <input
                                        type="text"
                                        placeholder="过滤当前书架书名..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/95 text-slate-800 placeholder-slate-400 pl-12 pr-6 py-2.5 rounded-full text-sm font-bold border-none outline-none shadow-md focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all duration-300"
                                    />
                                </div>

                                {/* 彩色快捷图标键 */}
                                <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-700">
                                    <button 
                                        onClick={() => handleFinishCreate({ title: 'AI 智能回忆书', category: 'graduation' })}
                                        className="px-4 py-2.5 bg-white/90 hover:bg-white rounded-full flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <Sparkles size={14} className="text-[#C5A059] fill-[#C5A059]" />
                                        <span>AI 一键排版</span>
                                    </button>
                                    <button 
                                        onClick={() => navigate('/workbench?tab=designs')}
                                        className="px-4 py-2.5 bg-white/90 hover:bg-white rounded-full flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <Palette size={14} className="text-indigo-600" />
                                        <span>设计模板库</span>
                                    </button>
                                    <button 
                                        onClick={() => navigate('/workbench?tab=resources')}
                                        className="px-4 py-2.5 bg-white/90 hover:bg-white rounded-full flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <ImageIcon size={14} className="text-[#C5A059]" />
                                        <span>批量传素材</span>
                                    </button>
                                    <button 
                                        onClick={() => setIsCreateOpen(true)}
                                        className="px-4 py-2.5 bg-white/90 hover:bg-white rounded-full flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    >
                                        <Plus size={14} className="text-rose-500 stroke-[3]" />
                                        <span>新建空白画册</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. TAB 1: 回忆书列表 */}
                    {activeTab === 'books' && (
                        <div className="space-y-10">
                            
                            {/* 最近使用 (仅在书籍总数大于 4 本且未搜索时，展示前 4 本最常修改的) */}
                            {books.length > 4 && recentBooks.length > 0 && !searchQuery && (
                                <section className="select-none">
                                    <h3 className="text-sm font-black text-slate-800 tracking-wide uppercase mb-4 flex items-center gap-2">
                                        <TrendingUp size={16} className="text-indigo-600" />
                                        <span>最近使用</span>
                                    </h3>
                                    <div className={`${bookshelfColsClass} gap-5`}>
                                        {recentBooks.map((book) => (
                                            <div 
                                                key={book.id} 
                                                onClick={() => handleOpenBook(book.id)}
                                                className="group bg-white border border-slate-100 hover:border-indigo-150 p-4 rounded-2xl cursor-pointer hover:shadow-md transition-all flex flex-col relative w-full max-w-[200px] sm:max-w-[220px] md:max-w-[240px]"
                                            >
                                                {/* 拟物小封面 */}
                                                <div className="aspect-[3/4] bg-slate-50 border border-slate-100 rounded-xl overflow-hidden mb-3 relative flex items-center justify-center shrink-0">
                                                    {book.coverThumbnailUrl ? (
                                                        <img src={book.coverThumbnailUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                                                    ) : (
                                                        <BookOpen size={24} className="text-slate-300" />
                                                    )}
                                                    
                                                    {/* 角标 */}
                                                    <span className={`absolute top-2 right-2 text-[8px] font-black px-1.5 py-0.5 rounded uppercase
                                                                    ${book.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {book.status === 'published' ? '已发布' : '草稿'}
                                                    </span>
                                                </div>
                                                <h4 className="text-[12px] font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                                    {book.title}
                                                </h4>
                                                <p className="text-[9px] font-black text-slate-400 mt-0.5">
                                                    创建时间: {new Date(book.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* 个人时光画册书架 */}
                            <section className="relative">
                                <div className="flex items-center justify-between mb-5 select-none">
                                    <h3 className="text-sm font-black text-slate-800 tracking-wide uppercase flex items-center gap-2">
                                        <FolderOpen size={16} className="text-indigo-600" />
                                        <span>我的时光书架</span>
                                    </h3>
                                    
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => navigate('/trash')}
                                            className="px-3.5 py-1.5 bg-slate-50 border border-slate-150 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 text-slate-500 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Trash2 size={12} />
                                            <span>垃圾箱</span>
                                        </button>
                                        
                                        {/* 大屏下提供折叠档案馆面板按钮 */}
                                        <button
                                            onClick={() => setIsArchiveCollapsed(!isArchiveCollapsed)}
                                            className="hidden xl:flex px-3.5 py-1.5 bg-slate-50 border border-slate-150 hover:bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black transition-all items-center gap-1.5 cursor-pointer"
                                            title="切换数据面板"
                                        >
                                            <BarChart3 size={12} />
                                            <span>{isArchiveCollapsed ? '展开数据' : '收起数据'}</span>
                                        </button>
                                    </div>
                                </div>

                                {isLoading ? (
                                    <div className="py-20 flex justify-center">
                                        <Loader2 className="animate-spin text-indigo-650" size={32} />
                                    </div>
                                ) : filteredBooks.length === 0 ? (
                                    <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-[28px] select-none">
                                        <BookOpen size={36} className="text-slate-300 mx-auto mb-3" />
                                        <h4 className="text-slate-600 text-sm font-black mb-1">书架空空如也</h4>
                                        <p className="text-slate-400 text-xs font-medium max-w-xs mx-auto leading-relaxed mb-5">
                                            您还没有创建任何时光回忆书。点击上方“一键排版”或快捷新建开启第一个时光画册吧！
                                        </p>
                                        <button 
                                            onClick={() => setIsCreateOpen(true)}
                                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs cursor-pointer shadow-md shadow-indigo-100 transition-all active:scale-95"
                                        >
                                            快速创建新书
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-6">
                                        <BookshelfGrid
                                            theme="oak"
                                            gap={24}
                                            rowGap={64}
                                            colsClass={bookshelfColsClass}
                                        >
                                            {filteredBooks.map((book) => {
                                                const isFav = favoritedBooks.some(fb => fb.id === book.id);
                                                return (
                                                    <div
                                                        key={book.id}
                                                        onContextMenu={(e) => handleContextMenu(e, book.id, isFav)}
                                                        className="h-full"
                                                    >
                                                        <BookCard
                                                            book={book}
                                                            onClick={() => handleOpenBook(book.id)}
                                                            onContextMenu={(e) => handleContextMenu(e, book.id, isFav)}
                                                            showCommunityStats={true}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </BookshelfGrid>
                                        
                                        {/* 加载更多 */}
                                        {hasMore && (
                                            <div className="flex justify-center pt-8">
                                                <button
                                                    onClick={handleLoadMore}
                                                    disabled={loadingMore}
                                                    className="px-6 py-2.5 bg-white border border-slate-200 rounded-2xl font-black text-xs text-slate-500 hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
                                                >
                                                    {loadingMore ? '正在加载...' : '加载更多时光集'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>
                        </div>
                    )}

                    {/* 3. TAB 2: 设计模板中心 */}
                    {activeTab === 'designs' && (
                        <div className="space-y-6">
                            
                            {/* 设计二级子 Tab 导航 */}
                            <div className="flex border-b border-slate-100 pb-3 mb-6 gap-6 text-sm font-bold text-slate-400 select-none">
                                <button 
                                    onClick={() => setDesignSubTab('pageTemplates')}
                                    className={`pb-3 relative cursor-pointer ${designSubTab === 'pageTemplates' ? 'text-indigo-650 font-black' : 'hover:text-slate-650'}`}
                                >
                                    <span>页模板</span>
                                    {designSubTab === 'pageTemplates' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                                </button>
                                <button 
                                    onClick={() => setDesignSubTab('bookTemplates')}
                                    className={`pb-3 relative cursor-pointer ${designSubTab === 'bookTemplates' ? 'text-indigo-650 font-black' : 'hover:text-slate-650'}`}
                                >
                                    <span>书模板</span>
                                    {designSubTab === 'bookTemplates' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
                                </button>
                            </div>

                            {/* 渲染子路由组件的嵌入版 */}
                            <div className="space-y-4">
                                {designSubTab === 'pageTemplates' && (
                                    <div className="flex flex-col gap-6">
                                        {/* Segmented Control for page templates */}
                                        <div className="flex justify-start">
                                            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 shadow-inner select-none gap-1">
                                                <button
                                                    onClick={() => setPageTemplateSegment('preset')}
                                                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                                        pageTemplateSegment === 'preset'
                                                            ? 'bg-white text-indigo-650 shadow-md shadow-indigo-100/50'
                                                            : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    系统精选
                                                </button>
                                                <button
                                                    onClick={() => setPageTemplateSegment('my')}
                                                    className={`px-6 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                                                        pageTemplateSegment === 'my'
                                                            ? 'bg-white text-indigo-650 shadow-md shadow-indigo-100/50'
                                                            : 'text-slate-500 hover:text-slate-800'
                                                    }`}
                                                >
                                                    我的设计
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            {pageTemplateSegment === 'preset' ? (
                                                <Market isEmbed={true} />
                                            ) : (
                                                <MyLayouts isEmbed={true} />
                                            )}
                                        </div>
                                    </div>
                                )}

                                {designSubTab === 'bookTemplates' && (
                                    <MyBookTemplates isEmbed={true} />
                                )}
                            </div>
                        </div>
                    )}

                    {/* 4. TAB 3: 个人照片资源中心 */}
                    {activeTab === 'resources' && (
                        <div>
                            <AssetCenter isEmbed={true} />
                        </div>
                    )}

                </div>

                {/* 5. 右侧常驻“拾光档案馆” (仅在 回忆书 tab 下且未收起时常驻) */}
                {activeTab === 'books' && !isArchiveCollapsed && (
                    <aside className="hidden xl:flex w-72 bg-white border-l border-slate-100 flex-col shrink-0 p-6 select-none animate-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between border-b border-slate-100/80 pb-4 mb-6">
                            <h3 className="font-black text-slate-800 text-sm tracking-wide uppercase flex items-center gap-2">
                                <BarChart3 size={15} className="text-indigo-650" />
                                <span>拾光档案馆</span>
                            </h3>
                            <button
                                onClick={() => setIsArchiveCollapsed(true)}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                                title="收起面板"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* 手账贴纸质感统计指标 */}
                        <div className="space-y-5">
                            
                            <div className="bg-[#FAF8F5] border border-[#EBE6DD] rounded-[24px] p-5 shadow-xs relative overflow-hidden group">
                                <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-[#EAE5D9] text-[#8C7A5F] flex items-center justify-center font-black text-xs select-none">
                                    📖
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">创作时光集</p>
                                <p className="text-3xl font-black text-slate-850 font-mono">{totalBooksCount} <span className="text-[11px] font-black text-slate-400 uppercase tracking-wide">册</span></p>
                            </div>

                            <div className="bg-[#FAF8F5] border border-[#EBE6DD] rounded-[24px] p-5 shadow-xs relative overflow-hidden group">
                                <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-[#EAE5D9] text-[#8C7A5F] flex items-center justify-center font-black text-xs select-none">
                                    📄
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">装订页数</p>
                                <p className="text-3xl font-black text-slate-850 font-mono">{totalPagesCount} <span className="text-[11px] font-black text-slate-400 uppercase tracking-wide">页</span></p>
                            </div>

                            <div className="bg-[#FAF8F5] border border-[#EBE6DD] rounded-[24px] p-5 shadow-xs relative overflow-hidden group">
                                <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-[#EAE5D9] text-[#8C7A5F] flex items-center justify-center font-black text-xs select-none">
                                    📸
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">收录照片回忆</p>
                                <p className="text-3xl font-black text-slate-850 font-mono">{totalPhotosCount} <span className="text-[11px] font-black text-slate-400 uppercase tracking-wide">张</span></p>
                            </div>

                            <div className="bg-[#FAF8F5] border border-[#EBE6DD] rounded-[24px] p-5 shadow-xs relative overflow-hidden group">
                                <div className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-[#EAE5D9] text-[#8C7A5F] flex items-center justify-center font-black text-xs select-none">
                                    ✨
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">访客阅览与爱心</p>
                                <div className="flex items-center gap-6 mt-1 font-mono text-slate-700 font-bold">
                                    <span className="flex items-center gap-1.5 text-xs">
                                        👁️ {totalViewsCount} 次
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs text-rose-500">
                                        ❤️ {totalLikesCount} 赞
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 装饰温馨手账文案 */}
                        <div className="mt-auto p-4 border border-[#F3E8FF] bg-gradient-to-br from-purple-50/40 to-indigo-50/20 rounded-2xl text-[11px] text-purple-700 font-bold leading-relaxed shadow-xs">
                            💡 “每一张照片都是时光切片，在你的巧手装订下，冷冰冰的数据成为了温暖的故事。”
                        </div>
                    </aside>
                )}

            </div>

            {/* --- 业务相关各种弹窗控制 --- */}

            {/* 新建画册 Modal */}
            <BookEditModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSave={handleFinishCreate}
                title="新建时光相册"
            />

            {/* 编辑信息 Modal */}
            {editModal.isOpen && (
                <BookEditModal
                    isOpen={editModal.isOpen}
                    onClose={() => setEditModal({ isOpen: false, bookId: '' })}
                    onSave={handleSaveBookInfo}
                    initialData={editModal.initialData}
                    title="编辑相册信息"
                />
            )}

            {/* 删除确认 Modal */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                onCancel={() => setDeleteConfirm({ isOpen: false, bookId: '' })}
                onConfirm={executeDelete}
                title="删除时光集"
                message="确定要将该相册移入垃圾箱吗？相册中的所有页排版设计与文字信息仍可被找回。"
            />

            {/* 系统置顶公告 */}
            {showAnnouncement && (
                <AnnouncementModal
                    isOpen={showAnnouncement}
                    onClose={() => setShowAnnouncement(false)}
                    content={announcementContent}
                />
            )}

            {/* 分享二维码 / 链接弹窗 */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                shareUrl={shareUrl}
                bookTitle={shareBookTitle}
            />

            {/* 发布模板确认弹窗 */}
            {publishTemplateModal.isOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl p-8 flex flex-col gap-6 font-['Outfit',_sans-serif]">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">发布为整书模板</h3>
                            <p className="text-slate-400 text-xs font-semibold mt-1.5">
                                将《{publishTemplateModal.bookTitle}》发布为可复用的模板。发布后，您和其他创作者都可以在“书模板市场”中套用该结构一键建书。
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">模板展示名称</label>
                            <input
                                type="text"
                                placeholder="输入模板名称..."
                                value={publishTemplateModal.templateTitle}
                                onChange={(e) => setPublishTemplateModal(prev => ({ ...prev, templateTitle: e.target.value }))}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[14px] text-slate-700 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all font-bold"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                disabled={isPublishingTemplate}
                                onClick={() => setPublishTemplateModal({ isOpen: false, bookId: '', bookTitle: '', templateTitle: '' })}
                                className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-bold text-[14px] transition-colors cursor-pointer"
                            >
                                取消
                            </button>
                            <button
                                disabled={isPublishingTemplate}
                                onClick={handleConfirmPublishTemplate}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-[14px] shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                {isPublishingTemplate && <Loader2 className="animate-spin" size={16} />}
                                确认发布
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 导出进度条 Modal */}
            {activeExportJobId && (
                <ExportProgressModal
                    jobId={activeExportJobId}
                    title={exportTypeTitle}
                    onClose={() => setActiveExportJobId(null)}
                />
            )}

            {/* 右键上下文菜单渲染 */}
            {contextMenu && (
                <BookContextMenu
                    bookId={contextMenu.bookId}
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    isFavorite={contextMenu.isFavorite}
                    onClose={() => setContextMenu(null)}
                    onOpen={() => handleOpenBook(contextMenu.bookId)}
                    onEdit={() => handleEditBook(contextMenu.bookId)}
                    onDelete={() => handleDeleteBook(null, contextMenu.bookId)}
                    onUnfavorite={() => handleToggleFavorite(contextMenu.bookId)}
                    onStatusUpdate={(newStatus) => handleUpdateBookStatus(contextMenu.bookId, newStatus)}
                    onShare={() => handleShareBook(contextMenu.bookId)}
                    onPublishTemplate={() => handlePublishTemplateTrigger(contextMenu.bookId)}
                    onExportTriggered={(jobId, type) => {
                        const title = type === 'pdf' ? '导出 PDF 画册' : '导出 3D 拟物视频';
                        setExportTypeTitle(title);
                        setActiveExportJobId(jobId);
                    }}
                />
            )}

    </MainLayout>
    );
}
