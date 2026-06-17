import React, { useRef, useState } from 'react';
import { useBookStore, getVirtualChapters } from '../../../store';
import { ImagePlus, Calendar, Plus, MoreHorizontal, FileText, Trash2, Settings, Layout, Info } from 'lucide-react';
import { PAGE_SIZES, type PageSize } from '../../../rendering/PhysicalConstants';
import { PREFACE_TEMPLATES, compilePrefaceText } from '../../../rendering/constants/prefaceTemplates';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortablePhotoItem } from './SortablePhotoItem';
import { LockOverlay } from './LockOverlay';

interface ChapterEditorProps {
    chapterId: string | null;
    activePageId: string | null;
    onPageChange: (pageId: string) => void;
    onUnlock?: () => void;
}

/**
 * @description 章节与书籍编辑控制面板
 * 包含：书籍全局设置（尺寸、主题）、章节元数据、页面多级编辑、智能素材池管理
 */
export const ChapterEditor: React.FC<ChapterEditorProps> = ({
    chapterId,
    activePageId,
    onPageChange,
    onUnlock
}) => {
    const {
        currentBook,
        updateBookSettings,
        updateChapter,
        updatePage,
        addPageToChapter,
        deletePage,
        uploadPhotoToPage,
        deletePhotoFromPage,
        reorderPhotosInPage,
        themes,
        templates
    } = useBookStore();

    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const [isLayoutPopoverOpen, setIsLayoutPopoverOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 拖拽排序相关 - 必须放在顶层，不能在 early return 之后
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    if (!currentBook) return null;

    const chapters = React.useMemo(() => {
        if (!currentBook || !currentBook.pages) return [];
        return getVirtualChapters(currentBook.pages);
    }, [currentBook]);

    if (!chapterId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                <div className="w-16 h-16 rounded-full border border-gray-200 flex items-center justify-center mb-4">
                    <MoreHorizontal size={24} strokeWidth={1.5} />
                </div>
                <p className="text-sm font-medium">请选择要编辑的章节</p>
            </div>
        );
    }

    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return null;

    const currentPage = chapter.pages.find(p => p.id === activePageId) || chapter.pages[0];
    if (!currentPage) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            await uploadPhotoToPage(chapterId, currentPage.id, files[i]);
        }
        e.target.value = '';
    };

    const handleAddPage = async () => {
        const newPageId = await addPageToChapter(chapterId);
        if (newPageId) onPageChange(newPageId);
    };

    const handleDeletePage = async (pageId: string) => {
        if (chapter.pages.length <= 1) return;
        await deletePage(chapterId, pageId);
        if (chapter.pages[0]) onPageChange(chapter.pages[0].id);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = currentPage.photos.findIndex(p => p.id === active.id);
        const newIndex = currentPage.photos.findIndex(p => p.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            const newOrder = arrayMove(currentPage.photos, oldIndex, newIndex);
            await reorderPhotosInPage(chapterId, currentPage.id, newOrder.map(p => p.id));
        }
    };

    const renderLayoutSvg = (tpl: any) => {
        const elements = tpl?.layoutSchema?.elements || [];
        return (
            <svg className="w-12 h-16 border border-gray-200 rounded bg-slate-50 text-indigo-550/80 p-0.5 transition-transform group-hover:scale-105 shadow-sm" viewBox="0 0 100 141.4">
                {/* Simulated page background */}
                <rect x="0" y="0" width="100" height="141.4" fill="#FFFFFF" rx="2" />
                {elements.map((el: any) => {
                    const left = parseFloat(el.style.left) || 0;
                    const top = (parseFloat(el.style.top) || 0) * 1.414;
                    const width = parseFloat(el.style.width) || 0;
                    const height = (parseFloat(el.style.height) || 0) * 1.414;

                    if (el.type === 'photo') {
                        return (
                            <rect
                                key={el.id}
                                x={left}
                                y={top}
                                width={width}
                                height={height}
                                rx="2"
                                fill="currentColor"
                                fillOpacity="0.15"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeLinejoin="round"
                            />
                        );
                    }
                    if (el.type === 'text') {
                        return (
                            <rect
                                key={el.id}
                                x={left}
                                y={top}
                                width={width}
                                height={height}
                                rx="1"
                                fill="currentColor"
                                fillOpacity="0.05"
                                stroke="currentColor"
                                strokeWidth="0.5"
                                strokeDasharray="1.5 1.5"
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
        <div className="flex-1 overflow-hidden bg-white flex flex-col h-full relative">
            {currentBook.status === 'published' && onUnlock && (
                <LockOverlay onUnlock={onUnlock} />
            )}
            {/* 1. Global Book Settings Header */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                <button
                    onClick={() => setShowGlobalSettings(!showGlobalSettings)}
                    className="flex items-center justify-between w-full text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-primary transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Settings size={12} />
                        书籍全局设置
                    </div>
                    <MoreHorizontal size={14} className={`transform transition-transform ${showGlobalSettings ? 'rotate-90' : ''}`} />
                </button>

                {showGlobalSettings && (
                    <div className="mt-4 space-y-5 pb-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* 引言 / 序言 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">启用序言页</label>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={currentBook.showPreface !== false}
                                        onChange={(e) => updateBookSettings({ showPreface: e.target.checked })}
                                        className="sr-only peer"
                                    />
                                    <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                            
                            {currentBook.showPreface !== false && (
                                <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                                    <textarea
                                        value={currentBook.preface || ''}
                                        onChange={(e) => updateBookSettings({ preface: e.target.value })}
                                        className="w-full h-24 resize-none text-xs font-medium bg-white border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-primary transition-colors leading-relaxed"
                                        placeholder="在这里输入作品的引言、寄语或序言..."
                                    />
                                    
                                    <div className="space-y-1.5">
                                        <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">金句模板库 (一键套用)</span>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {PREFACE_TEMPLATES.map((tpl) => (
                                                <button
                                                    key={tpl.id}
                                                    onClick={() => {
                                                        const compiled = compilePrefaceText(tpl.content, currentBook);
                                                        updateBookSettings({ preface: compiled });
                                                    }}
                                                    className="p-2 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded text-left transition-all duration-150 group"
                                                    title={tpl.content}
                                                >
                                                    <div className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-700">{tpl.name}</div>
                                                    <div className="text-[8px] text-slate-400 line-clamp-1 group-hover:text-indigo-400 mt-0.5">{tpl.content.replace(/\n/g, ' ')}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 物理属性 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] text-gray-400 mb-1 font-bold uppercase tracking-wider">纸张尺寸</label>
                                <select
                                    value={currentBook.pageSize}
                                    onChange={(e) => updateBookSettings({ pageSize: e.target.value as PageSize })}
                                    className="w-full text-xs font-medium bg-white border border-gray-200 rounded px-2 py-1.5 outline-none"
                                >
                                    {Object.entries(PAGE_SIZES).map(([key, value]) => (
                                        <option key={key} value={key}>{value.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] text-gray-400 mb-1 font-bold uppercase tracking-wider">视觉主题</label>
                                <select
                                    value={currentBook.theme}
                                    onChange={(e) => updateBookSettings({ theme: e.target.value })}
                                    className="w-full text-xs font-medium bg-white border border-gray-200 rounded px-2 py-1.5 outline-none"
                                >
                                    <option value="classic">经典雅致 (Classic)</option>
                                    <option value="modern">现代简约 (Modern)</option>
                                    <option value="warm">温馨时光 (Warm)</option>
                                    <option value="magazine">时尚杂志 (Magazine)</option>
                                    {themes && themes.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Chapter Meta Editor */}
            <div className="p-6 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-cta font-bold tracking-widest uppercase text-[10px]">
                        <Calendar size={12} />
                        <input
                            type="date"
                            value={chapter.date || ''}
                            onChange={(e) => updateChapter(chapterId, { date: e.target.value })}
                            className="bg-transparent border-none outline-none cursor-pointer hover:text-primary transition-colors"
                        />
                    </div>
                </div>
                <input
                    type="text"
                    value={chapter.title}
                    onChange={(e) => updateChapter(chapterId, { title: e.target.value })}
                    className="text-2xl font-black text-primary border-none outline-none placeholder-gray-200 w-full tracking-tight focus:ring-0"
                    placeholder="章节标题"
                />
            </div>

            {/* 3. Page Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
                {chapter.pages.map((page, index) => (
                    <button
                        key={page.id}
                        onClick={() => onPageChange(page.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${currentPage.id === page.id
                            ? 'bg-primary text-white shadow-sm'
                            : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                            }`}
                    >
                        <FileText size={12} />
                        <span>第 {index + 1} 页</span>
                    </button>
                ))}
                <button
                    onClick={handleAddPage}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-400 hover:text-cta hover:bg-gray-100 border border-dashed border-gray-300 transition-all flex-shrink-0"
                >
                    <Plus size={12} />
                    <span>添加页</span>
                </button>
            </div>

            {/* 4. Page Detail Editor */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6" >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 relative">
                        <Layout size={14} className="text-gray-400" />
                        
                        {/* Selector Trigger Button */}
                        <button
                            onClick={() => setIsLayoutPopoverOpen(!isLayoutPopoverOpen)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 shadow-sm cursor-pointer transition-all"
                        >
                            <span>{templates.find(t => t.id === currentPage.layout)?.name || '选择排版'}</span>
                            <span className="text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md font-semibold">
                                {templates.find(t => t.id === currentPage.layout)?.photoCount || 0} 张照片
                            </span>
                        </button>

                        {/* Floating Layout Popover */}
                        {isLayoutPopoverOpen && (
                            <>
                                {/* Overlay to close */}
                                <div 
                                    className="fixed inset-0 z-30 cursor-default" 
                                    onClick={() => setIsLayoutPopoverOpen(false)}
                                />
                                
                                <div className="absolute top-full left-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl p-4 w-72 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                                    <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3">切换页面排版布局</h4>
                                    <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                                        {templates.map(t => {
                                            const isSelected = currentPage.layout === t.id;
                                            return (
                                                <button
                                                    key={t.id}
                                                    onClick={() => {
                                                        updatePage(chapterId, currentPage.id, { layout: t.id });
                                                        setIsLayoutPopoverOpen(false);
                                                    }}
                                                    className={`p-2 rounded-xl border flex flex-col items-center gap-2 transition-all group cursor-pointer ${
                                                        isSelected
                                                            ? 'border-indigo-600 bg-indigo-50/15'
                                                            : 'border-gray-100 hover:border-gray-250 bg-white hover:bg-slate-50/40'
                                                    }`}
                                                >
                                                    {/* Blueprint Thumbnail */}
                                                    <div className="w-full flex justify-center">
                                                        {renderLayoutSvg(t)}
                                                    </div>

                                                    {/* Layout Info */}
                                                    <div className="text-center w-full">
                                                        <p className={`text-[10px] font-bold truncate leading-tight ${
                                                            isSelected ? 'text-indigo-950' : 'text-gray-700'
                                                        }`}>
                                                            {t.name}
                                                        </p>
                                                        <span className="text-[8px] text-gray-400 block mt-0.5 font-semibold">
                                                            {t.photoCount} 张照片
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {chapter.pages.length > 1 && (
                        <button
                            onClick={() => handleDeletePage(currentPage.id)}
                            className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                        >
                            <Trash2 size={12} />
                            删除页面
                        </button>
                    )}
                </div>

                <textarea
                    value={currentPage.content}
                    onChange={(e) => updatePage(chapterId, currentPage.id, { content: e.target.value })}
                    className="w-full resize-none border-none outline-none text-base text-secondary leading-relaxed min-h-[120px] placeholder-gray-300 focus:ring-0 font-light"
                    placeholder="在这里记录这一页的内容..."
                />

                <div className="h-px bg-gray-100" />

                {/* 5. Imagery & Smart Pool */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-primary tracking-widest uppercase flex items-center gap-2">
                            <ImagePlus size={12} className="text-cta" />
                            素材库
                        </h3>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-gray-50 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
                        >
                            <Plus size={14} />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
                    </div>

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={currentPage.photos.filter(p => p && p.url).map(p => p.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid grid-cols-3 gap-2">
                                {currentPage.photos.filter(p => p && p.url).map((photo, index) => {
                                    const layoutLimits: Record<string, number> = {
                                        single: 1, grid: 9, collage: 4, cover: 1, magazine: 4, journal: 2
                                    };
                                    const dynamicTemplate = templates.find(t => t.id === currentPage.layout);
                                    const maxPhotos = dynamicTemplate ? dynamicTemplate.photoCount : (layoutLimits[currentPage.layout] || 4);
                                    const isOverflow = index >= maxPhotos;

                                    return (
                                        <SortablePhotoItem
                                            key={photo.id}
                                            photo={photo}
                                            index={index}
                                            isOverflow={isOverflow}
                                            onDelete={() => deletePhotoFromPage(chapterId, currentPage.id, photo.id)}
                                        />
                                    );
                                })}
                                {/* 上传占位 */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-cta hover:bg-gray-100 transition-all"
                                >
                                    <Plus size={20} className="text-gray-300" />
                                </div>
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div >

            {
                (() => {
                    const layoutLimits: Record<string, number> = { single: 1, grid: 9, collage: 4, cover: 1, magazine: 4, journal: 2 };
                    const dynamicTemplate = templates.find(t => t.id === currentPage.layout);
                    const maxPhotos = dynamicTemplate ? dynamicTemplate.photoCount : (layoutLimits[currentPage.layout] || 4);
                    const validPhotosCount = currentPage.photos.filter(p => p && p.url).length;
                    if (validPhotosCount > maxPhotos) {
                        return (
                            <div className="mt-4 p-3 bg-amber-50 rounded-lg flex gap-3 text-amber-700">
                                <Info size={14} className="flex-shrink-0 mt-0.5" />
                                <p className="text-[10px] leading-relaxed">
                                    当前布局最多支持显示 {maxPhotos} 张照片。多出的图片已放入"素材池"。
                                </p>
                            </div>
                        );
                    }
                    return null;
                })()
            }
        </div >
    );
};
