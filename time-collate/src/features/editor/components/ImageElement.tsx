import React from 'react';

interface ImageElementProps {
  src?: string;
  alt?: string;
}

/**
 * ImageElement 图片渲染组件
 * 使用 contain 以在保持盒子比例的同时完整展现图片，具备流光渐变加载效果与圆角样式。
 */
export const ImageElement: React.FC<ImageElementProps> = ({ src, alt = '相册图片' }) => {
  if (!src) {
    return (
      <div className="w-full h-full bg-amber-50/20 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-amber-500/20 rounded-xl text-amber-600/70 text-xs font-medium gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-amber-500/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>拖拽或上传图片</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-contain pointer-events-none rounded-xl transition-transform duration-300 hover:scale-[1.01]"
      draggable={false}
    />
  );
};
export default ImageElement;
