import React, { useState } from 'react';
import { ImageOff, ExternalLink } from 'lucide-react';
import type { PexelsPhoto } from '../../assets/services/pexelsService';

interface PexelsPhotoCardProps {
    photo: PexelsPhoto;
    style: React.CSSProperties;
}

/**
 * Pexels 素材卡片组件 (专供编辑器侧边栏使用)
 * 包含独立的图片懒加载骨架屏、404加载失败防御回退机制以及带有完整 Pexels 拖拽载荷的拖拽逻辑。
 */
export const PexelsPhotoCard: React.FC<PexelsPhotoCardProps> = ({
    photo,
    style
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    // 拖动开始：写入拖拽载荷 (直接输出 pexelsPhoto 格式与 text/plain URL)
    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('pexelsPhoto', JSON.stringify({
            id: photo.id,
            url: photo.url, // large size url
            photographer: photo.photographer,
            width: photo.width,
            height: photo.height
        }));
        e.dataTransfer.setData('text/plain', photo.url);
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div
            style={style}
            draggable
            onDragStart={handleDragStart}
            className="group relative rounded-xl overflow-hidden border border-gray-200/80 bg-slate-50 cursor-grab active:cursor-grabbing hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 select-none"
        >
            {/* 1. 骨架屏占位 */}
            {!isLoaded && !hasError && (
                <div className="absolute inset-0 bg-slate-100 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-r from-slate-100 via-slate-200/60 to-slate-100 animate-pulse bg-[length:200%_100%]" />
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
                    src={photo.thumbnailUrl} // 缩略图提升加载速度
                    onLoad={() => setIsLoaded(true)}
                    onError={() => {
                        setHasError(true);
                        setIsLoaded(true);
                    }}
                    className={`w-full h-full object-cover transition-opacity duration-300 pointer-events-none select-none ${
                        isLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    alt={photo.name}
                />
            )}

            {/* 4. 浮动操作按钮面板 (Hover Overlay) */}
            {isLoaded && !hasError && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2 pointer-events-none">
                    <div className="flex items-center justify-between pointer-events-auto">
                        <span className="text-[8px] font-bold text-white truncate max-w-[75%] drop-shadow-sm" title={photo.name}>
                            @{photo.photographer}
                        </span>
                        <a
                            href={photo.pexelsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded-full bg-black/30 hover:bg-black/60 text-white transition-all"
                            title="在 Pexels 查看大图"
                        >
                            <ExternalLink size={8} />
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};
