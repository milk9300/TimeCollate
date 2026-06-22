import { useEffect, useState } from 'react';
import { useMarketStore } from '../../../store/useMarketStore';
import { useBookStore } from '../../../store';
import { MainLayout } from '../../common/components/MainLayout';
import { TemplateCard } from '../components/TemplateCard';
import { TemplatePreviewModal } from '../components/TemplatePreviewModal';
import { BookRenderer } from '../../../rendering/BookRenderer';
import { ThemeProvider } from '../../../rendering/ThemeManager';
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
        marketThemes, 
        isLoading: marketLoading, 
        error: marketError, 
        fetchMarketAssets,
        collectTemplate,
        uncollectTemplate,
        collectTheme,
        uncollectTheme
    } = useMarketStore();

    const { 
        templates: userTemplates, 
        themes: userThemes, 
        loadTemplates, 
        loadThemes 
    } = useBookStore();

    const [activeTab, setActiveTab] = useState<'templates' | 'themes'>('templates');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Sandbox Preview States
    const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
    const [previewTheme, setPreviewTheme] = useState<any | null>(null);
    const [selectedTemplateIdForThemePreview, setSelectedTemplateIdForThemePreview] = useState<string>('collage');

    // Merge User and Market Lists for Full Swapping inside the Sandbox
    const allThemes = [
        ...userThemes,
        ...marketThemes.filter(mt => !userThemes.some(ut => ut.id === mt.id))
    ];

    const allTemplates = [
        ...userTemplates,
        ...marketTemplates.filter(mt => !userTemplates.some(ut => ut.id === mt.id))
    ];

    // 初始化加载
    useEffect(() => {
        fetchMarketAssets();
        loadTemplates();
        loadThemes();
    }, [fetchMarketAssets, loadTemplates, loadThemes]);

    // 检查是否已经订阅
    const isTemplateCollected = (templateId: string) => {
        return userTemplates.some(t => t.id === templateId);
    };

    const isThemeCollected = (themeId: string) => {
        return userThemes.some(t => t.id === themeId);
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

    // 处理主题订阅/取消
    const handleThemeAction = async (themeId: string, isCollected: boolean) => {
        setActionLoadingId(themeId);
        try {
            if (isCollected) {
                await uncollectTheme(themeId);
            } else {
                await collectTheme(themeId);
            }
        } catch (e) {
            console.error(e);
            alert(isCollected ? '取消收藏主题失败，请重试' : '收藏主题失败，请重试');
        } finally {
            setActionLoadingId(null);
        }
    };

    // 搜索与分类过滤
    const filteredTemplates = marketTemplates.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const filteredThemes = marketThemes.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.themeSchema?.fontFamily?.toLowerCase().includes(searchQuery.toLowerCase());
            
        let matchesCategory = true;
        if (selectedCategory !== 'all') {
            const name = t.name;
            if (selectedCategory === 'warm') {
                matchesCategory = name.includes('奶油') || name.includes('粉') || name.includes('秋') || name.includes('暖');
            } else if (selectedCategory === 'cool') {
                matchesCategory = name.includes('极夜') || name.includes('冷') || name.includes('深邃') || name.includes('蓝');
            } else if (selectedCategory === 'neutral') {
                matchesCategory = name.includes('黑白') || name.includes('素雅') || name.includes('简约');
            } else if (selectedCategory === 'morandi') {
                matchesCategory = name.includes('莫兰迪') || name.includes('粉') || name.includes('绿');
            }
        }
        return matchesSearch && matchesCategory;
    });

    const handleLeaderboardThemeClick = (theme: any) => {
        setPreviewTheme(theme);
        setSelectedTemplateIdForThemePreview('collage');
    };

    const tabContent = (
        <div className="relative bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/50 w-56 sm:w-60">
            <div 
                className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm transition-all duration-300 ease-out"
                style={{
                    left: activeTab === 'templates' ? '4.5px' : 'calc(50% + 2.5px)',
                    width: 'calc(50% - 7px)'
                }}
            />
            <button
                onClick={() => { setActiveTab('templates'); setSearchQuery(''); setSelectedCategory('all'); }}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    activeTab === 'templates'
                        ? 'text-indigo-650'
                        : 'text-slate-500 hover:text-slate-805'
                }`}
            >
                <LayoutGrid size={14} />
                排版模板
            </button>
            <button
                onClick={() => { setActiveTab('themes'); setSearchQuery(''); setSelectedCategory('all'); }}
                className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    activeTab === 'themes'
                        ? 'text-indigo-650'
                        : 'text-slate-500 hover:text-slate-805'
                }`}
            >
                <Palette size={14} />
                视觉主题
            </button>
        </div>
    );

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
                            浏览并收藏高品质排版模板与视觉主题，立即在编辑器中实时渲染应用。
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        {tabContent}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <p className="text-slate-450 text-xs font-semibold">
                        浏览并收藏系统内置的排版布局与视觉主题配色
                    </p>
                    {tabContent}
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
                        {activeTab === 'templates' ? (
                            /* ================== TEMPLATE GRID ================== */
                            filteredTemplates.length === 0 ? (
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
                            )
                        ) : (
                            /* ================== THEME GRID ================== */
                            filteredThemes.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-[28px] border border-dashed border-gray-200">
                                    <Palette size={48} className="mx-auto text-gray-300 mb-4" />
                                    <p className="text-gray-400 text-sm font-medium">没有找到匹配的视觉主题</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {filteredThemes.map(theme => {
                                        const collected = isThemeCollected(theme.id);
                                        const isLoading = actionLoadingId === theme.id;
                                        const schema = theme.themeSchema;
                                        const isSystem = theme.creatorId === 'system';

                                        return (
                                            <div
                                                key={theme.id}
                                                className="bg-white rounded-[28px] border border-gray-200/80 shadow-sm overflow-hidden flex flex-col hover:shadow-[0_16px_36px_-6px_rgba(79,70,229,0.08)] hover:border-gray-300 hover:-translate-y-1 transition-all duration-300 group"
                                            >
                                                {/* Preview Canvas */}
                                                <div 
                                                    style={{ background: schema.backgroundColor }} 
                                                    className="h-40 border-b border-gray-100 p-4 flex items-center justify-center relative overflow-hidden group/canvas cursor-pointer select-none"
                                                    onClick={() => {
                                                        setPreviewTheme(theme);
                                                        setSelectedTemplateIdForThemePreview('collage');
                                                    }}
                                                >
                                                    {/* Hover Overlay */}
                                                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover/canvas:opacity-100 transition-opacity flex items-center justify-center z-10">
                                                        <button className="px-4 py-2 bg-white text-gray-900 rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-1.5 cursor-pointer">
                                                            <Sparkles size={12} className="text-indigo-600 animate-pulse" />
                                                            <span>实时效果预览</span>
                                                        </button>
                                                    </div>
                                                    {/* Mini rendering simulating theme font, title weight, primary and accent colors */}
                                                    <div 
                                                        style={{ 
                                                            borderColor: schema.borderColor,
                                                            background: schema.backgroundGradient || schema.backgroundColor
                                                        }}
                                                        className="w-48 h-32 border-2 rounded-lg p-2.5 flex flex-col justify-between shadow-sm relative group-hover:scale-[1.02] duration-300"
                                                    >
                                                        {/* Fake decorations */}
                                                        <div 
                                                            style={{ background: schema.accentColor }} 
                                                            className="absolute top-2 right-2 w-2 h-2 rounded-full opacity-60" 
                                                        />
                                                        
                                                        <div>
                                                            <h4 
                                                                style={{ 
                                                                    color: schema.primaryColor,
                                                                    fontFamily: schema.fontFamily,
                                                                    fontWeight: schema.titleStyle?.fontWeight || 'bold'
                                                                }} 
                                                                className="text-[10px] font-bold leading-tight"
                                                            >
                                                                时光集预览
                                                            </h4>
                                                            <div 
                                                                style={{ background: schema.secondaryColor }} 
                                                                className="w-10 h-0.5 mt-0.5 opacity-70" 
                                                            />
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div style={{ background: schema.primaryColor }} className="w-full h-0.5 rounded opacity-30" />
                                                            <div style={{ background: schema.primaryColor }} className="w-5/6 h-0.5 rounded opacity-30" />
                                                        </div>

                                                        <div className="flex justify-between items-center text-[7px] opacity-60">
                                                            <span style={{ color: schema.primaryColor }}>TIME COLLATE</span>
                                                            <span style={{ color: schema.accentColor }}>★ PREVIEW</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card Info */}
                                                <div className="p-5 flex-1 flex flex-col justify-between">
                                                    <div>
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <h3 className="font-bold text-gray-900 text-sm group-hover:text-indigo-600 transition-colors">
                                                                {theme.name}
                                                            </h3>
                                                            <span className="text-[9px] font-bold text-gray-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 select-none">
                                                                <ArrowLeftRight size={10} />
                                                                主题配色
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Color Palettes Dot Visualizer */}
                                                        <div className="flex items-center gap-1.5 my-3 bg-slate-50 border border-slate-100 p-1.5 px-3 rounded-full w-fit select-none">
                                                            <span className="text-[10px] text-slate-400 font-bold mr-1">配色:</span>
                                                            <div style={{ background: schema.primaryColor }} className="w-4 h-4 rounded-full border-2 border-white shadow-sm hover:scale-125 transition-transform cursor-help" title="主色 (Primary)" />
                                                            <div style={{ background: schema.secondaryColor }} className="w-4 h-4 rounded-full border-2 border-white shadow-sm hover:scale-125 transition-transform cursor-help" title="次色 (Secondary)" />
                                                            <div style={{ background: schema.accentColor }} className="w-4 h-4 rounded-full border-2 border-white shadow-sm hover:scale-125 transition-transform cursor-help" title="强调色 (Accent)" />
                                                            <div style={{ background: schema.backgroundColor }} className="w-4 h-4 rounded-full border-2 border-gray-200 shadow-sm hover:scale-125 transition-transform cursor-help" title="背景色 (Background)" />
                                                        </div>

                                                        {theme.creatorId !== 'system' ? (
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4 select-none">
                                                                <User size={12} />
                                                                <span>创作者: 用户 {theme.creatorId.substring(0, 6)}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="h-6" />
                                                        )}
                                                    </div>

                                                    {/* Actions */}
                                                    {isSystem ? (
                                                        <div className="flex items-center justify-center gap-1 w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-50/50 border border-emerald-100/30 text-emerald-700 select-none">
                                                            <span>✓</span> 已集成系统默认
                                                        </div>
                                                    ) : (
                                                        <button
                                                            disabled={isLoading}
                                                            onClick={() => handleThemeAction(theme.id, collected)}
                                                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                                                                collected
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 group/btn'
                                                                    : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 shadow-sm'
                                                            }`}
                                                        >
                                                            {isLoading ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : collected ? (
                                                                <>
                                                                    <BookmarkCheck size={14} className="group-hover/btn:hidden" />
                                                                    <span className="group-hover/btn:hidden">已收藏 (已加入主题库)</span>
                                                                    <Bookmark size={14} className="hidden group-hover/btn:inline" />
                                                                    <span className="hidden group-hover/btn:inline">取消收藏</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Bookmark size={14} />
                                                                    一键收藏主题
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
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
                                {/* Themes count */}
                                <div className="bg-[#FCFBF8] border border-[#EDE5D3] p-4 rounded-2xl shadow-[1px_2px_6px_rgba(80,70,50,0.03)] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-pink-50/80 text-pink-600 flex items-center justify-center border border-pink-100/30">
                                            <Palette size={16} />
                                        </div>
                                        <div>
                                            <span className="block text-[10px] font-bold text-[#A69B85] uppercase tracking-wider">已订阅/收藏主题</span>
                                            <span className="block text-sm font-bold text-[#5C4033] mt-0.5">{userThemes.length} 个</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Quick Style Filter */}
                        <div className="bg-white border border-slate-200/60 p-5.5 rounded-[28px] shadow-sm flex flex-col gap-4">
                            <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase select-none">风格快速筛选</h3>
                            <div className="flex flex-wrap gap-2">
                                {activeTab === 'templates' ? (
                                    <>
                                        {/* Template tags */}
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
                                    </>
                                ) : (
                                    <>
                                        {/* Theme tags */}
                                        {[
                                            { id: 'all', name: '全部色系' },
                                            { id: 'warm', name: '暖色调' },
                                            { id: 'cool', name: '冷色调' },
                                            { id: 'neutral', name: '经典黑白' },
                                            { id: 'morandi', name: '莫兰迪色' }
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
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Card 3: Leaderboard */}
                        <div className="bg-white border border-slate-200/60 p-5.5 rounded-[28px] shadow-sm flex flex-col gap-4">
                            <div className="flex justify-between items-center select-none">
                                <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase">本周飙升榜 (Trending)</h3>
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md">Top 5</span>
                            </div>
                            
                            <div className="flex flex-col gap-1">
                                {activeTab === 'templates' ? (
                                    [
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
                                    })
                                ) : (
                                    [
                                        { name: '经典黑白', count: '19.8k次订阅' },
                                        { name: '奶油温存', count: '15.2k次订阅' },
                                        { name: '深邃极夜', count: '11.0k次订阅' },
                                        { name: '莫兰迪粉', count: '8.9k次订阅' },
                                        { name: '复古报纸', count: '7.5k次订阅' }
                                    ].map((item, idx) => {
                                        const matched = allThemes.find(t => t.name === item.name) || marketThemes.find(t => t.name === item.name);
                                        return (
                                            <div
                                                key={item.name}
                                                onClick={() => matched && handleLeaderboardThemeClick(matched)}
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
                                                        <span className="block text-xs font-bold text-slate-755 group-hover/row:text-indigo-600 transition-colors">
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
                                    })
                                )}
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
                        themes={allThemes}
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

            {/* ================== THEME PREVIEW MODAL ================== */}
            {previewTheme && (() => {
                const currentTemplate = allTemplates.find(t => t.id === selectedTemplateIdForThemePreview) || allTemplates[0];
                const themeSchema = previewTheme.themeSchema || {
                    backgroundColor: '#FFFFFF',
                    primaryColor: '#1A1A1A',
                    secondaryColor: '#4B5563',
                    accentColor: '#6366F1',
                    fontFamily: 'sans'
                };
                
                // Construct mock content JSON string containing active theme
                const mockContent = JSON.stringify({
                    slots: {
                        'page-content': { 
                            content: '这是由时光集排版系统渲染的动态内容区域。通过这套高保真沙盒，你可以任意调整下方的视觉主题，观察该排版在不同配色与字体下的真实表现。' 
                        },
                        'slot-1': { content: '时光斑驳' },
                        'slot-2': { content: '岁月静好' },
                        'slot-3': { content: '一期一会' }
                    },
                    atmosphere: themeSchema.atmosphere || 'default',
                    fontFamily: themeSchema.fontFamily || 'sans'
                });

                const mockPhotos = SAMPLE_PHOTOS.slice(0, currentTemplate?.photoCount || 4).map((p, idx) => ({
                    id: `mock-photo-${idx}`,
                    url: p.url,
                    caption: p.caption,
                    scale: 1.0,
                    xOffset: 50,
                    yOffset: 50,
                    styleType: 'normal' as const,
                    filterType: 'none'
                })) as any[];

                const mockPage = {
                    id: 'mock-preview-page-theme',
                    layout: currentTemplate?.id || 'collage',
                    content: mockContent,
                    photos: mockPhotos
                };

                return (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl border border-gray-100 max-h-[90vh]">
                            {/* Left Page Render Area */}
                            <div className="flex-1 bg-slate-50 border-r border-gray-100 flex flex-col items-center justify-center p-6 min-h-[400px] md:min-h-[550px] relative overflow-hidden select-none">
                                <span className="absolute top-4 left-4 text-[10px] font-bold text-gray-400 bg-gray-200/50 px-2 py-0.5 rounded-full flex items-center gap-1 z-20">
                                    <Eye size={10} />
                                    <span>真实视觉主题渲染效果</span>
                                </span>
                                
                                {/* 固定尺寸包裹层：手动计算缩放后的视觉尺寸，让容器精确匹配 */}
                                <div className="relative" style={{ width: '340px', height: '480px' }}>
                                    <div 
                                        className="absolute top-1/2 left-1/2"
                                        style={{ 
                                            transform: 'translate(-50%, -50%) scale(0.43)',
                                            transformOrigin: 'center center'
                                        }}
                                    >
                                        <ThemeProvider theme={previewTheme.id}>
                                            <BookRenderer
                                                page={mockPage}
                                                pageSize="A4"
                                                chapterTitle="回忆的旅途"
                                                chapterDate="2026.05"
                                                readOnly={true}
                                            />
                                        </ThemeProvider>
                                    </div>
                                </div>
                            </div>

                            {/* Right Settings Control Panel */}
                            <div className="w-full md:w-80 p-6 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{previewTheme.name}</h3>
                                            <p className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block mt-1 font-semibold">
                                                视觉主题 · 配色与字体
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setPreviewTheme(null)}
                                            className="p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                                        >
                                            <X size={18} className="text-gray-400" />
                                        </button>
                                    </div>

                                    <div className="border-t border-gray-100 pt-4 my-4">
                                        <label className="text-xs font-bold text-gray-400 block mb-2">在不同排版模板下测试主题:</label>
                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                            {allTemplates.map(template => (
                                                <button
                                                    key={template.id}
                                                    onClick={() => setSelectedTemplateIdForThemePreview(template.id)}
                                                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                                                        selectedTemplateIdForThemePreview === template.id
                                                            ? 'border-indigo-600 bg-indigo-50/20 text-indigo-950 font-bold'
                                                            : 'border-gray-100 hover:border-gray-200 text-gray-700 bg-white'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <LayoutGrid size={14} className="text-gray-400 flex-shrink-0" />
                                                        <span className="text-xs truncate">{template.name}</span>
                                                    </div>
                                                    <span className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {template.photoCount}图
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Color Swatch Dot List */}
                                    <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
                                        <span className="text-xs font-bold text-gray-400">配色方案:</span>
                                        <div className="flex gap-1.5">
                                            <div style={{ background: themeSchema.primaryColor }} className="w-4 h-4 rounded-full border border-white shadow-sm" title="主色" />
                                            <div style={{ background: themeSchema.secondaryColor }} className="w-4 h-4 rounded-full border border-white shadow-sm" title="次色" />
                                            <div style={{ background: themeSchema.accentColor }} className="w-4 h-4 rounded-full border border-white shadow-sm" title="强调色" />
                                            <div style={{ background: themeSchema.backgroundColor }} className="w-4 h-4 rounded-full border border-gray-200 shadow-sm" title="背景" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6">
                                    {previewTheme.creatorId === 'system' ? (
                                        <button
                                            disabled
                                            className="w-full py-3 rounded-xl text-xs font-bold border bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed flex items-center justify-center gap-1.5"
                                        >
                                            <BookmarkCheck size={14} />
                                            <span>系统内置 (默认可用)</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                const collected = isThemeCollected(previewTheme.id);
                                                handleThemeAction(previewTheme.id, collected);
                                                setPreviewTheme(null);
                                            }}
                                            disabled={actionLoadingId === previewTheme.id}
                                            className={`w-full py-3 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                                                isThemeCollected(previewTheme.id)
                                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-700 border border-emerald-200'
                                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            }`}
                                        >
                                            {actionLoadingId === previewTheme.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : isThemeCollected(previewTheme.id) ? (
                                                <>
                                                    <BookmarkCheck size={14} />
                                                    <span>取消收藏此主题</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Bookmark size={14} />
                                                    <span>收藏视觉主题</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
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
