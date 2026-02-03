import React, { useRef, useState } from 'react';
import { useBookStore } from '../store';
import { ImagePlus, Calendar, Plus, MoreHorizontal, FileText, Trash2, Settings, Layout, Info } from 'lucide-react';
import { PAGE_SIZES, type PageSize } from '../rendering/PhysicalConstants';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortablePhotoItem } from './SortablePhotoItem';

interface ChapterEditorProps {
    chapterId: string | null;
    activePageId: string | null;
    onPageChange: (pageId: string) => void;
}

/**
 * @description 章节与书籍编辑控制面板
 * 包含：书籍全局设置（尺寸、主题）、章节元数据、页面多级编辑、智能素材池管理
 */
export const ChapterEditor: React.FC<ChapterEditorProps> = ({
    chapterId,
    activePageId,
    onPageChange
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
        reorderPhotosInPage
    } = useBookStore();

    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 拖拽排序相关 - 必须放在顶层，不能在 early return 之后
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    if (!currentBook) return null;

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

    const chapter = currentBook.chapters.find(c => c.id === chapterId);
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

    return (
        <div className="flex-1 overflow-hidden bg-white flex flex-col h-full">
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
                    <div className="mt-4 space-y-4 pb-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] text-gray-400 mb-1">纸张尺寸</label>
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
                                <label className="block text-[9px] text-gray-400 mb-1">视觉主题</label>
                                <select
                                    value={currentBook.theme}
                                    onChange={(e) => updateBookSettings({ theme: e.target.value as any })}
                                    className="w-full text-xs font-medium bg-white border border-gray-200 rounded px-2 py-1.5 outline-none"
                                >
                                    <option value="classic">经典雅致 (Classic)</option>
                                    <option value="modern">现代简约 (Modern)</option>
                                    <option value="warm">温馨时光 (Warm)</option>
                                    <option value="magazine">时尚杂志 (Magazine)</option>
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
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layout size={14} className="text-gray-400" />
                        <select
                            value={currentPage.layout}
                            onChange={(e) => updatePage(chapterId, currentPage.id, { layout: e.target.value as any })}
                            className="text-[10px] font-bold uppercase tracking-widest bg-white border border-gray-200 rounded px-2 py-1.5 outline-none text-gray-500 cursor-pointer hover:bg-gray-100"
                        >
                            <option value="single">高光时刻 · 1张 (FULL)</option>
                            <option value="grid">生活九宫格 · 9张 (GRID)</option>
                            <option value="collage">艺术拼贴 · 4张 (COLLAGE)</option>
                            <option value="cover">篇章封面 · 1张 (COVER)</option>
                            <option value="magazine">杂志风 · 4张 (MAGAZINE)</option>
                            <option value="journal">手账日记 · 2张 (JOURNAL)</option>
                        </select>
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
                            items={currentPage.photos.map(p => p.id)}
                            strategy={rectSortingStrategy}
                        >
                            <div className="grid grid-cols-3 gap-2">
                                {currentPage.photos.map((photo, index) => {
                                    const layoutLimits: Record<string, number> = {
                                        single: 1, grid: 9, collage: 4, cover: 1, magazine: 4, journal: 2
                                    };
                                    const maxPhotos = layoutLimits[currentPage.layout] || 4;
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
            </div>

            {(() => {
                const layoutLimits: Record<string, number> = { single: 1, grid: 9, collage: 4, cover: 1, magazine: 4, journal: 2 };
                const maxPhotos = layoutLimits[currentPage.layout] || 4;
                if (currentPage.photos.length > maxPhotos) {
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
            })()}
        </div>
    );
};
