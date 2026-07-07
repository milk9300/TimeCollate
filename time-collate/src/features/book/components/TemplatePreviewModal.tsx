import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import type { Template } from '../../../types';
import { getResizeImageUrl } from '../../../utils/coverCaptureHelper';

interface TemplatePreviewModalProps {
    template: Template;
    onClose: () => void;
    themes?: any[];
    actionButton?: React.ReactNode;
}

const categoryNames: Record<string, string> = {
    general: '通用',
    travel: '旅行',
    journal: '手帐',
    family: '家庭',
    minimalist: '极简',
    retro: '复古',
};

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
    template,
    onClose,
    actionButton
}) => {
    return (
        <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-7 flex flex-col md:flex-row gap-6 md:gap-7 shadow-2xl border border-slate-150/40 animate-in zoom-in-95 duration-200 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 右上角绝对定位关闭按钮 */}
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer z-10"
                >
                    <X size={16} />
                </button>

                {/* 左侧：大的排版缩略图 (直角 A4) */}
                <div className="w-full md:w-[260px] h-[367px] bg-slate-50 border border-slate-250 shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden rounded-none shrink-0 flex items-center justify-center">
                    {template.thumbnailUrl || template.coverUrl ? (
                        <img 
                            src={getResizeImageUrl(template.thumbnailUrl || template.coverUrl, 500)} 
                            alt={template.name} 
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50">
                            <ImageIcon className="text-indigo-200 w-10 h-10 mb-2 opacity-60" />
                            <span className="text-[9px] text-slate-400 font-bold">暂无排版缩略图</span>
                        </div>
                    )}
                </div>

                {/* 右侧：详细内容与操作按钮 */}
                <div className="flex-1 flex flex-col justify-between py-1.5 min-w-0">
                    <div className="space-y-4">
                        {/* 标题及 ID 信息 */}
                        <div>
                            <h3 className="text-base font-black text-slate-800 tracking-tight leading-tight line-clamp-2 pr-6">
                                {template.name}
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-3 select-none">
                                <span className="text-[8px] font-black px-2.5 py-0.5 bg-slate-150 text-slate-650 rounded-md tracking-wider uppercase">
                                    {categoryNames[template.category || ''] || '通用'}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-100">
                                    ID: {template.id.substring(0, 8).toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* 精美印刷说明板 */}
                        <div className="bg-[#FAF7EE] border border-[#EADFC9]/60 p-4.5 rounded-2xl text-[10px] text-[#5C4033] leading-relaxed font-serif">
                            💡 <strong>印前排版说明：</strong>
                            本排版格式为高保真网格布局，已进行多设备物理对齐与防虚封边校准。实际印刷时，照片和文本会根据您选择的视觉风格主题进行智能适配渲染。
                        </div>
                    </div>

                    {/* 操作控制区 (Edit, Delete, Close 等按钮) */}
                    {actionButton && (
                        <div className="w-full mt-6 shrink-0">
                            {actionButton}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
