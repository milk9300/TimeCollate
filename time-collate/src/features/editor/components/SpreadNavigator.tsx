import React, { useState } from 'react';
import { useBookStore } from '../../../store';
import { 
    BookOpen, 
    Plus, 
    Trash2, 
    MoreVertical,
    Layers,
    Image as ImageIcon,
    FileText,
    FolderOpen,
    Edit,
    ChevronDown,
    GripVertical
} from 'lucide-react';
import { getSlotText } from '../../../utils/textSlotHelper';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Page } from '../../../types';

interface SpreadNavigatorProps {
    activeChapterId: string | null;
    activePageId: string | null;
    isEditingCover: boolean;
    onSelectChapter: (chapterId: string) => void;
    onSelectPage: (chapterId: string, pageId: string) => void;
    onSelectCover: () => void;
    onUnlock?: () => void;
}

// #region SortablePageItem Component
interface SortablePageItemProps {
    page: Page;
    chapterId: string;
    absoluteIdx: number;
    isPageSelected: boolean;
    activeMenuId: string | null;
    setActiveMenuId: (id: string | null) => void;
    handleDeletePageClick: (chapterId: string, pageId: string, e: React.MouseEvent) => void;
    onSelectPage: (chapterId: string, pageId: string) => void;
}

const SortablePageItem: React.FC<SortablePageItemProps> = ({
    page,
    chapterId,
    absoluteIdx,
    isPageSelected,
    activeMenuId,
    setActiveMenuId,
    handleDeletePageClick,
    onSelectPage
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });
    const { templates } = useBookStore();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    // Compute page thumbnail & layout description
    const firstPhoto = page.photos && page.photos.length > 0 ? page.photos.find(p => p && p.url) : null;
    const template = templates.find((t) => t.id === page.layout);
    const validPhotosCount = page.photos ? page.photos.filter(p => p && p.url).length : 0;
    const layoutName = template ? template.name : '经典排版';
    
    // Extract page text snippet for page small title
    const textSlotVal = getSlotText(page.content, 'page-content') || getSlotText(page.content, 'default') || '';
    const pageSmallTitle = textSlotVal.trim() 
        ? (textSlotVal.length > 12 ? textSlotVal.substring(0, 12) + '...' : textSlotVal) 
        : layoutName;

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onSelectPage(chapterId, page.id)}
            className={`p-2 rounded-xl border transition-all duration-200 flex items-center gap-2 relative cursor-pointer group ${
                isPageSelected
                    ? 'border-indigo-600/80 bg-indigo-50/10 shadow-sm'
                    : 'border-gray-200/50 bg-white hover:bg-gray-50/30 hover:border-gray-300'
            }`}
        >
            {isPageSelected && (
                <div className="absolute left-0 inset-y-1.5 w-0.5 rounded bg-indigo-600" />
            )}

            {/* Grip handle */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-0.5 rounded opacity-40 group-hover:opacity-100 transition-opacity"
                onClick={e => e.stopPropagation()}
            >
                <GripVertical size={11} />
            </div>

            {/* Thumbnail Preview Area */}
            <div className="w-8 h-10 rounded-md overflow-hidden border border-gray-200/80 bg-gray-50 flex-shrink-0 flex items-center justify-center relative shadow-sm">
                {firstPhoto && firstPhoto.url ? (
                    <img 
                        src={firstPhoto.url} 
                        alt="thumbnail" 
                        className="w-full h-full object-cover select-none pointer-events-none"
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-300">
                        <ImageIcon size={11} className="stroke-[1.5]" />
                    </div>
                )}
                {validPhotosCount > 0 && (
                    <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[6px] font-black px-1 rounded-sm leading-none py-0.5">
                        {validPhotosCount}
                    </div>
                )}
            </div>

            {/* Info details */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                    <span className="text-[9px] font-bold text-gray-400 font-mono">
                        {absoluteIdx.toString().padStart(2, '0')}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-700 truncate" title={pageSmallTitle}>
                        {pageSmallTitle}
                    </span>
                </div>
                <span className="text-[8px] text-gray-400 truncate">
                    {layoutName}
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 z-10" onClick={e => e.stopPropagation()}>
                {/* Menu trigger */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setActiveMenuId(activeMenuId === page.id ? null : page.id);
                        }}
                        className="p-0.5 text-gray-300 hover:text-gray-600 rounded hover:bg-slate-50 opacity-40 group-hover:opacity-100 transition-opacity"
                    >
                        <MoreVertical size={10} />
                    </button>

                    {activeMenuId === page.id && (
                        <>
                            <div 
                                className="fixed inset-0 z-20" 
                                onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-0 mt-1 w-24 bg-white border border-gray-200/80 rounded-xl shadow-xl py-1 z-30 animate-in fade-in duration-100">
                                <button
                                    onClick={(e) => handleDeletePageClick(chapterId, page.id, e)}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors"
                                >
                                    <Trash2 size={11} />
                                    删除页面
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
// #endregion

// #region SortableChapterItem Component
interface SortableChapterItemProps {
    chapter: any;
    chapterIdx: number;
    isChapterActive: boolean;
    activePageId: string | null;
    isEditingCover: boolean;
    pageIndexMap: Record<string, number>;
    activeMenuId: string | null;
    setActiveMenuId: (id: string | null) => void;
    handleDeletePageClick: (chapterId: string, pageId: string, e: React.MouseEvent) => void;
    onSelectChapter: (chapterId: string) => void;
    onSelectPage: (chapterId: string, pageId: string) => void;
    collapsedChapters: Record<string, boolean>;
    toggleChapterCollapse: (chapterId: string, e: React.MouseEvent) => void;
}

const SortableChapterItem: React.FC<SortableChapterItemProps> = ({
    chapter,
    chapterIdx,
    isChapterActive,
    activePageId,
    isEditingCover,
    pageIndexMap,
    activeMenuId,
    setActiveMenuId,
    handleDeletePageClick,
    onSelectChapter,
    onSelectPage,
    collapsedChapters,
    toggleChapterCollapse
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: chapter.id });
    const { updateChapter, deleteChapter, addPageToChapter, reorderPages } = useBookStore();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
    };

    const isCollapsed = collapsedChapters[chapter.id] || false;

    const pageSensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3,
            }
        })
    );

    const handlePageDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        // Guard: Only handle sorting if the item is indeed a page from this chapter
        const isPage = chapter.pages.some((p: any) => p.id === active.id);
        if (!isPage) return;

        if (active.id !== over.id) {
            const oldIndex = chapter.pages.findIndex((p: any) => p.id === active.id);
            const newIndex = chapter.pages.findIndex((p: any) => p.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newPages = arrayMove(chapter.pages, oldIndex, newIndex);
                reorderPages(chapter.id, newPages as any[]);
            }
        }
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="space-y-2 border-t border-gray-100 pt-3 first:border-0 first:pt-0"
        >
            {/* Chapter Section Header */}
            <div 
                onClick={(e) => {
                    onSelectChapter(chapter.id);
                    toggleChapterCollapse(chapter.id, e);
                }}
                className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer group ${
                    isChapterActive
                        ? 'bg-slate-50 border border-slate-200/50 shadow-sm'
                        : 'hover:bg-slate-50/50 border border-transparent'
                }`}
            >
                <div className="flex items-center gap-1.5 min-w-0">
                    {/* Grip handle */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-0.5 rounded transition-colors"
                        onClick={e => e.stopPropagation()}
                    >
                        <GripVertical size={11} />
                    </div>

                    {/* Collapse chevron */}
                    <div className="p-0.5 text-gray-400 group-hover:text-gray-600 transition-colors">
                        <ChevronDown 
                            size={11} 
                            className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                        />
                    </div>

                    <FolderOpen size={13} className={isChapterActive ? 'text-indigo-600' : 'text-gray-400'} />
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-black text-indigo-600/90 tracking-wider">
                            第 {(chapterIdx + 1).toString().padStart(2, '0')} 章节
                        </span>
                        <span className="text-[10.5px] font-bold text-gray-800 truncate" title={chapter.title}>
                            {chapter.title || '未命名章节'}
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0 z-10" onClick={e => e.stopPropagation()}>
                    {/* Edit Chapter Title */}
                    <button
                        onClick={() => {
                            const newTitle = window.prompt("修改章节名称：", chapter.title);
                            if (newTitle !== null && newTitle.trim()) {
                                updateChapter(chapter.id, { title: newTitle.trim() });
                            }
                        }}
                        className="p-1 hover:bg-slate-100 hover:text-slate-700 text-gray-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 duration-200"
                        title="修改章节标题"
                    >
                        <Edit size={11} />
                    </button>

                    {/* Delete chapter */}
                    <button
                        onClick={async () => {
                            if (window.confirm(`确认删除章节「${chapter.title}」及其下的所有页面吗？`)) {
                                await deleteChapter(chapter.id);
                            }
                        }}
                        className="p-1 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-lg transition-all opacity-0 group-hover:opacity-100 duration-200"
                        title="删除章节"
                    >
                        <Trash2 size={11} />
                    </button>
                </div>
            </div>

            {/* Pages belonging to this chapter */}
            {!isCollapsed && (
                <div className="pl-3.5 space-y-1.5 border-l border-indigo-100/50 ml-3.5">
                    {chapter.pages && chapter.pages.length > 0 ? (
                        <>
                            <DndContext
                                sensors={pageSensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handlePageDragEnd}
                            >
                                <SortableContext
                                    items={chapter.pages.map((p: Page) => p.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {chapter.pages.map((page: Page) => {
                                        const isPageSelected = activePageId === page.id && !isEditingCover;
                                        const absoluteIdx = pageIndexMap[page.id] || 0;

                                        return (
                                            <SortablePageItem
                                                key={page.id}
                                                page={page}
                                                chapterId={chapter.id}
                                                absoluteIdx={absoluteIdx}
                                                isPageSelected={isPageSelected}
                                                activeMenuId={activeMenuId}
                                                setActiveMenuId={setActiveMenuId}
                                                handleDeletePageClick={handleDeletePageClick}
                                                onSelectPage={onSelectPage}
                                            />
                                        );
                                    })}
                                </SortableContext>
                            </DndContext>
                            {/* Inline bottom add button for this chapter */}
                            <button
                                onClick={async () => {
                                    const newPageId = await addPageToChapter(chapter.id);
                                    if (newPageId) onSelectPage(chapter.id, newPageId);
                                }}
                                className="w-full py-1.5 border border-dashed border-gray-200/60 hover:border-indigo-400 hover:bg-indigo-50/5 rounded-xl text-[9px] font-bold text-gray-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-1 bg-white/50"
                                title="在此章节新建页面"
                            >
                                <Plus size={10} className="stroke-[2.5]" />
                                <span>添加页面</span>
                            </button>
                        </>
                    ) : (
                        <div 
                            onClick={async () => {
                                const newPageId = await addPageToChapter(chapter.id);
                                if (newPageId) onSelectPage(chapter.id, newPageId);
                            }}
                            className="border border-dashed border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/5 rounded-xl p-2 text-center cursor-pointer transition-all flex flex-col items-center gap-0.5 text-gray-400 hover:text-indigo-600 bg-white/50"
                        >
                            <Plus size={12} className="stroke-[2.5]" />
                            <span className="text-[8px] font-bold">在此章节追加页面</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
// #endregion

// #region Main SpreadNavigator Component
export const SpreadNavigator: React.FC<SpreadNavigatorProps> = ({
    activeChapterId,
    activePageId,
    isEditingCover,
    onSelectChapter,
    onSelectPage,
    onSelectCover
}) => {
    const { 
        currentBook, 
        addChapter, 
        addPageToChapter,
        deletePage,
        reorderChapters
    } = useBookStore();

    // Context menu states
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [showAddMenu, setShowAddMenu] = useState(false);
    
    // Chapter accordion collapse states
    const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

    const chapterSensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3,
            }
        })
    );

    if (!currentBook) return null;

    const handleAddPageToCurrent = async () => {
        let targetChapterId = activeChapterId;
        if (!targetChapterId && currentBook.chapters.length > 0) {
            targetChapterId = currentBook.chapters[0].id;
        } else if (currentBook.chapters.length === 0) {
            await addChapter("第一章：起航");
            const updatedBook = useBookStore.getState().currentBook;
            if (updatedBook && updatedBook.chapters.length > 0) {
                targetChapterId = updatedBook.chapters[0].id;
            }
        }

        if (targetChapterId) {
            const newPageId = await addPageToChapter(targetChapterId);
            if (newPageId) {
                onSelectPage(targetChapterId, newPageId);
            }
        }
    };

    const handleDeletePageClick = async (chapterId: string, pageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveMenuId(null);
        if (window.confirm('确认删除此页面吗？')) {
            await deletePage(chapterId, pageId);
        }
    };

    const toggleChapterCollapse = (chapterId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setCollapsedChapters(prev => ({
            ...prev,
            [chapterId]: !prev[chapterId]
        }));
    };

    const handleChapterDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        // Guard: Only handle sorting if the item is indeed a chapter
        const isChapter = currentBook.chapters.some(c => c.id === active.id);
        if (!isChapter) return;

        if (active.id !== over.id) {
            const oldIndex = currentBook.chapters.findIndex((c) => c.id === active.id);
            const newIndex = currentBook.chapters.findIndex((c) => c.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newChapters = arrayMove(currentBook.chapters, oldIndex, newIndex);
                reorderChapters(newChapters);
            }
        }
    };

    // Calculate absolute indices for all pages across all chapters
    const pageIndexMap: Record<string, number> = {};
    let globalIndex = 1;
    currentBook.chapters.forEach((ch) => {
        (ch.pages || []).forEach((p) => {
            pageIndexMap[p.id] = globalIndex++;
        });
    });

    const totalPagesCount = globalIndex - 1;

    return (
        <div className="flex flex-col h-full bg-[#FCFCFD] border-r border-gray-200/80 w-[260px] select-none flex-shrink-0">
            {/* Header: Title & Navigation */}
            <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h3 className="text-xs font-black text-gray-900 tracking-wider flex items-center gap-1">
                        <Layers size={14} className="text-indigo-600" />
                        回忆画卷 (Book Map)
                    </h3>
                    <p className="text-[9px] text-gray-400 font-bold mt-0.5">
                        共 {currentBook.chapters.length} 章节 · {totalPagesCount + 2} 个页面
                    </p>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-[10px] font-bold flex items-center gap-1 shadow-sm shadow-indigo-600/10"
                        title="新建内容"
                    >
                        <Plus size={11} className="stroke-[3]" />
                        <span>新建</span>
                        <ChevronDown size={10} className={`transition-transform duration-200 ${showAddMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showAddMenu && (
                        <>
                            <div 
                                className="fixed inset-0 z-20" 
                                onClick={() => setShowAddMenu(false)}
                            />
                            <div className="absolute right-0 mt-1.5 w-28 bg-white border border-gray-200/80 rounded-xl shadow-xl py-1.5 z-30 animate-in fade-in slide-in-from-top-1 duration-150">
                                <button
                                    onClick={async () => {
                                        setShowAddMenu(false);
                                        const title = window.prompt("请输入新章节的标题：", `章节 ${currentBook.chapters.length + 1}`);
                                        if (title && title.trim()) {
                                            await addChapter(title.trim());
                                        }
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                                >
                                    <FolderOpen size={11} className="text-gray-400" />
                                    新建章节
                                </button>
                                <button
                                    onClick={async () => {
                                        setShowAddMenu(false);
                                        await handleAddPageToCurrent();
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors border-t border-gray-50"
                                >
                                    <FileText size={11} className="text-gray-400" />
                                    新建页面
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Scrollable Layout Stream */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                
                {/* 1. Cover & Preface Special Card */}
                <div
                    onClick={onSelectCover}
                    className={`p-3 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col gap-2.5 relative overflow-hidden group ${
                        isEditingCover
                            ? 'border-indigo-600/80 bg-indigo-50/15 text-indigo-900 shadow-md shadow-indigo-600/5'
                            : 'border-gray-200/60 bg-white hover:bg-gray-50/50 hover:border-gray-300 text-gray-700'
                    }`}
                >
                    {isEditingCover && (
                        <div className="absolute inset-x-0 top-0 h-1 bg-indigo-600" />
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen size={13} className={isEditingCover ? 'text-indigo-600' : 'text-gray-400'} />
                            <span className="text-[11px] font-black tracking-wide">书籍封面与引言</span>
                        </div>
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 group-hover:bg-indigo-100/50 group-hover:text-indigo-600 transition-colors">
                            Cover
                        </span>
                    </div>
                </div>

                {/* 2. Chapters Accordion / Groups */}
                {currentBook.chapters.length > 0 ? (
                    <div className="space-y-4">
                        <DndContext
                            sensors={chapterSensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleChapterDragEnd}
                        >
                            <SortableContext
                                items={currentBook.chapters.map(c => c.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {currentBook.chapters.map((chapter, chapterIdx) => {
                                    const isChapterActive = activeChapterId === chapter.id && !isEditingCover;

                                    return (
                                        <SortableChapterItem
                                            key={chapter.id}
                                            chapter={chapter}
                                            chapterIdx={chapterIdx}
                                            isChapterActive={isChapterActive}
                                            activePageId={activePageId}
                                            isEditingCover={isEditingCover}
                                            pageIndexMap={pageIndexMap}
                                            activeMenuId={activeMenuId}
                                            setActiveMenuId={setActiveMenuId}
                                            handleDeletePageClick={handleDeletePageClick}
                                            onSelectChapter={onSelectChapter}
                                            onSelectPage={onSelectPage}
                                            collapsedChapters={collapsedChapters}
                                            toggleChapterCollapse={toggleChapterCollapse}
                                        />
                                    );
                                })}
                            </SortableContext>
                        </DndContext>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 flex flex-col items-center justify-center gap-2">
                        <FileText size={20} className="stroke-[1.5] text-gray-300" />
                        <span className="text-[10px] font-bold">暂无回忆章节</span>
                        <button
                            onClick={async () => {
                                await addChapter("新建回忆章节");
                            }}
                            className="mt-1 px-3 py-1 bg-indigo-600 text-white text-[9px] font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                            + 新增章节
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
// #endregion
