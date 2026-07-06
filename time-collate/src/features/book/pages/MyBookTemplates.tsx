import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bookmark,
    Plus,
    Loader2,
    BookOpen,
    Edit3,
    Trash2,
    ArrowRight,
    User,
    Calendar,
    Eye,
    ChevronLeft,
    ChevronRight,
    X
} from 'lucide-react';
import { getBookService } from '../../../services/serviceFactory';
import { MainLayout } from '../../common/components/MainLayout';
import type { Book } from '../../../types';
import { ConfirmModal } from '../../common/components/ConfirmModal';
import { useAuthStore } from '../../../store/useAuthStore';
import { BookCard } from '../components/BookCard';

const bookService = getBookService();

export function MyBookTemplates({ isEmbed = false }: { isEmbed?: boolean }) {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [templates, setTemplates] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 预览弹窗状态
    const [previewBook, setPreviewBook] = useState<any | null>(null);
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

    // 删除确认弹窗状态
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        templateId: string;
        templateTitle: string;
    }>({ isOpen: false, templateId: '', templateTitle: '' });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadMyTemplates();
    }, []);

    const loadMyTemplates = async () => {
        setIsLoading(true);
        try {
            // 获取用户自己拥有的模板列表
            const response = await bookService.getBookTemplates();
            setTemplates(response.items || []);
        } catch (error) {
            console.error('Failed to load my book templates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 编辑模板
    const handleEditTemplate = (templateId: string) => {
        navigate(`/editor/${templateId}`);
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

    // 卡片点击逻辑
    const handleCardClick = (tpl: any) => {
        const isPrivileged = user?.role === 'admin' || user?.role === 'designer';
        if (isPrivileged) {
            handleEditTemplate(tpl.id);
        } else {
            handlePreviewTrigger(tpl.id);
        }
    };

    // 触发套用
    const handleApplyTrigger = (templateId: string, templateTitle: string) => {
        setApplyModal({
            isOpen: true,
            templateId,
            templateTitle,
            newTitle: `${templateTitle} (套用)`
        });
    };

    // 确定套用
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

    // 触发删除模板
    const handleDeleteTrigger = (templateId: string, templateTitle: string) => {
        setDeleteConfirm({
            isOpen: true,
            templateId,
            templateTitle
        });
    };

    // 确定删除
    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await bookService.deleteBook(deleteConfirm.templateId);
            setTemplates(prev => prev.filter(t => t.id !== deleteConfirm.templateId));
        } catch (error) {
            console.error('Failed to delete book template:', error);
            alert('删除失败，请稍后重试');
        } finally {
            setIsDeleting(false);
            setDeleteConfirm({ isOpen: false, templateId: '', templateTitle: '' });
        }
    };

    const content = (
        <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto font-['Outfit',_sans-serif] min-h-screen">
            {/* 顶部标题区 */}
            {!isEmbed && (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Bookmark className="text-indigo-600" size={32} strokeWidth={2.5} />
                            我的书模板
                        </h1>
                        <p className="text-slate-400 font-medium mt-1">
                            您自己设计并发布的完整相册模板。可重复克隆套用或继续编辑。
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl
                                 font-bold text-[14px] shadow-lg shadow-indigo-100 hover:shadow-xl transition-all duration-300 cursor-pointer"
                    >
                        <Plus size={18} strokeWidth={2.5} />
                        创作新相册
                    </button>
                </div>
            )}

            {/* 列表区 */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-indigo-605" size={40} />
                </div>
            ) : templates.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <Bookmark size={48} className="text-slate-350 mb-3" />
                    <h3 className="text-sm font-black text-slate-700">暂无自定义书模板</h3>
                    <p className="text-slate-400 text-xs mt-1">您可以先在“我的书架”创作一本书，完成后点击[发布为模板]。</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-y-10 gap-x-6 justify-center">
                    {templates.map(tpl => {
                        const mappedBook = {
                            id: tpl.id,
                            title: tpl.title,
                            createdAt: new Date(tpl.createdAt).getTime(),
                            coverThumbnailUrl: tpl.coverThumbnailUrl,
                            status: tpl.isPublic ? 'published' as const : 'private' as const,
                            pageCount: tpl.pageCount,
                            photoCount: tpl.photoCount
                        };

                        return (
                            <div key={tpl.id} className="flex flex-col gap-3.5 group relative select-none">
                                <BookCard
                                    book={mappedBook}
                                    onClick={() => handleCardClick(tpl)}
                                    showCommunityStats={false}
                                />
                                
                                {/* 书名与页数简报 */}
                                <div className="text-center mt-1 px-2">
                                    <h4 className="font-bold text-slate-800 text-[12.5px] line-clamp-1 group-hover:text-indigo-650 transition-colors font-sans">
                                        {tpl.title}
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-extrabold mt-1 uppercase tracking-wider">
                                        {tpl.pageCount || 0} P
                                    </p>
                                </div>

                                {/* 立体书封右上角悬浮管理层 */}
                                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-slate-200/40">
                                    <button
                                        onClick={() => handleApplyTrigger(tpl.id, tpl.title)}
                                        className="p-1.5 bg-indigo-50/70 hover:bg-indigo-600 text-indigo-650 hover:text-white rounded-lg transition-all cursor-pointer"
                                        title="套用模板"
                                    >
                                        <ArrowRight size={13} strokeWidth={2.5} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTrigger(tpl.id, tpl.title)}
                                        className="p-1.5 bg-rose-50/70 hover:bg-rose-600 text-rose-650 hover:text-white rounded-lg transition-all cursor-pointer"
                                        title="删除模板"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 套用模板弹窗 */}
            {applyModal.isOpen && (
                <div className="fixed inset-0 z-55 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl p-8 flex flex-col gap-6">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">确认套用书模板</h3>
                            <p className="text-slate-450 text-xs font-semibold mt-1.5">
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

            {/* 预览模板弹窗 */}
            {previewBook && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col">
                        {/* 弹窗头部 */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight">预览整书模板</h3>
                                <p className="text-slate-450 text-[11px] font-bold mt-0.5">
                                    当前正在预览《{previewBook.title}》的相册框架与页排版设计
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewBook(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* 预览区域 */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50 flex flex-col items-center justify-center min-h-0">
                            {previewBook.pages.length === 0 ? (
                                <div className="text-slate-400 py-10 font-bold text-xs">该模板中暂无设计好的页面</div>
                            ) : (
                                <div className="w-full flex flex-col items-center gap-6">
                                    {/* 对开页预览 */}
                                    <div className="flex flex-col md:flex-row gap-6 items-center justify-center w-full max-w-4xl">
                                        {/* 单页展示 */}
                                        <div className="w-full md:w-1/2 aspect-[3/4] bg-white rounded-3xl border border-slate-150 shadow-xs p-8 flex flex-col relative select-none">
                                            <div className="absolute top-4 left-6 text-[10px] font-black text-slate-350 tracking-wider">
                                                Page {activePageIdx + 1}
                                            </div>
                                            {/* 页面内容模拟骨架 */}
                                            <div className="flex-1 flex flex-col justify-between pt-4">
                                                <div className="h-4 bg-slate-100 rounded-full w-2/3 mb-4" />
                                                <div className="flex-1 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-350 font-bold text-xs">
                                                    [照片区域 - {previewBook.pages[activePageIdx]?.templateId || '默认'} 排版]
                                                </div>
                                                <div className="h-3 bg-slate-105 rounded-full w-full mt-4" />
                                                <div className="h-3 bg-slate-105 rounded-full w-4/5 mt-2" />
                                            </div>
                                        </div>

                                        {/* 如果有下一页，对开展示 */}
                                        {activePageIdx + 1 < previewBook.pages.length ? (
                                            <div className="w-full md:w-1/2 aspect-[3/4] bg-white rounded-3xl border border-slate-150 shadow-xs p-8 flex flex-col relative select-none">
                                                <div className="absolute top-4 left-6 text-[10px] font-black text-slate-350 tracking-wider">
                                                    Page {activePageIdx + 2}
                                                </div>
                                                <div className="flex-1 flex flex-col justify-between pt-4">
                                                    <div className="h-4 bg-slate-100 rounded-full w-1/2 mb-4" />
                                                    <div className="flex-1 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-slate-350 font-bold text-xs">
                                                        [照片区域 - {previewBook.pages[activePageIdx + 1]?.templateId || '默认'} 排版]
                                                    </div>
                                                    <div className="h-3 bg-slate-105 rounded-full w-full mt-4" />
                                                    <div className="h-3 bg-slate-105 rounded-full w-3/4 mt-2" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-full md:w-1/2 aspect-[3/4] bg-slate-100/50 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs select-none">
                                                封底
                                            </div>
                                        )}
                                    </div>

                                    {/* 翻页控制 */}
                                    <div className="flex items-center gap-6 select-none mt-2">
                                        <button
                                            disabled={activePageIdx === 0}
                                            onClick={() => setActivePageIdx(prev => Math.max(0, prev - 2))}
                                            className={`p-2.5 bg-white border border-slate-200 shadow-xs rounded-full transition-all cursor-pointer
                                                      ${activePageIdx === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50 active:scale-95 text-slate-650'}`}
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <span className="text-xs font-black text-slate-500">
                                            {activePageIdx + 1} - {Math.min(previewBook.pages.length, activePageIdx + 2)} / {previewBook.pages.length}
                                        </span>
                                        <button
                                            disabled={activePageIdx + 2 >= previewBook.pages.length}
                                            onClick={() => setActivePageIdx(prev => prev + 2)}
                                            className={`p-2.5 bg-white border border-slate-200 shadow-xs rounded-full transition-all cursor-pointer
                                                      ${activePageIdx + 2 >= previewBook.pages.length ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50 active:scale-95 text-slate-650'}`}
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 弹窗底部操作 */}
                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setPreviewBook(null)}
                                className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-2xl font-bold text-[13.5px] transition-colors cursor-pointer"
                            >
                                关闭预览
                            </button>
                            <button
                                onClick={() => {
                                    const tplId = previewBook.id;
                                    const tplTitle = previewBook.title;
                                    setPreviewBook(null);
                                    handleApplyTrigger(tplId, tplTitle);
                                }}
                                className="px-6 py-3 bg-indigo-650 hover:bg-indigo-750 text-white rounded-2xl font-bold text-[13.5px] shadow-lg shadow-indigo-100 transition-all cursor-pointer"
                            >
                                套用并应用该模板
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 删除确认弹窗 */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="确定删除此书模板吗？"
                message={`此操作将把书模板 "${deleteConfirm.templateTitle}" 移动到回收站。您稍后可在回收站内进行恢复或永久删除。`}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, templateId: '', templateTitle: '' })}
                confirmText="确认删除"
                cancelText="取消"
            />
        </div>
    );

    if (isEmbed) return content;
    return <MainLayout title="我的书模板">{content}</MainLayout>;
}
