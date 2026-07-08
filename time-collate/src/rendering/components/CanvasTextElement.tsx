import React, { useState, useRef, useEffect } from 'react';
import type { TextElement, CanvasElement } from '../../types';
import { useBookStore } from '../../store';
import { isGradientColor } from '../../utils/colorUtils';
import { CanvaSelectionFrame } from '../../features/editor/components/CanvaSelectionFrame';
import { editorFacade } from '../../features/editor/runtime/EditorFacade';
import { eventBus } from '../../features/editor/runtime/eventBus';
import { getVirtualDimensions } from '../PhysicalConstants';
import { useCanvasElementTransform } from '../../features/editor/hooks/useCanvasElementTransform';
import { debounce } from '../../utils/debounce';

interface CanvasTextElementProps {
    element: TextElement;
    chapterId: string;
    pageId: string;
    readOnly?: boolean;
    onUpdate: (updates: Partial<TextElement>) => void;
    onDragEnd?: () => void;
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
    onDragEnd,
    canvasRef,
    siblingElements
}) => {
    const editorMode = useBookStore(state => state.editorMode);
    const activeTextEdit = useBookStore(state => state.activeTextEdit);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);

    const textConfig = element.textConfig || {
        content: '',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontWeight: 'normal',
        color: '#334155',
        textAlign: 'left',
        lineHeight: 1.6,
        letterSpacing: '0px',
        fontStyle: 'normal'
    };

    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(textConfig.content);
    const elementRef = useRef<HTMLDivElement>(null);

    const isSelected = activeTextEdit?.slotId === element.id && activeTextEdit?.pageId === pageId;

    const { handleMouseDown } = useCanvasElementTransform(
        element,
        canvasRef,
        siblingElements,
        onUpdate as any,
        onDragEnd
    );

    useEffect(() => {
        setLocalValue(textConfig.content);
    }, [textConfig.content]);

    // #region 资源加载状态对接
    const fontId = textConfig.fontFamily || 'system-sans';
    const [resolvedFontFamily, setResolvedFontFamily] = useState('sans-serif');

    useEffect(() => {
        // 占用并计数
        editorFacade.acquireResource(fontId);

        let isMounted = true;

        const loadFont = async () => {
            try {
                const res = await editorFacade.getResource(fontId);
                if (res) {
                    await editorFacade.loadResource(fontId);
                    if (isMounted) {
                        setResolvedFontFamily(res.metadata?.family || 'sans-serif');
                    }
                } else {
                    // 如果不是系统或已知云字体，降级为直接应用 fontFamily (兼容历史字符串数据)
                    if (isMounted) {
                        setResolvedFontFamily(fontId);
                    }
                }
            } catch (err) {
                console.error(`CanvasTextElement: Failed to load font: ${fontId}`, err);
                if (isMounted) {
                    setResolvedFontFamily('sans-serif');
                }
            }
        };

        loadFont();

        // 监听事件总线，当该字体在别处加载 Ready 时，能够触发同步重绘
        const handleResourceReady = (res: any) => {
            if (res.id === fontId && isMounted) {
                editorFacade.getResource(fontId).then(r => {
                    if (r && isMounted) {
                        setResolvedFontFamily(r.metadata?.family || 'sans-serif');
                    }
                });
            }
        };

        eventBus.on('resource:ready', handleResourceReady);

        return () => {
            isMounted = false;
            eventBus.off('resource:ready', handleResourceReady);
            // 释放计数，延时防抖卸载
            editorFacade.releaseResource(fontId);
        };
    }, [fontId]);
    // #endregion

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly || editorMode === 'hand') return;
        e.stopPropagation();

        if (isEditing) return; // Prevent state updates and re-renders while typing/editing

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

                const placeholderTexts = [
                    '双击输入正文...',
                    '双击编辑文本',
                    '添加大标题',
                    '添加副标题',
                    '添加正文文本...',
                    '添加标题',
                    '图片说明文字',
                    '在这里写下你的文字…',
                    '标题文字',
                    '点击编辑...'
                ];
                const currentText = elementRef.current.innerText.trim();
                const isPlaceholder = placeholderTexts.includes(currentText) ||
                    currentText.startsWith('双击') ||
                    currentText.startsWith('添加') ||
                    currentText.startsWith('写下') ||
                    currentText.includes('你想引用') ||
                    currentText.includes('此刻的心情') ||
                    currentText.includes('点击编辑');

                if (isPlaceholder) {
                    const range = document.createRange();
                    range.selectNodeContents(elementRef.current);
                    const selection = window.getSelection();
                    if (selection) {
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                } else {
                    // For custom text, collapse the selection range to the end to place the cursor at the end
                    const range = document.createRange();
                    range.selectNodeContents(elementRef.current);
                    range.collapse(false);
                    const selection = window.getSelection();
                    if (selection) {
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
            }
        }, 0);
    };

    const handleBlur = () => {
        setIsEditing(false);
        const newValue = elementRef.current?.innerText?.trim() || '';
        setLocalValue(newValue);
        console.log('📝 [handleBlur]', {
            newValue,
            oldValue: textConfig.content,
            changed: newValue !== textConfig.content
        });

        if (newValue === textConfig.content) return;

        onUpdate({
            textConfig: {
                ...textConfig,
                content: newValue
            }
        });
        onDragEnd?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (element.role !== 'page-content' && e.key === 'Enter') {
            e.preventDefault();
            elementRef.current?.blur();
        }
    };

    const displayValue = localValue || '双击编辑文本';

    // Synchronize innerText manually when NOT editing to isolate React reconciliation
    useEffect(() => {
        if (elementRef.current && !isEditing) {
            elementRef.current.innerText = displayValue;
        }
    }, [displayValue, isEditing]);

    const currentBook = useBookStore(state => state.currentBook);
    const pageSize = currentBook?.pageSize || 'A4';
    const { virtualWidth, virtualHeight } = getVirtualDimensions(pageSize);

    // Use useRef to store the debounced update function to prevent recreation during render
    const debouncedUpdateHeight = useRef(
        debounce((h: number, onUpdateFn: typeof onUpdate, onDragEndFn: typeof onDragEnd) => {
            console.log('📏 [ResizeObserver] Debounced triggering height update to:', h);
            onUpdateFn({
                height: h
            });
            onDragEndFn?.();
        }, 300)
    ).current;

    // Clean up debounced timer on unmount
    useEffect(() => {
        return () => {
            debouncedUpdateHeight.cancel();
        };
    }, [debouncedUpdateHeight]);

    // Sync measured height to the store/db using ResizeObserver (only when NOT editing)
    useEffect(() => {
        if (readOnly || isEditing || !elementRef.current || !canvasRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            if (!canvasRef.current) return;
            const unscaledCanvasH = canvasRef.current.offsetHeight;
            if (!unscaledCanvasH) return;

            for (const entry of entries) {
                // Measure the actual layout border-box height of the inner text element
                const domHeight = entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height;
                if (!domHeight) continue;

                const measuredVirtualHeight = Math.round((domHeight / unscaledCanvasH) * virtualHeight);
                console.log('📏 [ResizeObserver]', {
                    elementId: element.id,
                    domHeight,
                    unscaledCanvasH,
                    virtualHeight,
                    measuredVirtualHeight,
                    currentElementHeight: element.height,
                    diff: Math.abs(measuredVirtualHeight - element.height)
                });

                // Synchronize store height only if the difference exceeds a threshold of 2 units to prevent rendering jitter loops
                if (Math.abs(measuredVirtualHeight - element.height) > 2) {
                    console.log('📏 [ResizeObserver] Queueing debounced height update to:', measuredVirtualHeight);
                    debouncedUpdateHeight(measuredVirtualHeight, onUpdate, onDragEnd);
                }
            }
        });

        resizeObserver.observe(elementRef.current);
        return () => {
            resizeObserver.disconnect();
        };
    }, [element.width, element.height, readOnly, isEditing, canvasRef, virtualHeight, onUpdate]);

    // 绝对定位盒样式
    const boxStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${(element.x / virtualWidth) * 100}%`,
        top: `${(element.y / virtualHeight) * 100}%`,
        width: `${(element.width / virtualWidth) * 100}%`,
        height: isEditing ? 'auto' : `${(element.height / virtualHeight) * 100}%`,
        transform: `rotate(${element.rotate || 0}deg)`,
        zIndex: isSelected ? 9999 : (element.zIndex || 10),
        pointerEvents: readOnly ? 'none' : 'auto',
    };

    const isGrad = !isEditing && isGradientColor(textConfig.color || '');

    // 文本排版样式
    const textStyle: React.CSSProperties = {
        fontFamily: resolvedFontFamily,
        fontSize: textConfig.fontSize || '14px',
        fontWeight: textConfig.fontWeight || 'normal',
        fontStyle: textConfig.fontStyle || 'normal',
        color: isEditing ? '#1f2937' : (isGrad ? 'transparent' : (textConfig.color || '#334155')),
        background: isGrad ? textConfig.color : undefined,
        WebkitBackgroundClip: isGrad ? 'text' : undefined,
        WebkitTextFillColor: isGrad ? 'transparent' : undefined,
        textAlign: textConfig.textAlign || 'left',
        lineHeight: textConfig.lineHeight || 1.6,
        letterSpacing: textConfig.letterSpacing || '0px',
        width: '105%', // 稍微扩宽防止渐变字右边缘被少量截断
        height: 'auto',
        wordBreak: 'break-word',
    };

    if (readOnly) {
        return (
            <div style={boxStyle} className="select-none">
                <div style={textStyle}>
                    {textConfig.content || ''}
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
                    e.stopPropagation();
                    setActiveTextEdit({
                        chapterId,
                        pageId,
                        slotId: element.id
                    });
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
                className={`outline-none transition-all px-1.5 py-0.5 rounded ${
                    isEditing
                        ? 'bg-white text-gray-800 ring-2 ring-[#8b3dff] shadow-sm cursor-text'
                        : isSelected
                            ? 'bg-transparent cursor-pointer select-none'
                            : 'hover:bg-primary/5 cursor-pointer select-none hover:ring-1 hover:ring-dashed hover:ring-[#8b3dff]/40'
                }`}
                title="单击选中，双击进行编辑"
            />

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
