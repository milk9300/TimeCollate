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
    Calendar
} from 'lucide-react';
import { getBookService } from '../../../services/serviceFactory';
import { MainLayout } from '../../common/components/MainLayout';
import type { Book } from '../../../types';
import { ConfirmModal } from '../../common/components/ConfirmModal';

const bookService = getBookService();

export function MyBookTemplates() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<Book[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    return (
        <MainLayout title="我的书模板">
            <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto font-['Outfit',_sans-serif] min-h-screen">
                {/* 顶部标题区 */}
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

                {/* 列表区 */}
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center py-20">
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                    </div>
                ) : templates.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                        <Bookmark size={48} className="text-slate-300 mb-3" />
                        <h3 className="text-lg font-bold text-slate-700">暂无自定义书模板</h3>
                        <p className="text-slate-400 text-sm mt-1">您可以先在“我的书架”创作一本书，完成后点击[发布为模板]。</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {templates.map(tpl => (
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
                                                <Calendar size={12} />
                                                {new Date(tpl.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 操作按钮组 */}
                                    <div className="mt-auto flex flex-col gap-2 pt-2">
                                        <button
                                            onClick={() => handleApplyTrigger(tpl.id, tpl.title)}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-650 hover:bg-indigo-750 text-white rounded-2xl
                                                     transition-all duration-350 font-bold text-[13px] cursor-pointer shadow-sm"
                                        >
                                            套用模板
                                            <ArrowRight size={13} />
                                        </button>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEditTemplate(tpl.id)}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl
                                                         transition-colors font-bold text-[12px] cursor-pointer"
                                            >
                                                <Edit3 size={12} />
                                                编辑设计
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTrigger(tpl.id, tpl.title)}
                                                className="flex items-center justify-center p-2.5 bg-rose-50 hover:bg-rose-550 text-rose-600 hover:text-white rounded-xl
                                                         transition-colors cursor-pointer"
                                                title="删除模板"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
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
        </MainLayout>
    );
}
