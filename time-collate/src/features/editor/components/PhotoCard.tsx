// #region Description
import React, { useState } from 'react';
import { ImageOff, Heart } from 'lucide-react';
import type { Material } from '../../assets/services/assetService';
import { getThumbnailUrl } from '../../../utils/cdn';
import { useAssetStore } from '../../../store/useAssetStore';

interface PhotoCardProps {
    material: Material;
    activeChapterId: string | null;
    activePageId: string | null;
    style: React.CSSProperties;
}

/**
 * 照片卡片组件
 * 包含独立的图片懒加载骨架屏、404加载失败防御回退机制以及拖拽传输逻辑。
 */
export const PhotoCard: React.FC<PhotoCardProps> = ({
    material,
    activeChapterId,
    activePageId,
    style
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const toggleFavorite = useAssetStore(state => state.toggleFavorite);

    // 拖动开始：写入拖拽载荷
    const handleDragStart = (e: React.DragEvent) => {
        if (!material.file_url) return;
        e.dataTransfer.setData('text/plain', material.file_url);
        e.dataTransfer.setData('photoId', material.id);
        e.dataTransfer.setData('sourcePageId', activePageId || '');
        e.dataTransfer.setData('sourceChapterId', activeChapterId || '');
        e.dataTransfer.effectAllowed = 'copyMove';
    };

    // 收藏切换
    const handleFavoriteClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await toggleFavorite(material.id);
        } catch (err) {
            console.error('Failed to toggle favorite:', err);
        }
    };

    const isFav = material.is_favorite === 1;

    return (
        <div
            style={style}
            draggable
            onDragStart={handleDragStart}
            className="group relative rounded-xl overflow-hidden border border-gray-200/80 bg-slate-50 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 select-none"
        >
            {/* 1. 骨架屏占位 (Shimmer pulse effect) */}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-r from-slate-100 via-slate-200/60 to-slate-100 animate-pulse bg-[length:200%_100%] shadow-[inset_0_0_8px_rgba(0,0,0,0.01)]" />
                </div>
            )}

            {/* 2. 加载失败防御占位 */}
            {hasError ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-3 text-gray-400 bg-gray-100/50 gap-1.5 select-none">
                    <ImageOff size={18} className="text-gray-300" />
                    <span className="text-[9px] text-gray-400 font-bold scale-90">加载失败</span>
                </div>
            ) : (
                /* 3. 图片渲染 */
                <img
                    src={getThumbnailUrl(material.file_url, 240)}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => {
                        setHasError(true);
                        setIsLoaded(true);
                    }}
                    className={`w-full h-full object-cover transition-opacity duration-300 pointer-events-none select-none ${
                        isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    alt={material.name}
                />
            )}

            {/* 4. 浮动操作按钮面板 (Hover Overlay) */}
            {isLoaded && !hasError && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 pointer-events-none">
                    <div className="flex items-center justify-between pointer-events-auto">
                        <span className="text-[9px] font-bold text-white truncate max-w-[70%] drop-shadow-sm">
                            {material.name}
                        </span>
                        <button
                            onClick={handleFavoriteClick}
                            className={`p-1.5 rounded-full transition-all cursor-pointer ${
                                isFav 
                                    ? 'bg-amber-500/90 text-white shadow-sm' 
                                    : 'bg-black/30 text-white hover:bg-black/60 hover:scale-105'
                            }`}
                            title={isFav ? "取消收藏" : "移入收藏夹"}
                        >
                            <Heart size={10} fill={isFav ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
// #endregion
