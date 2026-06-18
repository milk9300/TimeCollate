import React, { useState, useEffect, useRef } from 'react';
import { FileText, Book as BookIcon, Loader2, Download, Trash2, ExternalLink, Image as ImageIcon, Send, Undo2, Film, Share2, Bookmark } from 'lucide-react';
import { getBookService } from '../../../services/serviceFactory';
import { useAuthStore } from '../../../store/useAuthStore';

interface BookContextMenuProps {
    bookId: string;
    onDelete?: () => void;
    onEdit?: () => void;
    onOpen?: () => void;
    status?: 'private' | 'pending' | 'published' | 'rejected';
    onStatusUpdate?: (newStatus: 'private' | 'pending' | 'published' | 'rejected') => Promise<void>;
    onClose: () => void;
    position: { x: number; y: number };
    onExportTriggered?: (jobId: string, type: 'pdf' | 'video') => void;
    isFavorite?: boolean;
    onUnfavorite?: () => void;
    onShare?: () => void;
    onPublishTemplate?: () => void;
}

/**
 * 书籍右键上下文菜单
 * 仿照现代 UI 设计，提供更简洁的操作方式
 */
export const BookContextMenu: React.FC<BookContextMenuProps> = ({
    bookId,
    onDelete,
    onEdit,
    onOpen,
    status = 'private',
    onStatusUpdate,
    position,
    onClose,
    onExportTriggered,
    isFavorite = false,
    onUnfavorite,
    onShare,
    onPublishTemplate
}) => {
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // 点击外部或滚动时关闭
    useEffect(() => {
        const handleEvents = () => onClose();
        document.addEventListener('mousedown', handleEvents);
        window.addEventListener('scroll', handleEvents);
        return () => {
            document.removeEventListener('mousedown', handleEvents);
            window.removeEventListener('scroll', handleEvents);
        };
    }, [onClose]);

    const handleExport = async (type: 'pdf' | 'video') => {
        if (isExporting) return;
        setIsExporting(type);

        try {
            let jobId = '';
            if (type === 'pdf') {
                // PDF export (async queue)
                const token = useAuthStore.getState().token;
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/export/${bookId}?type=pdf`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) throw new Error('Export failed');
                const data = await response.json();
                jobId = data.jobId;
            } else {
                // Video export (FC async execution)
                const token = useAuthStore.getState().token;
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/export/${bookId}?type=video`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) throw new Error('Export failed');
                const data = await response.json();
                jobId = data.jobId;
            }

            if (jobId && onExportTriggered) {
                onExportTriggered(jobId, type);
            }
            onClose();
        } catch (error) {
            console.error(`Export ${type} failed:`, error);
            alert(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            setIsExporting(null);
        }
    };

    const handleStatusUpdateAction = async (newStatus: 'private' | 'pending' | 'published' | 'rejected') => {
        if (!onStatusUpdate || isUpdatingStatus) return;
        setIsUpdatingStatus(true);
        try {
            await onStatusUpdate(newStatus);
            onClose();
        } catch (error) {
            console.error('Failed to update book status:', error);
            alert('更新状态失败');
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // 动态调整位置，防止超出屏幕
    const style: React.CSSProperties = {
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 9999,
    };

    if (isFavorite) {
        return (
            <div
                ref={menuRef}
                style={style}
                className="w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200/50
                           overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100"
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpen?.();
                        onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#3B82F6] hover:text-white transition-colors text-left cursor-pointer"
                >
                    <ExternalLink size={14} />
                    开始阅读
                </button>

                <div className="h-px bg-gray-100 my-1 mx-2" />

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onUnfavorite?.();
                        onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors text-left cursor-pointer"
                >
                    <Trash2 size={14} />
                    取消收藏
                </button>
            </div>
        );
    }

    return (
        <div
            ref={menuRef}
            style={style}
            className="w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200/50
                       overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-100"
            onContextMenu={(e) => e.preventDefault()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onOpen?.();
                    onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#3B82F6] hover:text-white transition-colors text-left"
            >
                <ExternalLink size={14} />
                打开编辑器
            </button>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.();
                    onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#3B82F6] hover:text-white transition-colors text-left"
            >
                <ImageIcon size={14} />
                修改书籍信息
            </button>

            {onShare && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onShare();
                        onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#3B82F6] hover:text-white transition-colors text-left"
                >
                    <Share2 size={14} />
                    发布分享
                </button>
            )}

            {onPublishTemplate && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onPublishTemplate();
                        onClose();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#3B82F6] hover:text-white transition-colors text-left cursor-pointer"
                >
                    <Bookmark size={14} />
                    发布为模板
                </button>
            )}

            <div className="h-px bg-gray-100 my-1 mx-2" />

            {/* 发布审核操作 */}
            <div className="px-4 py-1.5 pt-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">发布审核</span>
            </div>

            {(status === 'private' || status === 'rejected') && (
                <button
                    disabled={isUpdatingStatus}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdateAction('pending');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors text-left"
                >
                    {isUpdatingStatus ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    发布到广场
                </button>
            )}

            {(status === 'pending' || status === 'published') && (
                <button
                    disabled={isUpdatingStatus}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdateAction('private');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-amber-600 hover:bg-amber-600 hover:text-white transition-colors text-left"
                >
                    {isUpdatingStatus ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
                    撤回/转为私密
                </button>
            )}

            <div className="h-px bg-gray-100 my-1 mx-2" />

            <div className="px-4 py-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">导出交付物</span>
            </div>

            <button
                disabled={!!isExporting}
                onClick={(e) => {
                    e.stopPropagation();
                    handleExport('pdf');
                }}
                className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#3B82F6] hover:text-white transition-colors text-left disabled:opacity-50"
            >
                <div className="flex items-center gap-3">
                    {isExporting === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <BookIcon size={14} />}
                    高清 PDF
                </div>
                <Download size={12} className="opacity-40" />
            </button>



            <button
                disabled={!!isExporting}
                onClick={(e) => {
                    e.stopPropagation();
                    handleExport('video');
                }}
                className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-[#3B82F6] hover:text-white transition-colors text-left disabled:opacity-50"
            >
                <div className="flex items-center gap-3">
                    {isExporting === 'video' ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
                    3D 翻页视频
                </div>
                <Download size={12} className="opacity-40" />
            </button>

            {onDelete && (
                <>
                    <div className="h-px bg-gray-100 my-1 mx-2" />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                            onClose();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 hover:bg-red-500 hover:text-white transition-colors text-left"
                    >
                        <Trash2 size={14} />
                        移至回收站
                    </button>
                </>
            )}
        </div>
    );
};
