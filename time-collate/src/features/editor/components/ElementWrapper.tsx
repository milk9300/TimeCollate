import React, { useRef } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import type { Element } from '../../../store/useEditorStore';

interface ElementWrapperProps {
  element: Element;
  pageId: string;
  children: React.ReactNode;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

/**
 * ElementWrapper 自由操控外壳
 * 基于绝对定位放置元素，支持 Pointer 事件拖拽与锁定比例缩放。
 */
export const ElementWrapper: React.FC<ElementWrapperProps> = ({
  element,
  pageId,
  children,
  selected,
  onClick
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. 处理拖动 (Drag) 交互
  const handlePointerDown = (e: React.PointerEvent) => {
    // 如果点击的是缩放手柄，则不触发拖动
    if ((e.target as HTMLElement).dataset.handle) return;
    
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;

    el.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = element.x;
    const startTop = element.y;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      // 实时更新 Zustand 中的绝对坐标 (px)
      useEditorStore.getState().updateElement(pageId, element.id, {
        x: Math.round(startLeft + dx),
        y: Math.round(startTop + dy),
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      try {
        el.releasePointerCapture(upEvent.pointerId);
      } catch (err) {
        // 忽略指针捕获释放异常
      }
    };

    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
  };

  // 2. 处理缩放 (Resize) 交互
  const handleResizeStart = (e: React.PointerEvent, handleType: string) => {
    e.stopPropagation();
    e.preventDefault();
    const handleEl = e.currentTarget as HTMLElement;
    handleEl.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = element.width;
    const startHeight = element.height;
    const startLeft = element.x;
    const startTop = element.y;

    // 确定是否锁定宽高比 (图片类型或含有 aspectRatio 的元素)
    const ratio = element.aspectRatio || (startWidth / startHeight);
    const keepRatio = element.type === 'image' || !!element.aspectRatio;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newLeft = startLeft;
      let newTop = startTop;

      switch (handleType) {
        case 'bottom-right':
          newWidth = Math.max(20, startWidth + dx);
          if (keepRatio) {
            newHeight = newWidth / ratio;
          } else {
            newHeight = Math.max(20, startHeight + dy);
          }
          break;
        case 'bottom-left':
          newWidth = Math.max(20, startWidth - dx);
          newLeft = startLeft + (startWidth - newWidth);
          if (keepRatio) {
            newHeight = newWidth / ratio;
          } else {
            newHeight = Math.max(20, startHeight + dy);
          }
          break;
        case 'top-right':
          newWidth = Math.max(20, startWidth + dx);
          if (keepRatio) {
            newHeight = newWidth / ratio;
            newTop = startTop - (newHeight - startHeight);
          } else {
            newHeight = Math.max(20, startHeight - dy);
            newTop = startTop + (startHeight - newHeight);
          }
          break;
        case 'top-left':
          newWidth = Math.max(20, startWidth - dx);
          newLeft = startLeft + (startWidth - newWidth);
          if (keepRatio) {
            newHeight = newWidth / ratio;
            newTop = startTop - (newHeight - startHeight);
          } else {
            newHeight = Math.max(20, startHeight - dy);
            newTop = startTop + (startHeight - newHeight);
          }
          break;
      }

      useEditorStore.getState().updateElement(pageId, element.id, {
        x: Math.round(newLeft),
        y: Math.round(newTop),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      });
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      handleEl.removeEventListener('pointermove', onPointerMove);
      handleEl.removeEventListener('pointerup', onPointerUp);
      try {
        handleEl.releasePointerCapture(upEvent.pointerId);
      } catch (err) {
        // 忽略指针捕获释放异常
      }
    };

    handleEl.addEventListener('pointermove', onPointerMove);
    handleEl.addEventListener('pointerup', onPointerUp);
  };

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${element.x}px`,
    top: `${element.y}px`,
    width: `${element.width}px`,
    height: `${element.height}px`,
    zIndex: element.zIndex,
  };

  return (
    <div
      ref={containerRef}
      style={style}
      onPointerDown={handlePointerDown}
      onClick={onClick}
      className={`group select-none outline-none ${
        selected 
          ? 'ring-2 ring-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
          : 'hover:ring-1 hover:ring-amber-500/40 hover:ring-dashed'
      }`}
    >
      {/* 渲染子元素本体 */}
      <div className="w-full h-full relative overflow-hidden pointer-events-auto">
        {children}
      </div>

      {/* 渲染选中的操控手柄 */}
      {selected && (
        <>
          {/* 四角缩放手柄 */}
          <div
            data-handle="true"
            onPointerDown={(e) => handleResizeStart(e, 'top-left')}
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-600 rounded-full shadow-md cursor-nwse-resize z-50 hover:bg-amber-100 transition-colors"
          />
          <div
            data-handle="true"
            onPointerDown={(e) => handleResizeStart(e, 'top-right')}
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-600 rounded-full shadow-md cursor-nesw-resize z-50 hover:bg-amber-100 transition-colors"
          />
          <div
            data-handle="true"
            onPointerDown={(e) => handleResizeStart(e, 'bottom-left')}
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-amber-600 rounded-full shadow-md cursor-nesw-resize z-50 hover:bg-amber-100 transition-colors"
          />
          <div
            data-handle="true"
            onPointerDown={(e) => handleResizeStart(e, 'bottom-right')}
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-amber-600 rounded-full shadow-md cursor-nwse-resize z-50 hover:bg-amber-100 transition-colors"
          />

          {/* 顶部的深度调整快捷控制条 */}
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] px-2.5 py-1 rounded-full shadow-lg flex items-center gap-2 border border-amber-500/20 backdrop-blur-sm z-50 select-none animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={(e) => {
                e.stopPropagation();
                useEditorStore.getState().bringToFront(pageId, element.id);
              }}
              className="hover:text-amber-400 transition-colors font-semibold"
            >
              置顶
            </button>
            <span className="w-px h-2.5 bg-slate-700" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                useEditorStore.getState().sendToBack(pageId, element.id);
              }}
              className="hover:text-amber-400 transition-colors font-semibold"
            >
              置底
            </button>
            <span className="w-px h-2.5 bg-slate-700" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                useEditorStore.getState().deleteElement(pageId, element.id);
              }}
              className="hover:text-rose-400 transition-colors font-semibold"
            >
              删除
            </button>
          </div>
        </>
      )}
    </div>
  );
};
export default ElementWrapper;
