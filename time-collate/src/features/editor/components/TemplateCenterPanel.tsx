import React, { useState, useEffect, useMemo } from 'react';
import { useBookStore } from '../../../store';
import { useMarketStore } from '../../../store/useMarketStore';
import { getBookService } from '../../../services/serviceFactory';
import {
    Sparkles,
    BookOpen,
    Layers,
    FolderOpen,
    Plus,
    Check,
    Search,
    ChevronRight,
    Tag,
    Globe,
    Lock,
    Eye,
    PlusCircle,
    Copy,
    ArrowDownToLine,
    Info
} from 'lucide-react';
import type { Template, TemplateCollection, Book } from '../../../types';
import { captureCoverToBlob, uploadTemplateThumbnail, getResizeImageUrl } from '../../../utils/coverCaptureHelper';

const bookService = getBookService();

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

interface TemplateCenterPanelProps {
    activePage: any;
    activeChapter: any;
    activeChapterId: string | null;
}

export const TemplateCenterPanel: React.FC<TemplateCenterPanelProps> = ({
    activePage,
    activeChapter,
    activeChapterId
}) => {
    // 侧边栏活动 Tab：整书模板 | 页面模板 | 模板集合
    const [activeTab, setActiveTab] = useState<'book' | 'page' | 'collection'>('page');

    const currentBook = useBookStore((state: any) => state.currentBook);
    const loadBook = useBookStore((state: any) => state.loadBook);
    const templates = useBookStore((state: any) => state.templates);
    const updatePage = useBookStore((state: any) => state.updatePage);
    const loadTemplates = useBookStore((state: any) => state.loadTemplates);
    const addPage = useBookStore((state: any) => state.addPage);

    // 市场及网络资源状态
    const [bookTemplates, setBookTemplates] = useState<Book[]>([]);
    const [collections, setCollections] = useState<TemplateCollection[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<(TemplateCollection & { items: any[] }) | null>(null);
    const [isApplyingCollection, setIsApplyingCollection] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 页面模板筛选与分类
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // 页面模板大图预览详情弹窗状态
    const [selectedPreviewTemplate, setSelectedPreviewTemplate] = useState<Template | null>(null);

    // 发布模板的弹窗状态
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [publishName, setPublishName] = useState('');
    const [publishCategory, setPublishCategory] = useState('general');
    const [publishTags, setPublishTags] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    // 检查并读取当前页面之前已发布过的模板数据
    const existingTemplate = useMemo(() => {
        if (!activePage) return null;
        return templates.find((t: any) => t.templateOriginType === 'PAGE' && t.templateOriginId === activePage.id) || null;
    }, [templates, activePage?.id]);

    const isAlreadyPublished = !!existingTemplate;

    // 当模态弹窗打开时，如果已发布过模板，自动反显回填其原本数据；否则重置为空白表单
    useEffect(() => {
        if (showPublishModal) {
            if (existingTemplate) {
                setPublishName(existingTemplate.name || '');
                setPublishCategory(existingTemplate.category || 'general');
                setPublishTags(existingTemplate.tags ? existingTemplate.tags.join(', ') : '');
            } else {
                setPublishName('');
                setPublishCategory('general');
                setPublishTags('');
            }
        }
    }, [showPublishModal, existingTemplate]);

    // 挂载时加载可用列表
    useEffect(() => {
        if (activeTab === 'book') {
            loadBookTemplates();
        } else if (activeTab === 'collection') {
            loadCollections();
        }
    }, [activeTab]);

    const loadBookTemplates = async () => {
        setIsLoading(true);
        try {
            // 获取可用的整书模板 (个人拥有及公开)
            const res = await bookService.getBookTemplates(1, 100);
            setBookTemplates(res.items || []);
        } catch (e) {
            console.error('Failed to load book templates:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCollections = async () => {
        setIsLoading(true);
        try {
            const list = await bookService.getTemplateCollections(false);
            setCollections(list || []);
        } catch (e) {
            console.error('Failed to load collections:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCollection = async (col: TemplateCollection) => {
        setIsLoading(true);
        try {
            const detail = await bookService.getTemplateCollection(col.id);
            setSelectedCollection(detail);
        } catch (e) {
            console.error('Failed to load collection details:', e);
        } finally {
            setIsLoading(false);
        }
    };

    // 套用整书模板
    const handleApplyBookTemplate = async (bt: Book) => {
        if (!window.confirm(`确定要套用整书模板《${bt.title}》创建一本新书吗？这会离开当前编辑器。`)) return;
        try {
            const newBookId = await bookService.applyTemplate(bt.id, `套用-${bt.title}`);
            window.location.href = `/editor/${newBookId}`;
        } catch (e: any) {
            alert(`套用模板失败: ${e.message}`);
        }
    };

    // 应用单页模板至当前页
    const handleApplyPageTemplate = async (tpl: Template) => {
        if (!activePage) return;
        try {
            // 深拷贝 layoutSchema elements
            let clonedElements = [];
            if (tpl.layoutSchema && Array.isArray(tpl.layoutSchema.elements)) {
                // 物理拷贝：为了隔离实例 UUID 冲突，重新生成自由组件实例的 UUID (在前端应用时)
                const idMapping = new Map<string, string>();
                clonedElements = tpl.layoutSchema.elements.map((el: any) => {
                    const cloneEl = JSON.parse(JSON.stringify(el));
                    const newElId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    idMapping.set(el.id, newElId);
                    cloneEl.id = newElId;
                    return cloneEl;
                });
                clonedElements.forEach((el: any) => {
                    if (el.groupId && idMapping.has(el.groupId)) {
                        el.groupId = idMapping.get(el.groupId);
                    }
                });
            }

            // 更新当前页面布局
            updatePage(activeChapter?.id || activeChapterId!, activePage.id, {
                templateId: tpl.id,
                elements: clonedElements,
                background: tpl.layoutSchema?.background || { color: '#FFFFFF' },
                templateOriginType: 'PAGE',
                templateOriginId: tpl.id
            });

            // 递增套用统计次数
            await bookService.usePageTemplate(tpl.id);
        } catch (e) {
            console.error('Failed to apply page template:', e);
        }
    };

    // 一键插入单页模板为新页面
    const handleInsertPageTemplateAsNew = async (tpl: Template) => {
        if (!currentBook) return;
        try {
            const newPageId = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // 物理隔离元素 UUID
            let clonedElements = [];
            if (tpl.layoutSchema && Array.isArray(tpl.layoutSchema.elements)) {
                const idMapping = new Map<string, string>();
                clonedElements = tpl.layoutSchema.elements.map((el: any) => {
                    const cloneEl = JSON.parse(JSON.stringify(el));
                    const newElId = `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    idMapping.set(el.id, newElId);
                    cloneEl.id = newElId;
                    return cloneEl;
                });
                clonedElements.forEach((el: any) => {
                    if (el.groupId && idMapping.has(el.groupId)) {
                        el.groupId = idMapping.get(el.groupId);
                    }
                });
            }

            const newPage = {
                id: newPageId,
                pageTitle: tpl.name,
                isChapterStart: false,
                content: '',
                photos: [],
                templateId: tpl.id,
                elements: clonedElements,
                background: tpl.layoutSchema?.background || { color: '#FFFFFF' },
                pageType: tpl.templateType === 'cover' ? 'cover' : 'content' as any,
                templateOriginType: 'PAGE' as const,
                templateOriginId: tpl.id
            };

            // Zustand 新增页面
            addPage(activeChapter?.id || activeChapterId!, newPage);

            // 递增计数
            await bookService.usePageTemplate(tpl.id);
        } catch (e) {
            console.error('Failed to insert page template:', e);
        }
    };

    // 一键导入页面合集到时光集
    const handleApplyCollection = async (col: TemplateCollection) => {
        if (!currentBook || !activePage) return;
        setIsApplyingCollection(true);
        try {
            // 调用后端应用合集接口，批量将合集内的模板生成为新 Page 插入当前书当前页之后
            await bookService.applyTemplateCollection(col.id, currentBook.id, activePage.id);
            // 刷新全书页面数据
            await loadBook(currentBook.id);
            alert(`合集《${col.title}》已成功导入到当前回忆页之后！`);
        } catch (e: any) {
            alert(`导入合集失败: ${e.message}`);
        } finally {
            setIsApplyingCollection(false);
        }
    };

    // 发布当前页为页面模板
    const handlePublishPageTemplate = async () => {
        if (!activePage) return;
        if (!publishName.trim()) {
            alert('模板名称不能为空');
            return;
        }

        setIsPublishing(true);
        try {
            // 1. 获取当前页面对应的画布 DOM 节点
            const isCover = activePage.pageType === 'cover';
            const domNode = isCover
                ? document.getElementById('book-cover-page-capture-container')
                : document.getElementById('editor-active-page-canvas');

            const targetNode = domNode || document.getElementById('editor-canvas-container');

            let thumbnailUrl = '';
            
            // 2. 如果找到了 DOM 节点，对其截图并自动直传
            if (targetNode) {
                const blob = await captureCoverToBlob(targetNode);
                if (blob) {
                    const { v4: uuidv4 } = await import('uuid');
                    const tempTplId = uuidv4();
                    const uploadResult = await uploadTemplateThumbnail(tempTplId, blob);
                    if (uploadResult) {
                        thumbnailUrl = uploadResult.url;
                    }
                }
            }

            const tagsArray = publishTags.split(/[，,+# ]+/).filter(Boolean);
            
            // 3. 将包含缩略图 URL 的数据提交到后端发布
            await bookService.publishPageTemplate(
                activePage.id,
                publishName,
                activePage.pageType || 'content',
                publishCategory,
                tagsArray,
                thumbnailUrl, // 动态生成的 WebP 缩略图
                thumbnailUrl, // 封面图 (复用)
                'public'
            );

            alert('发布页面模板成功！');
            setShowPublishModal(false);
            setPublishName('');
            setPublishTags('');
            // 刷新可用模板列表以显示刚刚发布的模板
            await loadTemplates();
        } catch (e: any) {
            alert(`发布模板失败: ${e.message}`);
        } finally {
            setIsPublishing(false);
        }
    };

    // 页面模板的筛选分类
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
            const matchesQuery = !searchQuery.trim() || t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                (t.tags && t.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase())));
            return matchesCategory && matchesType && matchesQuery;
        });
    }, [templates, selectedCategoryFilter, selectedTypeFilter, searchQuery]);

    // 渲染排版线框 SVG
    const renderLayoutBlueprintSvg = (tpl: any, sizeClass = 'w-[110px] h-[155px]') => {
        const elements = tpl?.layoutSchema?.elements || [];
        return (
            <svg className={`${sizeClass} border border-slate-100 rounded-lg bg-slate-50/50 text-indigo-500/80 p-1 transition-transform group-hover:scale-105 shadow-sm`} viewBox="0 0 100 141.4">
                <rect x="0" y="0" width="100" height="141.4" fill="#FFFFFF" rx="2" />
                {elements.map((el: any) => {
                    const x = parseFloat(el.x) || 0;
                    const y = (parseFloat(el.y) || 0) * 1.414;
                    const width = parseFloat(el.width) || 0;
                    const height = (parseFloat(el.height) || 0) * 1.414;

                    if (el.type === 'photo-frame') {
                        return (
                            <rect
                                key={el.id}
                                x={x / 10}
                                y={y / 14.14}
                                width={width / 10}
                                height={height / 14.14}
                                rx="1.5"
                                fill="currentColor"
                                fillOpacity="0.12"
                                stroke="currentColor"
                                strokeWidth="0.8"
                                strokeLinejoin="round"
                            />
                        );
                    }
                    if (el.type === 'text') {
                        return (
                            <rect
                                key={el.id}
                                x={x / 10}
                                y={y / 14.14}
                                width={width / 10}
                                height={height / 14.14}
                                rx="0.5"
                                fill="currentColor"
                                fillOpacity="0.04"
                                stroke="currentColor"
                                strokeWidth="0.4"
                                strokeDasharray="1.2 1.2"
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
        <div className="flex flex-col h-full space-y-4">
            {/* 三重 Tab 标签切换 */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">
                <button
                    onClick={() => setActiveTab('page')}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeTab === 'page'
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Layers className="w-3.5 h-3.5" />
                    页面模板
                </button>
                <button
                    onClick={() => setActiveTab('collection')}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeTab === 'collection'
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <FolderOpen className="w-3.5 h-3.5" />
                    模板集合
                </button>
                <button
                    onClick={() => setActiveTab('book')}
                    className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        activeTab === 'book'
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    整书模板
                </button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-10 text-left">
                {isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2 text-[10px]">
                        <span className="animate-spin text-indigo-500 text-lg">⏳</span>
                        <span>加载资源中...</span>
                    </div>
                )}

                {/* 1. 页面模板 Tab */}
                {!isLoading && activeTab === 'page' && (
                    <div className="space-y-4">
                        {/* 将当前页面发布为模板的入口 */}
                        {activePage && (
                            <button
                                onClick={() => setShowPublishModal(true)}
                                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 border border-indigo-200/80 rounded-xl text-indigo-650 hover:bg-indigo-100/60 font-bold text-[10px] transition-all cursor-pointer shadow-sm"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                {isAlreadyPublished ? '重新发布当前页模板' : '将当前页发布为页面模板'}
                            </button>
                        )}

                        {/* 搜索与筛选 */}
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="搜索页面模板名称或标签..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                />
                            </div>

                            {/* 结构类型过滤 */}
                            <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
                                {TEMPLATE_TYPES.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setSelectedTypeFilter(t.id)}
                                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                            selectedTypeFilter === t.id
                                                ? 'bg-indigo-600 text-white font-black'
                                                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-500'
                                        }`}
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>

                            {/* 主题分类过滤 */}
                            <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
                                <button
                                    onClick={() => setSelectedCategoryFilter('all')}
                                    className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                        selectedCategoryFilter === 'all'
                                            ? 'bg-indigo-600 text-white font-black'
                                            : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-500'
                                    }`}
                                >
                                    全部主题
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategoryFilter(cat)}
                                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                            selectedCategoryFilter === cat
                                                ? 'bg-indigo-600 text-white font-black'
                                                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-500'
                                        }`}
                                    >
                                        {CATEGORY_NAMES[cat] || cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 页面模板两列纯图片列表 */}
                        <div className="grid grid-cols-2 gap-3.5 pb-6">
                            {filteredTemplates.length > 0 ? (
                                filteredTemplates.map((t: Template) => {
                                    const isCurrentTpl = activePage?.templateId === t.id;
                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => setSelectedPreviewTemplate(t)}
                                            className="flex flex-col items-center transition-all group cursor-pointer"
                                        >
                                            {/* Thumbnail or Blueprint Lineframe - 两列大图直出 */}
                                            <div className="relative flex items-center justify-center p-0.5 w-full">
                                                {t.thumbnailUrl ? (
                                                    <img 
                                                        src={getResizeImageUrl(t.thumbnailUrl, 250)} 
                                                        alt={t.name} 
                                                        className={`w-[115px] h-[162px] border rounded-2xl bg-white object-cover transition-all duration-300 group-hover:scale-103 shadow-md ${
                                                            isCurrentTpl
                                                                ? 'border-indigo-500 ring-2 ring-indigo-500/35 shadow-indigo-150/40'
                                                                : 'border-slate-200/80 group-hover:border-slate-350 group-hover:shadow-lg'
                                                        }`}
                                                    />
                                                ) : (
                                                    renderLayoutBlueprintSvg(
                                                        t,
                                                        `w-[115px] h-[162px] border rounded-2xl bg-white transition-all duration-300 group-hover:scale-103 shadow-md ${
                                                            isCurrentTpl
                                                                ? 'border-indigo-500 ring-2 ring-indigo-500/35'
                                                                : 'border-slate-200/80 group-hover:border-slate-350 group-hover:shadow-lg'
                                                        }`
                                                    )
                                                )}
                                                
                                                {/* 覆盖悬停：精致的“点击查看”徽标 */}
                                                <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                                    <span className="bg-slate-900/75 text-white font-bold text-[8px] px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm select-none">
                                                        点击查看
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 text-center py-12 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-[10px] px-4 select-none leading-relaxed">
                                    暂无符合过滤条件的页面模板
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. 模板集合 Tab */}
                {!isLoading && activeTab === 'collection' && (
                    <div className="space-y-4">
                        {!selectedCollection ? (
                            // 展示合集列表
                            <div className="space-y-2.5">
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                                    全部模板集合 ({collections.length})
                                </div>
                                {collections.length > 0 ? (
                                    collections.map((col: TemplateCollection) => (
                                        <div
                                            key={col.id}
                                            onClick={() => handleSelectCollection(col)}
                                            className="p-3 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50/50 rounded-2xl flex items-center gap-3 transition-all cursor-pointer shadow-sm group"
                                        >
                                            {/* 预览缩略封面 */}
                                            <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-indigo-100 to-slate-200 border border-slate-200/50 flex items-center justify-center shadow-inner relative overflow-hidden flex-shrink-0">
                                                {col.cover ? (
                                                    <img src={col.cover} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FolderOpen className="w-5 h-5 text-indigo-500/80" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-slate-800 truncate group-hover:text-indigo-950">
                                                    {col.title}
                                                </p>
                                                <p className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                                    {col.description || '由设计师整理的多页模组集合'}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-bold">
                                                        {col.visibility === 'public' ? '公开' : '私有'}
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-[10px] leading-relaxed select-none">
                                        暂无可用模板合集
                                    </div>
                                )}
                            </div>
                        ) : (
                            // 展示选中的合集明细及预览
                            <div className="space-y-4">
                                <button
                                    onClick={() => setSelectedCollection(null)}
                                    className="text-[9px] text-indigo-650 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                                >
                                    ← 返回合集列表
                                </button>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
                                    <h4 className="text-[12px] font-black text-slate-900">{selectedCollection.title}</h4>
                                    <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed">{selectedCollection.description || '无详细描述'}</p>
                                    
                                    <button
                                        onClick={() => handleApplyCollection(selectedCollection)}
                                        disabled={isApplyingCollection || !activePage}
                                        className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed"
                                    >
                                        {isApplyingCollection ? (
                                            <span>导入中...</span>
                                        ) : (
                                            <>
                                                <ArrowDownToLine className="w-3.5 h-3.5" />
                                                一键导入该合集到本书页后
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                                    合集内包含页面 ({selectedCollection.items.length} 页)
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {selectedCollection.items.map((item, index) => (
                                        <div key={item.pageTemplateId} className="p-2.5 bg-white border border-slate-200 rounded-xl flex flex-col items-center gap-2">
                                            <div className="relative h-36 flex items-center justify-center">
                                                {item.pageTemplate?.thumbnailUrl ? (
                                                    <img 
                                                        src={getResizeImageUrl(item.pageTemplate.thumbnailUrl, 180)} 
                                                        alt="" 
                                                        className="w-[88px] h-[124px] border border-slate-100 rounded-xl bg-white object-cover shadow-sm" 
                                                    />
                                                ) : (
                                                    renderLayoutBlueprintSvg(item.pageTemplate, 'w-[88px] h-[124px]')
                                                )}
                                                <span className="absolute top-1 left-1 bg-slate-900/65 text-white font-bold text-[8px] px-1 rounded">
                                                    P{index + 1}
                                                </span>
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-700 truncate w-full text-center">
                                                {item.pageTemplate?.name}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. 整书模板 Tab */}
                {!isLoading && activeTab === 'book' && (
                    <div className="space-y-3">
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                            选择模板快速建立新时光集 ({bookTemplates.length})
                        </div>
                        {bookTemplates.length > 0 ? (
                            bookTemplates.map((bt: Book) => (
                                <div
                                    key={bt.id}
                                    className="p-3 bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50/50 rounded-2xl flex items-center gap-3 transition-all shadow-sm group"
                                >
                                    {/* 封面缩略 */}
                                    <div className="w-12 h-16 rounded-lg bg-indigo-50 border border-slate-200/50 flex items-center justify-center shadow-inner relative overflow-hidden flex-shrink-0">
                                        {bt.coverUrl ? (
                                            <img src={bt.coverUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <BookOpen className="w-5 h-5 text-indigo-500/80" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black text-slate-800 truncate leading-tight">
                                            {bt.title}
                                        </p>
                                        <p className="text-[9px] text-slate-400 mt-1">
                                            作者: {bt.author || '匿名设计师'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-bold">
                                                {bt.pageSize} 尺寸
                                            </span>
                                            <span className="text-[8px] bg-indigo-50 text-indigo-650 px-1 py-0.2 rounded font-bold">
                                                {bt.pageCount || 0} 页排版
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleApplyBookTemplate(bt)}
                                        className="py-1 px-2.5 text-[9px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm cursor-pointer flex-shrink-0"
                                    >
                                        套用
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-[10px] leading-relaxed select-none">
                                暂无整书模板
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 发布单页模板弹窗 */}
            {showPublishModal && activePage && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-5 border border-slate-200 shadow-xl space-y-4 text-left">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="text-[12px] font-black text-slate-800 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-indigo-500" />
                                {isAlreadyPublished ? '重新发布当前页模板' : '发布页面为单页模板'}
                            </h3>
                            <button
                                onClick={() => setShowPublishModal(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* 模板标题 */}
                            <div className="space-y-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase pl-0.5">
                                    模板名称 (Title)
                                </label>
                                <input
                                    type="text"
                                    placeholder="起一个抓人的排版模板名字"
                                    value={publishName}
                                    onChange={e => setPublishName(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                />
                            </div>

                            {/* 分类筛选 */}
                            <div className="space-y-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase pl-0.5">
                                    回忆分类 (Category)
                                </label>
                                <select
                                    value={publishCategory}
                                    onChange={e => setPublishCategory(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                >
                                    {Object.entries(CATEGORY_NAMES).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 标签 */}
                            <div className="space-y-1">
                                <label className="text-[9px] text-slate-400 font-bold uppercase pl-0.5">
                                    模板标签 (Tags，用逗号或空格分割)
                                </label>
                                <input
                                    type="text"
                                    placeholder="例: 双人, 拼贴, 拍立得, 简约"
                                    value={publishTags}
                                    onChange={e => setPublishTags(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                                />
                            </div>
                        </div>

                        {/* 操作 */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowPublishModal(false)}
                                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-[10px] cursor-pointer"
                            >
                                取消
                            </button>
                            <button
                                onClick={handlePublishPageTemplate}
                                disabled={isPublishing}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-black rounded-xl text-[10px] transition-all cursor-pointer shadow-md disabled:bg-slate-300"
                            >
                                {isPublishing ? '发布中...' : (isAlreadyPublished ? '重新发布' : '确定发布')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 页面模板大图预览详情弹窗 */}
            {selectedPreviewTemplate && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col sm:flex-row text-left">
                        {/* 左侧：高清大图预览区 */}
                        <div className="w-full sm:w-[48%] bg-slate-50 border-r border-slate-100 flex flex-col items-center justify-center p-6 flex-shrink-0 relative">
                            {selectedPreviewTemplate.thumbnailUrl ? (
                                <img
                                    src={getResizeImageUrl(selectedPreviewTemplate.thumbnailUrl, 500)}
                                    alt={selectedPreviewTemplate.name}
                                    className="w-[190px] h-[268px] border border-slate-200/80 rounded-2xl bg-white object-cover shadow-md select-none animate-in zoom-in-95 duration-200"
                                />
                            ) : (
                                renderLayoutBlueprintSvg(selectedPreviewTemplate, 'w-[190px] h-[268px]')
                            )}
                            <span className="absolute top-4 left-4 bg-slate-900/65 text-white font-bold text-[8px] px-2 py-0.5 rounded-full select-none">
                                PREVIEW 大图预览
                            </span>
                        </div>

                        {/* 右侧：详细信息与应用操作按钮 */}
                        <div className="flex-1 p-6 flex flex-col justify-between space-y-5">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[13px] font-black text-slate-800 tracking-tight pr-2 truncate">
                                        {selectedPreviewTemplate.name}
                                    </h3>
                                    <span className="text-[8px] font-black bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        {selectedPreviewTemplate.templateType === 'cover' ? '封面' : selectedPreviewTemplate.templateType === 'structural' ? '过渡页' : '内容页'}
                                    </span>
                                </div>

                                <div className="space-y-2.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase w-16">照片插槽:</span>
                                        <span className="text-[10px] font-bold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-md">
                                            {selectedPreviewTemplate.photoCount} 张
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase w-16">所属分类:</span>
                                        <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                            {CATEGORY_NAMES[selectedPreviewTemplate.category] || selectedPreviewTemplate.category}
                                        </span>
                                    </div>
                                    {selectedPreviewTemplate.tags && selectedPreviewTemplate.tags.length > 0 && (
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">模板标签:</span>
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                                {selectedPreviewTemplate.tags.map((tag: string) => (
                                                    <span key={tag} className="text-[8px] bg-indigo-50/60 text-indigo-650 px-1.5 py-0.5 rounded font-bold">
                                                        #{tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 操作按钮：应用（当页、下一页），取消 */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            handleApplyPageTemplate(selectedPreviewTemplate);
                                            setSelectedPreviewTemplate(null);
                                        }}
                                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-750 text-white font-black rounded-xl text-[10px] shadow-sm transition-all cursor-pointer text-center"
                                    >
                                        应用 (当页)
                                    </button>
                                    <button
                                        onClick={() => {
                                            handleInsertPageTemplateAsNew(selectedPreviewTemplate);
                                            setSelectedPreviewTemplate(null);
                                        }}
                                        className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 border border-indigo-200/50 font-bold rounded-xl text-[10px] transition-all cursor-pointer text-center"
                                    >
                                        应用 (下一页)
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSelectedPreviewTemplate(null)}
                                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-[10px] transition-all cursor-pointer text-center"
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
