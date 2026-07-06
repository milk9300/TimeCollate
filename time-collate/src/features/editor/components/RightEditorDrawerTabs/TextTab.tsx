// #region Description
import React, { useCallback } from 'react';
import { useBookStore } from '../../../../store';
import { getVirtualDimensions } from '../../../../rendering/PhysicalConstants';
import type { TextElement } from '../../../../types';
import type { Page, Chapter } from '../../../../types';
import { Type, Heading1, Heading2, AlignLeft, Quote, PenLine } from 'lucide-react';

// #region 预设文字样式常量
/**
 * 预设文字样式模板列表
 * 每个预设定义了一个 TextElementConfig 模板，及其在面板中的展示信息
 */
const TEXT_PRESETS = [
    {
        id: 'heading',
        name: '大标题',
        description: '醒目的大号标题，适合章节页或封面',
        icon: Heading1,
        previewStyle: { fontSize: '18px', fontWeight: '800', letterSpacing: '2px' },
        config: {
            content: '请输入标题',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '48px',
            fontWeight: '800',
            color: '#1E293B',
            textAlign: 'center' as const,
            lineHeight: 1.3,
            letterSpacing: '2px',
        },
        /** 元素初始尺寸（虚拟坐标） */
        elementSize: { width: 600, height: 80 },
    },
    {
        id: 'subtitle',
        name: '副标题',
        description: '中等大小的副标题，用于段落引导',
        icon: Heading2,
        previewStyle: { fontSize: '14px', fontWeight: '600', letterSpacing: '1px' },
        config: {
            content: '请输入副标题',
            fontFamily: '"Noto Sans SC", sans-serif',
            fontSize: '28px',
            fontWeight: '600',
            color: '#475569',
            textAlign: 'center' as const,
            lineHeight: 1.5,
            letterSpacing: '1px',
        },
        elementSize: { width: 500, height: 60 },
    },
    {
        id: 'body',
        name: '正文',
        description: '标准正文段落，可自由编辑内容',
        icon: AlignLeft,
        previewStyle: { fontSize: '12px', fontWeight: '400' },
        config: {
            content: '在这里写下你的文字…',
            fontFamily: '"Noto Sans SC", sans-serif',
            fontSize: '16px',
            fontWeight: '400',
            color: '#334155',
            textAlign: 'left' as const,
            lineHeight: 1.8,
            letterSpacing: '0px',
        },
        elementSize: { width: 500, height: 100 },
    },
    {
        id: 'quote',
        name: '引用文字',
        description: '斜体引用样式，适合摘录或心情',
        icon: Quote,
        previewStyle: { fontSize: '12px', fontWeight: '400', fontStyle: 'italic' as const },
        config: {
            content: '"写下你想引用的话…"',
            fontFamily: '"Noto Serif SC", serif',
            fontSize: '18px',
            fontWeight: '400',
            color: '#64748B',
            textAlign: 'center' as const,
            lineHeight: 1.8,
            letterSpacing: '0.5px',
        },
        elementSize: { width: 450, height: 80 },
    },
    {
        id: 'caption',
        name: '图片注释',
        description: '小号文字，适合图片说明或脚注',
        icon: Type,
        previewStyle: { fontSize: '10px', fontWeight: '400', color: '#94A3B8' },
        config: {
            content: '图片说明文字',
            fontFamily: '"Noto Sans SC", sans-serif',
            fontSize: '12px',
            fontWeight: '400',
            color: '#94A3B8',
            textAlign: 'center' as const,
            lineHeight: 1.5,
            letterSpacing: '0px',
        },
        elementSize: { width: 300, height: 40 },
    },
    {
        id: 'handwriting',
        name: '手写风格',
        description: '温暖的手写体，适合私密回忆',
        icon: PenLine,
        previewStyle: { fontSize: '14px', fontWeight: '400', fontFamily: '"Ma Shan Zheng", cursive' },
        config: {
            content: '写下此刻的心情…',
            fontFamily: '"Ma Shan Zheng", cursive',
            fontSize: '24px',
            fontWeight: '400',
            color: '#78716C',
            textAlign: 'left' as const,
            lineHeight: 1.8,
            letterSpacing: '1px',
        },
        elementSize: { width: 400, height: 70 },
    },
] as const;
// #endregion

