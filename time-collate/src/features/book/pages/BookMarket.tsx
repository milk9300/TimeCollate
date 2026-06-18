import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    Search,
    Sparkles,
    Loader2,
    Calendar,
    User,
    ArrowRight,
    X,
    Eye,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { getBookService } from '../../../services/serviceFactory';
import { MainLayout } from '../../common/components/MainLayout';
import type { Book } from '../../../types';
import { useAuthStore } from '../../../store/useAuthStore';

const bookService = getBookService();

const CATEGORIES = [
    { id: 'all', name: '全部模板' },
    { id: 'graduation', name: '毕业纪念' },
    { id: 'travel', name: '旅行手册' },
    { id: 'couple', name: '情侣相册' },
    { id: 'child', name: '成长记录' },
    { id: 'company', name: '企业画册' },
    { id: 'other', name: '其他' },
];

export function BookMarket() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [templates, setTemplates] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // 预览弹窗状态
    const [previewBook, setPreviewBook] = useState<Book | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [activePageIdx, setActivePageIdx] = useState(0);

    // 套用模板弹窗状态
    const [applyModal, setApplyModal] = useState<{
        isOpen: boolean;
        templateId: string;
        templateTitle: string;
        newTitle: string;
    }>({ isOpen: false, templateId: '', templateTitle: '', newTitle: '' });
    const [isApplying, setIsApplying] = useState(false);

    useEffect(() => {
        loadTemplates(1);
    }, [selectedCategory]);

    const loadTemplates = async (pageNum: number) => {
        setIsLoading(true);
        try {
            const response = await bookService.getMarketBookTemplates(
                pageNum,
                12,
                selectedCategory === 'all' ? undefined : selectedCategory
            );
            setTemplates(response.items || []);
            setPage(response.page);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error('Failed to load market book templates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 触发预览
    const handlePreviewTrigger = async (templateId: string) => {
        setIsPreviewLoading(true);
        try {
            const fullBook = await bookService.getBook(templateId);
            if (fullBook) {
                setPreviewBook(fullBook);
                setActivePageIdx(0);
            }
        } catch (error) {
            console.error('Failed to load book template detail:', error);
            alert('加载模板详情失败');
        } finally {
            setIsPreviewLoading(false);
        }
    };

    // 触发套用模板弹窗
    const handleApplyTrigger = (templateId: string, templateTitle: string) => {
        setApplyModal({
            isOpen: true,
            templateId,
            templateTitle,
            newTitle: `${templateTitle} (套用)`
        });
    };

    // 确定套用模板
    const handleConfirmApply = async () => {
        if (!applyModal.newTitle.trim()) {
            alert('请输入相册标题');
            return;
        }
        setIsApplying(true);
        try {
            const newBookId = await bookService.applyTemplate(applyModal.templateId, applyModal.newTitle);
            navigate(`/editor/${newBookId}`);
        } catch (error) {
            console.error('Failed to apply template:', error);
            alert('套用模板失败，请稍后重试');
        } finally {
            setIsApplying(false);
            setApplyModal({ isOpen: false, templateId: '', templateTitle: '', newTitle: '' });
        }
    };

    // 搜索过滤
    const filteredTemplates = templates.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.author && t.author.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <MainLayout title="书模板市场">
            <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto font-['Outfit',_sans-serif] min-h-screen">
                {/* 顶部标题区 */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <BookOpen className="text-indigo-600" size={32} strokeWidth={2.5} />
                            书模板市场
                        </h1>
                        <p className="text-slate-400 font-medium mt-1">
                            精选完整相册模板，毕业、旅行、情侣日记一键套用，自动排版
                        </p>
                    </div>

                    {/* 搜索框 */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="搜索书模板..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[14px] text-slate-700
                                     placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all duration-300"
                        />
                    </div>
                </div>

                {/* 分类过滤 */}
                <div className="flex flex-wrap gap-2.5">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-5 py-2.5 rounded-full text-[14px] font-bold transition-all duration-300 cursor-pointer
                                      ${selectedCategory === cat.id
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                    : 'bg-slate-50 hover:bg-slate-100/70 text-slate-500 hover:text-slate-700'}`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>

                {/* 列表主体 */}
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                        <BookOpen size={48} className="text-slate-300 mb-3" />
                        <h3 className="text-lg font-bold text-slate-700">暂无相关书模板</h3>
                        <p className="text-slate-400 text-sm mt-1">换个分类或搜索词试试吧</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredTemplates.map(tpl => (
                            <div
                                key={tpl.id}
                                className="group bg-white rounded-3xl border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
                            >
                                {/* 封面预览图 */}
                                <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden shrink-0">
                                    {tpl.coverThumbnailUrl ? (
                                        <img
                                            src={tpl.coverThumbnailUrl}
                                            alt={tpl.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                            <BookOpen size={32} strokeWidth={1.5} />
                                            <span className="text-xs font-bold">暂无封面</span>
                                        </div>
                                    )}

                                    {/* 悬浮预览按钮 */}
                                    <button
                                        onClick={() => handlePreviewTrigger(tpl.id)}
                                        className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2 text-white font-bold text-[14px]"
                                    >
                                        <Eye size={18} />
                                        预览模板
                                    </button>

                                    {/* 页数角标 */}
                                    <div className="absolute left-4 bottom-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[11px] font-black text-slate-700">
                                        {tpl.pageCount || 0} P
                                    </div>
                                </div>

                                {/* 信息介绍 */}
                                <div className="p-5 flex-1 flex flex-col gap-4">
                                    <div>
                                        <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                            {tpl.title}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-2 text-slate-400 text-[12px] font-medium">
                                            <span className="flex items-center gap-1">
                                                <User size={12} />
                                                {tpl.author || '系统设计师'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(tpl.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 底部按钮 */}
                                    <div className="mt-auto pt-2">
                                        <button
                                            onClick={() => handleApplyTrigger(tpl.id, tpl.title)}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-50 text-indigo-600 rounded-2xl
                                                     hover:bg-indigo-600 hover:text-white transition-all duration-300 font-bold text-[14px] cursor-pointer"
                                        >
                                            一键套用
                                            <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 模板详情双页预览弹窗 */}
                {previewBook && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                            {/* 弹窗头部 */}
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">{previewBook.title}</h2>
                                    <p className="text-xs font-semibold text-slate-400 mt-1">
                                        设计师: {previewBook.author || '系统设计师'} &nbsp;|&nbsp; 页面数: {previewBook.pages.length} 页
                                    </p>
                                </div>
                                <button
                                    onClick={() => setPreviewBook(null)}
                                    className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* 预览区域 */}
                            <div className="flex-1 overflow-y-auto p-8 bg-slate-50 flex flex-col items-center justify-center">
                                {previewBook.pages.length === 0 ? (
                                    <div className="text-slate-400 py-10 font-bold">该模板中暂无设计好的页面</div>
                                ) : (
                                    <div className="w-full flex flex-col items-center gap-6">
                                        {/* 经典对开页预览 */}
                                        <div className="flex flex-col md:flex-row gap-4 items-center justify-center w-full max-w-4xl">
                                            {/* 单页展示 */}
                                            <div className="w-full md:w-1/2 aspect-[3/4] bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col relative">
                                                <div className="absolute top-4 left-6 text-xs font-black text-slate-350">
                                                    Page {activePageIdx + 1}
                                                </div>
                                                {/* 页面内容模拟骨架 */}
                                                <div className="flex-1 flex flex-col justify-between pt-4">
                                                    <div className="h-4 bg-slate-100 rounded-full w-2/3 mb-4" />
                                                    <div className="flex-1 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-350 font-bold text-sm">
                                                        [照片区域 - {previewBook.pages[activePageIdx]?.layout || '默认'} 排版]
                                                    </div>
                                                    <div className="h-3 bg-slate-100 rounded-full w-full mt-4" />
                                                    <div className="h-3 bg-slate-100 rounded-full w-4/5 mt-2" />
                                                </div>
                                            </div>

                                            {/* 如果有下一页，对开展示 */}
                                            {activePageIdx + 1 < previewBook.pages.length ? (
                                                <div className="w-full md:w-1/2 aspect-[3/4] bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col relative">
                                                    <div className="absolute top-4 left-6 text-xs font-black text-slate-350">
                                                        Page {activePageIdx + 2}
                                                    </div>
                                                    <div className="flex-1 flex flex-col justify-between pt-4">
                                                        <div className="h-4 bg-slate-100 rounded-full w-1/2 mb-4" />
                                                        <div className="flex-1 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-350 font-bold text-sm">
                                                            [照片区域 - {previewBook.pages[activePageIdx + 1]?.layout || '默认'} 排版]
                                                        </div>
                                                        <div className="h-3 bg-slate-100 rounded-full w-full mt-4" />
                                                        <div className="h-3 bg-slate-100 rounded-full w-3/4 mt-2" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full md:w-1/2 aspect-[3/4] bg-slate-100/50 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 font-bold text-sm">
                                                    封底
                                                </div>
                                            )}
                                        </div>

                                        {/* 翻页控制 */}
                                        <div className="flex items-center gap-6">
                                            <button
                                                disabled={activePageIdx === 0}
                                                onClick={() => setActivePageIdx(prev => Math.max(0, prev - 2))}
                                                className={`p-3 bg-white border border-slate-100 shadow-sm rounded-full transition-all cursor-pointer
                                                          ${activePageIdx === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50 active:scale-95'}`}
                                            >
                                                <ChevronLeft size={20} />
                                            </button>
                                            <span className="text-sm font-bold text-slate-500">
                                                {activePageIdx + 1} - {Math.min(previewBook.pages.length, activePageIdx + 2)} / {previewBook.pages.length}
                                            </span>
                                            <button
                                                disabled={activePageIdx + 2 >= previewBook.pages.length}
                                                onClick={() => setActivePageIdx(prev => prev + 2)}
                                                className={`p-3 bg-white border border-slate-100 shadow-sm rounded-full transition-all cursor-pointer
                                                          ${activePageIdx + 2 >= previewBook.pages.length ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50 active:scale-95'}`}
                                            >
                                                <ChevronRight size={20} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 弹窗底部操作 */}
                            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
                                <button
                                    onClick={() => setPreviewBook(null)}
                                    className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-bold text-[14px] transition-colors cursor-pointer"
                                >
                                    返回市场
                                </button>
                                <button
                                    onClick={() => {
                                        const tplId = previewBook.id;
                                        const tplTitle = previewBook.title;
                                        setPreviewBook(null);
                                        handleApplyTrigger(tplId, tplTitle);
                                    }}
                                    className="px-6 py-3 bg-indigo-650 hover:bg-indigo-750 text-white rounded-2xl font-bold text-[14px] shadow-lg shadow-indigo-100 transition-all cursor-pointer"
                                >
                                    应用此相册模板
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 套用模板弹窗 */}
                {applyModal.isOpen && (
                    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl p-8 flex flex-col gap-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-800">确认套用书模板</h3>
                                <p className="text-slate-400 text-xs font-semibold mt-1.5">
                                    克隆模板将为您创建一本全新的普通时光相册。您可以在其中增删页面和修改图片文字。
                                </p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] font-black text-slate-500">新相册标题</label>
                                <input
                                    type="text"
                                    placeholder="输入相册名称..."
                                    value={applyModal.newTitle}
                                    onChange={(e) => setApplyModal(prev => ({ ...prev, newTitle: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[14px] text-slate-700
                                             focus:outline-none focus:bg-white focus:border-indigo-500 transition-all duration-300 font-bold"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    disabled={isApplying}
                                    onClick={() => setApplyModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-bold text-[14px] transition-colors cursor-pointer"
                                >
                                    取消
                                </button>
                                <button
                                    disabled={isApplying}
                                    onClick={handleConfirmApply}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-[14px] shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    {isApplying && <Loader2 className="animate-spin" size={16} />}
                                    确认套用
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}
