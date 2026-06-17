import React, { useState, useMemo, useCallback } from 'react';
import { useBookStore, getVirtualChapters } from '../../../store';
import { useMarketStore } from '../../../store/useMarketStore';
import { CustomAssetBrowser } from './CustomAssetBrowser';
import { AccordionSection } from './AccordionSection';
import { getBookService } from '../../../services/serviceFactory';
import { PAGE_SIZES, type PageSize } from '../../../rendering/PhysicalConstants';
import { PREFACE_TEMPLATES, compilePrefaceText } from '../../../rendering/constants/prefaceTemplates';
import {
    Settings,
    Sliders,
    Sparkles,
    Globe,
    ChevronRight,
    ChevronLeft,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
import {
    getSlotText,
    getSlotStyle,
    updateSlotText,
    updateSlotStyle,
    parsePageContent,
    getPageAtmosphere,
    getPageFontFamily,
    updatePageAtmosphere,
    updatePageFontFamily,
    updateElementOverride,
    type TextSlotData
} from '../../../utils/textSlotHelper';

const bookService = getBookService();

interface SidebarPropertyProps {
    activeChapterId: string | null;
    activePageId: string | null;
    isEditingCover: boolean;
    setIsEditingCover: (val: boolean) => void;
    isEditingPreface: boolean;
    setIsEditingPreface: (val: boolean) => void;
    isDrawerOpen: boolean;
    setIsDrawerOpen: (val: boolean) => void;
    showGridOverlay: boolean;
    setShowGridOverlay: (val: boolean) => void;
}

/**
 * @description 右侧折叠属性与素材面板 (已进行组件层级与切片订阅解耦，解决全屏重渲染卡顿问题)
 */
export const SidebarProperty: React.FC<SidebarPropertyProps> = ({
    activeChapterId,
    activePageId,
    isEditingCover,
    setIsEditingCover,
    isEditingPreface,
    setIsEditingPreface,
    isDrawerOpen,
    setIsDrawerOpen,
    showGridOverlay,
    setShowGridOverlay
}) => {
    // 1. 切片订阅 Zustand Actions & State (非全量解构，极大减少不必要的重渲染)
    const currentBook = useBookStore(state => state.currentBook);
    const updateBookSettings = useBookStore(state => state.updateBookSettings);
    const activePhotoEdit = useBookStore(state => state.activePhotoEdit);
    const setActivePhotoEdit = useBookStore(state => state.setActivePhotoEdit);
    const activeTextEdit = useBookStore(state => state.activeTextEdit);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);
    const updatePhotoSettings = useBookStore(state => state.updatePhotoSettings);
    const deletePhotoFromPage = useBookStore(state => state.deletePhotoFromPage);
    const updatePage = useBookStore(state => state.updatePage);
    const templates = useBookStore(state => state.templates);

    // 2. 本地 UI 状态收拢
    const [activeTab, setActiveTab] = useState<'inspector' | 'material' | 'global'>('inspector');
    const [stickerSource, setStickerSource] = useState<'preset' | 'custom'>('preset');
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        chapterInfo: true,
        templates: true,
        stickers: false,
    });

    const toggleSection = useCallback((key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    const chapters = useMemo(() => {
        if (!currentBook || !currentBook.pages) return [];
        return getVirtualChapters(currentBook.pages);
    }, [currentBook]);

    const activeChapter = chapters.find(c => c.id === activeChapterId) || null;
    const activePage = activeChapter?.pages.find(p => p.id === activePageId) || null;

    // 选中图片属性计算
    const selectedPhoto = useMemo(() => {
        if (!activePhotoEdit || !currentBook) return null;
        for (const chap of chapters) {
            if (chap.id === activePhotoEdit.chapterId) {
                const page = chap.pages.find(p => p.id === activePhotoEdit.pageId);
                if (page) {
                    return page.photos.find(p => p.id === activePhotoEdit.photoId) || null;
                }
            }
        }
        return null;
    }, [activePhotoEdit, currentBook, chapters]);

    // 选中文字属性计算
    const selectedTextSlot = useMemo(() => {
        if (!activeTextEdit || !currentBook) return null;
        const chapter = chapters.find(c => c.id === activeTextEdit.chapterId);
        const page = chapter?.pages.find(p => p.id === activeTextEdit.pageId);
        if (!page) return null;

        const template = templates.find((t) => t.id === page.layout);
        const element = template?.layoutSchema.elements.find(e => e.id === activeTextEdit.slotId);

        return {
            text: getSlotText(page.content, activeTextEdit.slotId),
            style: getSlotStyle(page.content, activeTextEdit.slotId, {
                fontSize: element?.style.fontSize,
                fontWeight: element?.style.fontWeight as any,
                lineHeight: element?.style.lineHeight,
            }),
            rawStyle: parsePageContent(page.content).slots[activeTextEdit.slotId]?.style || {}
        };
    }, [activeTextEdit, currentBook, templates]);

    const updateSelectedTextSlot = useCallback((updates: { text?: string; style?: Partial<TextSlotData['style']> }) => {
        if (!activeTextEdit || !currentBook) return;
        const { chapterId, pageId, slotId } = activeTextEdit;
        const chapter = chapters.find(c => c.id === chapterId);
        const page = chapter?.pages.find(p => p.id === pageId);
        if (!page) return;

        let content = page.content || '';
        if (updates.text !== undefined) {
            content = updateSlotText(content, slotId, updates.text);
        }
        if (updates.style !== undefined) {
            content = updateSlotStyle(content, slotId, updates.style);
        }

        updatePage(chapterId, pageId, { content });
    }, [activeTextEdit, currentBook, updatePage, chapters]);

    const marketTemplates = useMarketStore(state => state.marketTemplates || []);

    const handleMicroAdjust = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (!activePage || !activeChapter) return;

        let elementId = '';
        let defaultLeft = '0%';
        let defaultTop = '0%';

        const allTemplates = [...templates, ...marketTemplates];

        if (activeTextEdit) {
            elementId = activeTextEdit.slotId;
            const template = allTemplates.find((t) => t.id === activePage.layout);
            const element = template?.layoutSchema.elements.find(e => e.id === elementId);
            if (element) {
                defaultLeft = element.style.left || '0%';
                defaultTop = element.style.top || '0%';
            }
        } else if (activePhotoEdit) {
            const photo = activePage.photos.find(p => p.id === activePhotoEdit.photoId);
            const slotIndex = photo?.slotIndex ?? 0;
            const template = allTemplates.find((t) => t.id === activePage.layout);
            const element = template?.layoutSchema.elements.find(e => e.type === 'photo' && (e.slotIndex ?? 0) === slotIndex);
            if (element) {
                elementId = element.id;
                defaultLeft = element.style.left || '0%';
                defaultTop = element.style.top || '0%';
            }
        }

        if (!elementId) return;

        const parsed = parsePageContent(activePage.content);
        const override = parsed.elementOverrides?.[elementId] || {};

        let leftNum = parseFloat(override.left ?? defaultLeft);
        let topNum = parseFloat(override.top ?? defaultTop);

        const STEP = 0.5;
        if (direction === 'left') leftNum -= STEP;
        if (direction === 'right') leftNum += STEP;
        if (direction === 'up') topNum -= STEP;
        if (direction === 'down') topNum += STEP;

        const updatedContent = updateElementOverride(activePage.content, elementId, {
            left: `${leftNum}%`,
            top: `${topNum}%`
        });

        updatePage(activeChapter.id, activePage.id, { content: updatedContent });
    }, [activePage, activeChapter, activeTextEdit, activePhotoEdit, templates, marketTemplates, updatePage]);

    const handleAddSticker = useCallback((stickerId: string) => {
        if (!activePage || !activeChapter) return;

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

        const updatedContent = updateElementOverride(activePage.content, '', {}, [...decorations, newSticker]);
        updatePage(activeChapter.id, activePage.id, { content: updatedContent });
    }, [activePage, activeChapter, updatePage]);

    if (!currentBook) return null;

    return (
        <div
            id="editor-right-sidebar"
            className={`border-l border-gray-200/80 bg-white flex flex-col shadow-sm transition-all duration-300 ease-in-out z-10 relative ${isDrawerOpen ? 'w-[400px]' : 'w-0 overflow-hidden opacity-0 border-l-0'}`}
        >
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <span className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <Settings size={14} className="text-indigo-600" />
                    回忆排版工坊
                </span>
                <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Tab Headers */}
            <div className="flex border-b border-gray-100 bg-white flex-shrink-0">
                <button
                    onClick={() => setActiveTab('inspector')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${activeTab === 'inspector' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    <Sliders size={13} />
                    属性
                </button>
                <button
                    onClick={() => setActiveTab('material')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${activeTab === 'material' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    <Sparkles size={13} />
                    素材
                </button>
                <button
                    onClick={() => setActiveTab('global')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all border-b-2 cursor-pointer ${activeTab === 'global' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    <Globe size={13} />
                    全局
                </button>
            </div>

            {/* Scrollable Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 editor-panel-scrollbar">
                {/* INSPECTOR TAB */}
                {activeTab === 'inspector' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200">
                        {activePhotoEdit && selectedPhoto ? (
                            <div className="space-y-5 text-xs text-gray-600">
                                <button
                                    onClick={() => setActivePhotoEdit(null)}
                                    className="text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 mb-2 bg-indigo-50/50 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-100/50 w-fit cursor-pointer"
                                >
                                    <ChevronLeft size={13} />
                                    返回属性首页
                                </button>

                                <div className="border-t border-gray-100 pt-3 space-y-4">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        所选图片属性
                                    </div>

                                    <div className="w-full aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50 relative group">
                                        <img
                                            src={selectedPhoto.url}
                                            alt="Selected"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-[10px] font-bold">选中编辑状态</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                                            <span>缩放倍率 (Zoom)</span>
                                            <span className="text-indigo-600 font-mono">{(selectedPhoto.scale || 1.0).toFixed(2)}x</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1.0"
                                            max="3.0"
                                            step="0.05"
                                            value={selectedPhoto.scale || 1.0}
                                            onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { scale: parseFloat(e.target.value) })}
                                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                                            <span>水平偏移 (Offset X)</span>
                                            <span className="text-indigo-600 font-mono">{selectedPhoto.xOffset !== undefined ? selectedPhoto.xOffset : 50}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={selectedPhoto.xOffset !== undefined ? selectedPhoto.xOffset : 50}
                                            onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { xOffset: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                                            <span>垂直偏移 (Offset Y)</span>
                                            <span className="text-indigo-600 font-mono">{selectedPhoto.yOffset !== undefined ? selectedPhoto.yOffset : 50}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="1"
                                            value={selectedPhoto.yOffset !== undefined ? selectedPhoto.yOffset : 50}
                                            onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { yOffset: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">图片描述 (Caption)</span>
                                        <input
                                            type="text"
                                            placeholder="写点描述记录此刻..."
                                            value={selectedPhoto.caption || ''}
                                            onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { caption: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none text-xs text-gray-700 focus:border-indigo-600 focus:bg-white transition-colors"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5 pt-1">
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">相框样式 (Frame Style)</span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'normal', name: '无边框' },
                                                { id: 'rounded', name: '精致圆角' },
                                                { id: 'polaroid', name: '拍立得' },
                                                { id: 'film', name: '复古胶片' }
                                            ].map(styleOpt => {
                                                const isOptSelected = (selectedPhoto.styleType || 'normal') === styleOpt.id;
                                                return (
                                                    <button
                                                        key={styleOpt.id}
                                                        onClick={() => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { styleType: styleOpt.id as any })}
                                                        className={`py-2 px-1 border rounded-xl font-bold text-center text-[10px] transition-all cursor-pointer ${isOptSelected ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        {styleOpt.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5 pt-1">
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">艺术滤镜 (Photo Filter)</span>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'none', name: '原色' },
                                                { id: 'warm', name: '温暖午后' },
                                                { id: 'fresh', name: '日系清新' },
                                                { id: 'retro', name: '摩登复古' }
                                            ].map(filterOpt => {
                                                const isOptSelected = (selectedPhoto.filterType || 'none') === filterOpt.id;
                                                return (
                                                    <button
                                                        key={filterOpt.id}
                                                        onClick={() => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { filterType: filterOpt.id as any })}
                                                        className={`py-2 px-1 border rounded-xl font-bold text-center text-[10px] transition-all cursor-pointer ${isOptSelected ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                    >
                                                        {filterOpt.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-1.5 pt-4 border-t border-gray-100">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                                            插槽位置微调 (0.5% 步长)
                                        </span>
                                        <div className="relative w-24 h-24 flex items-center justify-center bg-gray-50/50 rounded-full border border-gray-200/50 shadow-inner">
                                            <button
                                                onClick={() => handleMicroAdjust('up')}
                                                className="absolute top-0.5 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向上微调"
                                            >
                                                <ChevronUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleMicroAdjust('left')}
                                                className="absolute left-0.5 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向左微调"
                                            >
                                                <ChevronLeft size={14} />
                                            </button>
                                            <div className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                            </div>
                                            <button
                                                onClick={() => handleMicroAdjust('right')}
                                                className="absolute right-0.5 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向右微调"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleMicroAdjust('down')}
                                                className="absolute bottom-0.5 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向下微调"
                                            >
                                                <ChevronDown size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={async () => {
                                                const choosePreset = window.confirm("点击确定选择上传本地图片，点击取消自动替换为一张精美的推荐风景图：");
                                                if (choosePreset) {
                                                    const input = document.createElement('input');
                                                    input.type = 'file';
                                                    input.accept = 'image/*';
                                                    input.onchange = async (e: any) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            try {
                                                                const newPhoto = await bookService.uploadPhoto(file);
                                                                await updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, {
                                                                    url: newPhoto.url,
                                                                    ossKey: newPhoto.ossKey,
                                                                    width: newPhoto.width,
                                                                    height: newPhoto.height,
                                                                    scale: 1.0,
                                                                    xOffset: 50,
                                                                    yOffset: 50
                                                                });
                                                            } catch (err) {
                                                                console.error(err);
                                                            }
                                                        }
                                                    };
                                                    input.click();
                                                } else {
                                                    const randomPreset = PRESET_PHOTOS[Math.floor(Math.random() * PRESET_PHOTOS.length)];
                                                    await updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, {
                                                        url: randomPreset.url,
                                                        scale: 1.0,
                                                        xOffset: 50,
                                                        yOffset: 50
                                                    });
                                                }
                                            }}
                                            className="flex-1 py-2 px-3 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-bold border border-gray-200/80 transition-colors text-center text-xs text-ellipsis overflow-hidden whitespace-nowrap cursor-pointer"
                                        >
                                            替换图片
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (window.confirm('确定要删除这张图片吗？')) {
                                                    await deletePhotoFromPage(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId);
                                                    setActivePhotoEdit(null);
                                                }
                                            }}
                                            className="py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold border border-red-100 transition-colors text-xs cursor-pointer"
                                        >
                                            删除
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : activeTextEdit && selectedTextSlot ? (
                            <div className="space-y-5 text-xs text-gray-600">
                                <button
                                    onClick={() => setActiveTextEdit(null)}
                                    className="text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 mb-2 bg-indigo-50/50 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors border border-indigo-100/50 w-fit cursor-pointer"
                                >
                                    <ChevronLeft size={13} />
                                    返回属性首页
                                </button>

                                <div className="border-t border-gray-100 pt-3 space-y-4">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        所选文本属性
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">文本内容 (Text Content)</span>
                                        <textarea
                                            rows={4}
                                            placeholder="写点什么呢..."
                                            value={selectedTextSlot.text}
                                            onChange={(e) => updateSelectedTextSlot({ text: e.target.value })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none text-xs text-gray-700 focus:border-indigo-600 focus:bg-white transition-colors resize-y font-normal"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">字体大小 (Font Size)</span>
                                        <select
                                            value={selectedTextSlot.rawStyle.fontSize || ''}
                                            onChange={(e) => updateSelectedTextSlot({ style: { fontSize: e.target.value || undefined } })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none text-xs font-semibold text-gray-700 focus:border-indigo-600 focus:bg-white transition-colors cursor-pointer"
                                        >
                                            <option value="">默认 (Default)</option>
                                            <option value="9pt">超小 (9pt)</option>
                                            <option value="10pt">小 (10pt)</option>
                                            <option value="12pt">标准 (12pt)</option>
                                            <option value="14pt">中等 (14pt)</option>
                                            <option value="16pt">大 (16pt)</option>
                                            <option value="18pt">超大 (18pt)</option>
                                            <option value="24pt">标题 (24pt)</option>
                                            <option value="28pt">大标题 (28pt)</option>
                                            <option value="32pt">超大标题 (32pt)</option>
                                        </select>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">对齐方式 (Alignment)</span>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { value: 'left', label: '居左' },
                                                { value: 'center', label: '居中' },
                                                { value: 'right', label: '居右' }
                                            ].map(align => (
                                                <button
                                                    key={align.value}
                                                    onClick={() => updateSelectedTextSlot({ style: { textAlign: align.value } })}
                                                    className={`py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${(selectedTextSlot.rawStyle.textAlign || 'left') === align.value ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                                >
                                                    {align.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">字体样式 (Font Styles)</span>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => updateSelectedTextSlot({
                                                    style: {
                                                        fontWeight: selectedTextSlot.rawStyle.fontWeight === 'bold' ? 'normal' : 'bold'
                                                    }
                                                })}
                                                className={`py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${selectedTextSlot.rawStyle.fontWeight === 'bold' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20 font-bold' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                加粗 (Bold)
                                            </button>
                                            <button
                                                onClick={() => updateSelectedTextSlot({
                                                    style: {
                                                        fontStyle: selectedTextSlot.rawStyle.fontStyle === 'italic' ? 'normal' : 'italic'
                                                    }
                                                })}
                                                className={`py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${selectedTextSlot.rawStyle.fontStyle === 'italic' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20 italic' : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                斜体 (Italic)
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">字体颜色 (Color)</span>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { value: '', label: '默认', color: 'transparent', border: 'border-gray-300' },
                                                { value: 'var(--theme-primary)', label: '主色', color: 'var(--theme-primary)' },
                                                { value: 'var(--theme-secondary)', label: '辅色', color: 'var(--theme-secondary)' },
                                                { value: 'var(--theme-accent)', label: '强调', color: 'var(--theme-accent)' },
                                                { value: '#000000', label: '纯黑', color: '#000000' },
                                                { value: '#4b5563', label: '深灰', color: '#4b5563' },
                                                { value: '#9ca3af', label: '浅灰', color: '#9ca3af' },
                                                { value: '#ef4444', label: '红色', color: '#ef4444' },
                                                { value: '#f59e0b', label: '橙色', color: '#f59e0b' },
                                                { value: '#10b981', label: '绿色', color: '#10b981' },
                                                { value: '#3b82f6', label: '蓝色', color: '#3b82f6' }
                                            ].map(col => (
                                                <button
                                                    key={col.label}
                                                    onClick={() => updateSelectedTextSlot({ style: { color: col.value || undefined } })}
                                                    className={`w-6 h-6 rounded-full border transition-all relative flex items-center justify-center cursor-pointer ${selectedTextSlot.rawStyle.color === col.value || (!selectedTextSlot.rawStyle.color && col.value === '') ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105'} ${col.border || 'border-transparent'}`}
                                                    style={{ backgroundColor: col.color }}
                                                    title={col.label}
                                                >
                                                    {col.value === '' && <span className="text-[8px] text-gray-400">×</span>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-1.5 pt-4 border-t border-gray-100">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                                            组件位置微调 (0.5% 步长)
                                        </span>
                                        <div className="relative w-24 h-24 flex items-center justify-center bg-gray-50/50 rounded-full border border-gray-200/50 shadow-inner">
                                            <button
                                                onClick={() => handleMicroAdjust('up')}
                                                className="absolute top-0.5 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向上微调"
                                            >
                                                <ChevronUp size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleMicroAdjust('left')}
                                                className="absolute left-0.5 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向左微调"
                                            >
                                                <ChevronLeft size={14} />
                                            </button>
                                            <div className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                            </div>
                                            <button
                                                onClick={() => handleMicroAdjust('right')}
                                                className="absolute right-0.5 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向右微调"
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleMicroAdjust('down')}
                                                className="absolute bottom-0.5 p-1.5 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-indigo-600 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向下微调"
                                            >
                                                <ChevronDown size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {isEditingCover ? (
                                    <div className="bg-white/70 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] space-y-4">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            封面底图素材管理
                                        </div>
                                        <div className="text-[11px] text-gray-500 leading-relaxed">
                                            当前正在编辑回忆书的<strong>经典封面结构</strong>。若需要替换或设置封面的氛围色，请在左侧点击封面卡片，或者在“全局”主题设置中一键定制回忆书的整套基调。
                                        </div>
                                    </div>
                                ) : isEditingPreface ? (
                                    <div className="bg-white/70 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.03)] space-y-4">
                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            序言页编辑器提示
                                        </div>
                                        <div className="text-[11px] text-gray-500 leading-relaxed font-normal">
                                            双击左侧画布文字可激活就地编辑，您也可以在右侧“全局”选项卡中启用或修改序言引言金句，一键排版输出。
                                        </div>
                                    </div>
                                ) : activePage ? (
                                    <AccordionSection
                                        title="整页排版属性"
                                        isOpen={openSections.chapterInfo}
                                        onToggle={() => toggleSection('chapterInfo')}
                                    >
                                        <div className="space-y-4 pt-1">
                                            <div className="space-y-2">
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    整页设计氛围
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { id: 'classic', name: '经典白描' },
                                                        { id: 'retro', name: '复古怀旧' },
                                                        { id: 'film', name: '暗调胶片' },
                                                        { id: 'notebook', name: '手账信笺' },
                                                        { id: 'summer', name: '盛夏微风' }
                                                    ].map((atm) => {
                                                        const currentAtmosphere = getPageAtmosphere(activePage.content);
                                                        const isSelected = currentAtmosphere === atm.id;
                                                        return (
                                                            <button
                                                                key={atm.id}
                                                                onClick={() => {
                                                                    const updatedContent = updatePageAtmosphere(activePage.content, atm.id);
                                                                    updatePage(activeChapter!.id, activePage.id, { content: updatedContent });
                                                                }}
                                                                className={`py-2 px-1 text-[9px] font-bold rounded-xl border text-center transition-all cursor-pointer ${isSelected ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 shadow-sm' : 'border-gray-200/60 hover:bg-gray-50 text-gray-600'}`}
                                                            >
                                                                {atm.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                                    页面排版字体
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { id: 'sans', name: '现代黑体' },
                                                        { id: 'serif', name: '优雅衬线' },
                                                        { id: 'handwriting', name: '硬笔手写' }
                                                    ].map((fnt) => {
                                                        const currentFont = getPageFontFamily(activePage.content);
                                                        const isSelected = currentFont === fnt.id;
                                                        return (
                                                            <button
                                                                key={fnt.id}
                                                                onClick={() => {
                                                                    const updatedContent = updatePageFontFamily(activePage.content, fnt.id);
                                                                    updatePage(activeChapter!.id, activePage.id, { content: updatedContent });
                                                                }}
                                                                className={`py-2 px-1 text-[9px] font-bold rounded-xl border text-center transition-all cursor-pointer ${isSelected ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 shadow-sm' : 'border-gray-200/60 hover:bg-gray-50 text-gray-600'}`}
                                                            >
                                                                {fnt.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionSection>
                                ) : (
                                    <div className="text-center py-12 text-gray-400 text-[11px]">
                                        请先选择或新建一个页面
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* MATERIAL TAB */}
                {activeTab === 'material' && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200 text-xs text-gray-600 h-full flex flex-col min-h-0">
                        {!isEditingCover && activePage ? (
                            <CustomAssetBrowser
                                activeChapterId={activeChapter?.id || null}
                                activePageId={activePage?.id || null}
                                handleAddSticker={handleAddSticker}
                            />
                        ) : (
                            <div className="text-center py-12 bg-gray-50/30 border border-dashed border-gray-200 rounded-xl text-gray-400 text-[10px]">
                                封面/序言页不支持素材操作，请选择正页。
                            </div>
                        )}
                    </div>
                )}

                {/* GLOBAL TAB */}
                {activeTab === 'global' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200 text-xs text-gray-600">
                        <div className="space-y-2">
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                全局纸张规格
                            </div>
                            <select
                                value={currentBook.pageSize}
                                onChange={(e) => updateBookSettings({ pageSize: e.target.value as PageSize })}
                                className="w-full text-xs font-bold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 outline-none text-gray-700 transition-colors cursor-pointer"
                            >
                                {Object.entries(PAGE_SIZES).map(([key, val]) => (
                                    <option key={key} value={key}>{val.name} ({val.width}x{val.height}mm)</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3 border-t border-gray-100 pt-4">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                    启用序言页
                                </div>
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
                                    <div>
                                        <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                                            引言 / 序言内容
                                        </label>
                                        <textarea
                                            value={currentBook.preface || ''}
                                            onChange={(e) => updateBookSettings({ preface: e.target.value })}
                                            className="w-full h-24 resize-none text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-indigo-600 focus:bg-white transition-all leading-relaxed"
                                            placeholder="在这里输入作品的引言、寄语或序言..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                            金句模板库 (一键套用)
                                        </span>
                                        <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                                            {PREFACE_TEMPLATES.map((tpl) => (
                                                <button
                                                    key={tpl.id}
                                                    onClick={() => {
                                                        const compiled = compilePrefaceText(tpl.content, currentBook);
                                                        updateBookSettings({ preface: compiled });
                                                    }}
                                                    className="p-2 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 rounded-xl text-left transition-all duration-150 group cursor-pointer"
                                                    title={tpl.content}
                                                >
                                                    <div className="text-[10px] font-bold text-slate-700 group-hover:text-indigo-700">
                                                        {tpl.name}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 line-clamp-1 group-hover:text-indigo-400 mt-0.5">
                                                        {tpl.content.replace(/\n/g, ' ')}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 border-t border-gray-100 pt-4">
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                整书视觉主题
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'classic', name: '经典雅致', desc: 'Classic Traditional' },
                                    { id: 'modern', name: '现代简约', desc: 'Sleek Modern' },
                                    { id: 'warm', name: '温馨时光', desc: 'Warm Memory' },
                                    { id: 'magazine', name: '时尚杂志', desc: 'Style Magazine' }
                                ].map(themeOpt => {
                                    const isThemeSelected = currentBook.theme === themeOpt.id;
                                    return (
                                        <button
                                            key={themeOpt.id}
                                            onClick={() => updateBookSettings({ theme: themeOpt.id as any })}
                                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${isThemeSelected ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50/50'}`}
                                        >
                                            <div className="font-bold text-xs">{themeOpt.name}</div>
                                            <div className="text-[8px] text-gray-400 mt-0.5 font-mono">{themeOpt.desc}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-2.5 border-t border-gray-100 pt-4">
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                辅助网格与线
                            </div>
                            <button
                                onClick={() => setShowGridOverlay(!showGridOverlay)}
                                className={`w-full py-2.5 px-4 rounded-xl border font-bold text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${showGridOverlay ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all ${showGridOverlay ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent border-gray-300'}`}>
                                    {showGridOverlay && <div className="w-1 h-1 bg-white rounded-full" />}
                                </div>
                                <span>{showGridOverlay ? '辅助网格层：开启' : '辅助网格层：关闭'}</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
