import { useEffect, useState } from 'react';
import { 
    FolderOpen, 
    Loader2, 
    X, 
    Trash2,
    Layers
} from 'lucide-react';
import { getBookService } from '../../../services/serviceFactory';
import { ConfirmModal } from '../../common/components/ConfirmModal';
import { useAuthStore } from '../../../store/useAuthStore';
import type { TemplateCollection } from '../../../types';

const bookService = getBookService();

export function MyCollections({ isEmbed = false }: { isEmbed?: boolean }) {
    const { user } = useAuthStore();
    const [collections, setCollections] = useState<TemplateCollection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // 预览弹窗状态
    const [previewCollection, setPreviewCollection] = useState<any | null>(null);

    // 删除确认弹窗状态
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        collectionId: string;
        collectionTitle: string;
    }>({ isOpen: false, collectionId: '', collectionTitle: '' });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        loadCollections();
    }, []);

    const loadCollections = async () => {
        setIsLoading(true);
        try {
            // 获取可用的模板合集列表 (传 true 获取本人的)
            const list = await bookService.getTemplateCollections(true);
            setCollections(list || []);
        } catch (error) {
            console.error('Failed to load collections:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 触发预览合集详情
    const handlePreviewTrigger = async (collectionId: string) => {
        setIsLoading(true);
        try {
            const detail = await bookService.getTemplateCollection(collectionId);
            if (detail) {
                setPreviewCollection(detail);
            }
        } catch (error) {
            console.error('Failed to load collection detail:', error);
            alert('加载合集详情失败');
        } finally {
            setIsLoading(false);
        }
    };

    // 触发删除合集
    const handleDeleteTrigger = (e: React.MouseEvent, colId: string, colTitle: string) => {
        e.stopPropagation();
        setDeleteConfirm({
            isOpen: true,
            collectionId: colId,
            collectionTitle: colTitle
        });
    };

    // 确定删除合集
    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await bookService.deleteTemplateCollection(deleteConfirm.collectionId);
            setCollections(prev => prev.filter(c => c.id !== deleteConfirm.collectionId));
        } catch (error) {
            console.error('Failed to delete template collection:', error);
            alert('删除合集失败，请稍后重试');
        } finally {
            setIsDeleting(false);
            setDeleteConfirm({ isOpen: false, collectionId: '', collectionTitle: '' });
        }
    };

    const content = (
        <div className="p-8 max-w-7xl mx-auto font-['Outfit',_sans-serif] min-h-[500px]">
            {isLoading && !previewCollection ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 size={36} className="animate-spin text-indigo-650" />
                    <span className="text-slate-400 text-xs font-black tracking-wider uppercase">正在加载模板合集...</span>
                </div>
            ) : collections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-[28px] border border-dashed border-slate-200 select-none">
                    <FolderOpen size={48} className="text-slate-350 mb-3" />
                    <h3 className="text-sm font-black text-slate-700">暂无自定义合集</h3>
                    <p className="text-slate-400 text-xs mt-1">您可以在编辑器中创建或将设计的常用组合整理为排版合集。</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 select-none">
                    {collections.map(col => {
                        const isOwner = col.author === user?.id || col.author === user?.nickname || user?.role === 'admin' || user?.role === 'designer';
                        
                        return (
                            <div 
                                key={col.id} 
                                onClick={() => handlePreviewTrigger(col.id)}
                                className="bg-white border border-slate-200/60 rounded-[28px] p-5.5 shadow-sm hover:shadow-[0_16px_36px_-6px_rgba(79,70,229,0.08)] hover:border-indigo-150 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between cursor-pointer group relative"
                            >
                                <div className="flex-1 flex flex-col">
                                    {/* 标签 */}
                                    <div className="flex items-center justify-between mb-3.5">
                                        <span className="text-[9px] font-black px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full tracking-wider uppercase">
                                            {col.visibility === 'public' ? '公开' : '私有'}
                                        </span>
                                    </div>

                                    {/* 合集书本叠放效果封面预览 */}
                                    <div className="w-full h-[150px] bg-slate-50 border border-slate-100 rounded-2xl mb-4 overflow-hidden relative flex items-center justify-center transition-all duration-300">
                                        <div className="relative w-[85px] h-[120px] transition-transform group-hover:scale-105 duration-300">
                                            {/* 底层阴影纸 */}
                                            <div className="absolute top-2 left-2 w-full h-full bg-slate-200/60 border border-slate-200 rounded-md shadow-xs rotate-3" />
                                            {/* 中层阴影纸 */}
                                            <div className="absolute top-1 left-1 w-full h-full bg-slate-100 border border-slate-150 rounded-md shadow-xs -rotate-2" />
                                            {/* 主封面纸 */}
                                            <div className="absolute inset-0 bg-white border border-slate-250 rounded-md shadow-[0_4px_12px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col items-center justify-center bg-gradient-to-br from-white to-slate-50">
                                                {col.cover ? (
                                                    <img src={col.cover} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <FolderOpen className="w-8 h-8 text-indigo-500/80" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 合集标题 */}
                                    <h3 className="text-sm font-black text-slate-800 line-clamp-1 mb-1.5 group-hover:text-indigo-650 transition-colors">
                                        {col.title}
                                    </h3>
                                    
                                    <p className="text-[10px] text-slate-400 font-semibold line-clamp-2 leading-relaxed mb-4">
                                        {col.description || '由设计师整理的多页模组排版合集。'}
                                    </p>
                                </div>

                                {/* 操作条 / 属性条 */}
                                <div className="border-t border-slate-100/60 pt-3 flex items-center justify-between">
                                    <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-1">
                                        <Layers size={10} />
                                        <span>排版合集</span>
                                    </span>

                                    {isOwner && (
                                        <button
                                            onClick={(e) => handleDeleteTrigger(e, col.id, col.title)}
                                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                            title="删除合集"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* 详情预览模态框 */}
            {previewCollection && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* 头部 */}
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                                    <FolderOpen className="text-indigo-600" size={20} />
                                    <span>合集详情预览: {previewCollection.title}</span>
                                </h3>
                                <p className="text-slate-400 text-[11px] font-semibold mt-0.5">
                                    {previewCollection.description || '当前合集中包含的页面排版模板'}
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewCollection(null)}
                                className="p-2 text-slate-400 hover:text-slate-650 bg-slate-50 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* 内容区 */}
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 min-h-0">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-center">
                                {previewCollection.items && previewCollection.items.length > 0 ? (
                                    previewCollection.items.map((item: any, index: number) => (
                                        <div key={item.pageTemplateId || index} className="bg-white border border-slate-200/80 p-3 rounded-2xl flex flex-col items-center gap-3.5 shadow-sm group">
                                            <div className="relative h-32 w-full flex items-center justify-center bg-slate-50/40 rounded-xl border border-slate-100 overflow-hidden">
                                                {item.pageTemplate?.thumbnailUrl ? (
                                                    <img 
                                                        src={item.pageTemplate.thumbnailUrl} 
                                                        alt="" 
                                                        className="w-[80px] h-[113px] border border-slate-205 rounded-lg bg-white object-cover shadow-xs transition-transform group-hover:scale-105" 
                                                    />
                                                ) : (
                                                    <div className="w-[80px] h-[113px] border border-slate-205 rounded-lg bg-white shadow-xs flex flex-col items-center justify-center">
                                                        <Layers className="text-indigo-200 w-5 h-5 mb-1" />
                                                        <span className="text-[8px] text-slate-450 font-bold">排版页</span>
                                                    </div>
                                                )}
                                                <span className="absolute top-1.5 left-1.5 bg-slate-900/60 text-white font-extrabold text-[8px] px-1.5 py-0.5 rounded shadow-sm">
                                                    P{index + 1}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-700 truncate w-full text-center">
                                                {item.pageTemplate?.name || '页面模板'}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-12 text-slate-400 text-xs font-bold">
                                        该合集为空，未包含任何页面模板
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 底部 */}
                        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setPreviewCollection(null)}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-205 text-slate-655 rounded-2xl font-bold text-[13px] transition-colors cursor-pointer"
                            >
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 删除确认弹窗 */}
            <ConfirmModal
                isOpen={deleteConfirm.isOpen}
                title="删除排版合集"
                message={`确定要永久删除排版合集 "${deleteConfirm.collectionTitle}" 吗？该操作不可撤销，已在书籍中套用此合集生成的页面不会受影响。`}
                confirmText={isDeleting ? '正在删除...' : '确定删除'}
                cancelText="保留合集"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteConfirm({ isOpen: false, collectionId: '', collectionTitle: '' })}
            />
        </div>
    );

    if (isEmbed) return content;
    return (
        <div className="min-h-screen bg-slate-50">
            {content}
        </div>
    );
}
