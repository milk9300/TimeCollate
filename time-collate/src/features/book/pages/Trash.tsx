import { useEffect, useState } from 'react';
import {
    RotateCcw,
    AlertTriangle,
    ChevronRight,
    Clock,
    Library,
    Trash2,
    Search
} from 'lucide-react';
import { MainLayout } from '../../common/components/MainLayout';
import { BookCard } from '../components/BookCard';
import { getBookService } from '../../../services/serviceFactory';
import type { Book } from '../../../types';
import { ConfirmModal } from '../../common/components/ConfirmModal';

const bookService = getBookService();

interface DeletedBook extends Book {
    deletedAt: number;
    daysRemaining: number;
}

/**
 * 回收站页面
 * 展示已删除的书籍，支持恢复和永久删除
 */
export function Trash() {
    const [books, setBooks] = useState<DeletedBook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        bookId: string;
    }>({ isOpen: false, bookId: '' });
    const [emptyConfirm, setEmptyConfirm] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // 一键清空回收站
    const handleEmptyTrash = async () => {
        setEmptyConfirm(false);
        setIsClearing(true);
        try {
            await Promise.all(books.map(b => bookService.permanentDeleteBook(b.id)));
            setBooks([]);
        } catch (error) {
            console.error('Failed to empty trash:', error);
            alert('清空回收站失败');
        } finally {
            setIsClearing(false);
        }
    };

    // 加载回收站书籍
    useEffect(() => {
        loadDeletedBooks();
    }, []);

    const loadDeletedBooks = async () => {
        setIsLoading(true);
        try {
            const result = await bookService.getDeletedBooks();
            setBooks(result as DeletedBook[]);
        } catch (error) {
            console.error('Failed to load deleted books:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 恢复书籍
    const handleRestore = async (bookId: string) => {
        setActionLoading(bookId);
        try {
            await bookService.restoreBook(bookId);
            setBooks(books.filter(b => b.id !== bookId));
        } catch (error) {
            console.error('Failed to restore book:', error);
        } finally {
            setActionLoading(null);
        }
    };

    // 触发永久删除确认
    const handlePermanentDelete = (bookId: string) => {
        setDeleteConfirm({ isOpen: true, bookId });
    };

    // 执行永久删除逻辑
    const executePermanentDelete = async () => {
        const { bookId } = deleteConfirm;
        setDeleteConfirm({ isOpen: false, bookId: '' });

        setActionLoading(bookId);
        try {
            await bookService.permanentDeleteBook(bookId);
            setBooks(books.filter(b => b.id !== bookId));
        } catch (error) {
            console.error('Failed to permanently delete book:', error);
            alert('彻底删除失败');
        } finally {
            setActionLoading(null);
        }
    };

    // 搜索过滤
    const filteredBooks = books.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <MainLayout title="回收站">
            <div className="p-8">
                {/* 页面指示与清空动作 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 select-none">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-[#94A3B8] text-sm">
                            <span>回收站</span>
                            <ChevronRight size={14} />
                            <span className="text-[#18181B] font-medium">所有已删除项目</span>
                        </div>
                        {/* 页面局部过滤输入框 */}
                        <div className="relative w-48 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={13} />
                            <input
                                type="text"
                                placeholder="过滤回收站..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200/60 rounded-xl py-1.5 pl-8 pr-3 text-[11px] font-bold text-slate-700 placeholder-slate-400 
                                         focus:border-indigo-500 focus:bg-white transition-all outline-none"
                            />
                        </div>
                    </div>
                    {books.length > 0 && (
                        <button
                            onClick={() => setEmptyConfirm(true)}
                            disabled={isClearing}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 text-red-600 border border-red-200/40 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white hover:border-transparent active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            <Trash2 size={14} />
                            <span>{isClearing ? '正在清空...' : '清空回收站'}</span>
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="aspect-[3/4] bg-white rounded-xl border border-[#E2E8F0] animate-pulse"></div>
                        ))}
                    </div>
                ) : filteredBooks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[24px] p-8 select-none">
                        <div className="w-14 h-14 bg-white text-slate-400 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 shadow-sm animate-in fade-in zoom-in-95 duration-500">
                            <Trash2 size={24} strokeWidth={1.5} />
                        </div>
                        <h3 className="text-sm font-black text-[#18181B] mb-1.5">回收站是空的</h3>
                        <p className="text-slate-400 max-w-sm text-xs font-semibold leading-relaxed">
                            这里没有已删除的项目，作品将保留 30 天以供恢复。
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 pb-8">
                        {filteredBooks.map((book) => (
                            <BookCard
                                key={book.id}
                                book={book}
                                onClick={() => { }} // 回收站内点击书籍不跳转
                                isTrash={true}
                                overlay={
                                    <div className="flex flex-col gap-3 items-center w-full px-4" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleRestore(book.id)}
                                            disabled={actionLoading === book.id}
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-white text-[#18181B] 
                                                     rounded-full hover:bg-white/90 transition-all cursor-pointer shadow-lg
                                                     disabled:opacity-50 disabled:cursor-not-allowed group/btn text-xs font-bold"
                                        >
                                            <RotateCcw size={16} className="group-hover/btn:rotate-[-45deg] transition-transform" />
                                            <span>恢复内容</span>
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDelete(book.id)}
                                            disabled={actionLoading === book.id}
                                            className="w-full flex items-center justify-center gap-2 py-2 bg-red-500 text-white 
                                                     rounded-full hover:bg-red-600 transition-all cursor-pointer shadow-lg
                                                     disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold"
                                        >
                                            <AlertTriangle size={16} />
                                            <span>彻底删除</span>
                                        </button>
                                    </div>
                                }
                                footerInfo={
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                                        <Clock size={10} />
                                        <span>{book.daysRemaining > 0 ? `${book.daysRemaining} 天后清理` : '即将清理'}</span>
                                    </div>
                                }
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* 永久删除确认弹窗 */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="永久删除时光集"
                message="确定要永久删除这本书吗？此操作不可撤销，所有图片也将被彻底清除。"
                confirmText="彻底删除"
                cancelText="暂不删除"
                onConfirm={executePermanentDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, bookId: '' })}
            />

            {/* 一键清空回收站确认弹窗 */}
            <ConfirmModal
                isOpen={emptyConfirm}
                title="清空回收站"
                message="确定要永久删除回收站里的所有时光集吗？此操作不可撤销，对应的所有图片和设计也将被彻底清除。"
                confirmText="全部清空"
                cancelText="暂不清除"
                onConfirm={handleEmptyTrash}
                onCancel={() => setEmptyConfirm(false)}
            />
        </MainLayout>
    );
}
