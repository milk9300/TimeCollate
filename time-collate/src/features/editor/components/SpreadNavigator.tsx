import React, { useState } from 'react';
import { useBookStore, getVirtualChapters } from '../../../store';
import { 
    BookOpen, 
    Plus, 
    Trash2, 
    MoreVertical,
    Layers,
    FileText,
    FolderOpen,
    Edit,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    Copy,
    Check
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
    onSelectChapter: (chapterId: string) => void;
    onSelectPage: (chapterId: string, pageId: string) => void;
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
    handleDuplicatePageClick: (chapterId: string, pageId: string, e: React.MouseEvent) => void;
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
    handleDuplicatePageClick,
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

    const pageMenuId = `page-${page.id}`;

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onSelectPage(chapterId, page.id)}
            className={`pl-2 pr-1.5 py-1.5 rounded-lg border transition-all duration-150 flex items-center justify-between gap-1.5 relative cursor-pointer group ${
                isPageSelected
                    ? 'border-indigo-500/80 bg-indigo-50/20 text-indigo-950 font-medium'
                    : 'border-transparent hover:bg-gray-100/70 text-gray-600 hover:text-gray-900'
            }`}
        >
            <div className="flex items-center gap-1.5 min-w-0">
                {/* 拖拽手柄 */}
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}
                >
                    <GripVertical size={11} />
                </div>

                {/* 页码与内容提示 */}
                <span className="text-[10px] font-mono bg-gray-100 group-hover:bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-black flex-shrink-0">
                    P{absoluteIdx}
                </span>
            </div>

            {/* 操作菜单 */}
            <div className="flex items-center z-10" onClick={e => e.stopPropagation()}>
                <div className="relative">
                    <button
                        onClick={() => {
                            setActiveMenuId(activeMenuId === pageMenuId ? null : pageMenuId);
                        }}
                        className="p-0.5 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <MoreVertical size={11} />
                    </button>

                    {activeMenuId === pageMenuId && (
                        <>
                            <div 
                                className="fixed inset-0 z-20" 
                                onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-0 mt-1 w-24 bg-white border border-gray-200/80 rounded-xl shadow-xl py-1 z-30 animate-in fade-in duration-100">
                                <button
                                    onClick={(e) => handleDuplicatePageClick(chapterId, page.id, e)}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                                >
                                    <Copy size={11} className="text-gray-400" />
                                    复制页面
                                </button>
                                <button
                                    onClick={(e) => handleDeletePageClick(chapterId, page.id, e)}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors border-t border-gray-50"
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
    handleDuplicatePageClick: (chapterId: string, pageId: string, e: React.MouseEvent) => void;
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
    handleDuplicatePageClick,
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
    const pageCount = chapter.pages ? chapter.pages.length : 0;

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

    const chapterMenuId = `chapter-${chapter.id}`;

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="space-y-1.5 border-t border-gray-100 pt-2.5 first:border-0 first:pt-0"
        >
            {/* 章节标题行 */}
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
                    {/* 章节拖拽手柄 */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-0.5 rounded transition-colors"
                        onClick={e => e.stopPropagation()}
                    >
                        <GripVertical size={11} />
                    </div>

                    {/* 折叠箭头 */}
                    <div className="p-0.5 text-gray-400 group-hover:text-gray-600 transition-colors">
                        <ChevronDown 
                            size={11} 
                            className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                        />
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[10px] font-black text-indigo-600/90 tracking-wider">
                            {(chapterIdx + 1).toString().padStart(2, '0')}.
                        </span>
                        <span className="text-[11px] font-bold text-gray-800 truncate" title={chapter.title}>
                            {chapter.title || '未命名章节'}
                        </span>
                        <span className="text-[9px] text-gray-400 font-mono">
                            ({pageCount})
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0 z-10" onClick={e => e.stopPropagation()}>
                    {/* 章节操作下拉菜单 */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setActiveMenuId(activeMenuId === chapterMenuId ? null : chapterMenuId);
                            }}
                            className="p-1 hover:bg-slate-100 text-gray-400 hover:text-gray-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                            <MoreVertical size={11} />
                        </button>

                        {activeMenuId === chapterMenuId && (
                            <>
                                <div 
                                    className="fixed inset-0 z-20" 
                                    onClick={() => setActiveMenuId(null)}
                                />
                                <div className="absolute right-0 mt-1 w-28 bg-white border border-gray-200/80 rounded-xl shadow-xl py-1 z-30 animate-in fade-in duration-100">
                                    <button
                                        onClick={async () => {
                                            setActiveMenuId(null);
                                            const newPageId = await addPageToChapter(chapter.id);
                                            if (newPageId) onSelectPage(chapter.id, newPageId);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
                                    >
                                        <Plus size={11} className="text-gray-400" />
                                        新建页面
                                    </button>
                                    <button
                                        onClick={() => {
                                            setActiveMenuId(null);
                                            const newTitle = window.prompt("修改章节名称：", chapter.title);
                                            if (newTitle !== null && newTitle.trim()) {
                                                updateChapter(chapter.id, { title: newTitle.trim() });
                                            }
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-colors border-t border-gray-50"
                                    >
                                        <Edit size={11} className="text-gray-400" />
                                        重命名章节
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setActiveMenuId(null);
                                            if (window.confirm(`确认删除章节「${chapter.title}」及其下的所有页面吗？`)) {
                                                await deleteChapter(chapter.id);
                                            }
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors border-t border-gray-50"
                                    >
                                        <Trash2 size={11} />
                                        删除章节
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 页面列表 */}
            {!isCollapsed && (
                <div className="pl-3.5 space-y-1 border-l border-indigo-100/50 ml-3.5">
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
                                    <div className="space-y-0.5">
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
                                                    handleDuplicatePageClick={handleDuplicatePageClick}
                                                    onSelectPage={onSelectPage}
                                                />
                                            );
                                        })}

                                        {/* 新建页按钮 */}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                const newPageId = await addPageToChapter(chapter.id);
                                                if (newPageId) onSelectPage(chapter.id, newPageId);
                                            }}
                                            className="w-full text-left pl-7 pr-1.5 py-1 border border-dashed border-gray-250/35 hover:border-indigo-400 hover:bg-indigo-50/10 text-gray-400 hover:text-indigo-650 transition-all rounded-lg flex items-center gap-1.5 cursor-pointer mt-1"
                                        >
                                            <Plus size={11} className="stroke-[2.5]" />
                                            <span className="text-[9px] font-bold">新建页面</span>
                                        </button>
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </>
                    ) : (
                        <div 
                            onClick={async () => {
                                const newPageId = await addPageToChapter(chapter.id);
                                if (newPageId) onSelectPage(chapter.id, newPageId);
                            }}
                            className="border border-dashed border-gray-250/60 hover:border-indigo-400 hover:bg-indigo-50/5 rounded-lg p-2 text-center cursor-pointer transition-all flex items-center justify-center gap-1 text-gray-400 hover:text-indigo-600 bg-white/50"
                        >
                            <Plus size={11} />
                            <span className="text-[10px] font-bold">在此章节新建页面</span>
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
    onSelectChapter,
    onSelectPage,
    onUnlock
}) => {
    const { 
        currentBook, 
        addChapter, 
        addPageToChapter,
        deletePage,
        duplicatePage,
        reorderChapters,
        updateBookSettings
    } = useBookStore();

    const editorScope = useBookStore(state => state.editorScope);
    const setEditorScope = useBookStore(state => state.setEditorScope);
    const activeFrontPage = useBookStore(state => state.activeFrontPage);
    const setActiveFrontPage = useBookStore(state => state.setActiveFrontPage);

    const isEditingCover = editorScope === 'cover';

    const onSelectCover = () => {
        setEditorScope('cover');
        setActiveFrontPage('cover');
    };

    const onSelectBackCover = () => {
        setEditorScope('cover');
        setActiveFrontPage('backCover');
    };

    // 折叠状态（图标栏模式）- 默认收起目录面板
    const [isCollapsed, setIsCollapsed] = useState(true);

    const documents = useBookStore(state => state.documents);

    const convertedPages = React.useMemo(() => {
        return documents.map(d => ({
            id: d.id,
            pageTitle: d.title,
            isChapterStart: d.isChapterStart,
            templateId: d.templateId || 'custom',
            elements: d.elements,
            background: d.background,
            thumbnail: d.thumbnail,
            pageType: d.type === 'cover' ? ('cover' as const) : ('content' as const),
            content: '',
            photos: []
        }));
    }, [documents]);

    // 虚拟章节列表
    const chapters = React.useMemo(() => {
        return getVirtualChapters(convertedPages);
    }, [convertedPages]);

    // 右键上下文菜单 ID
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    
    // 章节手风琴状态
    const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});

    // 选中章节后，其他展开的章节自动收缩
    React.useEffect(() => {
        if (activeChapterId) {
            setCollapsedChapters(prev => {
                const nextCollapsed: Record<string, boolean> = {};
                chapters.forEach(ch => {
                    nextCollapsed[ch.id] = ch.id !== activeChapterId;
                });
                return nextCollapsed;
            });
        }
    }, [activeChapterId, chapters]);

    const chapterSensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3,
            }
        })
    );

    if (!currentBook) return null;

    const handleDeletePageClick = async (chapterId: string, pageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveMenuId(null);
        if (window.confirm('确认删除此页面吗？')) {
            await deletePage(chapterId, pageId);
        }
    };

    const handleDuplicatePageClick = async (chapterId: string, pageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setActiveMenuId(null);
        const newPageId = await duplicatePage(chapterId, pageId);
        if (newPageId) {
            onSelectPage(chapterId, newPageId);
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

        const isChapter = chapters.some(c => c.id === active.id);
        if (!isChapter) return;

        if (active.id !== over.id) {
            const oldIndex = chapters.findIndex((c) => c.id === active.id);
            const newIndex = chapters.findIndex((c) => c.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                const newChapters = arrayMove(chapters, oldIndex, newIndex);
                reorderChapters(newChapters);
            }
        }
    };

    // 全局页面索引映射：第一个章节的第一页为 P1，依此类推。封面为 0。
    const pageIndexMap: Record<string, number> = {};
    let globalIndex = 1;
    chapters.forEach((ch) => {
        (ch.pages || []).forEach((p) => {
            pageIndexMap[p.id] = globalIndex++;
        });
    });

    const totalPagesCount = globalIndex - 1;

    // 渲染折叠态（图标栏模式）
    if (isCollapsed) {
        return (
            <div className="flex flex-col h-full bg-[#FCFCFD] border-r border-gray-200/80 w-[52px] select-none flex-shrink-0 items-center py-4 transition-all duration-300 gap-6">
                {/* 展开按钮 */}
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-lg transition-colors border border-indigo-200/40"
                    title="展开目录面板"
                >
                    <ChevronRight size={15} />
                </button>

                <div className="w-6 h-[1px] bg-gray-200" />

                {editorScope === 'cover' ? (
                    <div className="flex flex-col gap-2.5">
                        {/* 封面快捷键 */}
                        <button
                            onClick={onSelectCover}
                            className={`p-2 rounded-xl border transition-all ${
                                isEditingCover && activeFrontPage === 'cover'
                                    ? 'bg-indigo-650 text-white border-indigo-650 shadow-md' 
                                    : 'bg-white hover:bg-gray-100 text-gray-500 border-gray-250/80'
                            }`}
                            title="书籍封面"
                        >
                            <BookOpen size={14} />
                        </button>
                        {/* 封底快捷键 */}
                        <button
                            onClick={onSelectBackCover}
                            className={`p-2 rounded-xl border transition-all ${
                                isEditingCover && activeFrontPage === 'backCover'
                                    ? 'bg-indigo-650 text-white border-indigo-650 shadow-md' 
                                    : 'bg-white hover:bg-gray-100 text-gray-500 border-gray-250/80'
                            }`}
                            title="书籍封底"
                        >
                            <BookOpen size={14} className="rotate-180" />
                        </button>
                    </div>
                ) : (
                    /* 章节编号环与序言快捷键 */
                    <div className="flex flex-col gap-2.5 overflow-y-auto w-full items-center custom-scrollbar flex-1">
                        {chapters.map((chapter, idx) => {
                            const isChapterActive = activeChapterId === chapter.id && !isEditingCover;
                            return (
                                <button
                                    key={chapter.id}
                                    onClick={() => {
                                        onSelectChapter(chapter.id);
                                    }}
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-black transition-all ${
                                        isChapterActive
                                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-extrabold shadow-sm'
                                            : 'bg-white hover:bg-gray-100 text-gray-500 border-gray-200/60'
                                    }`}
                                    title={chapter.title || '未命名章节'}
                                >
                                    {(idx + 1).toString()}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // 正常展开态目录面板
    return (
        <div className="flex flex-col h-full bg-[#FCFCFD] border-r border-gray-200/80 w-[250px] select-none flex-shrink-0 transition-all duration-300 relative">
            
            {/* 折叠收起按钮 */}
            <button
                onClick={() => setIsCollapsed(true)}
                className="absolute -right-3 top-7 z-[25] w-6 h-6 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
                title="收起目录面板"
            >
                <ChevronLeft size={13} />
            </button>

            {/* Header: 书名与统计信息 */}
            <div className="p-4 border-b border-gray-100 bg-white flex flex-col gap-2.5 sticky top-0 z-10">
                <div className="flex items-center gap-1.5 min-w-0">
                    <Layers size={14} className="text-indigo-600 flex-shrink-0" />
                    <input
                        type="text"
                        value={currentBook.title}
                        onChange={(e) => updateBookSettings({ title: e.target.value })}
                        className="text-[12px] font-black text-gray-800 border-b border-transparent hover:border-gray-200 focus:border-indigo-500 focus:outline-none bg-transparent transition-colors px-0.5 truncate flex-1 min-w-0"
                        placeholder="目录设计"
                    />
                </div>

                {/* 页面及章节统计：符合手写稿 */}
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold font-mono">
                    <span className="flex items-center gap-1">
                        <FolderOpen size={12} className="text-gray-400" />
                        {chapters.length}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 mx-1" />
                    <span className="flex items-center gap-1">
                        <FileText size={12} className="text-gray-400" />
                        {totalPagesCount}
                    </span>
                </div>
            </div>

            {/* 可滚动目录树 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {editorScope === 'cover' ? (
                    <>
                        {/* 1. 0. 封面 条目 */}
                        <div
                            onClick={onSelectCover}
                            className={`pl-3 pr-2 py-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                                isEditingCover && activeFrontPage === 'cover'
                                    ? 'border-indigo-500/80 bg-indigo-50/15 text-indigo-950 font-bold shadow-sm'
                                    : 'border-gray-200/50 bg-white hover:bg-gray-50/50 hover:border-gray-300 text-gray-700'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600 font-mono">□ 0.</span>
                                <span className="text-[11px] font-bold">封面</span>
                            </div>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 group-hover:bg-indigo-100/40 group-hover:text-indigo-600 transition-colors">
                                Cover
                            </span>
                        </div>

                        {/* 2. 1. 封底 条目 */}
                        <div
                            onClick={onSelectBackCover}
                            className={`pl-3 pr-2 py-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between group mt-2 ${
                                isEditingCover && activeFrontPage === 'backCover'
                                    ? 'border-indigo-500/80 bg-indigo-50/15 text-indigo-950 font-bold shadow-sm'
                                    : 'border-gray-200/50 bg-white hover:bg-gray-50/50 hover:border-gray-300 text-gray-700'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 group-hover:text-gray-600 font-mono">□ 1.</span>
                                <span className="text-[11px] font-bold">封底</span>
                            </div>
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 group-hover:bg-indigo-100/40 group-hover:text-indigo-600 transition-colors">
                                Back
                            </span>
                        </div>
                    </>
                ) : (
                    /* 2. 章节分组与序言条目 */
                    <div className="space-y-3">


                        {chapters.length > 0 ? (
                            <DndContext
                                sensors={chapterSensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleChapterDragEnd}
                            >
                                <SortableContext
                                    items={chapters.map(c => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {chapters.map((chapter, chapterIdx) => {
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
                                                handleDuplicatePageClick={handleDuplicatePageClick}
                                                onSelectChapter={onSelectChapter}
                                                onSelectPage={onSelectPage}
                                                collapsedChapters={collapsedChapters}
                                                toggleChapterCollapse={toggleChapterCollapse}
                                            />
                                        );
                                    })}
                                </SortableContext>
                            </DndContext>
                        ) : (
                            <div className="text-center py-8 text-gray-400 flex flex-col items-center justify-center gap-2">
                                <FileText size={20} className="stroke-[1.5] text-gray-300" />
                                <span className="text-[10px] font-bold">暂无回忆章节</span>
                            </div>
                        )}

                        {/* 新建章节按钮 */}
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                const title = window.prompt("请输入新章节的标题：", `章节 ${chapters.length + 1}`);
                                if (title && title.trim()) {
                                    const newChapId = await addChapter(title.trim());
                                    if (newChapId) {
                                        onSelectChapter(newChapId);
                                    }
                                }
                            }}
                            className="w-full py-2 bg-white hover:bg-indigo-50/10 border border-dashed border-gray-200 hover:border-indigo-400 text-gray-500 hover:text-indigo-650 font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                        >
                            <Plus size={11} className="stroke-[2.5]" />
                            <span>新建章节</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
// #endregion
