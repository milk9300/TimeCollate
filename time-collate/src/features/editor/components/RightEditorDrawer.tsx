// #region Description
import React, { useMemo, useCallback } from 'react';
import { useBookStore, getVirtualChapters, useConvertedPages } from '../../../store';
import { editorFacade } from '../runtime/EditorFacade';
import { UpdatePageCommand } from '../runtime/services/UpdatePageCommand';
import { CustomPhotoBrowser } from './CustomPhotoBrowser';
import { CustomDecorationBrowser } from './CustomDecorationBrowser';
import type { TextElement, StickerElement } from '../../../types';
import {
    parsePageContent,
    updatePageDecorations,
    getSlotText,
    getSlotStyle,
    updateSlotText,
    updateSlotStyle,
    updateElementOverride,
    getPageDecorations
} from '../../../utils/textSlotHelper';
import {
    Clock
} from 'lucide-react';
import { parseCoverUrl } from './GeneratedCover';

// 导入拆分的 Tab 子组件
import { InspectorTab } from './RightEditorDrawerTabs/InspectorTab';
import { TemplateCenterPanel } from './TemplateCenterPanel';
import { GlobalTab } from './RightEditorDrawerTabs/GlobalTab';
import { TextTab } from './RightEditorDrawerTabs/TextTab';

interface RightEditorDrawerProps {
    activeTab: 'text' | 'templates' | 'photos' | 'decorations' | 'global' | 'inspector' | null;
    activeChapterId: string | null;
    activePageId: string | null;
}

