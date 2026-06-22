import React, { useState, useRef, useEffect } from 'react';
import type { TextElement, CanvasElement } from '../../types';
import { useBookStore } from '../../store';
import { CanvaSelectionFrame } from '../../features/editor/components/CanvaSelectionFrame';
import { useCanvasElementTransform } from '../../features/editor/hooks/useCanvasElementTransform';

interface CanvasTextElementProps {
    element: TextElement;
    chapterId: string;
    pageId: string;
    readOnly?: boolean;
    onUpdate: (updates: Partial<TextElement>) => void;
    canvasRef: React.RefObject<HTMLDivElement | null>;
    siblingElements: CanvasElement[];
}

/**
 * @description V2.0 Canvas自由画布文本组件
 * 依据百分比坐标与配置渲染文本，在编辑模式下支持双击 contentEditable 并自动触发 onUpdate 提交。
 */
export const CanvasTextElement: React.FC<CanvasTextElementProps> = ({
    element,
    chapterId,
    pageId,
    readOnly = false,
    onUpdate,
    canvasRef,
    siblingElements
}) => {
    const editorMode = useBookStore(state => state.editorMode);
    const activeTextEdit = useBookStore(state => state.activeTextEdit);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);

    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(element.textConfig.content);
    const elementRef = useRef<HTMLDivElement>(null);

    const isSelected = activeTextEdit?.slotId === element.id && activeTextEdit?.pageId === pageId;

    const { handleMouseDown } = useCanvasElementTransform(
        element,
        canvasRef,
        siblingElements,
        onUpdate as any
    );

    useEffect(() => {
        setLocalValue(element.textConfig.content);
    }, [element.textConfig.content]);

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly || editorMode === 'hand') return;
        e.stopPropagation();

        setActiveTextEdit({
            chapterId,
            pageId,
            slotId: element.id
        });
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (readOnly || editorMode === 'hand') return;
        e.stopPropagation();
        setIsEditing(true);
        setTimeout(() => {
            if (elementRef.current) {
                elementRef.current.focus();
                const range = document.createRange();
                range.selectNodeContents(elementRef.current);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }
        }, 0);
    };

    const handleBlur = () => {
        setIsEditing(false);
        const newValue = elementRef.current?.innerText?.trim() || '';
        setLocalValue(newValue);

        if (newValue === element.textConfig.content) return;

        onUpdate({
            textConfig: {
                ...element.textConfig,
                content: newValue
            }
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (element.role !== 'page-content' && e.key === 'Enter') {
            e.preventDefault();
            elementRef.current?.blur();
        }
    };

    const displayValue = localValue || '双击编辑文本';

    // 绝对定位盒样式
    const boxStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${element.x}%`,
        top: `${element.y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
        transform: `rotate(${element.rotate || 0}deg)`,
        zIndex: element.zIndex || 10,
        pointerEvents: readOnly ? 'none' : 'auto',
    };

    // 文本排版样式
    const textStyle: React.CSSProperties = {
        fontFamily: element.textConfig.fontFamily || 'sans-serif',
        fontSize: element.textConfig.fontSize || '14px',
        fontWeight: element.textConfig.fontWeight || 'normal',
        color: element.textConfig.color || '#334155',
        textAlign: element.textConfig.textAlign || 'left',
        lineHeight: element.textConfig.lineHeight || 1.6,
        letterSpacing: element.textConfig.letterSpacing || '0px',
        width: '100%',
        height: '100%',
    };

    if (readOnly) {
        return (
            <div style={boxStyle} className="select-none">
                <div style={textStyle}>
                    {element.textConfig.content || ''}
                </div>
            </div>
        );
    }

    return (
        <div
            style={boxStyle}
            onClick={handleClick}
            onMouseDown={(e) => {
                if (editorMode === 'select' && !isEditing) {
                    handleMouseDown(e, 'move');
                }
            }}
            className="group/canvas-text"
            data-element-id={element.id}
            data-element-type="text"
        >
            <div
                ref={elementRef}
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                onDoubleClick={handleDoubleClick}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                style={textStyle}
                className={`outline-none transition-all ${
                    isEditing
                        ? 'bg-white text-gray-800 ring-2 ring-[#8b3dff] shadow-sm px-1.5 py-0.5 rounded cursor-text'
                        : isSelected
                            ? 'bg-[#8b3dff]/5 rounded px-1.5 py-0.5 cursor-pointer select-none'
                            : 'hover:bg-primary/5 rounded px-1 cursor-pointer select-none hover:ring-1 hover:ring-dashed hover:ring-[#8b3dff]/40'
                }`}
                title="单击选中，双击进行编辑"
            >
                {isEditing ? localValue : displayValue}
            </div>

            {/* Canva 风格选中边框 */}
            {isSelected && !isEditing && (
                <CanvaSelectionFrame
                    showCornerHandles={true}
                    showEdgeHandles="horizontal"
                    showRotate={true}
                    onRotateStart={(e) => handleMouseDown(e, 'rotate')}
                    onResizeStart={(e, dir) => handleMouseDown(e, 'resize', dir)}
                />
            )}
        </div>
    );
};
