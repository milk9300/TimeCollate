import React, { useRef, useState } from 'react';
import { useBookStore, getVirtualChapters } from '../../store';
import type { Photo } from '../../types';
import { Plus, RefreshCw, Eraser, Crop } from 'lucide-react';
import { getThumbnailUrl } from '../../utils/cdn';

interface EditablePhotoProps {
    photo: Photo | undefined;
    chapterId?: string;
    pageId?: string;
    slotIndex: number; // 槽位序号
    className?: string;
    style?: React.CSSProperties;
    alt?: string;
    readOnly?: boolean;
}

const filterStyles: Record<string, string> = {
    none: 'none',
    warm: 'sepia(0.35) saturate(1.2) hue-rotate(-10deg) contrast(1.05)',
    fresh: 'saturate(1.3) brightness(1.05) contrast(0.95)',
    retro: 'contrast(1.1) brightness(0.9) sepia(0.15) saturate(0.85)'
};

/**
 * @description 支持物理样式、色彩滤镜、拖拽交换及悬浮工具栏的图片插槽组件
 */
export const EditablePhoto: React.FC<EditablePhotoProps> = ({
    photo,
    chapterId = '',
    pageId = '',
    slotIndex,
    className = 'w-full h-full',
    style,
    alt = '图片',
    readOnly = false
}) => {
    const editorMode = useBookStore(state => state.editorMode);
    const activePhotoEdit = useBookStore(state => state.activePhotoEdit);
    const setActivePhotoEdit = useBookStore(state => state.setActivePhotoEdit);
    const currentBook = useBookStore(state => state.currentBook);
    
    // Store Actions
    const uploadPhotoToPage = useBookStore(state => state.uploadPhotoToPage);
    const assignPhotoToSlot = useBookStore(state => state.assignPhotoToSlot);
    const clearPhotoSlot = useBookStore(state => state.clearPhotoSlot);
    const movePhotoBetweenPages = useBookStore(state => state.movePhotoBetweenPages);

    const [isDragOver, setIsDragOver] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isReplacing, setIsReplacing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isSelected = activePhotoEdit?.photoId === photo?.id;

    const handlePhotoClick = (e: React.MouseEvent) => {
        if (readOnly || editorMode === 'hand') return;
        e.stopPropagation();
        
        if (photo && photo.url) {
            setActivePhotoEdit({
                chapterId,
                pageId,
                photoId: photo.id
            });
        } else {
            // 空槽位点击，唤醒资源选择
            const event = new CustomEvent('timecollate-empty-slot-click', {
                detail: { chapterId, pageId, slotIndex }
            });
            window.dispatchEvent(event);
        }
    };

    const handleDragStart = (e: React.DragEvent) => {
        if (!photo || !photo.url) return;
        e.dataTransfer.setData('text/plain', photo.url);
        e.dataTransfer.setData('photoId', photo.id);
        e.dataTransfer.setData('sourcePageId', pageId);
        e.dataTransfer.setData('sourceChapterId', chapterId);
        e.dataTransfer.setData('sourceSlotIndex', slotIndex.toString());
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (editorMode !== 'select') return;
        if (e.dataTransfer.types.includes('stickerId')) {
            return;
        }
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        if (editorMode !== 'select') return;

        const dragPhotoId = e.dataTransfer.getData('photoId');
        if (!dragPhotoId) return; // Allow sticker drops to bubble up to BookRenderer

        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const sourcePageId = e.dataTransfer.getData('sourcePageId');
        const sourceChapterId = e.dataTransfer.getData('sourceChapterId');
        const sourceSlotIndexStr = e.dataTransfer.getData('sourceSlotIndex');
        const sourceSlotIndex = sourceSlotIndexStr ? parseInt(sourceSlotIndexStr, 10) : undefined;

        if (!dragPhotoId) return;

        if (sourcePageId === pageId) {
            // 同页面槽位分配 / 重新排序 / 交换位置 (Swap)
            await assignPhotoToSlot(chapterId, pageId, dragPhotoId, slotIndex, sourceSlotIndex);
        } else {
            // 跨页面拖拽移动
            const chapters = currentBook ? getVirtualChapters(currentBook.pages || []) : [];
            const finalSourceChapterId = sourceChapterId || (chapters.find(c =>
                c.pages.some(p => p.id === sourcePageId)
            )?.id);

            if (!finalSourceChapterId) return;

            await movePhotoBetweenPages(
                finalSourceChapterId,
                sourcePageId,
                chapterId,
                pageId,
                dragPhotoId,
                slotIndex
            );
        }
    };

    // 悬浮工具栏快捷操作
    const handleReplaceClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const choosePreset = window.confirm("点击确定选择上传本地图片，点击取消自动替换为一张精美的推荐风景图：");
        if (choosePreset) {
            fileInputRef.current?.click();
        } else {
            // Randomly select one preset url
            const presets = [
                'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80',
                'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80'
            ];
            const randomUrl = presets[Math.floor(Math.random() * presets.length)];
            const { addMockPhotoToPage } = useBookStore.getState();
            await addMockPhotoToPage(chapterId, pageId, randomUrl, "预设风景素材", slotIndex);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsReplacing(true);
        try {
            await uploadPhotoToPage(chapterId, pageId, file, slotIndex);
        } catch (err) {
            console.error('Failed to replace photo in slot:', err);
        } finally {
            setIsReplacing(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleClearClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (photo) {
            await clearPhotoSlot(chapterId, pageId, photo.id);
            setActivePhotoEdit(null);
        }
    };

    const handleCropClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (photo) {
            setActivePhotoEdit({
                chapterId,
                pageId,
                photoId: photo.id
            });
        }
    };

    // 1. 未填充状态
    if (!photo || !photo.url) {
        if (readOnly) {
            return (
                <div
                    className={`${className} flex flex-col items-center justify-center border border-dashed border-gray-200 bg-gray-50/20 rounded-lg p-2 min-h-[80px]`}
                    style={style}
                >
                    <div className="flex flex-col items-center gap-0.5 text-gray-400/80">
                        <Plus size={14} className="stroke-[2]" />
                        <span className="text-[8px] font-bold tracking-wider uppercase">
                            槽位 {slotIndex + 1}
                        </span>
                    </div>
                </div>
            );
        }
        return (
            <div
                onClick={handlePhotoClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`${className} flex flex-col items-center justify-center border-2 border-dashed transition-all rounded-lg cursor-pointer group p-4 min-h-[120px] ${
                    isDragOver 
                        ? 'border-indigo-600 bg-indigo-50/10 scale-[0.98]' 
                        : 'border-gray-200 hover:border-indigo-500/50 hover:bg-indigo-50/[0.02]'
                }`}
                style={style}
            >
                <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-indigo-600 transition-colors">
                    <Plus size={20} className="stroke-[2.5]" />
                    <span className="text-[10px] font-bold tracking-wider uppercase">
                        {isDragOver ? '松开填充插槽' : '添加图片'}
                    </span>
                </div>
            </div>
        );
    }

    // 2. 物理边框样式和滤镜处理
    const scale = photo.scale || 1.0;
    const xOffset = photo.xOffset !== undefined ? photo.xOffset : 50;
    const yOffset = photo.yOffset !== undefined ? photo.yOffset : 50;
    const borderStyle = photo.styleType || 'normal';
    const filterType = photo.filterType || 'none';

    // 滤镜 CSS 规则
    const filterCSS = filterStyles[filterType] || 'none';

    const renderImageElement = () => (
        <img
            src={getThumbnailUrl(photo.url, 800)}
            alt={alt}
            className="w-full h-full object-cover pointer-events-none select-none"
            style={{
                transform: `scale(${scale})`,
                objectPosition: `${xOffset}% ${yOffset}%`,
                transformOrigin: 'center center',
                filter: `var(--photo-filter, none) ${filterCSS !== 'none' ? filterCSS : ''}`,
                transition: 'transform 0.1s ease-out, object-position 0.1s ease-out, filter 0.2s ease-in-out'
            }}
        />
    );

    // 根据不同物理样式生成对应的外框包裹
    const renderStyledContent = () => {
        if (borderStyle === 'polaroid') {
            return (
                <div className="w-full h-full bg-white p-[3mm] pb-[8mm] shadow-lg border border-gray-200/60 flex flex-col justify-between items-center transition-all">
                    <div className="w-full flex-1 overflow-hidden relative bg-gray-50">
                        {renderImageElement()}
                    </div>
                    <div className="mt-2 text-center text-[7pt] font-mono text-gray-500 italic max-w-full truncate px-1 pointer-events-none select-none">
                        {photo.caption || 'Polaroid Frame'}
                    </div>
                </div>
            );
        }

        if (borderStyle === 'film') {
            return (
                <div className="w-full h-full bg-neutral-950 p-[3mm] py-[4mm] shadow-xl flex flex-col justify-center items-center relative transition-all overflow-hidden border border-neutral-900">
                    {/* Sprocket holes (齿孔) at top */}
                    <div className="absolute top-1 left-0 right-0 flex justify-around px-2 pointer-events-none opacity-60">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 bg-neutral-800 rounded-sm border border-neutral-700/30" />
                        ))}
                    </div>
                    <div className="w-full flex-1 overflow-hidden relative bg-neutral-900">
                        {renderImageElement()}
                    </div>
                    {/* Sprocket holes (齿孔) at bottom */}
                    <div className="absolute bottom-1 left-0 right-0 flex justify-around px-2 pointer-events-none opacity-60">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 bg-neutral-800 rounded-sm border border-neutral-700/30" />
                        ))}
                    </div>
                </div>
            );
        }

        if (borderStyle === 'rounded') {
            return (
                <div className="w-full h-full rounded-2xl border border-gray-200/50 shadow-md overflow-hidden bg-gray-50 transition-all">
                    {renderImageElement()}
                </div>
            );
        }

        // normal
        return (
            <div 
                className="w-full h-full overflow-hidden transition-all"
                style={{
                    padding: 'var(--photo-padding, 0px)',
                    border: 'var(--photo-border, 1px solid rgba(0,0,0,0.05))',
                    boxShadow: 'var(--photo-shadow, none)',
                    backgroundColor: 'var(--photo-bg, #fcfcfc)',
                }}
            >
                {renderImageElement()}
            </div>
        );
    };

    if (readOnly) {
        return (
            <div className={`${className} relative select-none w-full h-full`} style={style}>
                {renderStyledContent()}
            </div>
        );
    }

    return (
        <div
            onClick={handlePhotoClick}
            draggable={editorMode === 'select'}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            data-photo-id={photo.id}
            data-chapter-id={chapterId}
            data-page-id={pageId}
            className={`${className} relative transition-all ${
                editorMode === 'select'
                    ? 'cursor-pointer hover:ring-2 hover:ring-indigo-600/40 hover:ring-offset-1'
                    : ''
            } ${isSelected ? 'ring-2 ring-indigo-600 ring-offset-2' : ''} ${
                isDragOver ? 'ring-2 ring-indigo-600 ring-offset-2 scale-[0.98] opacity-80' : ''
            }`}
            style={{ ...style }}
        >
            {/* styled frame */}
            {renderStyledContent()}

            {/* Canvas Hover Context Toolbar (玻璃拟态悬浮操作栏) */}
            {editorMode === 'select' && (isHovered || isSelected) && (
                <div 
                    className="absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center bg-slate-900/90 backdrop-blur-md text-white rounded-lg shadow-2xl border border-slate-700/50 p-1 gap-1 text-[9px] pointer-events-auto transition-all animate-fade-in"
                    onClick={(e) => e.stopPropagation()} // 避免触发选择
                >
                    <button 
                        onClick={handleReplaceClick}
                        disabled={isReplacing}
                        className="p-1 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 font-bold px-1.5 whitespace-nowrap text-gray-200"
                        title="上传并替换照片"
                    >
                        <RefreshCw size={10} className={isReplacing ? 'animate-spin' : ''} />
                        <span>{isReplacing ? '上传中...' : '替换'}</span>
                    </button>
                    <div className="w-[1px] h-3 bg-slate-700/50" />
                    <button 
                        onClick={handleClearClick}
                        className="p-1 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 font-bold px-1.5 whitespace-nowrap text-red-400 hover:text-red-300"
                        title="移出当前插槽并回退至素材栏"
                    >
                        <Eraser size={10} />
                        <span>清空</span>
                    </button>
                    <div className="w-[1px] h-3 bg-slate-700/50" />
                    <button 
                        onClick={handleCropClick}
                        className="p-1 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 font-bold px-1.5 whitespace-nowrap text-indigo-400 hover:text-indigo-300"
                        title="打开精细调节面板"
                    >
                        <Crop size={10} />
                        <span>微调</span>
                    </button>
                </div>
            )}

            {/* Hidden upload input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
        </div>
    );
};