export const RightEditorDrawer: React.FC<RightEditorDrawerProps> = ({
    activeTab,
    activeChapterId,
    activePageId
}) => {
    const editorScope = useBookStore(state => state.editorScope);
    const isEditingCover = editorScope === 'cover';
    const activeFrontPage = useBookStore(state => state.activeFrontPage);
    const currentBook = useBookStore(state => state.currentBook);
    const updatePage = useBookStore(state => state.updatePage);
    const templates = useBookStore(state => state.templates);

    // Zustand editor state bindings
    const activePhotoEdit = useBookStore(state => state.activePhotoEdit);
    const setActivePhotoEdit = useBookStore(state => state.setActivePhotoEdit);
    const activeTextEdit = useBookStore(state => state.activeTextEdit);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);
    const activeStickerEdit = useBookStore(state => state.activeStickerEdit);
    const setActiveStickerEdit = useBookStore(state => state.setActiveStickerEdit);
    const updatePhotoSettings = useBookStore(state => state.updatePhotoSettings);
    const deletePhotoFromPage = useBookStore(state => state.deletePhotoFromPage);

    // 解析当前封皮配置
    const parsedCover = useMemo(() => {
        if (!currentBook) return { layout: 'classic', bgId: 'cotton-white', image: '', ossKey: '' } as any;
        return parseCoverUrl(currentBook.coverUrl, currentBook.title);
    }, [currentBook?.coverUrl, currentBook?.title]);

    const isLocked = currentBook?.status === 'pending' || currentBook?.status === 'published';

    const pages = useConvertedPages();

    const chapters = useMemo(() => {
        return getVirtualChapters(pages);
    }, [pages]);

    const coverPage = useMemo(() => {
        return pages.find(p => p.pageType === 'cover') || null;
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

    // 选中元素属性提取辅助
    const selectedPhoto = useMemo(() => {
        if (!activePhotoEdit || !currentBook) return null;
        const page = isEditingCover ? coverPage : chapters
            .find(c => c.id === activePhotoEdit.chapterId)
            ?.pages.find(p => p.id === activePhotoEdit.pageId);
        if (page) {
            // V2.0 Canvas element support
            if (page.elements) {
                const el = page.elements.find(e => e.id === activePhotoEdit.photoId);
                if (el && el.type === 'photo-frame') {
                    return (el as any).photo;
                }
            }
            // V1.0 Grid template support
            return page.photos.find(p => p.id === activePhotoEdit.photoId) || null;
        }
        return null;
    }, [activePhotoEdit, currentBook, chapters, isEditingCover, coverPage]);

    const selectedTextSlot = useMemo(() => {
        if (!activeTextEdit || !currentBook) return null;
        const page = isEditingCover ? coverPage : chapters
            .find(c => c.id === activeTextEdit.chapterId)
            ?.pages.find(p => p.id === activeTextEdit.pageId);
        if (!page) return null;

        // V2.0 Canvas element support
        if (page.elements) {
            const el = page.elements.find(e => e.id === activeTextEdit.slotId);
            if (el && el.type === 'text') {
                const textEl = el as TextElement;
                return {
                    isV2: true,
                    text: textEl.textConfig.content || '',
                    style: {
                        fontFamily: textEl.textConfig.fontFamily || 'sans-serif',
                        fontSize: textEl.textConfig.fontSize || '14px',
                        fontWeight: textEl.textConfig.fontWeight || 'normal',
                        color: textEl.textConfig.color || '#334155',
                        textAlign: textEl.textConfig.textAlign || 'left',
                        lineHeight: textEl.textConfig.lineHeight || 1.6,
                        letterSpacing: textEl.textConfig.letterSpacing || '0px',
                        fontStyle: textEl.textConfig.fontStyle || 'normal'
                    },
                    rawStyle: {}
                };
            }
        }

        const template = templates.find((t) => t.id === page.templateId);
        const element = template?.layoutSchema.elements.find(e => e.id === activeTextEdit.slotId);

        return {
            isV2: false,
            text: getSlotText(page.content, activeTextEdit.slotId),
            style: getSlotStyle(page.content, activeTextEdit.slotId, {
                fontSize: element?.style.fontSize,
                fontWeight: element?.style.fontWeight as any,
                lineHeight: element?.style.lineHeight,
            }),
            rawStyle: (parsePageContent(page.content).slots[activeTextEdit.slotId]?.style || {}) as any
        };
    }, [activeTextEdit, currentBook, templates, isEditingCover, coverPage, chapters]);

    const selectedSticker = useMemo(() => {
        if (!activeStickerEdit || !currentBook) return null;
        const page = isEditingCover ? coverPage : chapters
            .find(c => c.id === activeStickerEdit.chapterId)
            ?.pages.find(p => p.id === activeStickerEdit.pageId);
        if (!page) return null;

        if (page.elements) {
            const el = page.elements.find(e => e.id === activeStickerEdit.stickerId);
            if (el && el.type === 'sticker') {
                const stk = el as StickerElement;
                return {
                    isV2: true,
                    element: stk,
                    id: stk.id,
                    stickerId: stk.stickerConfig.stickerId,
                    imageUrl: stk.stickerConfig.imageUrl,
                    colorTint: stk.stickerConfig.colorTint,
                    size: stk.width,
                    rotate: stk.rotate
                };
            }
        }

        const decorations = getPageDecorations(page.content);
        const stk = decorations.find(d => d.id === activeStickerEdit.stickerId);
        if (!stk) return null;
        return {
            isV2: false,
            element: null as any,
            id: stk.id,
            stickerId: stk.content,
            imageUrl: '',
            colorTint: undefined as string | undefined,
            size: stk.size || 16,
            rotate: stk.rotate || 0
        };
    }, [activeStickerEdit, currentBook, chapters, isEditingCover, coverPage]);

    const stickerRotation = useMemo(() => {
        if (!selectedSticker) return 0;
        return selectedSticker.rotate || 0;
    }, [selectedSticker]);

    // 更新函数与操作 Actions
    const updateSelectedTextSlot = useCallback((updates: { text?: string; style?: Partial<any> }) => {
        if (!activeTextEdit || !currentBook) return;
        const { chapterId, pageId, slotId } = activeTextEdit;
        const page = isEditingCover ? coverPage : chapters
            .find(c => c.id === chapterId)
            ?.pages.find(p => p.id === pageId);
        if (!page) return;

        if (page.elements) {
            const updatedElements = page.elements.map(el => {
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
                    { elements: page.elements },
                    { elements: updatedElements }
                );
                editorFacade.execute(command);
            } else {
                updatePage(chapterId, pageId, { elements: updatedElements });
            }
            return;
        }

        let content = page.content || '';
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
                { content: page.content || '' },
                { content }
            );
            editorFacade.execute(command);
        } else {
            updatePage(chapterId, pageId, { content });
        }
    }, [activeTextEdit, currentBook, updatePage, chapters, isEditingCover, coverPage]);

    const updateSticker = useCallback((updates: { size?: number; rotate?: number; colorTint?: string }) => {
        if (!activeStickerEdit || !activePage || !activeChapter) return;

        if (activePage.elements) {
            const updatedElements = activePage.elements.map(el => {
                if (el.id === activeStickerEdit.stickerId && el.type === 'sticker') {
                    const stk = el as StickerElement;
                    return {
                        ...stk,
                        rotate: updates.rotate !== undefined ? updates.rotate : stk.rotate,
                        width: updates.size !== undefined ? updates.size : stk.width,
                        height: updates.size !== undefined ? updates.size : stk.height,
                        stickerConfig: {
                            ...stk.stickerConfig,
                            colorTint: updates.colorTint !== undefined ? (updates.colorTint === 'undefined' || !updates.colorTint ? undefined : updates.colorTint) : stk.stickerConfig.colorTint
                        }
                    } as StickerElement;
                }
                return el;
            });
            updatePage(activeChapter.id, activePage.id, { elements: updatedElements });
            return;
        }

        const parsed = parsePageContent(activePage.content);
        const decorations = parsed.decorations || [];
        const updatedDecorations = decorations.map(d => {
            if (d.id === activeStickerEdit.stickerId) {
                const newD = { ...d };
                if (updates.size !== undefined) newD.size = updates.size;
                if (updates.rotate !== undefined) newD.rotate = updates.rotate;
                return newD;
            }
            return d;
        });
        const updatedContent = updatePageDecorations(activePage.content, updatedDecorations);
        updatePage(activeChapter.id, activePage.id, { content: updatedContent });
    }, [activeStickerEdit, activePage, activeChapter, updatePage]);

    const deleteSelectedSticker = useCallback(() => {
        if (!activeStickerEdit || !activePage || !activeChapter) return;
        if (window.confirm('确定要删除这个贴图吗？')) {
            if (activePage.elements) {
                const updatedElements = activePage.elements.filter(el => el.id !== activeStickerEdit.stickerId);
                updatePage(activeChapter.id, activePage.id, { elements: updatedElements });
                setActiveStickerEdit(null);
                return;
            }

            const parsed = parsePageContent(activePage.content);
            const decorations = parsed.decorations || [];
            const updatedDecorations = decorations.filter(d => d.id !== activeStickerEdit.stickerId);
            const updatedContent = updatePageDecorations(activePage.content, updatedDecorations);
            updatePage(activeChapter.id, activePage.id, { content: updatedContent });
            setActiveStickerEdit(null);
        }
    }, [activeStickerEdit, activePage, activeChapter, updatePage, setActiveStickerEdit]);


    // Handle sticker addition
    const handleAddSticker = useCallback((stickerId: string) => {
        if (!activePage || !activeChapter) return;

        if (activePage.elements) {
            const newStickerElement: StickerElement = {
                id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'sticker',
                x: 50,
                y: 50,
                width: 15,
                height: 15,
                rotate: 0,
                zIndex: activePage.elements.length > 0 ? Math.max(...activePage.elements.map(e => e.zIndex)) + 10 : 20,
                stickerConfig: {
                    stickerId,
                    imageUrl: ''
                }
            };
            updatePage(activeChapter.id, activePage.id, {
                elements: [...activePage.elements, newStickerElement]
            });
            setActiveStickerEdit({
                chapterId: activeChapter.id,
                pageId: activePage.id,
                stickerId: newStickerElement.id
            });
            return;
        }

        const parsed = parsePageContent(activePage.content);
        const decorations: any[] = parsed.decorations || [];

        const newSticker = {
            id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'sticker',
            stickerId,
            left: '50%',
            top: '50%',
            width: '15%',
            height: '15%',
            transform: 'translate(-50%, -50%) rotate(0deg)'
        };

        const updatedContent = updatePageDecorations(activePage.content, [...decorations, newSticker]);
        updatePage(activeChapter.id, activePage.id, { content: updatedContent });
    }, [activePage, activeChapter, updatePage, setActiveStickerEdit]);

    const renderLockBanner = () => {
        if (!isLocked) return null;
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 mb-4 flex items-start gap-2.5 text-[10px] text-amber-700 font-bold leading-normal select-none animate-in fade-in duration-200">
                <Clock size={13} className="shrink-0 text-amber-600 mt-0.5 animate-pulse" />
                <div>
                    <p className="font-black text-amber-800">作品处于发布审核或公开状态</p>
                    <p className="mt-0.5 text-amber-600">在此状态下不可修改封面与书籍属性。如需编辑，请先在「全局配置」选项卡中撤回发布。</p>
                </div>
            </div>
        );
    };

    if (!currentBook || !activeTab) return null;

    const isBackCover = isEditingCover && activeFrontPage === 'backCover';

    if (isBackCover && activeTab !== 'global') {
        return (
            <div className="w-[320px] bg-white border-l border-gray-200/80 flex flex-col h-full z-10 shrink-0 shadow-sm transition-all duration-300 relative">
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/20 flex flex-col items-center justify-center">
                    {isEditingCover && renderLockBanner()}
                    <div className="text-center py-16 px-6 bg-white border border-dashed border-gray-250 rounded-3xl text-gray-400 text-[10px] leading-relaxed flex flex-col items-center justify-center gap-3 select-none">
                        <svg className="w-8 h-8 text-indigo-650 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.886L4.2 9.2l4.8 4.186L7.376 21 12 17.3 16.624 21l-1.624-7.614 4.8-4.186-5.888-.314z"/></svg>
                        <span className="font-bold text-slate-800 text-[11px]">封底为自动生成页面</span>
                        <span className="text-slate-400 leading-relaxed text-[9px]">
                            系统会根据您的封面设计与作品属性（作者、印制时间）自动绘制精美封底，不支持手动排版编辑。
                            您可以在右侧 <span className="text-indigo-650 font-bold">“全局配置”</span> 面板中切换书籍主题以改变封底视觉风格。
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-[320px] bg-white border-l border-gray-200/80 flex flex-col h-full z-10 shrink-0 shadow-sm transition-all duration-300 relative">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/20">
                {/* 仅在编辑书封时，且锁定状态下显示警告 */}
                {isEditingCover && renderLockBanner()}

                {/* 0. INSPECTOR TAB (属性设置微调) */}
                {activeTab === 'inspector' && (
                    <InspectorTab
                        activePage={activePage}
                        activeChapter={activeChapter}
                        selectedPhoto={selectedPhoto}
                        selectedTextSlot={selectedTextSlot}
                        selectedSticker={selectedSticker}
                        stickerRotation={stickerRotation}
                        updateSelectedTextSlot={updateSelectedTextSlot}
                        updateSticker={updateSticker}
                        deleteSelectedSticker={deleteSelectedSticker}
                    />
                )}

                {/* 1. TEMPLATES TAB */}
                {activeTab === 'templates' && (
                    <TemplateCenterPanel
                        activePage={activePage}
                        activeChapter={activeChapter}
                        activeChapterId={activeChapterId}
                    />
                )}

                {/* 1.5 TEXT TAB (添加文字) */}
                {activeTab === 'text' && (
                    <TextTab
                        activePage={activePage}
                        activeChapter={activeChapter}
                    />
                )}

                {/* 2. PHOTOS TAB */}
                {activeTab === 'photos' && (
                    <div className="h-full flex flex-col min-h-0">
                        {activePage ? (
                            <CustomPhotoBrowser
                                activeChapterId={activeChapter?.id || null}
                                activePageId={activePage?.id || null}
                            />
                        ) : (
                            <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] px-4 leading-relaxed">
                                请在左侧选择具体回忆页，以激活照片素材管理器。
                            </div>
                        )}
                    </div>
                )}

                {/* 2.5 DECORATIONS TAB */}
                {activeTab === 'decorations' && (
                    <div className="h-full flex flex-col min-h-0">
                        {activePage ? (
                            <CustomDecorationBrowser
                                activeChapterId={activeChapter?.id || null}
                                activePageId={activePage?.id || null}
                                handleAddSticker={handleAddSticker}
                            />
                        ) : (
                            <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] px-4 leading-relaxed">
                                请在左侧选择具体回忆页，以激活设计素材面板。
                            </div>
                        )}
                    </div>
                )}

                {/* 3. GLOBAL TAB */}
                {activeTab === 'global' && (
                    <GlobalTab />
                )}
            </div>
        </div>
    );
};
// #endregion
