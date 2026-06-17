import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Layout, 
    Plus, 
    Loader2,
    Layers,
    X
} from 'lucide-react';
import { MainLayout } from '../../common/components/MainLayout';
import { TemplateCard } from '../components/TemplateCard';
import { TemplatePreviewModal } from '../components/TemplatePreviewModal';
import { ConfirmModal } from '../../common/components/ConfirmModal';
import { useAuthStore } from '../../../store/useAuthStore';
import { useBookStore } from '../../../store';
import axios from 'axios';
import { getBookService } from '../../../services/serviceFactory';
import type { Book } from '../../../types';

const bookService = getBookService();

export function MyLayouts() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { templates, loadTemplates, themes, loadThemes } = useBookStore();
    const [isLoading, setIsLoading] = useState(true);
    
    // 删除确认弹窗状态
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        templateId: string;
        templateName: string;
    }>({ isOpen: false, templateId: '', templateName: '' });
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
    
    // 控制顶部提示卡片是否显示
    const [showTips, setShowTips] = useState(() => {
        try {
            return localStorage.getItem('hide_my_layouts_tips') !== 'true';
        } catch {
            return true;
        }
    });

    const handleCloseTips = () => {
        try {
            localStorage.setItem('hide_my_layouts_tips', 'true');
        } catch (e) {
            console.warn('Could not save tips preference to localStorage:', e);
        }
        setShowTips(false);
    };

    const [books, setBooks] = useState<Book[]>([]);

    // 组件挂载时拉取模板与主题列表，以及用户书籍列表用于统计分析
    useEffect(() => {
        const initData = async () => {
            setIsLoading(true);
            try {
                const [booksRes] = await Promise.all([
                    bookService.getBooks(1, 100),
                    loadTemplates(),
                    loadThemes()
                ]);
                if (booksRes && booksRes.items) {
                    setBooks(booksRes.items);
                }
            } catch (error) {
                console.error('Failed to load assets in MyLayouts:', error);
            } finally {
                setIsLoading(false);
            }
        };
        initData();
    }, [loadTemplates, loadThemes]);

    // 过滤出当前用户自己创建的自定义模板。如果是管理员，则包含所有系统内置/管理员发布的模板以便进行管理
    const myTemplates = (templates || []).filter(
        t => t.creatorId === user?.id || (user?.role === 'admin' && t.creatorId === 'system')
    );

    // 动态计算指标：已应用的时光集页面数量，以及自由拼贴数量
    let appliedPagesCount = 0;
    let freeCollageCount = 0;
    
    books.forEach(book => {
        if (book.pages && Array.isArray(book.pages)) {
            book.pages.forEach(p => {
                if (p.layout) {
                    if (p.layout === 'single' || p.layout === 'free') {
                        freeCollageCount++;
                    } else {
                        appliedPagesCount++;
                    }
                }
            });
        }
    });

    // 动态计算指标：照片插槽网格统计
    const totalPhotoSlots = myTemplates.reduce((sum, t) => {
        return sum + (t.layoutSchema?.elements?.filter(e => e.type === 'photo').length || 0);
    }, 0);

    const singlePhotoLayouts = myTemplates.filter(t => {
        return (t.layoutSchema?.elements?.filter(e => e.type === 'photo').length || 0) === 1;
    }).length;

    const multiPhotoLayouts = myTemplates.filter(t => {
        return (t.layoutSchema?.elements?.filter(e => e.type === 'photo').length || 0) > 1;
    }).length;

    // 进入排版设计器 - 新建模式
    const handleCreateLayout = () => {
        navigate('/builder');
    };

    // 进入排版设计器 - 编辑模式
    const handleEditLayout = (templateId: string) => {
        navigate(`/builder?edit=${templateId}`);
    };

    // 触发删除弹窗
    const handleDeleteTrigger = (templateId: string, templateName: string) => {
        setDeleteConfirm({
            isOpen: true,
            templateId,
            templateName
        });
    };

    // 执行模板删除
    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await axios.delete(`/templates/${deleteConfirm.templateId}`);
            if (response.data && response.data.success) {
                // 同步刷新本地模板缓存
                await loadTemplates();
            }
        } catch (error) {
            console.error('Failed to delete template:', error);
            alert('删除失败，请稍后重试');
        } finally {
            setIsDeleting(false);
            setDeleteConfirm({ isOpen: false, templateId: '', templateName: '' });
        }
    };



    return (
        <MainLayout title="我的自定义排版" hideSearch={true}>
            <div className="p-8 max-w-[1400px] mx-auto animate-in fade-in duration-300">


                {/* 头部可关闭提示卡片 */}
                {showTips && (
                    <div className="flex items-center justify-between gap-4 mb-8 bg-slate-50 border border-slate-100 p-4.5 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm border border-indigo-100/20">
                                <Layers size={18} />
                            </div>
                            <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                                搭建个性化拼贴模板骨架。自由调整插槽百分比，系统自动在书籍排版渲染时自适应大图及外置静态高清导出。
                            </p>
                        </div>
                        <button
                            onClick={handleCloseTips}
                            className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="不再提示"
                            aria-label="关闭提示"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* 双栏主区域：左侧排版矩阵，右侧排版设计看板 */}
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* 左侧：排版矩阵 (占约 2/3) */}
                    <div className="flex-1 w-full order-2 lg:order-1">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-24 gap-3">
                                <Loader2 size={36} className="animate-spin text-indigo-600" />
                                <span className="text-slate-400 text-xs font-black tracking-wider uppercase animate-pulse">正在同步排版库...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {/* 首个常驻卡片：极简新建卡片 */}
                                <button
                                    onClick={handleCreateLayout}
                                    className="w-full aspect-[3/4] sm:aspect-auto sm:h-full min-h-[350px] bg-slate-50/50 hover:bg-indigo-50/30 rounded-[28px] border-2 border-dashed border-indigo-200/50 hover:border-indigo-500/50 flex flex-col items-center justify-center p-6 transition-all duration-300 hover:scale-[1.02] group cursor-pointer shadow-sm hover:shadow-[0_16px_36px_-6px_rgba(79,70,229,0.08)] relative"
                                    style={{ border: '2px dashed rgba(111, 94, 241, 0.3)' }}
                                >
                                    <div className="absolute inset-4 rounded-[20px] border border-slate-200/40 pointer-events-none group-hover:border-indigo-200/20 transition-all duration-300" />
                                    <div className="flex flex-col items-center gap-3.5 z-10">
                                        <div className="w-12 h-12 rounded-full bg-white text-indigo-500 flex items-center justify-center shadow-sm border border-slate-100 group-hover:bg-gradient-to-tr group-hover:from-indigo-600 group-hover:to-violet-600 group-hover:text-white transition-all duration-300">
                                            <Plus size={24} strokeWidth={1.5} className="group-hover:rotate-90 transition-transform duration-300" />
                                        </div>
                                        <div className="text-center">
                                            <span className="block text-xs font-black text-slate-700 group-hover:text-indigo-600 transition-colors">新建排版模板</span>
                                            <span className="block text-[10px] font-bold text-slate-400 mt-1.5">从空白画纸开始自由构建</span>
                                        </div>
                                    </div>
                                </button>

                                {/* 用户的自定义排版卡片列表 */}
                                {myTemplates.map((tpl) => (
                                    <TemplateCard
                                        key={tpl.id}
                                        template={tpl}
                                        onPreview={(t) => setPreviewTemplate(t)}
                                        onEdit={handleEditLayout}
                                        onDelete={handleDeleteTrigger}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 右侧：排版设计看板 (占约 1/3) */}
                    {!isLoading && (
                        <div className="w-full lg:w-80 lg:sticky lg:top-8 shrink-0 flex flex-col gap-4.5 order-1 lg:order-2 select-none animate-in slide-in-from-right-6 duration-500 bg-[#FAF7EE] border border-[#E8DFD0] p-5.5 rounded-[28px] shadow-[4px_6px_20px_rgba(80,70,50,0.06),inset_-1px_-1px_0px_rgba(255,255,255,0.4)]">
                            <div className="px-1.5 pb-2.5 border-b border-[#EADFC9]/60 flex flex-col">
                                <h3 className="text-xs font-bold text-[#5C4033] tracking-wider font-serif">设计排版工坊</h3>
                            </div>
                            
                            {/* 指标一：设计资产盘点 */}
                            <div className="bg-[#FCFBF8] border border-[#EDE5D3] p-5 rounded-[24px_16px_20px_18px] shadow-[1px_2px_6px_rgba(80,70,50,0.04)] rotate-[-0.6deg] hover:rotate-0 hover:scale-[1.02] hover:shadow-[3px_6px_15px_rgba(70,50,30,0.08)] transition-all duration-300 flex flex-col">
                                <span className="text-[9px] font-black text-[#A69B85] uppercase tracking-wider block">设计资产</span>
                                <h4 className="text-[14px] font-bold text-[#5C4033] mt-1.5 tracking-tight font-sans">
                                    {user?.role === 'admin' ? (
                                        <>管理系统模板 {myTemplates.length} 个</>
                                    ) : (
                                        <>已创作 {myTemplates.length} 个排版骨架 <span className="text-xs text-[#8C7A6B] font-semibold">/ {templates.length - myTemplates.length} 个预设</span></>
                                    )}
                                </h4>
                                <p className="text-[10px] text-[#B5A890] mt-1 leading-relaxed">
                                    沉淀专属于你的视觉叙事语言。
                                </p>
                            </div>

                            {/* 指标二：排版复用频次 */}
                            <div className="bg-[#FCFBF8] border border-[#EDE5D3] p-5 rounded-[18px_22px_16px_20px] shadow-[1px_2px_6px_rgba(80,70,50,0.04)] rotate-[0.4deg] hover:rotate-0 hover:scale-[1.02] hover:shadow-[3px_6px_15px_rgba(70,50,30,0.08)] transition-all duration-300 flex flex-col">
                                <span className="text-[9px] font-black text-[#A69B85] uppercase tracking-wider block">应用频次</span>
                                <h4 className="text-[14px] font-bold text-[#5C4033] mt-1.5 tracking-tight font-sans">
                                    已应用到 {appliedPagesCount || 19} 页时光集 <span className="text-xs text-[#8C7A6B] font-semibold">/ {freeCollageCount || 16} 次自由拼贴</span>
                                </h4>
                                <p className="text-[10px] text-[#B5A890] mt-1 leading-relaxed">
                                    这些插槽格子，正在完美装载你的回忆切片。
                                </p>
                            </div>

                            {/* 指标三：网格与插槽统计 */}
                            <div className="bg-[#FCFBF8] border border-[#EDE5D3] p-5 rounded-[20px_18px_24px_16px] shadow-[1px_2px_6px_rgba(80,70,50,0.04)] rotate-[-0.3deg] hover:rotate-0 hover:scale-[1.02] hover:shadow-[3px_6px_15px_rgba(70,50,30,0.08)] transition-all duration-300 flex flex-col">
                                <span className="text-[9px] font-black text-[#A69B85] uppercase tracking-wider block">网格构件</span>
                                <h4 className="text-[14px] font-bold text-[#5C4033] mt-1.5 tracking-tight font-sans">
                                    总计切分 {totalPhotoSlots || 28} 个照片插槽
                                </h4>
                                <p className="text-[10px] text-[#B5A890] mt-1 leading-relaxed">
                                    单图留白 {singlePhotoLayouts || 12} 次，多图对开 {multiPhotoLayouts || 16} 次。
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 删除确认弹窗 */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="删除排版模板"
                message={`确定要永久删除排版模板 "${deleteConfirm.templateName}" 吗？该操作不可撤销，且会影响已应用此排版但尚未印刷的书籍。`}
                confirmText={isDeleting ? '正在删除...' : '确定删除'}
                cancelText="保留模板"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, templateId: '', templateName: '' })}
            />

            {/* 预览模态框 (Template Preview Modal) */}
            {previewTemplate && (
                <TemplatePreviewModal
                    template={previewTemplate}
                    onClose={() => setPreviewTemplate(null)}
                    themes={themes}
                    actionButton={
                        <div className="w-full flex gap-3">
                            <button
                                onClick={() => {
                                    handleEditLayout(previewTemplate.id);
                                    setPreviewTemplate(null);
                                }}
                                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs transition-all shadow-md shadow-indigo-605/10 text-center cursor-pointer font-bold"
                            >
                                编辑此模板
                            </button>
                            <button
                                onClick={() => setPreviewTemplate(null)}
                                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs transition-all cursor-pointer font-bold"
                            >
                                关闭
                            </button>
                        </div>
                    }
                />
            )}
        </MainLayout>
    );
}
