import React from 'react';
import { 
    Trash2, 
    Edit3, 
    Image as ImageIcon, 
    Type, 
    Eye, 
    EyeOff,
    Bookmark,
    BookmarkCheck,
    Loader2,
    User,
    Sparkles
} from 'lucide-react';
import type { Template } from '../../../types';

interface TemplateCardProps {
    template: Template;
    onPreview: (template: Template) => void;
    onEdit?: (templateId: string) => void;
    onDelete?: (templateId: string, templateName: string) => void;
    isCollected?: boolean;
    isSystem?: boolean;
    onCollectToggle?: (templateId: string, isCollected: boolean) => void;
    isActionLoading?: boolean;
}

const categoryNames: Record<string, string> = {
    general: '通用',
    travel: '旅行',
    journal: '手帐',
    family: '家庭',
    minimalist: '极简',
    retro: '复古',
};

export const TemplateCard: React.FC<TemplateCardProps> = ({
    template,
    onPreview,
    onEdit,
    onDelete,
    isCollected = false,
    isSystem = false,
    onCollectToggle,
    isActionLoading = false,
}) => {
    const elements = template.layoutSchema?.elements || [];
    const photoCount = elements.filter(e => e.type === 'photo').length || 0;
    const textCount = elements.filter(e => e.type === 'text').length || 0;
    const isPublic = template.visibility === 'public';

    return (
        <div className="bg-white border border-slate-200/60 rounded-[28px] overflow-hidden shadow-sm hover:shadow-[0_16px_36px_-6px_rgba(79,70,229,0.08)] hover:border-indigo-150 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">
            {/* 卡片体 */}
            <div className="p-5 flex-1 flex flex-col">
                {/* 分类及可访问权限徽标 */}
                <div className="flex items-center justify-between mb-3 select-none">
                    <span className="text-[9px] font-black px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full tracking-wider uppercase">
                        {categoryNames[template.category || ''] || '通用'}
                    </span>
                    
                    {onEdit && onDelete ? (
                        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider ${
                            isPublic 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-amber-50 text-amber-700'
                        }`}>
                            {isPublic ? <Eye size={10} /> : <EyeOff size={10} />}
                            {isPublic ? '市场公开' : '个人私有'}
                        </span>
                    ) : (
                        <span className="text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 uppercase tracking-wider bg-slate-100 text-slate-500">
                            <User size={10} />
                            {isSystem ? '系统内置' : '用户创建'}
                        </span>
                    )}
                </div>

                {/* 微缩 A4 画布实景预览（Figma / Canva 样式） */}
                <div 
                    onClick={() => onPreview(template)}
                    className="w-full h-[160px] bg-slate-50 hover:bg-slate-100/60 border border-slate-100 rounded-2xl mb-4 overflow-hidden relative flex items-center justify-center transition-all duration-300 select-none cursor-pointer"
                >
                    {/* 微缩纸张 */}
                    <div className="w-[100px] h-[141px] bg-white rounded-md border border-slate-200/50 shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] relative overflow-hidden transition-transform group-hover:scale-105 duration-300">
                        {elements.map((el) => {
                            const isPhoto = el.type === 'photo' || el.type === 'photo-frame';
                            
                            let left = '0%';
                            let top = '0%';
                            let width = '100%';
                            let height = '100%';
                            let borderRadius = '2px';
                            let borderWidth = '0px';
                            let borderColor = 'transparent';

                            if (el.style) {
                                left = el.style.left;
                                top = el.style.top;
                                width = el.style.width;
                                height = el.style.height;
                                borderRadius = el.style.borderRadius ? `calc(${el.style.borderRadius} / 6)` : '2px';
                                borderWidth = el.style.borderWidth ? `calc(${el.style.borderWidth} / 6)` : '0px';
                                borderColor = el.style.borderColor || 'transparent';
                            } else {
                                const vWidth = 1000;
                                const vHeight = 1414;
                                left = `${((el.x || 0) / vWidth) * 100}%`;
                                top = `${((el.y || 0) / vHeight) * 100}%`;
                                width = `${((el.width || 0) / vWidth) * 100}%`;
                                height = `${((el.height || 0) / vHeight) * 100}%`;
                            }

                            return (
                                <div
                                    key={el.id}
                                    className={`absolute border transition-all flex items-center justify-center overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] ${
                                        isPhoto 
                                            ? 'bg-indigo-50/60 border-indigo-200/30 text-indigo-400' 
                                            : 'bg-amber-50/40 border-amber-200/20 text-amber-500'
                                    }`}
                                    style={{
                                        left,
                                        top,
                                        width,
                                        height,
                                        borderRadius,
                                        borderWidth,
                                        borderColor,
                                    }}
                                >
                                    {isPhoto ? (
                                        <ImageIcon size={10} className="opacity-30" />
                                    ) : (
                                        <div className="flex flex-col gap-[1px] w-[60%] items-center opacity-30">
                                            <div className="h-[1.5px] w-full bg-amber-400 rounded-full" />
                                            <div className="h-[1.5px] w-[80%] bg-amber-400 rounded-full" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {/* Hover 渐变蒙层 */}
                    <div className="absolute inset-0 bg-slate-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="px-3.5 py-1.5 bg-white text-slate-850 font-black text-[10px] rounded-xl shadow-md tracking-wider transition-all scale-90 group-hover:scale-100 duration-300 border border-slate-100 flex items-center gap-1.5">
                            <Sparkles size={11} className="text-indigo-650 animate-pulse" />
                            <span>实时效果预览</span>
                        </span>
                    </div>
                </div>

                {/* 模板标题 */}
                <h3 className="text-sm font-black text-slate-800 line-clamp-1 mb-3 group-hover:text-indigo-600 transition-colors">
                    {template.name}
                </h3>

                {/* 槽位数统计 */}
                <div className="flex gap-4 border-t border-slate-100/60 pt-3 select-none">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold tracking-wider">
                        <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center">
                            <ImageIcon size={10} />
                        </div>
                        <span>照片槽 x{photoCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold tracking-wider">
                        <div className="w-5 h-5 rounded-md bg-amber-50 text-amber-500 flex items-center justify-center">
                            <Type size={10} />
                        </div>
                        <span>文本框 x{textCount}</span>
                    </div>
                </div>
            </div>

            {/* 操作条 */}
            <div className="bg-slate-50/50 px-5 py-3 border-t border-slate-100 flex items-center justify-between select-none">
                {onEdit && onDelete ? (
                    <>
                        <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">ID: {template.id.substring(0, 8)}</span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onEdit(template.id)}
                                className="p-1.5 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                title="编辑设计"
                            >
                                <Edit3 size={14} />
                            </button>
                            <button
                                onClick={() => onDelete(template.id, template.name)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                title="删除模板"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {template.creatorId === 'system' ? (
                            <div className="flex-1" />
                        ) : (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-450 font-bold truncate max-w-[120px]">
                                <div className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[8px] font-black border border-indigo-100/50 uppercase select-none">
                                    {template.creatorId ? template.creatorId.substring(0, 1) : 'U'}
                                </div>
                                <span className="truncate">用户 {template.creatorId?.substring(0, 6)}</span>
                            </div>
                        )}
                        
                        {isSystem ? (
                            <div className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black text-emerald-600 bg-emerald-50/50 rounded-lg border border-emerald-100/30 select-none">
                                <span className="text-[10px] font-bold">✓</span> 已集成
                            </div>
                        ) : (
                            onCollectToggle && (
                                <button
                                    disabled={isActionLoading}
                                    onClick={() => onCollectToggle(template.id, isCollected)}
                                    className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black transition-all border cursor-pointer uppercase ${
                                        isCollected
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 group/btn'
                                            : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700 shadow-sm'
                                    }`}
                                >
                                    {isActionLoading ? (
                                        <Loader2 size={10} className="animate-spin" />
                                    ) : isCollected ? (
                                        <>
                                            <BookmarkCheck size={10} className="group-hover/btn:hidden" />
                                            <span className="group-hover/btn:hidden">已收藏</span>
                                            <Bookmark size={10} className="hidden group-hover/btn:inline" />
                                            <span className="hidden group-hover/btn:inline">取消收藏</span>
                                        </>
                                    ) : (
                                        <>
                                            <Bookmark size={10} />
                                            <span>点击收藏</span>
                                        </>
                                    )}
                                </button>
                            )
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
