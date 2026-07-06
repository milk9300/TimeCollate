import React, { useState } from 'react';
import { X, Eye } from 'lucide-react';
import type { Template } from '../../../types';
import { BookRenderer } from '../../../rendering/BookRenderer';
import { ThemeProvider } from '../../../rendering/ThemeManager';

interface TemplatePreviewModalProps {
    template: Template;
    onClose: () => void;
    themes: any[];
    actionButton?: React.ReactNode;
}

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

export const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
    template,
    onClose,
    themes,
    actionButton
}) => {
    const [selectedThemeId, setSelectedThemeId] = useState<string>('default');

    const currentTheme = themes.find(t => t.id === selectedThemeId) || themes[0];
    const themeSchema = currentTheme?.themeSchema || {
        backgroundColor: '#FFFFFF',
        primaryColor: '#1A1A1A',
        secondaryColor: '#4B5563',
        accentColor: '#6366F1',
        fontFamily: 'sans'
    };

    const elements = template.layoutSchema?.elements || [];
    const photoCount = elements.filter(e => e.type === 'photo').length || 0;
    const textCount = elements.filter(e => e.type === 'text').length || 0;

    // Construct mock content JSON string containing active theme settings
    const mockContent = JSON.stringify({
        slots: {
            'page-content': { 
                content: '这是由时光集排版系统渲染的动态内容区域。通过这套高保真沙盒，你可以任意调整下方的视觉主题，观察该排版在不同配色与字体下的真实表现。' 
            },
            'slot-0': { content: '那年夏季，海风吹来' },
            'slot-1': { content: '海浪声声，我们在阳光下歌唱' },
            'slot-2': { content: '时光的脚印，岁月的印记' },
            'slot-3': { content: '记录生活里的每一个小幸运' },
            'slot-4': { content: '愿你终身美丽，眼里盛满星河' }
        },
        atmosphere: themeSchema.atmosphere || 'default',
        fontFamily: themeSchema.fontFamily || 'sans'
    });

    const mockPhotos = SAMPLE_PHOTOS.slice(0, photoCount).map((p, idx) => ({
        id: `mock-photo-${idx}`,
        url: p.url,
        caption: p.caption,
        scale: 1.0,
        xOffset: 50,
        yOffset: 50,
        styleType: 'normal' as const,
        filterType: 'none',
        slotIndex: idx
    })) as any[];

    const mockPage = {
        id: 'mock-preview-page',
        templateId: template.id,
        content: mockContent,
        photos: mockPhotos
    };

    return (
        <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-3xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden shadow-2xl border border-gray-100 max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left Page Render Area */}
                <div className="flex-1 bg-slate-50 border-r border-gray-100 flex flex-col items-center justify-center p-6 min-h-[400px] md:min-h-[550px] relative overflow-hidden select-none">
                    <span className="absolute top-4 left-4 text-[10px] font-bold text-gray-400 bg-gray-200/50 px-2 py-0.5 rounded-full flex items-center gap-1 z-20">
                        <Eye size={10} />
                        <span>真实印刷排版效果</span>
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
                            {currentTheme ? (
                                <ThemeProvider theme={currentTheme.id}>
                                    <BookRenderer
                                        page={mockPage}
                                        pageSize="A4"
                                        chapterTitle="回忆的旅途"
                                        chapterDate="2026.05"
                                        readOnly={true}
                                    />
                                </ThemeProvider>
                            ) : (
                                <div className="w-[300px] h-[424px] bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-400">
                                    正在渲染画布...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Settings Control Panel */}
                <div className="w-full md:w-80 p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-base font-black text-slate-900 leading-tight">{template.name}</h3>
                                <p className="text-[10px] text-indigo-650 bg-indigo-50 px-2.5 py-0.5 rounded-md inline-block mt-1 font-bold">
                                    排版模板 · {photoCount}张照片 | {textCount}文
                                </p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-1 hover:bg-gray-150 rounded-full transition-colors cursor-pointer"
                            >
                                <X size={18} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="border-t border-slate-100 pt-4 my-4">
                            <label className="text-[10px] font-bold text-gray-400 block mb-2 uppercase tracking-wider">切换视觉主题进行联调:</label>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {themes.map(theme => (
                                    <button
                                        key={theme.id}
                                        onClick={() => setSelectedThemeId(theme.id)}
                                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                                            selectedThemeId === theme.id
                                                ? 'border-indigo-600 bg-indigo-50/20 text-indigo-950 font-bold'
                                                : 'border-slate-100 hover:border-slate-200 text-gray-700 bg-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div 
                                                style={{ background: theme.themeSchema.primaryColor }}
                                                className="w-3.5 h-3.5 rounded-full border border-white shadow-sm flex-shrink-0"
                                            />
                                            <span className="text-xs truncate">{theme.name}</span>
                                        </div>
                                        <span className="text-[9px] text-gray-400 group-hover:text-gray-650">
                                            {theme.creatorId === 'system' ? '内置' : '自定义'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3 text-[10px] text-gray-500 leading-relaxed border border-gray-100">
                            💡 <strong>提示：</strong>排版在印刷时会根据选择的主题自动应用底纹、字体类型、网格间距和相框物理材质（如宝丽来、电影胶片等）。
                        </div>
                    </div>

                    {actionButton && (
                        <div className="mt-6">
                            {actionButton}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
