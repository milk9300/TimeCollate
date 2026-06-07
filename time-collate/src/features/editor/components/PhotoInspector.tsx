import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useBookStore } from '../../../store';
import { getBookService } from '../../../services/serviceFactory';
import { 
    X, 
    Maximize2, 
    Move, 
    Upload, 
    Trash2, 
    Heading 
} from 'lucide-react';

const bookService = getBookService();

/**
 * @description 图片微调浮空控制面板 (Portal 渲染)
 * 使用 requestAnimationFrame 在缩放平移时完美同步位置
 */
export const PhotoInspector: React.FC = () => {
    const activePhotoEdit = useBookStore((state) => state.activePhotoEdit);
    const setActivePhotoEdit = useBookStore((state) => state.setActivePhotoEdit);
    const updatePhotoSettings = useBookStore((state) => state.updatePhotoSettings);
    const deletePhotoFromPage = useBookStore((state) => state.deletePhotoFromPage);
    const currentBook = useBookStore((state) => state.currentBook);

    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 查找当前选中的 Photo 数据对象
    let photoData: any = null;
    if (activePhotoEdit && currentBook) {
        const chapter = currentBook.chapters.find(c => c.id === activePhotoEdit.chapterId);
        const page = chapter?.pages.find(p => p.id === activePhotoEdit.pageId);
        photoData = page?.photos.find(p => p.id === activePhotoEdit.photoId);
    }

    // 1. 位置实时计算同步逻辑
    useEffect(() => {
        if (!activePhotoEdit) {
            setCoords(null);
            return;
        }

        let active = true;
        const updatePosition = () => {
            const el = document.querySelector(`[data-photo-id="${activePhotoEdit.photoId}"]`);
            if (el) {
                const rect = el.getBoundingClientRect();
                // 居中显示在图片底部偏下 10px 位置
                setCoords({
                    top: rect.bottom + window.scrollY + 10,
                    left: rect.left + window.scrollX + rect.width / 2
                });
            } else {
                setCoords(null);
            }
        };

        const tick = () => {
            if (!active) return;
            updatePosition();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);

        return () => {
            active = false;
        };
    }, [activePhotoEdit]);

    // 2. 点击外部自动关闭
    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            if (!activePhotoEdit) return;
            const inspectorEl = document.getElementById('photo-inspector-card');
            const target = e.target as HTMLElement;

            // 如果点击的目标不在控制条内，也不在图片本身上，则关闭
            if (
                inspectorEl && 
                !inspectorEl.contains(target) && 
                !target.closest(`[data-photo-id="${activePhotoEdit.photoId}"]`)
            ) {
                // 如果点击了右侧属性面板、底部素材栏、顶部导航栏、或者弹出的模态框，不应当取消选中图片
                if (
                    target.closest('#editor-right-sidebar') ||
                    target.closest('#editor-bottom-tray') ||
                    target.closest('#editor-top-bar') ||
                    target.closest('.modal') ||
                    target.closest('[role="dialog"]') ||
                    target.closest('input[type="file"]')
                ) {
                    return;
                }
                setActivePhotoEdit(null);
            }
        };

        window.addEventListener('mousedown', handleOutsideClick);
        return () => window.removeEventListener('mousedown', handleOutsideClick);
    }, [activePhotoEdit, setActivePhotoEdit]);

    if (!activePhotoEdit || !photoData || !coords) return null;

    const { chapterId, pageId, photoId } = activePhotoEdit;

    // 3. 值调节修改处理器
    const handleScaleChange = (val: number) => {
        updatePhotoSettings(chapterId, pageId, photoId, { scale: val });
    };

    const handleXOffsetChange = (val: number) => {
        updatePhotoSettings(chapterId, pageId, photoId, { xOffset: val });
    };

    const handleYOffsetChange = (val: number) => {
        updatePhotoSettings(chapterId, pageId, photoId, { yOffset: val });
    };

    const handleCaptionChange = (val: string) => {
        updatePhotoSettings(chapterId, pageId, photoId, { caption: val });
    };

    // 4. 替换图片
    const handleReplaceClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const newPhoto = await bookService.uploadPhoto(file);
            await updatePhotoSettings(chapterId, pageId, photoId, {
                url: newPhoto.url,
                ossKey: newPhoto.ossKey,
                width: newPhoto.width,
                height: newPhoto.height,
                scale: 1.0,
                xOffset: 50,
                yOffset: 50
            });
        } catch (err) {
            console.error('Failed to replace photo', err);
        } finally {
            setIsUploading(false);
        }
    };

    // 5. 删除图片
    const handleDeleteClick = async () => {
        if (window.confirm('确定要从页面中删除这张图片吗？')) {
            await deletePhotoFromPage(chapterId, pageId, photoId);
            setActivePhotoEdit(null);
        }
    };

    // 使用 React Portal 挂载到 body 下，彻底解决 overflow-hidden 裁剪问题
    return ReactDOM.createPortal(
        <div
            id="photo-inspector-card"
            className="absolute z-[9999] -translate-x-1/2 flex flex-col gap-3 bg-white/95 backdrop-blur-md border border-gray-200/80 shadow-2xl rounded-2xl p-4 w-[280px] pointer-events-auto"
            style={{
                top: `${coords.top}px`,
                left: `${coords.left}px`,
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <span className="text-xs font-bold text-gray-700 tracking-wider flex items-center gap-1.5">
                    <Maximize2 size={12} className="text-primary" />
                    图片精细裁剪微调
                </span>
                <button 
                    onClick={() => setActivePhotoEdit(null)}
                    className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 p-1 transition-all"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-3 text-xs">
                {/* 1. Scale Slider */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                        <span>缩放倍率 (Zoom)</span>
                        <span className="text-primary font-mono">{(photoData.scale || 1.0).toFixed(2)}x</span>
                    </div>
                    <input
                        type="range"
                        min="1.0"
                        max="3.0"
                        step="0.05"
                        value={photoData.scale || 1.0}
                        onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                {/* 2. X Offset Slider */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                        <span>水平偏移 (Offset X)</span>
                        <span className="text-primary font-mono">{photoData.xOffset !== undefined ? photoData.xOffset : 50}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Move size={12} className="text-gray-400" />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={photoData.xOffset !== undefined ? photoData.xOffset : 50}
                            onChange={(e) => handleXOffsetChange(parseInt(e.target.value))}
                            className="flex-1 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                </div>

                {/* 3. Y Offset Slider */}
                <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                        <span>垂直偏移 (Offset Y)</span>
                        <span className="text-primary font-mono">{photoData.yOffset !== undefined ? photoData.yOffset : 50}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Move size={12} className="text-gray-400 rotate-90" />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={photoData.yOffset !== undefined ? photoData.yOffset : 50}
                            onChange={(e) => handleYOffsetChange(parseInt(e.target.value))}
                            className="flex-1 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                    </div>
                </div>

                {/* 4. Caption */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">图片标题描述 (Caption)</span>
                    <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1 bg-gray-50/50">
                        <Heading size={12} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="为这张图写点描述..."
                            value={photoData.caption || ''}
                            onChange={(e) => handleCaptionChange(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-xs text-gray-700 placeholder-gray-300 focus:ring-0 p-0"
                        />
                    </div>
                </div>
            </div>

            {/* Actions Footer */}
            <div className="flex gap-2 border-t border-gray-100 pt-3 mt-1">
                <button
                    onClick={handleReplaceClick}
                    disabled={isUploading}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg font-medium border border-gray-200 transition-all text-[11px]"
                >
                    <Upload size={12} />
                    {isUploading ? '替换中...' : '替换图片'}
                </button>
                <button
                    onClick={handleDeleteClick}
                    className="flex items-center justify-center gap-1 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium border border-red-100 transition-all text-[11px]"
                >
                    <Trash2 size={12} />
                    删除
                </button>
            </div>

            {/* Hidden upload input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
        </div>,
        document.body
    );
};
