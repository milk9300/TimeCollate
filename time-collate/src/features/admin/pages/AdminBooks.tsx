import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AdminLayout } from '../components/AdminLayout';
import { Eye, Trash2, BookOpen, User, XCircle, Filter, Clock, ShieldCheck, Heart, Star, Image, FileText, Layers } from 'lucide-react';
import { ConfirmModal } from '../../common/components/ConfirmModal';
import { AdminTable } from '../components/AdminTable';
import type { AdminTableColumn } from '../components/AdminTable';
import { GeneratedCover } from '../../editor/components/GeneratedCover';

interface BookData {
    id: string;
    title: string;
    author: string;
    theme: string;
    pageSize: string;
    coverUrl: string | null;
    isPublic: boolean;
    status: 'private' | 'pending' | 'published' | 'rejected';
    createdAt: number;
    userNickname: string;
    views: number;
    likes: number;
    favorites: number;
    chapterCount: number;
    pageCount: number;
    photoCount: number;
}

export function AdminBooks() {
    const navigate = useNavigate();
    const [books, setBooks] = useState<BookData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const PAGE_SIZE = 12;

    const [failedBookCovers, setFailedBookCovers] = useState<Set<string>>(new Set());

    const handleCoverError = (bookId: string) => {
        setFailedBookCovers(prev => {
            const next = new Set(prev);
            next.add(bookId);
            return next;
        });
    };

    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const fetchBooks = async (pageNum: number) => {
        if (pageNum === 1) setIsLoading(true);
        else setLoadingMore(true);

        try {
            const params = {
                page: pageNum,
                pageSize: PAGE_SIZE,
                ...(statusFilter !== 'all' ? { status: statusFilter } : {})
            };
            const response = await axios.get('/admin/books', { params });
            if (response.data.success) {
                const { books: newBooks, totalPages: total } = response.data.data;
                if (pageNum === 1) {
                    setBooks(newBooks);
                } else {
                    setBooks(prev => [...prev, ...newBooks]);
                }
                setTotalPages(total);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Failed to fetch admin books:', error);
        } finally {
            setIsLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        setPage(1);
        setFailedBookCovers(new Set());
        fetchBooks(1);
    }, [statusFilter]);

    const handleLoadMore = () => {
        if (!loadingMore && page < totalPages) {
            fetchBooks(page + 1);
        }
    };

    const handleAuditBook = async (id: string, action: 'approve' | 'reject') => {
        setIsProcessing(id);
        try {
            const response = await axios.post(`/admin/books/${id}/audit`, { action });
            if (response.data.success) {
                setPage(1);
                fetchBooks(1);
            }
        } catch (error) {
            console.error('Failed to audit book:', error);
            alert('操作失败');
        } finally {
            setIsProcessing(null);
        }
    };

    const triggerDeleteConfirm = (id: string, title: string) => {
        setConfirmConfig({
            isOpen: true,
            title: '下架并删除',
            message: `确定要下架并删除作品《${title}》吗？这将导致该作品进入回收站。`,
            onConfirm: async () => {
                try {
                    await axios.delete(`/admin/books/${id}`);
                    setPage(1);
                    fetchBooks(1);
                } catch (error) {
                    console.error('Failed to delete book:', error);
                } finally {
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const columns: AdminTableColumn<BookData>[] = [
        {
            key: 'cover',
            title: '封面',
            width: '80px',
            render: (book) => (
                <div className="w-12 h-16 rounded-lg overflow-hidden border border-slate-100 shadow-sm flex items-center justify-center shrink-0 relative">
                    <div className="w-[150px] h-[200px] absolute top-0 left-0" style={{ transform: 'scale(0.32)', transformOrigin: 'top left' }}>
                        <GeneratedCover
                            title={book.title}
                            author={book.author || ''}
                            coverUrl={book.coverUrl || undefined}
                            mode="card"
                        />
                    </div>
                </div>
            )
        },
        {
            key: 'title',
            title: '作品信息',
            width: '280px',
            render: (book) => (
                <div>
                    <h4 className="text-sm font-black text-slate-900 line-clamp-1">{book.title}</h4>
                    <div className="flex items-center gap-2.5 mt-1.5">
                        <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                            规格: {book.pageSize}
                        </span>
                    </div>
                </div>
            )
        },
        {
            key: 'author',
            title: '作者',
            width: '140px',
            render: (book) => (
                <div className="flex items-center gap-1.5 text-slate-700">
                    <User size={14} className="text-slate-400 shrink-0" />
                    <span className="text-sm font-bold truncate max-w-[100px]">{book.userNickname}</span>
                </div>
            )
        },
        {
            key: 'createdAt',
            title: '创建时间',
            width: '120px',
            render: (book) => (
                <span className="text-sm text-slate-500 font-bold">
                    {new Date(book.createdAt).toLocaleDateString()}
                </span>
            )
        },
        {
            key: 'stats',
            title: '数据统计',
            width: '240px',
            render: (book) => (
                <div className="flex flex-col gap-1.5 py-0.5">
                    {/* 互动数据 */}
                    <div className="flex items-center gap-3 text-slate-600 font-bold whitespace-nowrap">
                        <span className="flex items-center gap-1 text-[11px] shrink-0" title="浏览量">
                            <Eye size={12} className="text-slate-400 shrink-0" />
                            <span>{book.views}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] shrink-0" title="点赞数">
                            <Heart size={12} className="text-slate-400 shrink-0" />
                            <span>{book.likes}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[11px] shrink-0" title="收藏数">
                            <Star size={12} className="text-slate-400 shrink-0" />
                            <span>{book.favorites}</span>
                        </span>
                    </div>
                    {/* 实体组成数据 */}
                    <div className="flex items-center gap-2.5 text-slate-400 text-[10px] font-semibold whitespace-nowrap">
                        <span className="flex items-center gap-0.5 shrink-0" title="章节数">
                            <Layers size={10} className="text-slate-400 shrink-0" />
                            <span>{book.chapterCount}章</span>
                        </span>
                        <span className="flex items-center gap-0.5 shrink-0" title="页面数">
                            <FileText size={10} className="text-slate-400 shrink-0" />
                            <span>{book.pageCount}页</span>
                        </span>
                        <span className="flex items-center gap-0.5 shrink-0" title="照片数">
                            <Image size={10} className="text-slate-400 shrink-0" />
                            <span>{book.photoCount}张</span>
                        </span>
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            title: '状态',
            width: '120px',
            render: (book) => (
                <span className={`whitespace-nowrap inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    book.status === 'published' ? 'bg-emerald-50 text-emerald-600' :
                    book.status === 'pending' ? 'bg-amber-50 text-amber-600 animate-pulse' :
                    book.status === 'rejected' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'
                }`}>
                    {book.status === 'published' && '已公开'}
                    {book.status === 'pending' && '待审核'}
                    {book.status === 'rejected' && '已拒绝'}
                    {book.status === 'private' && '私有'}
                </span>
            )
        },
        {
            key: 'actions',
            title: '操作',
            width: '220px',
            align: 'right',
            render: (book) => (
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {book.status === 'pending' && (
                        <div className="flex gap-1.5 mr-2">
                            <button
                                onClick={() => handleAuditBook(book.id, 'approve')}
                                disabled={isProcessing === book.id}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50"
                            >
                                通过
                            </button>
                            <button
                                onClick={() => handleAuditBook(book.id, 'reject')}
                                disabled={isProcessing === book.id}
                                className="px-3 py-1.5 bg-white border border-red-100 text-red-500 hover:bg-red-50 rounded-xl text-xs font-black transition-all active:scale-95 disabled:opacity-50"
                            >
                                拒绝
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => navigate(`/read/${book.id}`, { state: { from: '/admin/books' } })}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-900 text-slate-500 hover:text-white rounded-xl text-xs font-black transition-all active:scale-95 whitespace-nowrap"
                        title="预览作品"
                    >
                        查看
                    </button>
                    <button
                        onClick={() => triggerDeleteConfirm(book.id, book.title)}
                        className="px-3 py-1.5 bg-red-50/50 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-xs font-black transition-all active:scale-95 whitespace-nowrap"
                        title="下架作品"
                    >
                        下架
                    </button>
                </div>
            )
        }
    ];

    return (
        <AdminLayout title="书籍管理">
            <div className="p-8 max-w-[1800px] mx-auto animate-in fade-in">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2 flex items-center gap-3">
                            作品管理
                            <span className="text-xs bg-indigo-50 text-indigo-500 px-3 py-1 rounded-full">{books.length} / {totalPages * PAGE_SIZE}</span>
                        </h2>
                        <p className="text-slate-500 font-medium">监控全站内容，处理违规作品及发布申请。</p>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100/50 backdrop-blur-sm p-1.5 rounded-2xl border border-slate-200/50">
                        {[
                            { id: 'all', name: '全部', icon: Filter },
                            { id: 'pending', name: '审核', icon: Clock },
                            { id: 'published', name: '发布', icon: ShieldCheck },
                            { id: 'rejected', name: '拒绝', icon: XCircle }
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => setStatusFilter(item.id)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-black transition-all ${statusFilter === item.id
                                    ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50 scale-105'
                                    : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                    }`}
                            >
                                <item.icon size={14} />
                                {item.name}
                            </button>
                        ))}
                    </div>
                </div>

                <AdminTable<BookData>
                    columns={columns}
                    data={books}
                    rowKey={(b) => b.id}
                    isLoading={isLoading}
                    emptyText="暂无作品记录"
                    hasMore={page < totalPages}
                    loadingMore={loadingMore}
                    onLoadMore={handleLoadMore}
                    loadMoreText="加载更多作品"
                />

                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    type="danger"
                />
            </div>
        </AdminLayout>
    );
}
