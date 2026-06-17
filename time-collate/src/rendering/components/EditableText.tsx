import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useBookStore } from '../../store';
import { updateSlotText, updateSlotStyle, getSlotStyle } from '../../utils/textSlotHelper';
import { 
    Bold, 
    Italic, 
    AlignLeft, 
    AlignCenter, 
    AlignRight, 
    Type
} from 'lucide-react';

interface EditableTextProps {
    value: string;
    chapterId?: string;
    pageId?: string;
    photoId?: string;
    slotId?: string; // 新增：如果是多文本槽位，表示当前槽位的 ID
    type: 'chapter-title' | 'chapter-date' | 'page-content' | 'photo-caption' | 'book-title' | 'book-author' | 'book-preface';
    className?: string;
    style?: React.CSSProperties;
    placeholder?: string;
    readOnly?: boolean;
}

/**
 * @description 支持双击内联编辑的文本组件
 * 在 select 模式下，双击开启 contentEditable，失去焦点或按回车自动保存到 Zustand Store 并同步到后端。
 */
export const EditableText: React.FC<EditableTextProps> = ({
    value,
    chapterId,
    pageId,
    photoId,
    slotId,
    type,
    className = '',
    style,
    placeholder = '点击编辑...',
    readOnly = false
}) => {
    const editorMode = useBookStore(state => state.editorMode);
    const activeTextEdit = useBookStore(state => state.activeTextEdit);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    const isSelected = slotId && activeTextEdit?.slotId === slotId && activeTextEdit?.pageId === pageId;

    useEffect(() => {
        if (!isSelected) {
            setShowColorPicker(false);
        }
    }, [isSelected]);

    // Reactive page content for style lookup
    const pageContent = useBookStore(state => {
        if (!pageId) return '';
        const page = state.currentBook?.pages?.find(p => p.id === pageId);
        return page?.content || '';
    });

    // Resolve current text slot style
    const slotStyle = useMemo(() => {
        if (!slotId) return {};
        return getSlotStyle(pageContent, slotId, {});
    }, [pageContent, slotId]);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleClick = (e: React.MouseEvent) => {
        if (readOnly || editorMode === 'hand') return;
        e.stopPropagation();
        
        if (chapterId && pageId && slotId) {
            setActiveTextEdit({
                chapterId,
                pageId,
                slotId
            });
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (readOnly || editorMode === 'hand') return;
        e.stopPropagation();
        setIsEditing(true);
        // 在下一个事件循环中聚焦并全选文本
        setTimeout(() => {
            if (elementRef.current) {
                elementRef.current.focus();
                // 选中所有文本
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
        
        if (newValue === value) return;

        const store = useBookStore.getState();
        if (type === 'book-title') {
            store.updateBookSettings({ title: newValue });
        } else if (type === 'book-author') {
            store.updateBookSettings({ author: newValue });
        } else if (type === 'book-preface') {
            store.updateBookSettings({ preface: newValue });
        } else if (type === 'chapter-title' && chapterId) {
            store.updateChapter(chapterId, { title: newValue });
        } else if (type === 'chapter-date' && chapterId) {
            store.updateChapter(chapterId, { date: newValue });
        } else if (type === 'page-content' && chapterId && pageId) {
            if (slotId) {
                const currentContent = pageContent;
                const updatedContent = updateSlotText(currentContent, slotId, newValue);
                store.updatePage(chapterId, pageId, { content: updatedContent });
            } else {
                store.updatePage(chapterId, pageId, { content: newValue });
            }
        } else if (type === 'photo-caption' && chapterId && pageId && photoId) {
            store.updatePhotoSettings(chapterId, pageId, photoId, { caption: newValue });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // 对于单行编辑，按 Enter 即保存并退出
        if (type !== 'page-content' && e.key === 'Enter') {
            e.preventDefault();
            elementRef.current?.blur();
        }
    };

    const handleStyleUpdate = (updates: any) => {
        if (!chapterId || !pageId || !slotId) return;
        const store = useBookStore.getState();
        const updatedContent = updateSlotStyle(pageContent, slotId, updates);
        store.updatePage(chapterId, pageId, { content: updatedContent });
    };

    const handleFontSizeChange = (direction: 'up' | 'down') => {
        const currentSizeStr = (slotStyle.fontSize as string) || '12pt';
        const num = parseInt(currentSizeStr) || 12;
        const newNum = direction === 'up' ? Math.min(64, num + 1) : Math.max(8, num - 1);
        handleStyleUpdate({ fontSize: `${newNum}pt` });
    };

    const toggleBold = () => {
        const currentWeight = slotStyle.fontWeight || 'normal';
        handleStyleUpdate({ fontWeight: currentWeight === 'bold' ? 'normal' : 'bold' });
    };

    const toggleItalic = () => {
        const currentStyle = slotStyle.fontStyle || 'normal';
        handleStyleUpdate({ fontStyle: currentStyle === 'italic' ? 'normal' : 'italic' });
    };

    const handleAlignChange = (align: 'left' | 'center' | 'right') => {
        handleStyleUpdate({ textAlign: align });
    };

    const displayValue = localValue || placeholder;

    // 如果处于只读或手形拖拽模式，只做纯展示，不响应任何编辑事件
    if (readOnly || editorMode === 'hand') {
        return (
            <div className={`${className} select-none`} style={style}>
                {value || placeholder}
            </div>
        );
    }

    const currentSize = parseInt((slotStyle.fontSize as string) || '12pt') || 12;
    const currentWeight = slotStyle.fontWeight || 'normal';
    const currentItalic = slotStyle.fontStyle || 'normal';
    const currentAlign = slotStyle.textAlign || 'left';

    return (
        <div className="relative group/text-slot">
            <div
                ref={elementRef}
                contentEditable={isEditing}
                suppressContentEditableWarning={true}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className={`${className} outline-none transition-all ${
                    isEditing
                        ? 'bg-white text-gray-800 ring-2 ring-indigo-500 shadow-sm px-1.5 py-0.5 rounded min-w-[50px] z-30 cursor-text'
                        : isSelected
                            ? 'ring-2 ring-indigo-500 bg-indigo-50/10 rounded px-1.5 py-0.5 cursor-pointer select-none'
                            : 'hover:bg-primary/5 rounded px-1 -mx-1 cursor-pointer select-none hover:ring-1 hover:ring-dashed hover:ring-primary/40'
                }`}
                style={style}
                title="单击选中，双击进行编辑"
            >
                {isEditing ? localValue : displayValue}
            </div>

            {/* Floating popover toolbar */}
            {isSelected && !isEditing && (
                <div 
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-40 flex items-center bg-slate-900/95 backdrop-blur-md text-white rounded-lg shadow-2xl border border-slate-700/50 p-1 gap-1 text-[9px] pointer-events-auto transition-all animate-fade-in whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Font Size controls */}
                    <button
                        onClick={() => handleFontSizeChange('down')}
                        className="p-1 hover:bg-slate-800 rounded transition-colors text-gray-300 font-bold"
                        title="缩小字号"
                    >
                        A-
                    </button>
                    <span className="px-1 text-[9px] font-bold text-gray-400 font-mono select-none">
                        {currentSize}pt
                    </span>
                    <button
                        onClick={() => handleFontSizeChange('up')}
                        className="p-1 hover:bg-slate-800 rounded transition-colors text-gray-300 font-bold"
                        title="增大字号"
                    >
                        A+
                    </button>

                    <div className="w-[1px] h-3 bg-slate-800" />

                    {/* Bold & Italic */}
                    <button
                        onClick={toggleBold}
                        className={`p-1 rounded transition-colors ${currentWeight === 'bold' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}
                        title="加粗"
                    >
                        <Bold size={10} />
                    </button>
                    <button
                        onClick={toggleItalic}
                        className={`p-1 rounded transition-colors ${currentItalic === 'italic' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}
                        title="斜体"
                    >
                        <Italic size={10} />
                    </button>

                    <div className="w-[1px] h-3 bg-slate-800" />

                    {/* Alignment */}
                    <button
                        onClick={() => handleAlignChange('left')}
                        className={`p-1 rounded transition-colors ${currentAlign === 'left' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}
                        title="居左"
                    >
                        <AlignLeft size={10} />
                    </button>
                    <button
                        onClick={() => handleAlignChange('center')}
                        className={`p-1 rounded transition-colors ${currentAlign === 'center' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}
                        title="居中"
                    >
                        <AlignCenter size={10} />
                    </button>
                    <button
                        onClick={() => handleAlignChange('right')}
                        className={`p-1 rounded transition-colors ${currentAlign === 'right' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-800'}`}
                        title="居右"
                    >
                        <AlignRight size={10} />
                    </button>

                    <div className="w-[1px] h-3 bg-slate-800" />

                    {/* Color Swatch Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className={`p-1.5 rounded transition-colors ${showColorPicker ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-slate-800'} flex items-center justify-center`}
                            title="选择颜色"
                        >
                            <span 
                                className="w-2.5 h-2.5 rounded-full border border-white/20" 
                                style={{ backgroundColor: slotStyle.color || '#1E293B' }}
                            />
                        </button>

                        {showColorPicker && (
                            <>
                                <div className="fixed inset-0 z-50" onClick={() => setShowColorPicker(false)} />
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700/60 rounded-lg p-1.5 flex gap-1.5 shadow-xl z-50 animate-in fade-in duration-100">
                                    {[
                                        { hex: '#1E293B', name: '深炭黑' },
                                        { hex: '#4F46E5', name: '靛青蓝' },
                                        { hex: '#059669', name: '艾草绿' },
                                        { hex: '#D97706', name: '琥珀金' },
                                        { hex: '#DC2626', name: '朱砂红' },
                                        { hex: '#DB2777', name: '蔷薇粉' }
                                    ].map((colorObj) => (
                                        <button
                                            key={colorObj.hex}
                                            onClick={() => {
                                                handleStyleUpdate({ color: colorObj.hex });
                                                setShowColorPicker(false);
                                            }}
                                            className="w-3.5 h-3.5 rounded-full border border-white/20 hover:scale-110 transition-all flex items-center justify-center relative"
                                            style={{ backgroundColor: colorObj.hex }}
                                            title={colorObj.name}
                                        >
                                            {(slotStyle.color || '#1E293B') === colorObj.hex && (
                                                <div className="w-1 h-1 bg-white rounded-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="w-[1px] h-3 bg-slate-800" />

                    {/* Edit button */}
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 hover:bg-indigo-600 hover:text-white rounded transition-colors text-indigo-400 flex items-center gap-0.5 font-bold px-1.5"
                        title="输入文本"
                    >
                        <Type size={10} />
                        编辑
                    </button>
                </div>
            )}
        </div>
    );
};
