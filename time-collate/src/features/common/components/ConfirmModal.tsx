import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'info';
}

/**
 * 统一的确认弹窗组件
 * 设计风格与系统整体保持一致：简洁、高级感、毛玻璃效果
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = '确定',
    cancelText = '取消',
    onConfirm,
    onCancel,
    type = 'danger'
}) => {
    // 禁止背景滚动
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            {/* 背景遮罩 */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onCancel}
            />

            {/* 弹窗主体 */}
            <div className="relative w-full max-w-[360px] bg-white rounded-2xl shadow-2xl border border-slate-100 
                          overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* 顶部指示条 */}
                <div className={`h-1.5 w-full ${type === 'danger' ? 'bg-rose-500' : 'bg-indigo-600'}`} />

                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-xl shrink-0 ${type === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'
                            }`}>
                            <AlertTriangle size={24} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 mb-1 leading-tight">
                                {title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {message}
                            </p>
                        </div>
                        <button
                            onClick={onCancel}
                            className="text-slate-400 hover:text-slate-900 transition-colors p-1"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="mt-8 flex items-center justify-end gap-3">
                        <button
                            onClick={onCancel}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-500 bg-slate-100 
                                     hover:bg-slate-200 hover:text-slate-900 transition-all duration-200"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:shadow-md 
                                     transition-all duration-200 active:scale-95 ${type === 'danger' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-slate-800 hover:bg-slate-900'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
