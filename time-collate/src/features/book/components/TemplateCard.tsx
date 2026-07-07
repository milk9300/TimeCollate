import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { Template } from '../../../types';
import { getResizeImageUrl } from '../../../utils/coverCaptureHelper';

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

export const TemplateCard: React.FC<TemplateCardProps> = ({
    template,
    onPreview,
}) => {
    return (
        <div 
            onClick={() => onPreview(template)}
            className="relative w-full aspect-[3/4.24] rounded-none overflow-hidden border border-slate-200 bg-white shadow-xs hover:shadow-[0_12px_24px_rgba(0,0,0,0.1)] hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-300 group cursor-pointer flex items-center justify-center select-none"
        >
            {/* 真实缩略图 (经云端实时裁剪优化，体积从 1.7MB 降低至 ~20KB) */}
            {template.thumbnailUrl || template.coverUrl ? (
                <img 
                    src={getResizeImageUrl(template.thumbnailUrl || template.coverUrl, 300)} 
                    alt={template.name} 
                    className="w-full h-full object-cover transition-transform duration-350 group-hover:scale-103"
                />
            ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center w-full h-full bg-slate-50 transition-transform duration-350 group-hover:scale-103">
                    <ImageIcon className="text-indigo-200 w-8 h-8 mb-1.5 opacity-60" />
                    <span className="text-[9px] text-slate-400 font-bold">无排版缩略图</span>
                </div>
            )}
        </div>
    );
};
