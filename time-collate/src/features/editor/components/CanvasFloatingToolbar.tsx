// #region Description
/**
 * @description 全局绝对定位随动工具栏组件 (CanvasFloatingToolbar)
 * 聚合文本、图片和贴纸的快捷操作，通过 DOM AABB 包围盒实现高拟真跟随与避让，仅保留超轻量快捷元动作。
 */
// #endregion

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useBookStore } from '../../../store';
import { 
    RefreshCw, 
    Eraser, 
    Trash2,
    RotateCw,
    RotateCcw,
    Plus,
    Minus,
    Type
} from 'lucide-react';
import { 
    updateSlotText,
    getPageDecorations, 
    updatePageDecorations 
} from '../../../utils/textSlotHelper';

export const CanvasFloatingToolbar: React.FC = () => {
    const currentBook = useBookStore(state => state.currentBook);
    const activePhotoEdit = useBookStore(state => state.activePhotoEdit);
    const activeTextEdit = useBookStore(state => state.activeTextEdit);
    const activeStickerEdit = useBookStore(state => state.activeStickerEdit);

    const setActivePhotoEdit = useBookStore(state => state.setActivePhotoEdit);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);
    const setActiveStickerEdit = useBookStore(state => state.setActiveStickerEdit);
    const updatePage = useBookStore(state => state.updatePage);
    const uploadPhotoToPage = useBookStore(state => state.uploadPhotoToPage);
    const addMockPhotoToPage = useBookStore(state => state.addMockPhotoToPage);
    const clearPhotoSlot = useBookStore(state => state.clearPhotoSlot);

    const [coords, setCoords] = useState<{ top: number; left: number; show: boolean }>({ top: 0, left: 0, show: false });
    const toolbarRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 统一获取当前选中元素的 ID 与类型
    const activeId = activePhotoEdit?.photoId || activeTextEdit?.slotId || activeStickerEdit?.stickerId;
    const activeType = activePhotoEdit ? 'photo' : activeTextEdit ? 'text' : activeStickerEdit ? 'sticker' : null;
    const pageId = activePhotoEdit?.pageId || activeTextEdit?.pageId || activeStickerEdit?.pageId;
    const chapterId = activePhotoEdit?.chapterId || activeTextEdit?.chapterId || activeStickerEdit?.chapterId;

    // 获取当前选中元素关联的页面和内容
    const pageData = useMemo(() => {
        if (!pageId || !currentBook) return null;
        return currentBook.pages?.find(p => p.id === pageId) || null;
    }, [pageId, currentBook]);

    const pageContent = pageData?.content || '';

    // 绝对定位跟随计算
    useEffect(() => {
        if (!activeId || !activeType) {
            setCoords(prev => ({ ...prev, show: false }));
            return;
        }

        const updatePosition = () => {
            const targetEl = document.querySelector(`[data-element-id="${activeId}"]`);
            const containerEl = document.getElementById('editor-canvas-container');

            if (!targetEl || !containerEl || !toolbarRef.current) return;

            const targetRect = targetEl.getBoundingClientRect();
            const containerRect = containerEl.getBoundingClientRect();
            const toolbarRect = toolbarRef.current.getBoundingClientRect();

            // 计算相对于 Canvas 容器的水平居中坐标
            let left = targetRect.left - containerRect.left + (targetRect.width / 2) - (toolbarRect.width / 2);
            // 定位在包围盒上方 12px
            let top = targetRect.top - containerRect.top - toolbarRect.height - 12;

            // 边缘避让：顶部溢出则向下翻转
            if (top < 12) {
                top = targetRect.bottom - containerRect.top + 12;
            }

            // 左右限位避让
            const maxLeft = containerRect.width - toolbarRect.width - 20;
            left = Math.max(20, Math.min(left, maxLeft));

            setCoords({ top, left, show: true });
        };

        // 立即计算一次
        updatePosition();

        const canvasContainer = document.getElementById('editor-canvas-container');
        window.addEventListener('resize', updatePosition);
        canvasContainer?.addEventListener('scroll', updatePosition, true);

        // 使用 rAF 实时追踪，在画布拖拽、缩放、贴纸拖动等过程中保持绝对同步
        let frameId = requestAnimationFrame(function poll() {
            updatePosition();
            frameId = requestAnimationFrame(poll);
        });

        return () => {
            window.removeEventListener('resize', updatePosition);
            canvasContainer?.removeEventListener('scroll', updatePosition, true);
            cancelAnimationFrame(frameId);
        };
    }, [activeId, activeType]);

    if (!coords.show || !pageId || !chapterId || !pageData) return null;

    // ==========================================
    // 1. 文本操作逻辑 (Text Handlers)
    // ==========================================
    const triggerInlineEdit = () => {
        // 触发指定 TextSlot 双击事件，开启内联编辑状态
        const innerTextEl = document.querySelector(`[data-element-id="${activeId}"] > div`);
        if (innerTextEl) {
            const dblClickEvent = new MouseEvent('dblclick', { bubbles: true, cancelable: true });
            innerTextEl.dispatchEvent(dblClickEvent);
        }
    };

    const handleTextClear = () => {
        if (activeType !== 'text') return;
        const updatedContent = updateSlotText(pageContent, activeId!, '');
        updatePage(chapterId, pageId, { content: updatedContent });
    };

    // ==========================================
    // 2. 图片操作逻辑 (Photo Handlers)
    // ==========================================
    const photoData = pageData.photos?.find(p => p.id === activeId);
    
    const handlePhotoReplace = async () => {
        const choosePreset = window.confirm("点击确定选择上传本地图片，点击取消自动替换为一张风景图：");
        if (choosePreset) {
            fileInputRef.current?.click();
        } else {
            const presets = [
                'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80'
            ];
            const randomUrl = presets[Math.floor(Math.random() * presets.length)];
            await addMockPhotoToPage(chapterId, pageId, randomUrl, "预设风景素材", photoData?.slotIndex);
        }
    };

    const handlePhotoUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            await uploadPhotoToPage(chapterId, pageId, file, photoData?.slotIndex);
        } catch (err) {
            console.error('Failed to replace photo in slot:', err);
        }
    };

    const handlePhotoClear = async () => {
        if (photoData) {
            await clearPhotoSlot(chapterId, pageId, photoData.id);
            setActivePhotoEdit(null);
        }
    };

    // ==========================================
    // 3. 贴纸操作逻辑 (Sticker Handlers)
    // ==========================================
    const decorations = getPageDecorations(pageContent);
    const stickerData = decorations.find(d => d.id === activeId);

    const handleStickerAdjust = (action: 'rotate' | 'size' | 'delete', value: number) => {
        if (activeType !== 'sticker') return;
        let newDecorations = [...decorations];
        if (action === 'delete') {
            newDecorations = newDecorations.filter(d => d.id !== activeId);
            setActiveStickerEdit(null);
        } else {
            newDecorations = newDecorations.map(d => {
                if (d.id === activeId) {
                    if (action === 'rotate') {
                        return { ...d, rotate: ((d.rotate || 0) + value) % 360 };
                    } else if (action === 'size') {
                        return { ...d, size: Math.max(8, (d.size || 16) + value) };
                    }
                }
                return d;
            });
        }
        const updatedContent = updatePageDecorations(pageContent, newDecorations);
        updatePage(chapterId, pageId, { content: updatedContent });
    };

    return (
        <div
            ref={toolbarRef}
            style={{
                position: 'absolute',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                transition: 'top 0.1s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.1s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.15s ease',
            }}
            className="z-40 flex items-center bg-slate-900/92 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-700/60 p-1 gap-1 text-[10px] select-none pointer-events-auto transition-all animate-fade-in whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
        >
            {/* 隐藏的图片上传 Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUploadChange}
                accept="image/*"
                className="hidden"
            />

            {/* ---------------- 文本随动工具栏 ---------------- */}
            {activeType === 'text' && (
                <>
                    {/* 进入文本编辑 */}
                    <button
                        onClick={triggerInlineEdit}
                        className="px-2 h-6 flex items-center gap-1 hover:bg-indigo-600 hover:text-white rounded-md transition-colors text-indigo-400 font-bold"
                        title="双击或点击此按钮输入内容"
                    >
                        <Type size={11} />
                        <span>编辑文本</span>
                    </button>

                    <div className="w-[1px] h-3.5 bg-slate-800" />

                    {/* 清空内容 */}
                    <button
                        onClick={handleTextClear}
                        className="px-2 h-6 flex items-center gap-1 hover:bg-slate-800 rounded-md transition-colors text-red-400 hover:text-red-300 font-semibold"
                        title="清除当前框里的所有文字"
                    >
                        <Eraser size={11} />
                        <span>清除</span>
                    </button>
                </>
            )}

            {/* ---------------- 图片随动工具栏 ---------------- */}
            {activeType === 'photo' && photoData && (
                <>
                    {/* 替换图片 */}
                    <button
                        onClick={handlePhotoReplace}
                        className="px-2 h-6 flex items-center gap-1 hover:bg-slate-800 rounded-md transition-colors text-gray-200 font-semibold"
                        title="重新选择或上传图片"
                    >
                        <RefreshCw size={11} />
                        <span>替换图片</span>
                    </button>

                    <div className="w-[1px] h-3.5 bg-slate-800" />

                    {/* 清空插槽 */}
                    <button
                        onClick={handlePhotoClear}
                        className="px-2 h-6 flex items-center gap-1 hover:bg-slate-800 rounded-md transition-colors text-red-400 hover:text-red-300 font-semibold"
                        title="清空该图片插槽"
                    >
                        <Eraser size={11} />
                        <span>清空</span>
                    </button>
                </>
            )}

            {/* ---------------- 贴纸随动工具栏 ---------------- */}
            {activeType === 'sticker' && stickerData && (
                <>
                    {/* 旋转微调 */}
                    <button
                        onClick={() => handleStickerAdjust('rotate', -15)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded-md transition-colors text-gray-300"
                        title="逆时针旋转 15°"
                    >
                        <RotateCcw size={11} />
                    </button>
                    <button
                        onClick={() => handleStickerAdjust('rotate', 15)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded-md transition-colors text-gray-300"
                        title="顺时针旋转 15°"
                    >
                        <RotateCw size={11} />
                    </button>

                    <div className="w-[1px] h-3.5 bg-slate-800" />

                    {/* 尺寸微调 */}
                    <button
                        onClick={() => handleStickerAdjust('size', 3)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded-md transition-colors text-gray-300"
                        title="放大贴纸"
                    >
                        <Plus size={11} />
                    </button>
                    <span className="px-1 text-[9px] font-bold text-gray-400 font-mono select-none">
                        {stickerData.size || 16}pt
                    </span>
                    <button
                        onClick={() => handleStickerAdjust('size', -3)}
                        className="w-6 h-6 flex items-center justify-center hover:bg-slate-800 rounded-md transition-colors text-gray-300"
                        title="缩小贴纸"
                    >
                        <Minus size={11} />
                    </button>

                    <div className="w-[1px] h-3.5 bg-slate-800" />

                    {/* 删除贴纸 */}
                    <button
                        onClick={() => handleStickerAdjust('delete', 0)}
                        className="px-2 h-6 flex items-center gap-1 hover:bg-red-950/80 hover:text-red-300 rounded-md transition-colors text-red-400 font-bold"
                        title="从页面中删除该贴纸"
                    >
                        <Trash2 size={11} />
                        <span>删除</span>
                    </button>
                </>
            )}
        </div>
    );
};
