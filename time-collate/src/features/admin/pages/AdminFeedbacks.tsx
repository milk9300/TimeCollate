import { useState, useEffect } from 'react';
import axios from 'axios';
import { AdminLayout } from '../components/AdminLayout';
import { MessageSquare, Calendar, CheckCircle, Clock, Trash2, Maximize2 } from 'lucide-react';
import { ConfirmModal } from '../../common/components/ConfirmModal';
import { FullScreenPreview } from '../../common/components/FullScreenPreview';
import { AdminTable } from '../components/AdminTable';
import type { AdminTableColumn } from '../components/AdminTable';

interface FeedbackData {
    id: string;
    content: string;
    images: string[];
    imageUrls: string[];
    user_id: string | null;
    user_nickname: string | null;
    status: 'pending' | 'processed';
    created_at: number;
    reply_content?: string | null;
    reply_at?: number | null;
}

export function AdminFeedbacks() {
    const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const PAGE_SIZE = 20;

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

    const [replyConfig, setReplyConfig] = useState<{
        isOpen: boolean;
        feedbackId: string;
        replyText: string;
    }>({
        isOpen: false,
        feedbackId: '',
        replyText: ''
    });

    const fetchFeedbacks = async (pageNum: number) => {
        if (pageNum === 1) setIsLoading(true);
        else setLoadingMore(true);

        try {
            const response = await axios.get('/admin/feedbacks', {
                params: {
                    page: pageNum,
                    pageSize: PAGE_SIZE
                }
            });

            if (response.data.success) {
                const { feedbacks: newFeedbacks, page: currentPage, totalPages } = response.data.data;

                if (pageNum === 1) {
                    setFeedbacks(newFeedbacks);
                } else {
                    setFeedbacks(prev => [...prev, ...newFeedbacks]);
                }

                setHasMore(currentPage < totalPages);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Failed to fetch admin feedbacks:', error);
        } finally {
            setIsLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchFeedbacks(1);
    }, []);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            fetchFeedbacks(page + 1);
        }
    };

    const handleUpdateStatus = async (id: string, status: string, replyContent?: string) => {
        try {
            const response = await axios.patch(`/admin/feedbacks/${id}/status`, { status, replyContent });
            if (response.data.success) {
                setPage(1);
                fetchFeedbacks(1);
            }
        } catch (error) {
            console.error('Failed to update feedback status:', error);
        }
    };

    const handleDeleteFeedback = async (id: string) => {
        try {
            const response = await axios.delete(`/admin/feedbacks/${id}`);
            if (response.data.success) {
                setPage(1);
                fetchFeedbacks(1);
            }
        } catch (error) {
            console.error('Failed to delete feedback:', error);
        } finally {
            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
    };

    const triggerDeleteConfirm = (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: '删除反馈记录',
            message: '确定要永久删除这条反馈记录吗？此操作不可恢复。',
            onConfirm: () => handleDeleteFeedback(id)
        });
    };

    const columns: AdminTableColumn<FeedbackData>[] = [
        {
            key: 'content',
            title: '反馈摘要 (点击可展开详情)',
            render: (fb) => (
                <p className="text-sm text-slate-600 font-medium line-clamp-1">
                    {fb.content}
                </p>
            )
        },
        {
            key: 'createdAt',
            title: '提交时间',
            width: '180px',
            render: (fb) => (
                <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                    <Calendar size={12} />
                    {new Date(fb.created_at).toLocaleString()}
                </span>
            )
        },
        {
            key: 'status',
            title: '状态',
            width: '120px',
            render: (fb) => (
                <span className={`inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider ${
                    fb.status === 'processed' ? 'text-emerald-500' : 'text-amber-500'
                }`}>
                    {fb.status === 'processed' ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {fb.status === 'processed' ? '已处理' : '待处理'}
                </span>
            )
        },
        {
            key: 'actions',
            title: '操作',
            width: '200px',
            align: 'right',
            render: (fb) => (
                <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    {fb.status === 'pending' && (
                        <button
                            onClick={() => setReplyConfig({
                                isOpen: true,
                                feedbackId: fb.id,
                                replyText: ''
                            })}
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-xs font-black shadow-sm"
                        >
                            标记已处理
                        </button>
                    )}
                    <button
                        onClick={() => triggerDeleteConfirm(fb.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="删除反馈"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )
        }
    ];

    const renderExpandedFeedback = (fb: FeedbackData) => {
        return (
            <div className="pl-12 pr-4 py-2">
                <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100/50">
                    <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">反馈内容</h5>
                    <p className="text-slate-700 text-sm leading-relaxed font-medium whitespace-pre-wrap mb-4">
                        {fb.content}
                    </p>

                    {fb.images && fb.images.length > 0 && (
                        <div>
                            <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">附件图片 ({fb.images.length})</h5>
                            <div className="flex flex-wrap gap-3">
                                {fb.imageUrls && fb.imageUrls.map((url, idx) => (
                                    <div
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewUrl(url);
                                        }}
                                        className="group relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200/50 shadow-sm cursor-zoom-in bg-white"
                                    >
                                        <img
                                            src={url}
                                            alt="反馈附件"
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                            <Maximize2 size={16} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {fb.reply_content && (
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <h5 className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2">管理员回复</h5>
                            <div className="bg-indigo-50/30 rounded-2xl p-5 border border-indigo-100/50">
                                <p className="text-indigo-950 text-sm leading-relaxed font-semibold whitespace-pre-wrap">
                                    {fb.reply_content}
                                </p>
                                <span className="text-[10px] text-slate-400 font-bold block mt-2">
                                    回复时间：{new Date(Number(fb.reply_at)).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <AdminLayout title="反馈管理">
            <div className="p-8 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">用户反馈</h2>
                    <p className="text-slate-500 font-medium">查看用户的建议与报错，优化产品体验。</p>
                </div>

                <AdminTable<FeedbackData>
                    columns={columns}
                    data={feedbacks}
                    rowKey={(fb) => fb.id}
                    isLoading={isLoading}
                    emptyText="暂无反馈记录"
                    hasMore={hasMore}
                    loadingMore={loadingMore}
                    onLoadMore={handleLoadMore}
                    expandedRowRender={renderExpandedFeedback}
                    loadMoreText="加载更多反馈"
                />

                <ConfirmModal
                    isOpen={confirmConfig.isOpen}
                    title={confirmConfig.title}
                    message={confirmConfig.message}
                    onConfirm={confirmConfig.onConfirm}
                    onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    type="danger"
                />

                {replyConfig.isOpen && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                            onClick={() => setReplyConfig(prev => ({ ...prev, isOpen: false }))}
                        />

                        <div className="relative w-full max-w-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="h-1.5 w-full bg-emerald-500" />
                            <div className="p-8">
                                <h3 className="text-xl font-black text-slate-900 mb-2">处理用户反馈</h3>
                                <p className="text-slate-400 text-xs font-bold mb-6">请输入给该用户的回复内容，回复将通过系统通知中心推送给用户。</p>
                                
                                <textarea
                                    value={replyConfig.replyText}
                                    onChange={(e) => setReplyConfig(prev => ({ ...prev, replyText: e.target.value }))}
                                    placeholder="（可选）请输入回复内容（例如：已收到您的反馈，该问题已修复，感谢您的支持！）..."
                                    className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-5 focus:bg-white focus:border-indigo-650/20 focus:outline-none transition-all placeholder:text-slate-300 font-medium min-h-[140px] resize-none text-sm"
                                />

                                <div className="mt-8 flex items-center justify-end gap-3">
                                    <button
                                        onClick={() => setReplyConfig(prev => ({ ...prev, isOpen: false }))}
                                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] hover:text-[#18181B] transition-all duration-200 cursor-pointer"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={async () => {
                                            await handleUpdateStatus(replyConfig.feedbackId, 'processed', replyConfig.replyText);
                                            setReplyConfig(prev => ({ ...prev, isOpen: false }));
                                        }}
                                        className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 cursor-pointer"
                                    >
                                        提交并标记已处理
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {previewUrl && (
                    <FullScreenPreview
                        imageUrl={previewUrl}
                        onClose={() => setPreviewUrl(null)}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
