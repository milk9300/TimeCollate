import React from 'react';

interface CanvaSelectionFrameProps {
    /** 是否显示四角圆形手柄 */
    showCornerHandles?: boolean;
    /** 是否显示边线上的手柄：'all' (四边都有), 'horizontal' (仅左右), 'vertical' (仅上下), 'none' (无) */
    showEdgeHandles?: 'all' | 'horizontal' | 'vertical' | 'none';
    /** 是否显示下方的旋转手柄 */
    showRotate?: boolean;
    /** 触发旋转时的回调，将鼠标按下事件传出 */
    onRotateStart?: (e: React.MouseEvent) => void;
    /** 触发缩放时的回调，将鼠标按下事件及方向传出 */
    onResizeStart?: (e: React.MouseEvent, direction: 'nw' | 'ne' | 'se' | 'sw' | 'w' | 'e' | 'n' | 's') => void;
}

/**
 * @description 模仿 Canva 风格的精致选中框组件
 * 渲染 2px 的紫色实线边框、白色带阴影的控制手柄与旋转按钮
 */
export const CanvaSelectionFrame: React.FC<CanvaSelectionFrameProps> = ({
    showCornerHandles = true,
    showEdgeHandles = 'all',
    showRotate = false,
    onRotateStart,
    onResizeStart
}) => {
    // #region 辅助手柄样式定义
    const handleBaseStyle = "absolute bg-white border border-[#8b3dff] rounded-full pointer-events-auto shadow-[0_2px_5px_rgba(0,0,0,0.18)] hover:scale-125 hover:bg-white active:scale-95 transition-transform duration-100 z-50";
    // #endregion

    return (
        <div className="absolute inset-0 pointer-events-none z-40 select-none canvas-editor-ui">
            {/* Canva 标志性紫色边框 */}
            <div className="absolute inset-0 border-2 border-[#8b3dff] rounded-[3px] pointer-events-none" />

            {/* #region 四角圆形控制点 */}
            {showCornerHandles && (
                <>
                    {/* 左上 */}
                    <div 
                        className={`${handleBaseStyle} w-[10px] h-[10px] -top-[5px] -left-[5px] cursor-nwse-resize`}
                        onMouseDown={(e) => { e.stopPropagation(); onResizeStart?.(e, 'nw'); }}
                        title="拖拽缩放" 
                    />
                    {/* 右上 */}
                    <div 
                        className={`${handleBaseStyle} w-[10px] h-[10px] -top-[5px] -right-[5px] cursor-nesw-resize`}
                        onMouseDown={(e) => { e.stopPropagation(); onResizeStart?.(e, 'ne'); }}
                        title="拖拽缩放" 
                    />
                    {/* 左下 */}
                    <div 
                        className={`${handleBaseStyle} w-[10px] h-[10px] -bottom-[5px] -left-[5px] cursor-nesw-resize`}
                        onMouseDown={(e) => { e.stopPropagation(); onResizeStart?.(e, 'sw'); }}
                        title="拖拽缩放" 
                    />
                    {/* 右下 */}
                    <div 
                        className={`${handleBaseStyle} w-[10px] h-[10px] -bottom-[5px] -right-[5px] cursor-nwse-resize`}
                        onMouseDown={(e) => { e.stopPropagation(); onResizeStart?.(e, 'se'); }}
                        title="拖拽缩放" 
                    />
                </>
            )}
            {/* #endregion */}

            {/* #region 边中点控制点 */}
            {(showEdgeHandles === 'all' || showEdgeHandles === 'horizontal') && (
                <>
                    {/* 左侧竖条 */}
                    <div 
                        className={`${handleBaseStyle} w-[5px] h-[16px] rounded-[3px] top-1/2 -translate-y-1/2 -left-[3px] cursor-ew-resize`}
                        onMouseDown={(e) => { e.stopPropagation(); onResizeStart?.(e, 'w'); }}
                        title="调整宽度" 
                    />
                    {/* 右侧竖条 */}
                    <div 
                        className={`${handleBaseStyle} w-[5px] h-[16px] rounded-[3px] top-1/2 -translate-y-1/2 -right-[3px] cursor-ew-resize`}
                        onMouseDown={(e) => { e.stopPropagation(); onResizeStart?.(e, 'e'); }}
                        title="调整宽度" 
                    />
                </>
            )}
            {(showEdgeHandles === 'all' || showEdgeHandles === 'vertical') && (
                <>
                    {/* 上侧横条 */}
                    <div 
                        className={`${handleBaseStyle} w-[16px] h-[5px] rounded-[3px] left-1/2 -translate-x-1/2 -top-[3px] cursor-ns-resize`}
                        onMouseDown={(e) => { e.stopPropagation(); onResizeStart?.(e, 'n'); }}
                        title="调整高度" 
                    />
                    {/* 下侧横条 */}
                    <div 
                        className={`${handleBaseStyle} w-[16px] h-[5px] rounded-[3px] left-1/2 -translate-x-1/2 -bottom-[3px] cursor-ns-resize`}
                        onMouseDown={(e) => { e.stopPropagation(); onResizeStart?.(e, 's'); }}
                        title="调整高度" 
                    />
                </>
            )}
            {/* #endregion */}

            {/* #region 旋转手柄 */}
            {showRotate && (
                <div 
                    className="absolute -bottom-11 left-1/2 -translate-x-1/2 w-[28px] h-[28px] bg-white rounded-full border border-gray-200/80 shadow-[0_2.5px_6px_rgba(0,0,0,0.15)] flex items-center justify-center pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-transform duration-100 z-50"
                    onMouseDown={(e) => { e.stopPropagation(); onRotateStart?.(e); }}
                    title="拖拽旋转"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                </div>
            )}
            {/* #endregion */}
        </div>
    );
};
