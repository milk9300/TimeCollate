import { useEffect, useState } from 'react';
import { useMarketStore } from '../../../store/useMarketStore';
import { useBookStore } from '../../../store';
import { MainLayout } from '../../common/components/MainLayout';
import { TemplateCard } from '../components/TemplateCard';
import { TemplatePreviewModal } from '../components/TemplatePreviewModal';
import { BookRenderer } from '../../../rendering/BookRenderer';
import { ThemeProvider, BUILTIN_THEMES } from '../../../rendering/ThemeManager';
import {
    LayoutGrid, 
    Palette, 
    Bookmark, 
    BookmarkCheck, 
    Sparkles, 
    User, 
    ArrowLeftRight,
    Loader2,
    X,
    Eye
} from 'lucide-react';

const SAMPLE_PHOTOS = [
    { id: 's-1', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80', caption: '那年夏天，我们去看海' },
    { id: 's-2', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80', caption: '阳光洒落在沙滩上' },
    { id: 's-3', url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&auto=format&fit=crop&q=80', caption: '大自然最温柔的馈赠' },
    { id: 's-4', url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80', caption: '背起行囊，走向远方' },
    { id: 's-5', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&auto=format&fit=crop&q=80', caption: '午后的咖啡馆，听一首歌' },
    { id: 's-6', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80', caption: '享受慵懒的猫咪时光' },
    { id: 's-7', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&auto=format&fit=crop&q=80', caption: '远山如黛，晨雾缭绕' },
    { id: 's-8', url: 'https://images.unsplash.com/photo-1472214222541-d510753a49fa?w=600&auto=format&fit=crop&q=80', caption: '麦田里的守望者' },
    { id: 's-9', url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=600&auto=format&fit=crop&q=80', caption: '微风轻抚着树叶' }
];

/**
 * 模板与主题市场页面
 */
export function Market({ isEmbed = false }: { isEmbed?: boolean }) {
    const { 
        marketTemplates, 
        isLoading: marketLoading, 
        error: marketError, 
        fetchMarketAssets,
        collectTemplate,
        uncollectTemplate
    } = useMarketStore();

    const { 
        templates: userTemplates, 
        loadTemplates 
    } = useBookStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Sandbox Preview States
    const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

    const allTemplates = [
        ...userTemplates,
        ...marketTemplates.filter(mt => !userTemplates.some(ut => ut.id === mt.id))
    ];

    // 初始化加载
    useEffect(() => {
        fetchMarketAssets();
        loadTemplates();
    }, [fetchMarketAssets, loadTemplates]);

    // 检查是否已经订阅
    const isTemplateCollected = (templateId: string) => {
        return userTemplates.some(t => t.id === templateId);
    };

    // 处理模板订阅/取消
    const handleTemplateAction = async (templateId: string, isCollected: boolean) => {
        setActionLoadingId(templateId);
        try {
            if (isCollected) {
                await uncollectTemplate(templateId);
            } else {
                await collectTemplate(templateId);
            }
        } catch (e) {
            console.error(e);
            alert(isCollected ? '取消收藏失败，请重试' : '收藏模板失败，请重试');
        } finally {
            setActionLoadingId(null);
        }
    };

    // 搜索与分类过滤
    // 搜索与分类过滤
    const filteredTemplates = marketTemplates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const content = (
        <>
            <div className="p-8">
            {/* Header */}
            {!isEmbed ? (
                <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <Sparkles className="text-indigo-600 animate-pulse" size={32} />
                            创意市场 & 资产订阅
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            浏览并收藏高品质排版模板，立即在编辑器中实时渲染应用。
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <p className="text-slate-450 text-xs font-semibold">
                        浏览并收藏系统内置的排版布局
                    </p>
                </div>
            )}

            {/* Error Message */}
            {marketError && (
                <div className="max-w-7xl mx-auto mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                    {marketError}
                </div>
            )}

            {/* Loader */}
            {marketLoading && (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="text-indigo-600 animate-spin mb-4" size={36} />
                    <p className="text-gray-400 text-xs font-medium">正在拉取创意市场资产，请稍候...</p>
                </div>
            )}

            {/* Main Area */}
            {!marketLoading && (
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start select-none">
                    {/* Left Column (2/3): Grid Area */}
                    <div className="flex-1 w-full order-2 lg:order-1">
                        {filteredTemplates.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[28px] border border-dashed border-gray-200">
                                <LayoutGrid size={48} className="mx-auto text-gray-300 mb-4" />
                                <p className="text-gray-400 text-sm font-medium">没有找到匹配的排版模板</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredTemplates.map(template => {
                                    const collected = isTemplateCollected(template.id);
                                    const isLoading = actionLoadingId === template.id;
                                    const isSystem = template.creatorId === 'system';

                                    return (
                                        <TemplateCard
                                            key={template.id}
                                            template={template}
                                            onPreview={(t) => setPreviewTemplate(t)}
                                            isCollected={collected}
                                            isSystem={isSystem}
                                            onCollectToggle={handleTemplateAction}
                                            isActionLoading={isLoading}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right Column (1/3): Market Hub */}
                    <div className="w-full lg:w-80 lg:sticky lg:top-8 shrink-0 flex flex-col gap-5 order-1 lg:order-2">
                        {/* Card 1: My Asset Briefing */}
                        <div className="bg-[#FAF7EE] border border-[#E8DFD0] p-5.5 rounded-[28px] shadow-[4px_6px_20px_rgba(80,70,50,0.06),inset_-1px_-1px_0px_rgba(255,255,255,0.4)] flex flex-col gap-4">
                            <div className="pb-2.5 border-b border-[#EADFC9]/60 flex flex-col">
                                <h3 className="text-xs font-bold text-[#5C4033] tracking-wider font-serif">我的资产简报</h3>
                            </div>
                            <div className="flex flex-col gap-3">
                                {/* Templates count */}
                                <div className="bg-[#FCFBF8] border border-[#EDE5D3] p-4 rounded-2xl shadow-[1px_2px_6px_rgba(80,70,50,0.03)] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50/80 text-indigo-650 flex items-center justify-center border border-indigo-100/30">
                                            <LayoutGrid size={16} />
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold text-[#A69B85] uppercase tracking-wider">已集成/收藏模板</span>
                                            <span className="block text-sm font-bold text-[#5C4033] mt-0.5">{userTemplates.length} 个</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Quick Style Filter */}
                        <div className="bg-white border border-slate-200/60 p-5.5 rounded-[28px] shadow-sm flex flex-col gap-4">
                            <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase select-none">风格快速筛选</h3>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'all', name: '全部风格' },
                                    { id: 'general', name: '通用' },
                                    { id: 'minimalist', name: '极简' },
                                    { id: 'retro', name: '复古' },
                                    { id: 'travel', name: '旅行' },
                                    { id: 'journal', name: '手帐' },
                                    { id: 'family', name: '家庭' }
                                ].map(tag => (
                                    <button
                                        key={tag.id}
                                        onClick={() => setSelectedCategory(tag.id)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                                            selectedCategory === tag.id
                                                ? 'bg-indigo-600 text-white border-transparent shadow-sm shadow-indigo-605/10 scale-105'
                                                : 'bg-slate-50 text-slate-655 border-slate-100/50 hover:bg-slate-100 hover:text-slate-800'
                                        }`}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Card 3: Leaderboard */}
                        <div className="bg-white border border-slate-200/60 p-5.5 rounded-[28px] shadow-sm flex flex-col gap-4">
                            <div className="flex justify-between items-center select-none">
                                <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase">本周飙升榜 (Trending)</h3>
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md">Top 5</span>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                {[
                                    { name: '宽荧幕电影感', count: '34.5k次套用' },
                                    { name: '艺术拼贴', count: '28.2k次套用' },
                                    { name: '自定义排版 (3图2文)', count: '21.0k次套用' },
                                    { name: '章节主页', count: '18.4k次套用' },
                                    { name: '简约日常', count: '12.1k次套用' }
                                ].map((item, idx) => {
                                    const matched = allTemplates.find(t => t.name === item.name) || marketTemplates.find(t => t.name === item.name);
                                    return (
                                        <div
                                            key={item.name}
                                            onClick={() => matched && setPreviewTemplate(matched)}
                                            className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                                                matched 
                                                    ? 'hover:bg-slate-50 cursor-pointer group/row' 
                                                    : 'opacity-70 cursor-not-allowed'
                                            }`}
                                        >
                                            <div className="flex items-center">
                                                <span className={`text-base font-light mr-3.5 w-5 text-center ${
                                                    idx === 0 ? 'text-indigo-600 font-bold' : 'text-slate-350'
                                                }`}>
                                                    0{idx + 1}
                                                </span>
                                                <div>
                                                    <span className="block text-xs font-bold text-slate-750 group-hover/row:text-indigo-600 transition-colors">
                                                        {item.name}
                                                    </span>
                                                    <span className="block text-[9px] text-slate-400 font-semibold mt-0.5">
                                                        {item.count}
                                                    </span>
                                                </div>
                                            </div>
                                            {matched && (
                                                <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 opacity-0 group-hover/row:opacity-100 flex items-center justify-center transition-all">
                                                    <Eye size={12} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* ================== TEMPLATE PREVIEW MODAL ================== */}
            {previewTemplate && (() => {
                const collected = isTemplateCollected(previewTemplate.id);
                const isLoading = actionLoadingId === previewTemplate.id;
                const isSystem = previewTemplate.creatorId === 'system';

                return (
                    <TemplatePreviewModal
                        template={previewTemplate}
                        onClose={() => setPreviewTemplate(null)}
                        themes={BUILTIN_THEMES}
                        actionButton={
                            isSystem ? (
                                <button
                                    disabled
                                    className="w-full py-3 rounded-xl text-xs font-bold border bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed flex items-center justify-center gap-1.5 uppercase font-bold"
                                >
                                    <BookmarkCheck size={14} />
                                    <span>系统内置 (默认可用)</span>
                                </button>
                            ) : (
                                <button
                                    onClick={async () => {
                                        await handleTemplateAction(previewTemplate.id, collected);
                                        setPreviewTemplate(null);
                                    }}
                                    disabled={isLoading}
                                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer uppercase ${
                                        collected
                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700 border border-emerald-200'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                                >
                                    {isLoading ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : collected ? (
                                        <>
                                            <BookmarkCheck size={14} />
                                            <span>取消收藏此模板</span>
                                        </>
                                    ) : (
                                        <>
                                            <Bookmark size={14} />
                                            <span>收藏排版模板</span>
                                        </>
                                    )}
                                </button>
                            )
                        }
                    />
                );
            })()}


        </>
    );

    if (isEmbed) return content;
    return (
        <MainLayout title="创意市场" onSearch={setSearchQuery}>
            {content}
        </MainLayout>
    );
}
