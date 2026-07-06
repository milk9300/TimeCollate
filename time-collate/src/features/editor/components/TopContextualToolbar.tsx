// #region Description
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useBookStore, getVirtualChapters, useConvertedPages } from '../../../store';
import { editorFacade } from '../runtime/EditorFacade';
import { ColorPicker } from './ColorPicker';
import {
    parsePageContent,
    getPageDecorations,
    updatePageDecorations,
    getSlotText,
    getSlotStyle,
    updateSlotText,
    updateSlotStyle
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
    ChevronUp,
    ChevronDown,
    ChevronsUp,
    ChevronsDown,
    Link2,
    Link2Off,
    Grid,
    Image as ImageIcon,
    ImageOff,
    Bold,
    Italic,
    Plus,
    Minus
} from 'lucide-react';
import { UpdatePageCommand } from '../runtime/services/UpdatePageCommand';
import type { TextElement } from '../../../types';

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
    const selectedElementIds = useBookStore(state => state.selectedElementIds);
    const setSelectedElementIds = useBookStore(state => state.setSelectedElementIds);

    const deletePhotoFromPage = useBookStore(state => state.deletePhotoFromPage);
    const updatePage = useBookStore(state => state.updatePage);
    const templates = useBookStore(state => state.templates);




    const isInspectorActive = rightActiveTab === 'inspector' && isDrawerOpen;

    const getBtnClassName = useCallback((section: 'edit' | 'crop' | 'frame' | 'font' | 'color' | 'sticker-adjust') => {
        const isActive = isInspectorActive && activeInspectorSection === section;
        return `h-8 px-2.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            isActive
                ? 'bg-indigo-50 border-indigo-250 text-indigo-650'
                : 'bg-white border-slate-200 text-slate-655 hover:bg-slate-50'
        }`;
    }, [isInspectorActive, activeInspectorSection]);

    const isEditingCover = editorScope === 'cover';

    const pages = useConvertedPages();

    const coverPage = useMemo(() => {
        return pages.find(p => p.pageType === 'cover') || null;
    }, [pages]);

    const chapters = useMemo(() => {
        return getVirtualChapters(pages);
    }, [pages]);

    const activeChapter = useMemo(() => {
        if (isEditingCover) {
            if (coverPage) {
                return {
                    id: 'cover_chapter_id',
                    title: '封面',
                    date: '',
                    pages: [coverPage]
                };
            }
            return null;
        }
        return chapters.find(c => c.id === activeChapterId) || null;
    }, [isEditingCover, coverPage, chapters, activeChapterId]);

    const activePage = useMemo(() => {
        if (isEditingCover) {
            return coverPage;
        }
        return activeChapter?.pages.find(p => p.id === activePageId) || null;
    }, [isEditingCover, coverPage, activeChapter, activePageId]);

    // 字体列表状态与拉取
    const [fontsList, setFontsList] = React.useState<any[]>([]);
    React.useEffect(() => {
        const fetchFonts = async () => {
            try {
                const list = await editorFacade.listResources('font');
                setFontsList(list);
            } catch (err) {
                console.error('Failed to fetch fonts in TopContextualToolbar:', err);
            }
        };
        fetchFonts();
    }, []);

    // 文本槽位样式解析与编辑支持
    const selectedTextSlot = useMemo(() => {
        if (!activeTextEdit || !currentBook || !activePage) return null;

        // V2.0 Canvas element support
        if (activePage.elements) {
            const el = activePage.elements.find(e => e.id === activeTextEdit.slotId);
            if (el && el.type === 'text') {
                const textEl = el as TextElement;
                return {
                    isV2: true,
                    text: textEl.textConfig.content || '',
                    style: {
                        fontFamily: textEl.textConfig.fontFamily || 'sans-serif',
                        fontSize: textEl.textConfig.fontSize || '14px',
                        fontWeight: textEl.textConfig.fontWeight || 'normal',
                        fontStyle: textEl.textConfig.fontStyle || 'normal',
                        color: textEl.textConfig.color || '#334155',
                        textAlign: textEl.textConfig.textAlign || 'left',
                        lineHeight: textEl.textConfig.lineHeight || 1.6,
                        letterSpacing: textEl.textConfig.letterSpacing || '0px'
                    }
                };
            }
        }

        // V1.0 Grid template support
        const template = templates.find((t) => t.id === activePage.templateId);
        const element = template?.layoutSchema.elements.find(e => e.id === activeTextEdit.slotId);

        return {
            isV2: false,
            text: getSlotText(activePage.content, activeTextEdit.slotId),
            style: getSlotStyle(activePage.content, activeTextEdit.slotId, {
                fontSize: element?.style.fontSize,
                fontWeight: element?.style.fontWeight as any,
                lineHeight: element?.style.lineHeight,
            })
        };
    }, [activeTextEdit, currentBook, activePage, templates]);

    const currentFontSize = selectedTextSlot?.style?.fontSize ? (parseInt(String(selectedTextSlot.style.fontSize)) || 14) : 14;
    const [localSizeInput, setLocalSizeInput] = useState(String(currentFontSize));

    useEffect(() => {
        setLocalSizeInput(String(currentFontSize));
    }, [currentFontSize]);

    const updateSelectedTextSlot = useCallback((updates: { text?: string; style?: Partial<any> }) => {
        if (!activeTextEdit || !currentBook || !activePage || !activeChapter) return;
        const { chapterId, pageId, slotId } = activeTextEdit;

        if (activePage.elements) {
            const updatedElements = activePage.elements.map(el => {
                if (el.id === slotId && el.type === 'text') {
                    const textEl = el as TextElement;
                    return {
                        ...textEl,
                        textConfig: {
                            ...textEl.textConfig,
                            ...(updates.text !== undefined ? { content: updates.text } : {}),
                            ...(updates.style !== undefined ? {
                                fontFamily: updates.style.fontFamily !== undefined ? updates.style.fontFamily : textEl.textConfig.fontFamily,
                                fontSize: updates.style.fontSize !== undefined ? updates.style.fontSize : textEl.textConfig.fontSize,
                                fontWeight: updates.style.fontWeight !== undefined ? updates.style.fontWeight : textEl.textConfig.fontWeight,
                                color: updates.style.color !== undefined ? updates.style.color : textEl.textConfig.color,
                                textAlign: updates.style.textAlign !== undefined ? updates.style.textAlign : textEl.textConfig.textAlign,
                                lineHeight: updates.style.lineHeight !== undefined ? updates.style.lineHeight : textEl.textConfig.lineHeight,
                                letterSpacing: updates.style.letterSpacing !== undefined ? updates.style.letterSpacing : textEl.textConfig.letterSpacing,
                                fontStyle: updates.style.fontStyle !== undefined ? updates.style.fontStyle : textEl.textConfig.fontStyle,
                            } : {})
                        }
                    } as TextElement;
                }
                return el;
            });
            const isCommandMode = useBookStore.getState().enableCommandHistory;
            if (isCommandMode) {
                const command = new UpdatePageCommand(
                    chapterId,
                    pageId,
                    { elements: activePage.elements },
                    { elements: updatedElements }
                );
                editorFacade.execute(command);
            } else {
                updatePage(chapterId, pageId, { elements: updatedElements });
            }
            return;
        }

        let content = activePage.content || '';
        if (updates.text !== undefined) {
            content = updateSlotText(content, slotId, updates.text);
        }
        if (updates.style !== undefined) {
            content = updateSlotStyle(content, slotId, updates.style);
        }

        const isCommandMode = useBookStore.getState().enableCommandHistory;
        if (isCommandMode) {
            const command = new UpdatePageCommand(
                chapterId,
                pageId,
                { content: activePage.content || '' },
                { content }
            );
            editorFacade.execute(command);
        } else {
            updatePage(chapterId, pageId, { content });
        }
    }, [activeTextEdit, currentBook, activePage, activeChapter, updatePage]);

    const activeElementId = activeTextEdit?.slotId || activePhotoEdit?.photoId || activeStickerEdit?.stickerId;
    const activeElement = activePage?.elements?.find(el => el.id === activeElementId) || null;
    const hasGroupId = activeElement && !!activeElement.groupId;

    const getFontDisplayName = useCallback((id: string) => {
        switch (id) {
            case 'sans-serif': return '默认无衬线';
            case 'system-sans': case 'sans': return '现代黑体';
            case 'system-serif': case 'serif': return '优雅宋体';
            case 'system-handwriting': case 'handwriting': return '硬笔手写';
            case 'system-outfit': case 'Outfit': return 'Outfit';
            case 'system-inter': case 'Inter': return 'Inter';
            case 'system-oswald': case 'Oswald': return 'Oswald';
            default: {
                const cloudFont = fontsList.find(f => f.id === id);
                return cloudFont ? cloudFont.name : id;
            }
        }
    }, [fontsList]);

    // 辅助激活侧边栏与具体编辑面板的方法
    const handleActivateSection = useCallback((section: 'edit' | 'crop' | 'frame' | 'font' | 'color' | 'sticker-adjust') => {
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

    // 背景属性修改逻辑
    const handleBgColorChange = useCallback((color: string) => {
        if (!activePage || !activeChapter) return;
        const currentBg = activePage.background || {};
        updatePage(activeChapter.id, activePage.id, {
            background: {
                ...currentBg,
                color
            }
        });
    }, [activePage, activeChapter, updatePage]);

    const handleBgGridToggle = useCallback(() => {
        if (!activePage || !activeChapter) return;
        const currentBg = activePage.background || {};
        updatePage(activeChapter.id, activePage.id, {
            background: {
                ...currentBg,
                gridPattern: !currentBg.gridPattern
            }
        });
    }, [activePage, activeChapter, updatePage]);

    const handleClearBgImage = useCallback(() => {
        if (!activePage || !activeChapter) return;
        const currentBg = activePage.background || {};
        updatePage(activeChapter.id, activePage.id, {
            background: {
                ...currentBg,
                backgroundImage: undefined
            }
        });
    }, [activePage, activeChapter, updatePage]);

    if (!currentBook) return null;

    const isBackgroundSelected = selectedElementIds.includes('page-background');
    const hasActiveSelection = activeTextEdit || activePhotoEdit || activeStickerEdit || isBackgroundSelected;
    if (!hasActiveSelection) return null;

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 h-14 bg-white/95 backdrop-blur-md border border-slate-200/80 px-4 flex items-center gap-3.5 z-40 shadow-[0_8px_32px_rgba(0,0,0,0.08)] rounded-2xl text-slate-700 select-none animate-in fade-in slide-in-from-top-2 duration-200 w-max max-w-[90vw]">
            {/* Context D: Page Background Active */}
            {isBackgroundSelected && activePage && (
                <div className="flex items-center gap-2">
                    {/* 预设底色圆点 */}
                    <div className="flex items-center gap-1.5 px-2 bg-slate-50 py-1 rounded-lg border border-slate-100 shrink-0">
                        {[
                            { color: '#FFFFFF', name: '纯白' },
                            { color: '#FAF5EC', name: '暖沙' },
                            { color: '#ECE3D3', name: '复古' },
                            { color: '#FDFCF7', name: '绘本' },
                            { color: '#18181B', name: '暗夜' }
                        ].map(item => {
                            const isCurrent = (activePage.background?.color || '#FFFFFF') === item.color;
                            return (
                                <button
                                    key={item.color}
                                    type="button"
                                    onClick={() => handleBgColorChange(item.color)}
                                    className={`w-5 h-5 rounded-full border transition-all cursor-pointer hover:scale-110 flex items-center justify-center ${
                                        isCurrent ? 'border-indigo-650 ring-2 ring-indigo-100 shadow-sm' : 'border-slate-200'
                                    }`}
                                    style={{ backgroundColor: item.color }}
                                    title={item.name}
                                >
                                    {isCurrent && (
                                        <span className={`w-1 h-1 rounded-full ${item.color === '#18181B' ? 'bg-white' : 'bg-slate-800'}`} />
                                    )}
                                </button>
                            );
                        })}

                        {/* 自定义颜色选择器 */}
                        <div className="flex items-center justify-center shrink-0">
                            <ColorPicker
                                color={activePage.background?.color || '#FFFFFF'}
                                onChange={handleBgColorChange}
                                onInteractiveStart={() => {
                                    if (useBookStore.getState().enableCommandHistory) {
                                        editorFacade.beginTransaction();
                                    }
                                }}
                                onInteractiveEnd={() => {
                                    if (useBookStore.getState().enableCommandHistory) {
                                        editorFacade.commitTransaction();
                                    }
                                }}
                                showAlpha={false}
                                triggerClassName="!w-5 !h-5 !rounded-full border-slate-200"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Context A: Text Element Active */}
            {activeTextEdit && selectedTextSlot && (
                <div className="flex items-center gap-2">
                    {/* 字体系列按钮，点击打开侧边栏 */}
                    <button
                        type="button"
                        onClick={() => handleActivateSection('font')}
                        className="h-8 bg-white border border-slate-200 rounded-lg px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        title="点击打开侧边栏选择字体与样式"
                    >
                        <span>{getFontDisplayName(selectedTextSlot.style.fontFamily || 'system-sans')}</span>
                        <ChevronDown size={11} className="text-slate-400" />
                    </button>

                    {/* 字号控制 - 96 + */}
                    <div className="flex items-center border border-slate-200 rounded-lg h-8 bg-white overflow-hidden shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                const currentSize = parseInt(String(selectedTextSlot.style.fontSize || '14')) || 14;
                                const newSize = Math.max(8, currentSize - 1);
                                updateSelectedTextSlot({ style: { fontSize: `${newSize}px` } });
                            }}
                            className="w-6 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer font-bold select-none border-r border-slate-100"
                        >
                            <Minus size={10} className="stroke-[2.5]" />
                        </button>
                        <input
                            type="text"
                            value={localSizeInput}
                            onChange={(e) => {
                                const valStr = e.target.value;
                                setLocalSizeInput(valStr);
                                const parsed = parseInt(valStr);
                                if (!isNaN(parsed) && parsed >= 8 && parsed <= 200) {
                                    updateSelectedTextSlot({ style: { fontSize: `${parsed}px` } });
                                }
                            }}
                            onBlur={() => {
                                let parsed = parseInt(localSizeInput);
                                if (isNaN(parsed)) {
                                    parsed = 14;
                                }
                                const clamped = Math.max(8, Math.min(200, parsed));
                                updateSelectedTextSlot({ style: { fontSize: `${clamped}px` } });
                                setLocalSizeInput(String(clamped));
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    let parsed = parseInt(localSizeInput);
                                    if (isNaN(parsed)) {
                                        parsed = 14;
                                    }
                                    const clamped = Math.max(8, Math.min(200, parsed));
                                    updateSelectedTextSlot({ style: { fontSize: `${clamped}px` } });
                                    setLocalSizeInput(String(clamped));
                                    e.currentTarget.blur();
                                }
                            }}
                            className="w-8 text-center text-[11px] font-mono font-bold text-slate-700 outline-none border-none bg-transparent"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                const currentSize = parseInt(String(selectedTextSlot.style.fontSize || '14')) || 14;
                                const newSize = Math.min(200, currentSize + 1);
                                updateSelectedTextSlot({ style: { fontSize: `${newSize}px` } });
                            }}
                            className="w-6 h-full flex items-center justify-center text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer font-bold select-none border-l border-slate-100"
                        >
                            <Plus size={10} className="stroke-[2.5]" />
                        </button>
                    </div>

                    {/* 颜色 A 图标 */}
                    <ColorPicker
                        color={selectedTextSlot.style.color || '#334155'}
                        onChange={(color) => updateSelectedTextSlot({ style: { color } })}
                        triggerClassName="!w-8 !h-8 !border border-slate-200 !rounded-lg !bg-white hover:!bg-slate-50 shrink-0"
                    >
                        <div className="flex flex-col items-center justify-center relative w-full h-full pointer-events-none">
                            <span className="text-xs font-bold text-slate-700 font-serif leading-none mt-[-2px]">A</span>
                            <div 
                                className="absolute bottom-1.5 left-1.5 right-1.5 h-[3px] rounded-sm" 
                                style={{ backgroundColor: selectedTextSlot.style.color || '#334155' }}
                            />
                        </div>
                    </ColorPicker>

                    {/* 加粗 B 图标 */}
                    {(() => {
                        const isBold = (selectedTextSlot.style.fontWeight || 'normal') === 'bold';
                        return (
                            <button
                                type="button"
                                onClick={() => {
                                    updateSelectedTextSlot({ style: { fontWeight: isBold ? 'normal' : 'bold' } });
                                }}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border cursor-pointer shrink-0 transition-all ${
                                    isBold
                                        ? 'bg-indigo-50 border-indigo-250 text-indigo-700 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                                title="加粗"
                            >
                                <Bold size={11} className="stroke-[2.5]" />
                            </button>
                        );
                    })()}

                    {/* 斜体 I 图标 */}
                    {(() => {
                        const isItalic = (selectedTextSlot.style.fontStyle || 'normal') === 'italic';
                        return (
                            <button
                                type="button"
                                onClick={() => {
                                    updateSelectedTextSlot({ style: { fontStyle: isItalic ? 'normal' : 'italic' } });
                                }}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg border cursor-pointer shrink-0 transition-all ${
                                    isItalic
                                        ? 'bg-indigo-50 border-indigo-250 text-indigo-700 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                                title="斜体"
                            >
                                <Italic size={11} className="stroke-[2.5]" />
                            </button>
                        );
                    })()}

                    {/* 高级设置 */}
                    <button
                        type="button"
                        onClick={() => handleActivateSection('font')}
                        className="h-8 px-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        title="高级设置"
                    >
                        <Sliders size={11} />
                        <span>高级设置</span>
                    </button>

                    <div className="h-4 w-px bg-slate-200 shrink-0 mx-0.5" />

                    <button
                        type="button"
                        onClick={async () => {
                            if (window.confirm('确定要删除这个文本框吗？')) {
                                const pageElements = activePage?.elements || [];
                                const updatedElements = pageElements.filter(el => el.id !== activeTextEdit.slotId);
                                updatePage(activeChapter!.id, activePage!.id, { elements: updatedElements });
                                setActiveTextEdit(null);
                            }
                        }}
                        className="p-1.5 h-8 w-8 flex items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50 cursor-pointer shrink-0 transition-all"
                        title="删除文本框"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            )}

            {/* Context B: Photo Element Active */}
            {activePhotoEdit && (
                <div className="flex items-center gap-2">

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

                    <button
                        type="button"
                        onClick={() => handleActivateSection('sticker-adjust')}
                        className={getBtnClassName('sticker-adjust')}
                    >
                        <Sliders size={13} />
                        <span>大小与旋转</span>
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