// #region 组件 Props 接口
interface TextTabProps {
    activePage: Page | null;
    activeChapter: { id: string; title: string; date: string; pages: Page[] } | null;
}
// #endregion

// #region TextTab 组件
/**
 * @description 添加文字面板
 * 提供预设文字样式卡片，点击后向当前页面画布添加对应 TextElement
 */
export const TextTab: React.FC<TextTabProps> = ({ activePage, activeChapter }) => {
    const updatePage = useBookStore(state => state.updatePage);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);
    const currentBook = useBookStore(state => state.currentBook);

    const pageSize = currentBook?.pageSize || 'A4';
    const { virtualWidth, virtualHeight } = getVirtualDimensions(pageSize);

    /**
     * 向当前页面添加一个预设文字元素
     */
    const handleAddTextPreset = useCallback((preset: typeof TEXT_PRESETS[number]) => {
        if (!activePage || !activeChapter) return;

        const elements = activePage.elements || [];
        const maxZIndex = elements.length > 0
            ? Math.max(...elements.map(e => e.zIndex || 10))
            : 0;

        // 将文字框居中放置在页面中央
        const x = Math.round((virtualWidth - preset.elementSize.width) / 2);
        const y = Math.round((virtualHeight - preset.elementSize.height) / 2);

        const newTextElement: TextElement = {
            id: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'text',
            x,
            y,
            width: preset.elementSize.width,
            height: preset.elementSize.height,
            rotate: 0,
            zIndex: maxZIndex + 10,
            textConfig: { ...preset.config },
        };

        updatePage(activeChapter.id, activePage.id, {
            elements: [...elements, newTextElement],
        });

        // 添加后自动选中该文字元素，便于用户立刻编辑
        setActiveTextEdit({
            chapterId: activeChapter.id,
            pageId: activePage.id,
            slotId: newTextElement.id,
        });
    }, [activePage, activeChapter, virtualWidth, virtualHeight, updatePage, setActiveTextEdit]);

    // 未选中页面时的空状态
    if (!activePage) {
        return (
            <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] px-4 leading-relaxed">
                请在左侧选择具体回忆页，以激活文字添加面板。
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* 标题 */}
            <div className="flex items-center gap-2 mb-1">
                <Type size={14} className="text-indigo-600" />
                <span className="text-[11px] font-bold text-slate-700 tracking-wide">文字样式预设</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed -mt-2">
                选择一种文字样式，点击后将自动添加到当前页面画布中央。添加后可在画布中直接拖拽调整位置。
            </p>

            {/* 预设卡片列表 */}
            <div className="flex flex-col gap-2.5">
                {TEXT_PRESETS.map((preset) => {
                    const IconComponent = preset.icon;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleAddTextPreset(preset)}
                            className="group w-full text-left bg-white border border-slate-200/80 rounded-2xl p-3.5 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-50 transition-all duration-200 cursor-pointer active:scale-[0.98]"
                        >
                            <div className="flex items-start gap-3">
                                {/* 图标 */}
                                <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center shrink-0 transition-colors">
                                    <IconComponent size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                </div>
                                {/* 文本信息 */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">
                                            {preset.name}
                                        </span>
                                        <span className="text-[9px] text-slate-300 group-hover:text-indigo-400 font-medium transition-colors">
                                            点击添加
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                                        {preset.description}
                                    </p>
                                    {/* 样式预览 */}
                                    <div
                                        className="mt-2 px-3 py-2 bg-slate-50/80 rounded-lg border border-slate-100 text-slate-600 truncate group-hover:bg-indigo-50/50 group-hover:border-indigo-100 transition-colors"
                                        style={preset.previewStyle as React.CSSProperties}
                                    >
                                        {preset.config.content}
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
// #endregion
