import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, ExternalLink } from 'lucide-react';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    shareUrl: string;
    bookTitle: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    shareUrl,
    bookTitle
}) => {
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            setCopied(false);
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* 弹窗主体 */}
            <div className="relative w-full max-w-[440px] bg-white rounded-3xl shadow-2xl border border-gray-100 
                          overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* 顶部指示条 */}
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-purple-600" />

                <div className="p-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <Share2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 leading-tight">
                                    分享您的作品
                                </h3>
                                <p className="text-sm text-gray-500 mt-0.5">让更多人看到这份精彩</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded-full"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-2">
                            分享链接
                        </span>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                readOnly
                                value={shareUrl}
                                className="flex-1 bg-transparent text-sm text-gray-700 font-medium outline-none"
                            />
                            <button
                                onClick={handleCopy}
                                className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors shrink-0"
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-sm text-gray-500 text-center px-4">
                            您可以直接将链接发给朋友或朋友圈，
                            他人点开链接即可查看作品《{bookTitle}》。
                        </p>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleCopy}
                                className={`flex-1 py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${copied
                                        ? 'bg-green-500 text-white'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                                    }`}
                            >
                                {copied ? '已复制到剪贴板' : '复制链接'}
                            </button>

                            <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 transition-all shadow-sm"
                                title="直接打开"
                            >
                                <ExternalLink size={20} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
