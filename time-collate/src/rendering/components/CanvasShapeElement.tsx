import React from 'react';
import type { ShapeElement, CanvasElement } from '../../types';
import { useBookStore } from '../../store';
import { getVirtualDimensions } from '../PhysicalConstants';
import { CanvaSelectionFrame } from '../../features/editor/components/CanvaSelectionFrame';
import { useCanvasElementTransform } from '../../features/editor/hooks/useCanvasElementTransform';

interface CanvasShapeElementProps {
    element: ShapeElement;
    chapterId: string;
    pageId: string;
    readOnly?: boolean;
    onUpdate: (updates: Partial<ShapeElement>) => void;
    onDragEnd?: () => void;
    canvasRef: React.RefObject<HTMLDivElement | null>;
    siblingElements: CanvasElement[];
}

/**
 * @description V2.0 Canvas自由画布几何形状组件
 * 支持矩形、圆形、三角形和线段的渲染，自动计算百分比宽高。
 */
export const CanvasShapeElement: React.FC<CanvasShapeElementProps> = ({
    element,
    chapterId,
    pageId,
    readOnly = false,
    onUpdate,
    onDragEnd,
    canvasRef,
    siblingElements
}) => {
    const editorMode = useBookStore(state => state.editorMode);
    const activeStickerEdit = useBookStore(state => state.activeStickerEdit);
    const setActiveStickerEdit = useBookStore(state => state.setActiveStickerEdit);

    const isSelected = activeStickerEdit?.stickerId === element.id && activeStickerEdit?.pageId === pageId;
    const { shapeType, fillColor = 'transparent', borderColor = '#6366f1', borderWidth = 2 } = element.shapeConfig;

    const { handleMouseDown } = useCanvasElementTransform(
        element,
        canvasRef,
        siblingElements,
        onUpdate as any,
        onDragEnd
    );

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly || editorMode === 'hand') return;
        e.stopPropagation();
        setActiveStickerEdit({
            chapterId,
            pageId,
            stickerId: element.id
        });
    };

    const currentBook = useBookStore(state => state.currentBook);
    const pageSize = currentBook?.pageSize || 'A4';
    const { virtualWidth, virtualHeight } = getVirtualDimensions(pageSize);

    // 绝对定位尺寸
    const boxStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${(element.x / virtualWidth) * 100}%`,
        top: `${(element.y / virtualHeight) * 100}%`,
        width: `${(element.width / virtualWidth) * 100}%`,
        height: `${(element.height / virtualHeight) * 100}%`,
        transform: `rotate(${element.rotate || 0}deg)`,
        zIndex: isSelected ? 9999 : (element.zIndex || 10),
        pointerEvents: readOnly ? 'none' : 'auto',
    };

    const renderShapeContent = () => {
        switch (shapeType) {
            case 'circle':
                return (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            backgroundColor: fillColor,
                            border: `${borderWidth}px solid ${borderColor}`,
                        }}
                    />
                );
            case 'triangle':
                return (
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polygon
                            points="50,5 95,95 5,95"
                            fill={fillColor}
                            stroke={borderColor}
                            strokeWidth={borderWidth}
                        />
                    </svg>
                );
            case 'line':
                return (
                    <svg width="100%" height="100%" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <line
                            x1="0"
                            y1="5"
                            x2="100"
                            y2="5"
                            stroke={borderColor}
                            strokeWidth={borderWidth}
                        />
                    </svg>
                );
            case 'rect':
            default:
                return (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: fillColor,
                            border: `${borderWidth}px solid ${borderColor}`,
                        }}
                    />
                );
        }
    };

    return (
        <div
            style={boxStyle}
            onClick={handleClick}
            onMouseDown={(e) => {
                if (editorMode === 'select') {
                    e.stopPropagation();
                    setActiveStickerEdit({
                        chapterId,
                        pageId,
                        stickerId: element.id
                    });
                    handleMouseDown(e, 'move');
                }
            }}
            className="group/canvas-shape"
            data-element-id={element.id}
            data-element-type="shape"
        >
            {renderShapeContent()}

            {isSelected && !readOnly && (
                <CanvaSelectionFrame
                    showCornerHandles={true}
                    showEdgeHandles="all"
                    showRotate={true}
                    onRotateStart={(e) => handleMouseDown(e, 'rotate')}
                    onResizeStart={(e, dir) => handleMouseDown(e, 'resize', dir)}
                />
            )}
        </div>
    );
};
