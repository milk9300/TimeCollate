import React from 'react';

interface StickerElementProps {
  src?: string;
  alt?: string;
}

/**
 * StickerElement 贴纸素材渲染组件
 * 支持直接渲染 SVG 字符串代码（实现动态换色）或渲染 PNG/WebP 静态图片 URL。
 */
export const StickerElement: React.FC<StickerElementProps> = ({ src, alt = '装饰贴纸' }) => {
  if (!src) {
    return (
      <div className="w-full h-full bg-slate-100/50 flex items-center justify-center border border-dashed border-slate-300 rounded-xl text-slate-400 text-xs font-medium select-none">
        <span>无效贴纸</span>
      </div>
    );
  }

  // 判定是否为直接嵌入的 SVG 字符串结构
  const isSvgString = src.trim().startsWith('<svg') && src.trim().endsWith('</svg>');

  if (isSvgString) {
    return (
      <div
        className="w-full h-full pointer-events-none drop-shadow-[2px_3px_5px_rgba(0,0,0,0.15)] transition-transform duration-300 hover:scale-[1.02]"
        dangerouslySetInnerHTML={{ __html: src }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-contain pointer-events-none drop-shadow-[2px_3px_5px_rgba(0,0,0,0.15)] transition-transform duration-300 hover:scale-[1.02]"
      draggable={false}
    />
  );
};
export default StickerElement;
