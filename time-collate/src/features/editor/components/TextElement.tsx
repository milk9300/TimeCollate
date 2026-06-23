import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import type { Element } from '../../../store/useEditorStore';

interface TextElementProps {
  element: Element;
  pageId: string;
}

/**
 * TextElement 文本渲染与就地编辑组件
 * 支持双击开启 contentEditable，并在失焦或回车时通过 Zustand Actions 同步最新内容。
 */
export const TextElement: React.FC<TextElementProps> = ({ element, pageId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // 同步 Zustand 中的文本内容到 innerText，避免在编辑状态下由于非受控更新导致光标抖动
  useEffect(() => {
    if (editorRef.current && !isEditing) {
      editorRef.current.innerText = element.content || '双击编辑文字';
    }
  }, [element.content, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    // 延迟执行 focus，确保 contentEditable 属性被浏览器正确响应
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        
        // 全选文本，方便快速替换
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }, 50);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editorRef.current) {
      const newText = editorRef.current.innerText.trim();
      useEditorStore.getState().updateElement(pageId, element.id, {
        content: newText || '点击输入文本',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 按 Enter 键提交，Shift + Enter 换行
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      editorRef.current?.blur();
    }
  };

  return (
    <div
      ref={editorRef}
      contentEditable={isEditing}
      suppressContentEditableWarning
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`w-full h-full p-2 outline-none break-words font-serif text-slate-800 text-sm leading-relaxed transition-all duration-200 ${
        isEditing 
          ? 'cursor-text bg-white/70 ring-2 ring-amber-500/50 rounded-xl shadow-inner backdrop-blur-sm' 
          : 'cursor-pointer select-none rounded-xl hover:bg-amber-500/5'
      }`}
      style={{
        userSelect: isEditing ? 'text' : 'none',
      }}
      title={isEditing ? '输入完成后点击空白处保存' : '双击以编辑此段文字'}
    />
  );
};
export default TextElement;
