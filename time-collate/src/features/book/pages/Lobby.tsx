import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Library,
    Loader2,
    BookOpen,
    Image,
    Sparkles,
    Plus,
    Search,
    Heart
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

const bookService = getBookService();

/**
 * 书籍大厅页面
 * 展示用户创建的所有书籍，支持搜索和管理
 */
export function Lobby() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuthStore();
    const [books, setBooks] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 12;

    const [searchQuery, setSearchQuery] = useState('');
    const [showAnnouncement, setShowAnnouncement] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [contextMenu, setContextMenu] = useState<{
        bookId: string;
        x: number;
        y: number;
        isFavorite?: boolean;
    } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        bookId: string;
    }>({ isOpen: false, bookId: '' });
    const [editModal, setEditModal] = useState<{
        isOpen: boolean;
        bookId: string;
        initialData?: Partial<Book>;
    }>({ isOpen: false, bookId: '' });
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

    // 加载书籍列表与收藏列表
    useEffect(() => {
        loadBooks(1);
        loadFavoritedBooks();
        // 检查是否需要显示首次公告
        if (user && !user.hasSeenAnnouncement) {
            setShowAnnouncement(true);
        }
    }, [user]);

    const loadFavoritedBooks = async () => {
        if (!user) return;
        setIsFavLoading(true);
        try {
            const response = await bookService.getFavoritedBooks(user.id, 1, 50);
            setFavoritedBooks(response.items);
        } catch (error) {
            console.error('Failed to load favorited books in lobby:', error);
        } finally {
            setIsFavLoading(false);
        }
    };

    // 处理从全局搜索 (Cmd + K) 或其他入口发起的“新建时光集” query param 触发指令
    useEffect(() => {
        if (searchParams.get('create') === 'true') {
            setIsCreateOpen(true);
            // 清理 query param 避免刷新重复弹窗
            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete('create');
            setSearchParams(nextParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

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

    // 触发创建时光集
    const handleNewBookClick = () => {
        setIsCreateOpen(true);
    };

    // 执行实际创建并跳转至编辑器
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
                // 更新本地列表
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

    // 取消收藏
    const handleToggleFavorite = async (bookId: string) => {
        try {
            await axios.post('/interactions/favorite', { entityType: 'book', entityId: bookId });
            // 更新本地收藏列表 (直接过滤掉已取消收藏的)
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
            // 更新本地列表状态
            setBooks(books.map(b => b.id === bookId ? { ...b, status: newStatus } : b));
        } catch (error) {
            console.error('Failed to update book status in lobby:', error);
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
            console.error('Failed to generate share link in lobby:', error);
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
            alert('发布模板成功！您可以在“我的书模板”中查看和套用。');
            setPublishTemplateModal({ isOpen: false, bookId: '', bookTitle: '', templateTitle: '' });
        } catch (error) {
            console.error('Failed to publish template:', error);
            alert('发布模板失败，请稍后重试');
        } finally {
            setIsPublishingTemplate(false);
        }
    };

    // 计算统计指标
    const totalBooksCount = books.length;
    const totalPagesCount = books.reduce((sum, b) => {
        let count = typeof b.pageCount === 'number' ? b.pageCount : 0;
        if (count === 0 && b.pages && Array.isArray(b.pages)) {
            count += b.pages.length;
        }
        return sum + count;
    }, 0);
    const totalPhotosCount = books.reduce((sum, b) => {
        let count = typeof b.photoCount === 'number' ? b.photoCount : 0;
        if (count === 0 && b.pages && Array.isArray(b.pages)) {
            b.pages.forEach(p => {
                if (p.photos && Array.isArray(p.photos)) {
                    count += p.photos.filter(ph => ph && ph.url).length;
                }
            });
        }
        return sum + count;
    }, 0);
    const totalViewsCount = books.reduce((sum, b) => sum + (b.views || 0), 0);
    const totalLikesCount = books.reduce((sum, b) => sum + (b.likes || 0), 0);

    // 搜索过滤
    const filteredBooks = (books || []).filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainLayout title="拾光集">
            <div className="p-8">
                {/* 页面指示与局部过滤 */}
                <div className="flex items-center justify-between mb-8 select-none">
                    <div>
                        <h2 className="text-[22px] font-black text-[#5C4033] tracking-tight font-['Georgia','Songti_SC','STSong',serif]">个人作品集</h2>
                    </div>
                    {/* 页面内部局部过滤输入框 */}
                    <div className="relative w-64 group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450 group-focus-within:text-indigo-650 transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="过滤当前书架..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-slate-700 placeholder-slate-400 
                                     focus:border-indigo-500 focus:bg-white transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* 左侧：书籍列表 */}
                    <div className="flex-1 w-full order-2 lg:order-1">
                        {isLoading ? (
                            <BookshelfGrid
                                theme="oak"
                                gap={24}
                                rowGap={64}
                                colsClass="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                            >
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="aspect-[3/4] bg-white/70 rounded-2xl border border-[#E2E8F0] animate-pulse shadow-sm"></div>
                                ))}
                            </BookshelfGrid>
                        ) : (books.length === 0 || filteredBooks.length === 0) && searchQuery ? (
                            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                                <div className="w-20 h-20 bg-[#F1F5F9] rounded-2xl flex items-center justify-center text-[#94A3B8] mb-4">
                                    <Library size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-[#18181B] mb-1">
                                    未找到相关作品
                                </h3>
                                <p className="text-[#64748B] max-w-sm">
                                    找不到包含 "{searchQuery}" 的作品，请换个词试试。
                                </p>
                            </div>
                        ) : (
                            <>
                                <BookshelfGrid
                                    theme="oak"
                                    gap={24}
                                    rowGap={64}
                                    colsClass="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                                >
                                    {/* 虚线新建卡片 - 仅在未搜索时，作为首个网格卡片展示 */}
                                    {!searchQuery && (
                                        <button
                                            onClick={handleNewBookClick}
                                            className="group relative w-full aspect-[3/4] rounded-r-md rounded-l-[3px] bg-slate-50/50 hover:bg-indigo-50/30 border-2 border-dashed border-indigo-200/50 hover:border-indigo-500/50 flex flex-col items-center justify-center p-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer shadow-sm hover:shadow-[0_16px_36px_-6px_rgba(79,70,229,0.08)]"
                                            style={{ border: '2px dashed rgba(111, 94, 241, 0.3)' }}
                                        >
                                            <div className="absolute inset-4 rounded-[20px] border border-slate-200/40 pointer-events-none group-hover:border-indigo-200/20 transition-all duration-300" />
                                            <div className="flex flex-col items-center gap-3.5 z-10">
                                                <div className="w-12 h-12 rounded-full bg-white text-indigo-500 flex items-center justify-center shadow-sm border border-slate-100 group-hover:bg-gradient-to-tr group-hover:from-indigo-600 group-hover:to-violet-600 group-hover:text-white transition-all duration-300">
                                                    <Plus size={24} strokeWidth={1.5} className="group-hover:rotate-90 transition-transform duration-300" />
                                                </div>
                                                <div className="text-center">
                                                    <span className="block text-xs font-black text-slate-700 group-hover:text-indigo-600 transition-colors">新建时光集</span>
                                                    <span className="block text-[10px] font-bold text-slate-400 mt-1.5">开启你的新作品</span>
                                                </div>
                                            </div>
                                        </button>
                                    )}

                                    {filteredBooks.map((book) => (
                                        <BookCard
                                            key={book.id}
                                            book={book}
                                            onClick={() => handleOpenBook(book.id)}
                                            onContextMenu={(e) => handleContextMenu(e, book.id)}
                                            showCommunityStats={true}
                                        />
                                    ))}
                                </BookshelfGrid>

                                {/* 加载更多按钮 */}
                                {hasMore && !searchQuery && (
                                    <div className="flex justify-center pb-8 mt-12">
                                        <button
                                            onClick={handleLoadMore}
                                            disabled={loadingMore}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-full font-medium hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50"
                                        >
                                            {loadingMore ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    加载中...
                                                </>
                                            ) : (
                                                '加载更多'
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {/* 我的收藏时光集 */}
                        {!isLoading && !searchQuery && (
                            <div className="mt-14 animate-in fade-in duration-300">
                                <div className="flex items-center mb-6 select-none border-b border-[#EADFC9]/30 pb-2">
                                    <div>
                                        <h3 className="text-[22px] font-black text-[#5C4033] tracking-tight font-['Georgia','Songti_SC','STSong',serif]">心动作品集</h3>
                                    </div>
                                </div>

                                {isFavLoading ? (
                                     <BookshelfGrid
                                         theme="oak"
                                         gap={24}
                                         rowGap={64}
                                         colsClass="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                                     >
                                         {[1, 2, 3].map(i => (
                                             <div key={i} className="aspect-[3/4] bg-white/70 rounded-2xl border border-[#E2E8F0] animate-pulse shadow-sm"></div>
                                         ))}
                                     </BookshelfGrid>
                                 ) : favoritedBooks.length === 0 ? (
                                     <div className="bg-[#FAF8F3]/50 rounded-[28px] p-8 border border-dashed border-[#EADFC9]/65 text-center text-[#8C7A6B]">
                                         <div className="w-10 h-10 bg-[#FCFBF8] rounded-full flex items-center justify-center text-[#B5A890] border border-[#EDE5D3] mx-auto mb-2 shadow-xs">
                                             <Heart size={18} className="text-slate-350" />
                                         </div>
                                         <p className="text-[11px] font-bold">暂无收藏的时光书。您可以去广场发现有趣的内容并添加收藏</p>
                                     </div>
                                 ) : (
                                     <BookshelfGrid
                                         theme="oak"
                                         gap={24}
                                         rowGap={64}
                                         colsClass="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                                     >
                                         {favoritedBooks.map((book) => (
                                             <BookCard
                                                 key={book.id}
                                                 book={book}
                                                 onClick={() => navigate(`/read/${book.id}`)}
                                                 onContextMenu={(e) => handleContextMenu(e, book.id, true)}
                                                 showCommunityStats={true}
                                             />
                                         ))}
                                     </BookshelfGrid>
                                 )}
                             </div>
                         )}
                    </div>

                    {/* 右侧：复古手账与质感纸张风数据看板 */}
                    {!isLoading && books.length > 0 && (
                        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4.5 order-1 lg:order-2 lg:sticky lg:top-8 select-none animate-in slide-in-from-right-6 duration-500 bg-[#FAF7EE] border border-[#E8DFD0] p-5.5 rounded-[28px] shadow-[4px_6px_20px_rgba(80,70,50,0.06),inset_-1px_-1px_0px_rgba(255,255,255,0.4)]">
                            <div className="px-1.5 pb-2.5 border-b border-[#EADFC9]/60 flex flex-col">
                                <h3 className="text-xs font-bold text-[#5C4033] tracking-wider font-['Georgia','Songti_SC','STSong',serif]">拾光档案馆</h3>
                                <p className="text-[9px] text-[#A69B85] font-black uppercase tracking-widest mt-0.5">The Private Archive</p>
                            </div>
                            
                            {/* 1. 作品记录 */}
                            <div className="bg-[#FCFBF8] border border-[#EDE5D3] p-5 rounded-[24px_16px_20px_18px] shadow-[1px_2px_6px_rgba(80,70,50,0.04)] rotate-[-0.6deg] hover:rotate-0 hover:scale-[1.02] hover:shadow-[3px_6px_15px_rgba(70,50,30,0.08)] transition-all duration-300 flex items-center gap-4 group cursor-pointer">
                                <div className="w-11 h-11 rounded-full border border-[#DCD3C1] bg-[#FAF8F3] flex items-center justify-center text-[#705A4A] shrink-0 group-hover:scale-110 transition-transform shadow-[inset_1px_1px_2px_rgba(0,0,0,0.02)]">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[#A69B85] uppercase tracking-wider block font-['Georgia','Songti_SC','STSong',serif]">已装订成册</span>
                                    <h3 className="text-[17px] font-bold text-[#5C4033] mt-0.5 tracking-tight font-['Georgia','Songti_SC','STSong',serif]">
                                        {totalBooksCount} <span className="text-xs text-[#8C7A6B] font-semibold">册时光集</span>
                                    </h3>
                                    <p className="text-[10px] text-[#B5A890] italic mt-0.5">珍藏的独家记忆</p>
                                </div>
                            </div>

                            {/* 2. 回忆内容量 */}
                            <div className="bg-[#FCFBF8] border border-[#EDE5D3] p-5 rounded-[18px_22px_16px_20px] shadow-[1px_2px_6px_rgba(80,70,50,0.04)] rotate-[0.4deg] hover:rotate-0 hover:scale-[1.02] hover:shadow-[3px_6px_15px_rgba(70,50,30,0.08)] transition-all duration-300 flex items-center gap-4 group cursor-pointer">
                                <div className="w-11 h-11 rounded-full border border-[#DCD3C1] bg-[#FAF8F3] flex items-center justify-center text-[#705A4A] shrink-0 group-hover:scale-110 transition-transform shadow-[inset_1px_1px_2px_rgba(0,0,0,0.02)]">
                                    <Image size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[#A69B85] uppercase tracking-wider block font-['Georgia','Songti_SC','STSong',serif]">留存的瞬间</span>
                                    <h3 className="text-[17px] font-bold text-[#5C4033] mt-0.5 tracking-tight font-['Georgia','Songti_SC','STSong',serif]">
                                        {totalPagesCount} <span className="text-xs text-[#8C7A6B] font-semibold">帧底片</span> <span className="text-xs text-[#DCD3C1] mx-0.5">/</span> {totalPhotosCount} <span className="text-xs text-[#8C7A6B] font-semibold">枚切片</span>
                                    </h3>
                                    <p className="text-[10px] text-[#B5A890] italic mt-0.5">碎影拼贴的暖心一幕</p>
                                </div>
                            </div>

                            {/* 3. 时光影响力 */}
                            <div className="bg-[#FCFBF8] border border-[#EDE5D3] p-5 rounded-[20px_18px_24px_16px] shadow-[1px_2px_6px_rgba(80,70,50,0.04)] rotate-[-0.3deg] hover:rotate-0 hover:scale-[1.02] hover:shadow-[3px_6px_15px_rgba(70,50,30,0.08)] transition-all duration-300 flex items-center gap-4 group cursor-pointer">
                                <div className="w-11 h-11 rounded-full border border-[#DCD3C1] bg-[#FAF8F3] flex items-center justify-center text-[#705A4A] shrink-0 group-hover:scale-110 transition-transform shadow-[inset_1px_1px_2px_rgba(0,0,0,0.02)]">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[#A69B85] uppercase tracking-wider block font-['Georgia','Songti_SC','STSong',serif]">有心人翻阅</span>
                                    <h3 className="text-[17px] font-bold text-[#5C4033] mt-0.5 tracking-tight font-['Georgia','Songti_SC','STSong',serif]">
                                        {totalViewsCount} <span className="text-xs text-[#8C7A6B] font-semibold">次不期而遇</span> <span className="text-xs text-[#DCD3C1] mx-0.5">/</span> {totalLikesCount} <span className="text-xs text-[#8C7A6B] font-semibold">声心意回响</span>
                                    </h3>
                                    <p className="text-[10px] text-[#B5A890] italic mt-0.5">每一次翻阅，都是一次共鸣</p>
                                </div>
                            </div>

                            {/* 4. 心动作品集 */}
                            <div className="bg-[#FCFBF8] border border-[#EDE5D3] p-5 rounded-[16px_20px_18px_22px] shadow-[1px_2px_6px_rgba(80,70,50,0.04)] rotate-[0.5deg] hover:rotate-0 hover:scale-[1.02] hover:shadow-[3px_6px_15px_rgba(70,50,30,0.08)] transition-all duration-300 flex items-center gap-4 group cursor-pointer">
                                <div className="w-11 h-11 rounded-full border border-[#DCD3C1] bg-[#FAF8F3] flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-110 transition-transform shadow-[inset_1px_1px_2px_rgba(0,0,0,0.02)]">
                                    <Heart size={20} className="fill-rose-50/50" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[#A69B85] uppercase tracking-wider block font-['Georgia','Songti_SC','STSong',serif]">收藏的回忆</span>
                                    <h3 className="text-[17px] font-bold text-[#5C4033] mt-0.5 tracking-tight font-['Georgia','Songti_SC','STSong',serif]">
                                        {favoritedBooks.length} <span className="text-xs text-[#8C7A6B] font-semibold">册心动时光</span>
                                    </h3>
                                    <p className="text-[10px] text-[#B5A890] italic mt-0.5">点亮心动的共鸣篇章</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 右键上下文菜单 */}
            {contextMenu && (
                <BookContextMenu
                    bookId={contextMenu.bookId}
                    status={books.find(b => b.id === contextMenu.bookId)?.status}
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    onClose={() => setContextMenu(null)}
                    onOpen={() => {
                        if (contextMenu.isFavorite) {
                            navigate(`/read/${contextMenu.bookId}`);
                        } else {
                            handleOpenBook(contextMenu.bookId);
                        }
                    }}
                    onEdit={() => handleEditBook(contextMenu.bookId)}
                    onDelete={() => handleDeleteBook(null, contextMenu.bookId)}
                    onStatusUpdate={(newStatus) => handleUpdateBookStatus(contextMenu.bookId, newStatus)}
                    onShare={() => handleShareBook(contextMenu.bookId)}
                    onExportTriggered={(jobId, type) => {
                        setActiveExportJobId(jobId);
                        setExportTypeTitle(
                            type === 'pdf' 
                                ? '正在准备高清 PDF 交付物' 
                                : '正在生成 3D 翻页视频'
                        );
                    }}
                    isFavorite={contextMenu.isFavorite}
                    onUnfavorite={() => handleToggleFavorite(contextMenu.bookId)}
                    onPublishTemplate={contextMenu.isFavorite ? undefined : () => handlePublishTemplateTrigger(contextMenu.bookId)}
                />
            )}

            {/* 编辑书籍信息弹窗 */}
            <BookEditModal
                isOpen={editModal.isOpen}
                title="修改书籍信息"
                initialData={editModal.initialData}
                onClose={() => setEditModal({ ...editModal, isOpen: false })}
                onSave={handleSaveBookInfo}
            />

            {/* 删除确认弹窗 */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="删除时光集"
                message="确定要将这本书移至回收站吗？您可以在 30 天内从回收站中恢复它。"
                confirmText="移至回收站"
                cancelText="留在库中"
                onConfirm={executeDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, bookId: '' })}
            />

            {/* 首次加入系统的公告展示 */}
            <AnnouncementModal
                isOpen={showAnnouncement}
                onClose={() => setShowAnnouncement(false)}
            />

            {/* 新建时光集弹窗 */}
            <BookEditModal
                isOpen={isCreateOpen}
                title="新建时光集"
                initialData={{
                    title: '',
                    author: user?.nickname || '时光记录者',
                    isPublic: false
                }}
                onClose={() => setIsCreateOpen(false)}
                onSave={handleFinishCreate}
            />

            {/* 导出进度进度显示模态框 */}
            {activeExportJobId && (
                <ExportProgressModal
                    jobId={activeExportJobId}
                    title={exportTypeTitle}
                    onClose={() => setActiveExportJobId(null)}
                />
            )}

            {/* 分享图书弹窗 */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                shareUrl={shareUrl}
                bookTitle={shareBookTitle}
            />

            {/* 发布为模板弹窗 */}
            {publishTemplateModal.isOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl p-8 flex flex-col gap-6 font-['Outfit',_sans-serif]">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">发布为整书模板</h3>
                            <p className="text-slate-400 text-xs font-semibold mt-1.5">
                                发布模板后，您可以在“我的书模板”中找到它，也可以一键克隆套用生成新书籍。
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-black text-slate-500">模板名称</label>
                            <input
                                type="text"
                                placeholder="输入模板名称..."
                                value={publishTemplateModal.templateTitle}
                                onChange={(e) => setPublishTemplateModal(prev => ({ ...prev, templateTitle: e.target.value }))}
                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[14px] text-slate-700
                                         focus:outline-none focus:bg-white focus:border-indigo-500 transition-all duration-300 font-bold"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                disabled={isPublishingTemplate}
                                onClick={() => setPublishTemplateModal(prev => ({ ...prev, isOpen: false }))}
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
        </MainLayout>
    );
}
