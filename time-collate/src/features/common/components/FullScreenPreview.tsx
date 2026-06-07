import React from 'react';
import { X } from 'lucide-react';

interface FullScreenPreviewProps {
    imageUrl: string;
    onClose: () => void;
}

/**
 * 全屏图片预览组件
 * 提供毛玻璃背景和高清大图展示
 */
export const FullScreenPreview: React.FC<FullScreenPreviewProps> = ({ imageUrl, onClose }) => {
    return (
        <div
            className="fixed inset-0 z-[11000] flex items-center justify-center animate-in fade-in duration-300"
            onClick={onClose}
        >
            {/* 背景遮罩 */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

            {/* 关闭按钮 */}
            <button
                className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all active:scale-95 z-10"
                onClick={onClose}
            >
                <X size={24} />
            </button>

            {/* 图片容器 */}
            <div className="relative max-w-[90vw] max-h-[90vh] overflow-hidden rounded-lg shadow-2xl animate-in zoom-in-95 duration-300">
                <img
                    src={imageUrl}
                    alt="Full preview"
                    className="w-full h-full object-contain"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    );
};
