// #region Description
import React, { useMemo, useCallback } from 'react';
import { useBookStore, getVirtualChapters } from '../../../store';
import {
    parsePageContent,
    getPageDecorations,
    updatePageDecorations
} from '../../../utils/textSlotHelper';
import {
    Type,
    Sliders,
    Camera,
    Sparkles,
    Trash2,
    Smile,
    X,
    Palette,
    Move,
    ChevronUp,
    ChevronDown,
    ChevronsUp,
    ChevronsDown,
    Link2,
    Link2Off
} from 'lucide-react';

interface TopContextualToolbarProps {
    activeChapterId: string | null;
    activePageId: string | null;
}

export const TopContextualToolbar: React.FC<TopContextualToolbarProps> = ({
    activeChapterId,
    activePageId
}) => {
    const editorScope = useBookStore(state => state.editorScope);

    // Zustand States & Actions
    const currentBook = useBookStore(state => state.currentBook);
    const activePhotoEdit = useBookStore(state => state.activePhotoEdit);
    const setActivePhotoEdit = useBookStore(state => state.setActivePhotoEdit);
    const activeTextEdit = useBookStore(state => state.activeTextEdit);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);
    const activeStickerEdit = useBookStore(state => state.activeStickerEdit);
    const setActiveStickerEdit = useBookStore(state => state.setActiveStickerEdit);

    const setRightActiveTab = useBookStore(state => state.setRightActiveTab);
    const setIsDrawerOpen = useBookStore(state => state.setIsDrawerOpen);
    const activeInspectorSection = useBookStore(state => state.activeInspectorSection);
    const setActiveInspectorSection = useBookStore(state => state.setActiveInspectorSection);
    const isDrawerOpen = useBookStore(state => state.isDrawerOpen);
    const rightActiveTab = useBookStore(state => state.rightActiveTab);

    const deletePhotoFromPage = useBookStore(state => state.deletePhotoFromPage);
    const updatePage = useBookStore(state => state.updatePage);

    const isInspectorActive = rightActiveTab === 'inspector' && isDrawerOpen;

    const getBtnClassName = useCallback((section: 'edit' | 'crop' | 'frame' | 'font' | 'color' | 'sticker-adjust' | 'position') => {
        const isActive = isInspectorActive && activeInspectorSection === section;
        return `h-8 px-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            isActive
                ? 'bg-indigo-50 border-indigo-250 text-indigo-650'
                : 'bg-white border-slate-200 text-slate-655 hover:bg-slate-50'
        }`;
    }, [isInspectorActive, activeInspectorSection]);

    const chapters = useMemo(() => {
        if (!currentBook || !currentBook.pages) return [];
        return getVirtualChapters(currentBook.pages);
    }, [currentBook]);

    const activeChapter = chapters.find(c => c.id === activeChapterId) || null;
    const activePage = activeChapter?.pages.find(p => p.id === activePageId) || null;

    const activeElementId = activeTextEdit?.slotId || activePhotoEdit?.photoId || activeStickerEdit?.stickerId;
    const activeElement = activePage?.elements?.find(el => el.id === activeElementId) || null;
    const hasGroupId = activeElement && !!activeElement.groupId;

    // 辅助激活侧边栏与具体编辑面板的方法
    const handleActivateSection = useCallback((section: 'edit' | 'crop' | 'frame' | 'font' | 'color' | 'sticker-adjust' | 'position') => {
        setRightActiveTab('inspector');
        setIsDrawerOpen(true);
        setActiveInspectorSection(section);
    }, [setRightActiveTab, setIsDrawerOpen, setActiveInspectorSection]);

    // 删除贴纸/几何形状逻辑
    const deleteSelectedSticker = useCallback(() => {
        if (!activeStickerEdit || !activePage || !activeChapter) return;
        if (window.confirm('确定要删除这个元素吗？')) {
            const pageElements = activePage.elements || [];
            // 如果是自由画布 V2.0 元素
            if (pageElements.length > 0) {
                const updatedElements = pageElements.filter(el => el.id !== activeStickerEdit.stickerId);
                updatePage(activeChapter.id, activePage.id, { elements: updatedElements });
            } else {
                // 回退到 V1.0 装饰图层逻辑
                const parsed = parsePageContent(activePage.content);
                const decorations = parsed.decorations || [];
                const updatedDecorations = decorations.filter(d => d.id !== activeStickerEdit.stickerId);
                const updatedContent = updatePageDecorations(activePage.content, updatedDecorations);
                updatePage(activeChapter.id, activePage.id, { content: updatedContent });
            }
            setActiveStickerEdit(null);
        }
    }, [activeStickerEdit, activePage, activeChapter, updatePage, setActiveStickerEdit]);

    // 调整图层层级 (zIndex)
    const changeLayerOrder = useCallback((action: 'front' | 'back' | 'forward' | 'backward') => {
        if (!activePage || !activeChapter || !activeElementId) return;
        const pageElements = activePage.elements || [];
        if (pageElements.length <= 1) return;

        const targetElement = pageElements.find(el => el.id === activeElementId);
        if (!targetElement) return;

        const targetGroupId = targetElement.groupId;
        const targetIds = new Set(
            targetGroupId 
                ? pageElements.filter(el => el.groupId === targetGroupId).map(el => el.id)
                : [activeElementId]
        );

        // 按 zIndex 升序排序
        const sorted = [...pageElements].sort((a, b) => (a.zIndex || 10) - (b.zIndex || 10));
        const targets = sorted.filter(el => targetIds.has(el.id));
        const others = sorted.filter(el => !targetIds.has(el.id));

        let newSorted = [...sorted];

        if (action === 'front') {
            newSorted = [...others, ...targets];
        } else if (action === 'back') {
            newSorted = [...targets, ...others];
        } else if (action === 'forward') {
            const lastTargetIdx = sorted.map(el => targetIds.has(el.id)).lastIndexOf(true);
            if (lastTargetIdx < sorted.length - 1) {
                const nextEl = sorted[lastTargetIdx + 1];
                const nextGroupId = nextEl.groupId;
                const nextGroupIds = new Set(
                    nextGroupId
                        ? pageElements.filter(el => el.groupId === nextGroupId).map(el => el.id)
                        : [nextEl.id]
                );
                
                const beforeSwap = sorted.filter(el => !targetIds.has(el.id) && !nextGroupIds.has(el.id) && sorted.indexOf(el) < lastTargetIdx);
                const afterSwap = sorted.filter(el => !targetIds.has(el.id) && !nextGroupIds.has(el.id) && sorted.indexOf(el) > lastTargetIdx);
                const nextGroupElements = sorted.filter(el => nextGroupIds.has(el.id));
                newSorted = [...beforeSwap, ...nextGroupElements, ...targets, ...afterSwap];
            }
        } else if (action === 'backward') {
            const firstTargetIdx = sorted.findIndex(el => targetIds.has(el.id));
            if (firstTargetIdx > 0) {
                const prevEl = sorted[firstTargetIdx - 1];
                const prevGroupId = prevEl.groupId;
                const prevGroupIds = new Set(
                    prevGroupId
                        ? pageElements.filter(el => el.groupId === prevGroupId).map(el => el.id)
                        : [prevEl.id]
                );

                const beforeSwap = sorted.filter(el => !targetIds.has(el.id) && !prevGroupIds.has(el.id) && sorted.indexOf(el) < firstTargetIdx);
                const afterSwap = sorted.filter(el => !targetIds.has(el.id) && !prevGroupIds.has(el.id) && sorted.indexOf(el) > firstTargetIdx);
                const prevGroupElements = sorted.filter(el => prevGroupIds.has(el.id));
                newSorted = [...beforeSwap, ...targets, ...prevGroupElements, ...afterSwap];
            }
        }

        const updatedElements = pageElements.map(el => {
            const newIndex = newSorted.findIndex(item => item.id === el.id);
            return {
                ...el,
                zIndex: (newIndex + 1) * 10
            };
        });

        updatePage(activeChapter.id, activePage.id, {
            elements: updatedElements
        });
    }, [activePage, activeChapter, activeElementId, updatePage]);

    // 组合重叠元素逻辑
    const handleGroupElements = useCallback(() => {
        if (!activePage || !activeChapter || !activeElementId) return;
        const pageElements = activePage.elements || [];
        const targetElement = pageElements.find(el => el.id === activeElementId);
        if (!targetElement) return;

        const getBoundingBox = (el: any) => {
            const isSticker = el.type === 'sticker';
            if (isSticker) {
                return {
                    left: el.x - el.width / 2,
                    right: el.x + el.width / 2,
                    top: el.y - el.height / 2,
                    bottom: el.y + el.height / 2
                };
            }
            return {
                left: el.x,
                right: el.x + el.width,
                top: el.y,
                bottom: el.y + el.height
            };
        };

        const intersects = (boxA: any, boxB: any) => {
            return !(boxA.right < boxB.left || 
                     boxA.left > boxB.right || 
                     boxA.bottom < boxB.top || 
                     boxA.top > boxB.bottom);
        };

        const targetBox = getBoundingBox(targetElement);
        const overlappingIds = pageElements
            .filter(el => el.id !== targetElement.id)
            .filter(el => intersects(targetBox, getBoundingBox(el)))
            .map(el => el.id);

        if (overlappingIds.length === 0) {
            alert('未检测到重叠的元素。请将要组合的元素拖拽放置到重叠位置后再试。');
            return;
        }

        let groupId = targetElement.groupId;
        if (!groupId) {
            const firstGroupedOverlapping = pageElements.find(el => overlappingIds.includes(el.id) && el.groupId);
            groupId = firstGroupedOverlapping?.groupId || `group-${Date.now()}`;
        }

        const idsToGroup = new Set([targetElement.id, ...overlappingIds]);

        const updatedElements = pageElements.map(el => {
            if (idsToGroup.has(el.id)) {
                return { ...el, groupId };
            }
            return el;
        });

        updatePage(activeChapter.id, activePage.id, {
            elements: updatedElements
        });
    }, [activePage, activeChapter, activeElementId, updatePage]);

    // 取消组合逻辑
    const handleUngroupElements = useCallback(() => {
        if (!activePage || !activeChapter || !activeElementId) return;
        const pageElements = activePage.elements || [];
        const targetElement = pageElements.find(el => el.id === activeElementId);
        if (!targetElement || !targetElement.groupId) return;

        const targetGroupId = targetElement.groupId;
        const updatedElements = pageElements.map(el => {
            if (el.groupId === targetGroupId) {
                const { groupId, ...rest } = el;
                return rest;
            }
            return el;
        });

        updatePage(activeChapter.id, activePage.id, {
            elements: updatedElements
        });
    }, [activePage, activeChapter, activeElementId, updatePage]);

    if (!currentBook) return null;

    const hasActiveSelection = activeTextEdit || activePhotoEdit || activeStickerEdit;
    if (!hasActiveSelection) return null;

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 h-14 bg-white/95 backdrop-blur-md border border-slate-200/80 px-4 flex items-center gap-3.5 z-40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl text-slate-700 select-none animate-in fade-in slide-in-from-top-2 duration-200 w-max max-w-[90vw]">
            {/* Context A: Text Element Active */}
            {activeTextEdit && (
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pr-1">文字选项</span>
                    
                    <button
                        type="button"
                        onClick={() => handleActivateSection('font')}
                        className={getBtnClassName('font')}
                    >
                        <Type size={13} />
                        <span>字体与文本</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleActivateSection('color')}
                        className={getBtnClassName('color')}
                    >
                        <Palette size={13} />
                        <span>颜色</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleActivateSection('position')}
                        className={getBtnClassName('position')}
                    >
                        <Move size={13} />
                        <span>位置微调</span>
                    </button>
                </div>
            )}

            {/* Context B: Photo Element Active */}
            {activePhotoEdit && (
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pr-1">图片选项</span>

                    <button
                        type="button"
                        onClick={() => handleActivateSection('edit')}
                        className={getBtnClassName('edit')}
                    >
                        <Camera size={13} />
                        <span>编辑与滤镜</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleActivateSection('crop')}
                        className={getBtnClassName('crop')}
                    >
                        <Sliders size={13} />
                        <span>剪裁</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleActivateSection('frame')}
                        className={getBtnClassName('frame')}
                    >
                        <Smile size={13} />
                        <span>相框</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleActivateSection('position')}
                        className={getBtnClassName('position')}
                    >
                        <Move size={13} />
                        <span>微调</span>
                    </button>

                    <div className="h-4 w-px bg-slate-200 shrink-0 mx-1" />

                    <button
                        type="button"
                        onClick={async () => {
                            if (window.confirm('确定要删除这张图片吗？')) {
                                await deletePhotoFromPage(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId);
                                setActivePhotoEdit(null);
                            }
                        }}
                        className="p-1.5 h-8 w-8 flex items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50 cursor-pointer shrink-0 transition-all"
                        title="删除图片"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}

            {/* Context C: Sticker / Shape Element Active */}
            {activeStickerEdit && (
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pr-1">元素选项</span>

                    <button
                        type="button"
                        onClick={() => handleActivateSection('sticker-adjust')}
                        className={getBtnClassName('sticker-adjust')}
                    >
                        <Sliders size={13} />
                        <span>大小与旋转</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => handleActivateSection('position')}
                        className={getBtnClassName('position')}
                    >
                        <Move size={13} />
                        <span>位置微调</span>
                    </button>

                    <div className="h-4 w-px bg-slate-200 shrink-0 mx-1" />

                    <button
                        type="button"
                        onClick={deleteSelectedSticker}
                        className="p-1.5 h-8 w-8 flex items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50 cursor-pointer shrink-0 transition-all"
                        title="删除元素"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}

            {/* Shared Controls: Layer Order & Grouping */}
            {activePage?.elements && activePage.elements.length > 0 && (
                <>
                    <div className="h-5 w-px bg-slate-200 shrink-0" />
                    
                    <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-100 shrink-0">
                        <button
                            type="button"
                            onClick={() => changeLayerOrder('front')}
                            className="p-1 h-7 w-7 flex items-center justify-center rounded text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm cursor-pointer transition-all"
                            title="置于顶层"
                        >
                            <ChevronsUp size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => changeLayerOrder('forward')}
                            className="p-1 h-7 w-7 flex items-center justify-center rounded text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm cursor-pointer transition-all"
                            title="上移一层"
                        >
                            <ChevronUp size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => changeLayerOrder('backward')}
                            className="p-1 h-7 w-7 flex items-center justify-center rounded text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm cursor-pointer transition-all"
                            title="下移一层"
                        >
                            <ChevronDown size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => changeLayerOrder('back')}
                            className="p-1 h-7 w-7 flex items-center justify-center rounded text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm cursor-pointer transition-all"
                            title="置于底层"
                        >
                            <ChevronsDown size={13} />
                        </button>

                        <div className="h-4 w-px bg-slate-200 mx-1" />

                        {hasGroupId ? (
                            <button
                                type="button"
                                onClick={handleUngroupElements}
                                className="p-1 h-7 px-1.5 flex items-center gap-1 rounded text-amber-600 hover:bg-white hover:shadow-sm cursor-pointer transition-all text-[10px] font-bold"
                                title="取消该组内所有元素的组合关联"
                            >
                                <Link2Off size={13} />
                                <span>解组</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleGroupElements}
                                className="p-1 h-7 px-1.5 flex items-center gap-1 rounded text-indigo-600 hover:bg-white hover:shadow-sm cursor-pointer transition-all text-[10px] font-bold"
                                title="组合当前选中元素及其所有重叠元素"
                            >
                                <Link2 size={13} />
                                <span>组合</span>
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
// #endregion
// #endregion
