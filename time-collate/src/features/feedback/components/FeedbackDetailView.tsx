import React, { useEffect, useState } from 'react';
import { X, Calendar, MessageSquare, Loader2, Image as ImageIcon, Maximize2 } from 'lucide-react';
import { feedbackService } from '../../../services/FeedbackService';
import { FullScreenPreview } from '../../common/components/FullScreenPreview';
import type { Feedback } from '../../../types';

interface FeedbackDetailViewProps {
    feedbackId: string;
    onClose: () => void;
}

/**
 * 反馈详情弹窗组件
 * 延迟加载图片附件，并支持全屏预览功能
 */
export const FeedbackDetailView: React.FC<FeedbackDetailViewProps> = ({ feedbackId, onClose }) => {
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const loadDetail = async () => {
        setIsLoading(true);
        try {
            const data = await feedbackService.getFeedbackById(feedbackId);
            setFeedback(data);
        } catch (error) {
            console.error('Failed to load feedback detail:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadDetail();
    }, [feedbackId]);

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    if (!feedbackId) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* 遮罩 */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* 弹窗主体 */}
            <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-purple-500" />

                <div className="p-8 md:p-12">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                <MessageSquare size={20} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">反馈详情</h3>
                                <div className="flex items-center gap-2 text-gray-400 text-xs font-bold uppercase tracking-wider mt-0.5">
                                    <Calendar size={12} />
                                    <span>{feedback ? formatDate(feedback.createdAt) : '--'}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="min-h-[200px]">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                <Loader2 className="animate-spin text-indigo-600" size={32} />
                                <p className="text-gray-400 font-bold">详情加载中...</p>
                            </div>
                        ) : feedback ? (
                            <div className="space-y-8">
                                <div className="bg-gray-50/50 rounded-3xl p-8 border border-gray-100">
                                    <p className="text-gray-700 leading-relaxed text-lg font-medium whitespace-pre-wrap">
                                        {feedback.content}
                                    </p>
                                </div>

                                {feedback.imageUrls && feedback.imageUrls.length > 0 ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <ImageIcon size={18} />
                                            <span className="text-sm font-black uppercase tracking-widest">附件照片 ({feedback.imageUrls.length})</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {feedback.imageUrls.map((url, idx) => (
                                                <div
                                                    key={idx}
                                                    className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-zoom-in shadow-sm hover:shadow-xl transition-all duration-500"
                                                    onClick={() => setPreviewUrl(feedback.originalImageUrls?.[idx] || url)}
                                                >
                                                    <img
                                                        src={url}
                                                        alt={`Feedback attach ${idx}`}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Maximize2 className="text-white" size={24} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    feedback.hasImages && (
                                        <div className="flex items-center justify-center p-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                            <Loader2 className="animate-spin text-gray-300 mr-2" size={20} />
                                            <span className="text-gray-400 font-bold">正在获取图片访问权限...</span>
                                        </div>
                                    )
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-400 font-bold">
                                无法找到该反馈，可能已被删除。
                            </div>
                        )}
                    </div>

                    <div className="mt-12 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-10 py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-gray-100"
                        >
                            我已知晓
                        </button>
                    </div>
                </div>
            </div>

            {/* 全屏预览层层级更高 */}
            {previewUrl && (
                <FullScreenPreview
                    imageUrl={previewUrl}
                    onClose={() => setPreviewUrl(null)}
                />
            )}
        </div>
    );
};
