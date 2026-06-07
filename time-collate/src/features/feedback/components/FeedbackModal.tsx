import React, { useState, useRef } from 'react';
import { X, Send, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { feedbackService } from '../../../services/FeedbackService';
import { getBookService } from '../../../services/serviceFactory';

const bookService = getBookService();

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [content, setContent] = useState('');
    const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
    const [isSubmitting, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newImages = files.map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setImages(prev => [...prev, ...newImages].slice(0, 4)); // Max 4 images
    };

    const removeImage = (index: number) => {
        setImages(prev => {
            const next = [...prev];
            URL.revokeObjectURL(next[index].preview);
            next.splice(index, 1);
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || isSubmitting) return;

        setIsLoading(true);
        try {
            // 1. 上传图片到 OSS (如果有)
            const ossKeys: string[] = [];
            for (const img of images) {
                const photo = await bookService.uploadPhoto(img.file);
                if (photo.ossKey) {
                    ossKeys.push(photo.ossKey);
                }
            }

            // 2. 提交反馈
            await feedbackService.submitFeedback(content, ossKeys);
            onSuccess();
            setContent('');
            setImages([]);
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            alert('提交失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white w-full max-w-[600px] rounded-[40px] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between p-8 border-b border-gray-50">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">发布反馈</h2>
                        <p className="text-gray-400 text-sm font-bold">匿名提交，您的分享将出现在大厅</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">反馈内容</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="请描述您的想法、建议或遇到的问题..."
                            className="w-full bg-gray-50 border-2 border-transparent rounded-3xl py-4 px-6 focus:bg-white focus:border-indigo-600/20 focus:outline-none transition-all placeholder:text-gray-300 font-medium min-h-[160px] resize-none"
                            required
                        />
                    </div>

                    <div className="space-y-4">
                        <label className="text-sm font-bold text-gray-700 ml-1 flex items-center justify-between">
                            添加图片 (最多 4 张)
                            <span className="text-xs text-gray-400">{images.length}/4</span>
                        </label>

                        <div className="grid grid-cols-4 gap-4">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group">
                                    <img src={img.preview} alt="preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(idx)}
                                        className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            ))}

                            {images.length < 4 && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-600/20 hover:bg-indigo-50/30 transition-all group"
                                >
                                    <ImageIcon size={24} className="group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold mt-1">点击上传</span>
                                </button>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            multiple
                            className="hidden"
                        />
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || !content.trim()}
                            className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    正在提交中...
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    确认发布
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
