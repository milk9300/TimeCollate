import React, { useState, useEffect, useMemo } from 'react';
import { useBookStore } from '../../../../store';
import { useMarketStore } from '../../../../store/useMarketStore';

const CATEGORY_NAMES: Record<string, string> = {
    general: '通用',
    travel: '旅行',
    journal: '手帐',
    family: '家庭',
    minimalist: '极简',
    retro: '复古',
    classic: '经典',
    magazine: '杂志',
    warm: '温馨',
    modern: '现代'
};

const TEMPLATE_TYPES = [
    { id: 'all', name: '全部' },
    { id: 'content', name: '内容页' },
    { id: 'cover', name: '书封' },
    { id: 'structural', name: '过渡页' }
];

interface TemplatesTabProps {
    activePage: any;
    activeChapter: any;
    activeChapterId: string | null;
}

export const TemplatesTab: React.FC<TemplatesTabProps> = ({
    activePage,
    activeChapter,
    activeChapterId
}) => {
    const templates = useBookStore((state: any) => state.templates);
    const updatePage = useBookStore((state: any) => state.updatePage);
    const editorScope = useBookStore((state: any) => state.editorScope);
    const isEditingCover = editorScope === 'cover';
    const marketTemplates = useMarketStore((state: any) => state.marketTemplates);

    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

    // 自动筛选封面模板
    useEffect(() => {
        if (isEditingCover) {
            setSelectedTypeFilter('cover');
        } else {
            setSelectedTypeFilter('all');
        }
    }, [isEditingCover]);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        templates.forEach((t: any) => {
            if (t.category) cats.add(t.category);
        });
        return Array.from(cats);
    }, [templates]);

    const filteredTemplates = useMemo(() => {
        return templates.filter((t: any) => {
            const tType = t.templateType || 'content';
            const matchesCategory = selectedCategoryFilter === 'all' || t.category === selectedCategoryFilter;
            const matchesType = selectedTypeFilter === 'all' || tType === selectedTypeFilter;
            return matchesCategory && matchesType;
        });
    }, [templates, selectedCategoryFilter, selectedTypeFilter]);

    const renderLayoutBlueprintSvg = (tpl: any) => {
        const elements = tpl?.layoutSchema?.elements || [];
        return (
            <svg className="w-14 h-20 border border-gray-200 rounded-lg bg-white text-indigo-500/80 p-1 transition-transform group-hover:scale-105 shadow-sm" viewBox="0 0 100 141.4">
                <rect x="0" y="0" width="100" height="141.4" fill="#FFFFFF" rx="2" />
                {elements.map((el: any) => {
                    const left = parseFloat(el.style.left) || 0;
                    const top = (parseFloat(el.style.top) || 0) * 1.414;
                    const width = parseFloat(el.style.width) || 0;
                    const height = (parseFloat(el.style.height) || 0) * 1.414;

                    if (el.type === 'photo') {
                        return (
                            <rect
                                key={el.id}
                                x={left}
                                y={top}
                                width={width}
                                height={height}
                                rx="2"
                                fill="currentColor"
                                fillOpacity="0.15"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinejoin="round"
                            />
                        );
                    }
                    if (el.type === 'text') {
                        return (
                            <rect
                                key={el.id}
                                x={left}
                                y={top}
                                width={width}
                                height={height}
                                rx="1"
                                fill="currentColor"
                                fillOpacity="0.05"
                                stroke="currentColor"
                                strokeWidth="0.6"
                                strokeDasharray="1.5 1.5"
                                strokeLinejoin="round"
                            />
                        );
                    }
                    return null;
                })}
            </svg>
        );
    };

    return (
        <div className="space-y-5">
            {activePage ? (
                /* --- 统一网格排版模板视图 --- */
                <>
                    {/* 页面网格布局 */}
                    <div className="space-y-2">
                        <div className="text-[10px] text-gray-450 font-bold uppercase tracking-wider">
                            {/* 结构与分类筛选栏 */}
                            <div className="space-y-3 mb-4 text-left">
                                {/* 结构类型 */}
                                <div className="space-y-1">
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                                        结构布局 (Structure)
                                    </div>
                                    <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                                        {TEMPLATE_TYPES.map(t => {
                                            const isActive = selectedTypeFilter === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setSelectedTypeFilter(t.id)}
                                                    className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                                        isActive
                                                            ? 'bg-indigo-650 text-white shadow-sm font-black'
                                                            : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-700'
                                                    }`}
                                                >
                                                    {t.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 主题分类 */}
                                <div className="space-y-1">
                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                                        回忆主题 (Category)
                                    </div>
                                    <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedCategoryFilter('all')}
                                            className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                                selectedCategoryFilter === 'all'
                                                    ? 'bg-indigo-650 text-white shadow-sm font-black'
                                                    : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-700'
                                            }`}
                                        >
                                            全部
                                        </button>
                                        {categories.map(cat => {
                                            const isActive = selectedCategoryFilter === cat;
                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setSelectedCategoryFilter(cat)}
                                                    className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                                        isActive
                                                            ? 'bg-indigo-650 text-white shadow-sm font-black'
                                                            : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-700'
                                                    }`}
                                                >
                                                    {CATEGORY_NAMES[cat] || cat}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            应用网格排版模板 ({filteredTemplates.length})
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {filteredTemplates.length > 0 ? (
                                filteredTemplates.map((t: any) => {
                                    const isSelected = activePage.templateId === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            onClick={() => updatePage(activeChapter?.id || activeChapterId!, activePage.id, { templateId: t.id })}
                                            className={`p-3 rounded-2xl border flex flex-col items-center gap-2.5 transition-all group cursor-pointer ${
                                                isSelected
                                                    ? 'border-indigo-650 bg-indigo-50/20 shadow-sm'
                                                    : 'border-gray-250/50 bg-white hover:border-gray-350 hover:bg-slate-50/50'
                                            }`}
                                        >
                                            {/* SVG Blueprint */}
                                            <div className="w-full flex justify-center">
                                                {renderLayoutBlueprintSvg(t)}
                                            </div>

                                            {/* Text detail */}
                                            <div className="text-center w-full min-w-0">
                                                <p className={`text-[10px] font-bold truncate leading-tight ${
                                                    isSelected ? 'text-indigo-950 font-black' : 'text-gray-700'
                                                }`}>
                                                    {t.name}
                                                </p>
                                                <span className="text-[8px] text-gray-400 block mt-0.5 font-bold font-mono">
                                                    {t.photoCount} 张照片
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 text-center py-10 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400 text-[10px] px-4 select-none leading-relaxed">
                                    该筛选条件下暂无排版模板
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] px-4 leading-relaxed">
                    请在左侧选择具体的回忆页，以开始配置单页排版及氛围模板。
                </div>
            )}
        </div>
    );
};
