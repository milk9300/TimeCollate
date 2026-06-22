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
    Move
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

    // 辅助激活侧边栏与具体编辑面板的方法
    const handleActivateSection = useCallback((section: 'edit' | 'crop' | 'frame' | 'font' | 'color' | 'sticker-adjust' | 'position') => {
        setRightActiveTab('inspector');
        setIsDrawerOpen(true);
        setActiveInspectorSection(section);
    }, [setRightActiveTab, setIsDrawerOpen, setActiveInspectorSection]);

    // 删除贴纸逻辑
    const deleteSelectedSticker = useCallback(() => {
        if (!activeStickerEdit || !activePage || !activeChapter) return;
        if (window.confirm('确定要删除这个贴图吗？')) {
            const parsed = parsePageContent(activePage.content);
            const decorations = parsed.decorations || [];
            const updatedDecorations = decorations.filter(d => d.id !== activeStickerEdit.stickerId);
            const updatedContent = updatePageDecorations(activePage.content, updatedDecorations);
            updatePage(activeChapter.id, activePage.id, { content: updatedContent });
            setActiveStickerEdit(null);
        }
    }, [activeStickerEdit, activePage, activeChapter, updatePage, setActiveStickerEdit]);

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

            {/* Context C: Sticker Element Active */}
            {activeStickerEdit && (
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pr-1">贴纸选项</span>

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
                        title="删除贴纸"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};
// #endregion
