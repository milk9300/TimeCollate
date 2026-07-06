import React, { useState, useEffect, useRef } from 'react';
import { useBookStore } from '../../../../store';
import { editorFacade } from '../../runtime/EditorFacade';
import type { Resource } from '../../runtime/types';
import { ColorPicker } from '../ColorPicker';
import { getBookService } from '../../../../services/serviceFactory';
import {
    getPageAtmosphere,
    getPageFontFamily,
    updatePageAtmosphere,
    updatePageFontFamily,
} from '../../../../utils/textSlotHelper';
import {
    Sparkles,
    Trash2,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    Check,
    Search
} from 'lucide-react';
import type { StickerElement } from '../../../../types';
import { debounce } from '../../../../utils/debounce';

export const PRESET_PHOTOS = [
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

interface InspectorTabProps {
    activePage: any;
    activeChapter: any;
    selectedPhoto: any;
    selectedTextSlot: any;
    selectedSticker: any;
    stickerRotation: number;
    updateSelectedTextSlot: (updates: { text?: string; style?: Partial<any> }) => void;
    updateSticker: (updates: { size?: number; rotate?: number; colorTint?: string }) => void;
    deleteSelectedSticker: () => void;
}

export const InspectorTab: React.FC<InspectorTabProps> = ({
    activePage,
    activeChapter,
    selectedPhoto,
    selectedTextSlot,
    selectedSticker,
    stickerRotation,
    updateSelectedTextSlot,
    updateSticker,
    deleteSelectedSticker
}) => {
    // #region 门面字体选择器状态与逻辑
    const [fontSearchQuery, setFontSearchQuery] = useState('');
    const [fontResources, setFontResources] = useState<Resource[]>([]);
    const [fontSubTab, setFontSubTab] = useState<'font' | 'style'>('font');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isFontsLoading, setIsFontsLoading] = useState(true);

    useEffect(() => {
        const fetchFonts = async () => {
            setIsFontsLoading(true);
            try {
                const list = await editorFacade.listResources('font');
                setFontResources(list);
                // 异步预加载所有字体的预览样式
                list.forEach(font => {
                    editorFacade.loadResource(font.id).catch(err => console.error(err));
                });
            } catch (err) {
                console.error('Failed to load fonts in InspectorTab:', err);
            } finally {
                setIsFontsLoading(false);
            }
        };
        fetchFonts();
    }, []);

    const getFontDisplayName = (id: string) => {
        switch (id) {
            case 'sans-serif': return '默认无衬线';
            case 'system-sans': case 'sans': return '现代黑体 (中文)';
            case 'system-serif': case 'serif': return '优雅衬线 (中文)';
            case 'system-handwriting': case 'handwriting': return '硬笔手写';
            case 'system-outfit': case 'Outfit': return 'Outfit (英文标牌)';
            case 'system-inter': case 'Inter': return 'Inter (现代科技)';
            case 'system-oswald': case 'Oswald': return 'Oswald (艺术排版)';
            default: {
                const cloudFont = fontResources.find(f => f.id === id);
                return cloudFont ? cloudFont.name : id;
            }
        }
    };
    // #endregion

    // Zustand store hooks with explicit state type annotations
    const activePhotoEdit = useBookStore((state: any) => state.activePhotoEdit);
    const setActivePhotoEdit = useBookStore((state: any) => state.setActivePhotoEdit);
    const activeTextEdit = useBookStore((state: any) => state.activeTextEdit);
    const activeStickerEdit = useBookStore((state: any) => state.activeStickerEdit);
    const activeInspectorSection = useBookStore((state: any) => state.activeInspectorSection);
    const updatePhotoSettings = useBookStore((state: any) => state.updatePhotoSettings);
    const deletePhotoFromPage = useBookStore((state: any) => state.deletePhotoFromPage);
    const updatePage = useBookStore((state: any) => state.updatePage);

    // 本地滑动条值代理 state (用于 100% 顺滑拖动)
    const [localPhotoScale, setLocalPhotoScale] = useState<number>(1.0);
    const [localPhotoXOffset, setLocalPhotoXOffset] = useState<number>(50);
    const [localPhotoYOffset, setLocalPhotoYOffset] = useState<number>(50);

    const [localLetterSpacing, setLocalLetterSpacing] = useState<number>(0);
    const [localLineHeight, setLocalLineHeight] = useState<number>(1.6);

    const [localStickerSize, setLocalStickerSize] = useState<number>(16);
    const [localStickerRotate, setLocalStickerRotate] = useState<number>(0);

    // 记录最近一次实际提交给 store 的值，用来在 useEffect 中识别真正的外部修改（如撤销/重做），避开渲染延迟引起的回弹
    const lastSubmittedPhotoScale = useRef<number>(1.0);
    const lastSubmittedPhotoXOffset = useRef<number>(50);
    const lastSubmittedPhotoYOffset = useRef<number>(50);

    const lastSubmittedLetterSpacing = useRef<number>(0);
    const lastSubmittedLineHeight = useRef<number>(1.6);

    const lastSubmittedStickerSize = useRef<number>(16);
    const lastSubmittedStickerRotate = useRef<number>(0);

    // 监听选中元素改变，初始化本地状态
    useEffect(() => {
        if (!selectedPhoto) return;
        const currentExtScale = selectedPhoto.scale || 1.0;
        const currentExtXOffset = selectedPhoto.xOffset !== undefined ? selectedPhoto.xOffset : 50;
        const currentExtYOffset = selectedPhoto.yOffset !== undefined ? selectedPhoto.yOffset : 50;

        // 仅当外部传入的新值与本地值不同，且该新值不等于我们最近提交/写入的值时，说明是外部主动变化（如切换插槽、撤销/重做），才同步本地 State
        if (currentExtScale !== localPhotoScale && currentExtScale !== lastSubmittedPhotoScale.current) {
            setLocalPhotoScale(currentExtScale);
            lastSubmittedPhotoScale.current = currentExtScale;
        }
        if (currentExtXOffset !== localPhotoXOffset && currentExtXOffset !== lastSubmittedPhotoXOffset.current) {
            setLocalPhotoXOffset(currentExtXOffset);
            lastSubmittedPhotoXOffset.current = currentExtXOffset;
        }
        if (currentExtYOffset !== localPhotoYOffset && currentExtYOffset !== lastSubmittedPhotoYOffset.current) {
            setLocalPhotoYOffset(currentExtYOffset);
            lastSubmittedPhotoYOffset.current = currentExtYOffset;
        }
    }, [selectedPhoto]);

    useEffect(() => {
        if (!selectedTextSlot) return;
        const currentExtLetterSpacing = parseInt(selectedTextSlot.style.letterSpacing || '0');
        const currentExtLineHeight = selectedTextSlot.style.lineHeight || 1.6;

        if (currentExtLetterSpacing !== localLetterSpacing && currentExtLetterSpacing !== lastSubmittedLetterSpacing.current) {
            setLocalLetterSpacing(currentExtLetterSpacing);
            lastSubmittedLetterSpacing.current = currentExtLetterSpacing;
        }
        if (currentExtLineHeight !== localLineHeight && currentExtLineHeight !== lastSubmittedLineHeight.current) {
            setLocalLineHeight(currentExtLineHeight);
            lastSubmittedLineHeight.current = currentExtLineHeight;
        }
    }, [selectedTextSlot]);

    useEffect(() => {
        if (!selectedSticker) return;
        const currentExtSize = selectedSticker.size || 16;
        const currentExtRotate = stickerRotation;

        if (currentExtSize !== localStickerSize && currentExtSize !== lastSubmittedStickerSize.current) {
            setLocalStickerSize(currentExtSize);
            lastSubmittedStickerSize.current = currentExtSize;
        }
        if (currentExtRotate !== localStickerRotate && currentExtRotate !== lastSubmittedStickerRotate.current) {
            setLocalStickerRotate(currentExtRotate);
            lastSubmittedStickerRotate.current = currentExtRotate;
        }
    }, [selectedSticker, stickerRotation]);

    // 防抖过的全局状态更新函数，避免密集重绘和高频保存网络请求
    const debouncedUpdatePhoto = useRef(
        debounce((chapterId: string, pageId: string, photoId: string, updates: any, updateFn: typeof updatePhotoSettings) => {
            if (updates.scale !== undefined) {
                lastSubmittedPhotoScale.current = updates.scale;
            }
            if (updates.xOffset !== undefined) {
                lastSubmittedPhotoXOffset.current = updates.xOffset;
            }
            if (updates.yOffset !== undefined) {
                lastSubmittedPhotoYOffset.current = updates.yOffset;
            }
            updateFn(chapterId, pageId, photoId, updates);
        }, 50)
    ).current;

    const debouncedUpdateText = useRef(
        debounce((updates: any, updateFn: typeof updateSelectedTextSlot) => {
            if (updates.style?.letterSpacing !== undefined) {
                lastSubmittedLetterSpacing.current = parseInt(updates.style.letterSpacing);
            }
            if (updates.style?.lineHeight !== undefined) {
                lastSubmittedLineHeight.current = updates.style.lineHeight;
            }
            updateFn(updates);
        }, 50)
    ).current;

    const debouncedUpdateSticker = useRef(
        debounce((updates: any, updateFn: typeof updateSticker) => {
            if (updates.size !== undefined) {
                lastSubmittedStickerSize.current = updates.size;
            }
            if (updates.rotate !== undefined) {
                lastSubmittedStickerRotate.current = updates.rotate;
            }
            updateFn(updates);
        }, 50)
    ).current;

    // 清理防抖
    useEffect(() => {
        return () => {
            debouncedUpdatePhoto.cancel();
            debouncedUpdateText.cancel();
            debouncedUpdateSticker.cancel();
        };
    }, [debouncedUpdatePhoto, debouncedUpdateText, debouncedUpdateSticker]);

    return (
        <div className="space-y-6 text-xs text-gray-650 font-['Outfit',_sans-serif]">
            {activePhotoEdit && selectedPhoto ? (
                /* 图片属性编辑器 */
                <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">

                    {activeInspectorSection === 'edit' && (
                        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                            {/* 描述 */}
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">图片描述 (Caption)</span>
                                <textarea
                                    rows={2}
                                    placeholder="写点描述记录此刻..."
                                    value={selectedPhoto.caption || ''}
                                    onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { caption: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-xs text-slate-700 focus:border-indigo-655 focus:bg-white focus:ring-1 focus:ring-indigo-650 transition-all resize-none"
                                />
                            </div>

                            {/* 滤镜 */}
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">艺术滤镜 (Photo Filter)</span>
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
                                                type="button"
                                                onClick={() => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { filterType: filterOpt.id as any })}
                                                className={`py-2 px-2 border rounded-xl font-bold text-center text-[10px] transition-all cursor-pointer ${isOptSelected ? 'bg-indigo-50 border-indigo-650 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'}`}
                                            >
                                                {filterOpt.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeInspectorSection === 'crop' && (
                        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                    <span>缩放倍率 (Zoom)</span>
                                    <span className="text-indigo-655 font-mono">{localPhotoScale.toFixed(2)}x</span>
                                </div>
                                <input
                                    type="range"
                                    min="1.0"
                                    max="3.0"
                                    step="0.05"
                                    value={localPhotoScale}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value) || 1.0;
                                        setLocalPhotoScale(val);
                                        debouncedUpdatePhoto(
                                            activePhotoEdit.chapterId,
                                            activePhotoEdit.pageId,
                                            activePhotoEdit.photoId,
                                            { scale: val },
                                            updatePhotoSettings
                                        );
                                    }}
                                    onMouseDown={() => {
                                        if (useBookStore.getState().enableCommandHistory) {
                                            editorFacade.beginTransaction();
                                        }
                                    }}
                                    onMouseUp={() => {
                                        debouncedUpdatePhoto.flush();
                                        if (useBookStore.getState().enableCommandHistory) {
                                            editorFacade.commitTransaction();
                                        }
                                    }}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                    <span>水平偏移 (Offset X)</span>
                                    <span className="text-indigo-655 font-mono">{localPhotoXOffset}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={localPhotoXOffset}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setLocalPhotoXOffset(val);
                                        debouncedUpdatePhoto(
                                            activePhotoEdit.chapterId,
                                            activePhotoEdit.pageId,
                                            activePhotoEdit.photoId,
                                            { xOffset: val },
                                            updatePhotoSettings
                                        );
                                    }}
                                    onMouseDown={() => {
                                        if (useBookStore.getState().enableCommandHistory) {
                                            editorFacade.beginTransaction();
                                        }
                                    }}
                                    onMouseUp={() => {
                                        debouncedUpdatePhoto.flush();
                                        if (useBookStore.getState().enableCommandHistory) {
                                            editorFacade.commitTransaction();
                                        }
                                    }}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                    <span>垂直偏移 (Offset Y)</span>
                                    <span className="text-indigo-655 font-mono">{localPhotoYOffset}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={localPhotoYOffset}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setLocalPhotoYOffset(val);
                                        debouncedUpdatePhoto(
                                            activePhotoEdit.chapterId,
                                            activePhotoEdit.pageId,
                                            activePhotoEdit.photoId,
                                            { yOffset: val },
                                            updatePhotoSettings
                                        );
                                    }}
                                    onMouseDown={() => {
                                        if (useBookStore.getState().enableCommandHistory) {
                                            editorFacade.beginTransaction();
                                        }
                                    }}
                                    onMouseUp={() => {
                                        debouncedUpdatePhoto.flush();
                                        if (useBookStore.getState().enableCommandHistory) {
                                            editorFacade.commitTransaction();
                                        }
                                    }}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                />
                            </div>
                        </div>
                    )}

                    {activeInspectorSection === 'frame' && (
                        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider pl-0.5">相框样式 (Frame Style)</span>
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
                                                type="button"
                                                onClick={() => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { styleType: styleOpt.id as any })}
                                                className={`py-2.5 px-2 border rounded-xl font-bold text-center text-[10px] transition-all cursor-pointer ${isOptSelected ? 'bg-indigo-50 border-indigo-650 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-655 hover:bg-slate-50'}`}
                                            >
                                                {styleOpt.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            ) : activeTextEdit && selectedTextSlot ? (
                /* 文本属性编辑器 */
                <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {activeInspectorSection === 'font' && (
                        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                            {selectedTextSlot.isV2 ? (
                                <>
                                    {/* 字体 & 样式二级面板 */}
                                    <div className="flex flex-col gap-2.5 relative">
                                        {/* Sub Tabs */}
                                        <div className="flex border-b border-slate-100 shrink-0 select-none">
                                            <button
                                                type="button"
                                                onClick={() => setFontSubTab('font')}
                                                className={`flex-1 pb-1.5 text-center text-[11px] font-bold transition-all border-b-2 cursor-pointer ${
                                                    fontSubTab === 'font'
                                                        ? 'border-indigo-600 text-indigo-700'
                                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                字体
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFontSubTab('style')}
                                                className={`flex-1 pb-1.5 text-center text-[11px] font-bold transition-all border-b-2 cursor-pointer ${
                                                    fontSubTab === 'style'
                                                        ? 'border-indigo-600 text-indigo-700'
                                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                                }`}
                                            >
                                                文字样式
                                            </button>
                                        </div>

                                        {fontSubTab === 'font' ? (
                                            <div className="flex flex-col gap-2">
                                                {/* 搜索框 */}
                                                <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:border-indigo-500 focus-within:bg-white transition-all shrink-0">
                                                    <Search size={12} className="text-slate-400 mr-1.5 shrink-0" />
                                                    <input
                                                        type="text"
                                                        placeholder="搜索字体名称..."
                                                        value={fontSearchQuery}
                                                        onChange={(e) => setFontSearchQuery(e.target.value)}
                                                        className="w-full bg-transparent border-none outline-none text-[11px] text-slate-700"
                                                    />
                                                </div>

                                                {/* 分类过滤 Pills */}
                                                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none shrink-0 select-none">
                                                    {[
                                                        { id: 'sans', name: '无衬线' },
                                                        { id: 'serif', name: '衬线' },
                                                        { id: 'handwriting', name: '手写' },
                                                        { id: 'bold', name: '粗体' },
                                                        { id: 'headline', name: '大字号' },
                                                    ].map(cat => {
                                                        const isActive = selectedCategory === cat.id;
                                                        return (
                                                            <button
                                                                key={cat.id}
                                                                type="button"
                                                                onClick={() => setSelectedCategory(isActive ? null : cat.id)}
                                                                className={`px-2 py-0.5 text-[9px] font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                                                    isActive
                                                                        ? 'bg-indigo-50 border-indigo-250 text-indigo-700 shadow-sm'
                                                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                {cat.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* 列表区 */}
                                                <div className="space-y-4 pt-1 pr-0.5">
                                                    {/* 过滤方法 */}
                                                    {(() => {
                                                        const filterFont = (font: any) => {
                                                            if (fontSearchQuery && !font.name.toLowerCase().includes(fontSearchQuery.toLowerCase())) {
                                                                return false;
                                                            }
                                                            if (selectedCategory) {
                                                                const idLower = font.id.toLowerCase();
                                                                const nameLower = font.name.toLowerCase();
                                                                switch (selectedCategory) {
                                                                    case 'sans':
                                                                        return idLower.includes('sans') || idLower.includes('outfit') || idLower.includes('inter') || nameLower.includes('黑体');
                                                                    case 'serif':
                                                                        return idLower.includes('serif') || nameLower.includes('宋体') || nameLower.includes('衬线');
                                                                    case 'handwriting':
                                                                        return idLower.includes('handwriting') || idLower.includes('cursive') || nameLower.includes('手写') || nameLower.includes('ma shan zheng');
                                                                    case 'bold':
                                                                        return idLower.includes('oswald') || idLower.includes('bebas') || nameLower.includes('粗') || nameLower.includes('黑');
                                                                    case 'headline':
                                                                        return idLower.includes('oswald') || idLower.includes('bebas') || nameLower.includes('标题') || nameLower.includes('雅');
                                                                    default:
                                                                        return true;
                                                                }
                                                            }
                                                            return true;
                                                        };

                                                         const cloudFonts = fontResources.filter(f => f.kind === 'font' && filterFont(f));

                                                         return (
                                                             <div className="space-y-2">
                                                                 {isFontsLoading ? (
                                                                     <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                                                                         <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                                                                         <span className="text-[10px] font-medium animate-pulse">正在获取系统字库...</span>
                                                                     </div>
                                                                 ) : cloudFonts.length > 0 ? (
                                                                     cloudFonts.map(font => (
                                                                         <button
                                                                             key={font.id}
                                                                             type="button"
                                                                             onClick={() => {
                                                                                 updateSelectedTextSlot({ style: { fontFamily: font.id } });
                                                                             }}
                                                                             style={{ fontFamily: font.metadata?.family || 'sans-serif' }}
                                                                             className={`w-full text-left px-3 py-2 text-[12px] rounded-lg transition-all cursor-pointer border border-transparent flex justify-between items-center ${
                                                                                 selectedTextSlot.style.fontFamily === font.id
                                                                                     ? 'bg-indigo-50 text-indigo-750 font-bold border-indigo-100 shadow-sm'
                                                                                     : 'hover:bg-white hover:shadow-sm hover:border-slate-100 text-slate-700'
                                                                             }`}
                                                                         >
                                                                             <span>{font.name}</span>
                                                                             {selectedTextSlot.style.fontFamily === font.id && <Check size={11} className="text-indigo-600 stroke-[2.5]" />}
                                                                         </button>
                                                                     ))
                                                                 ) : (
                                                                     <div className="text-center py-6 text-[10px] text-slate-400 leading-relaxed">
                                                                         未找到符合筛选条件的字体。<br />请放入字库并运行 db:sync-fonts 同步。
                                                                     </div>
                                                                 )}
                                                             </div>
                                                         );
                                                    })()}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                                                {/* 对齐方式 */}
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="grid grid-cols-4 gap-1.5 bg-slate-50/50 p-1.5 rounded-2xl border border-gray-100">
                                                        {[
                                                            { id: 'left', icon: AlignLeft, label: '居左' },
                                                            { id: 'center', icon: AlignCenter, label: '居中' },
                                                            { id: 'right', icon: AlignRight, label: '居右' },
                                                            { id: 'justify', icon: AlignJustify, label: '两端' }
                                                        ].map(alignOpt => {
                                                            const isAlignSelected = (selectedTextSlot.style.textAlign || 'left') === alignOpt.id;
                                                            const Icon = alignOpt.icon;
                                                            return (
                                                                <button
                                                                    key={alignOpt.id}
                                                                    type="button"
                                                                    onClick={() => updateSelectedTextSlot({ style: { textAlign: alignOpt.id } })}
                                                                    className={`py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                                                                        isAlignSelected
                                                                            ? 'bg-indigo-655 text-white shadow-sm font-black'
                                                                            : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-500'
                                                                    }`}
                                                                    title={alignOpt.label}
                                                                >
                                                                    <Icon size={14} />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* 字间距 */}
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                                        <span>字间距 (Letter Spacing)</span>
                                                        <span className="text-indigo-650 font-mono">{localLetterSpacing}px</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="10"
                                                        step="1"
                                                        value={localLetterSpacing}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            setLocalLetterSpacing(val);
                                                            debouncedUpdateText({ style: { letterSpacing: `${val}px` } }, updateSelectedTextSlot);
                                                        }}
                                                        onMouseDown={() => {
                                                            if (useBookStore.getState().enableCommandHistory) {
                                                                editorFacade.beginTransaction();
                                                            }
                                                        }}
                                                        onMouseUp={() => {
                                                            debouncedUpdateText.flush();
                                                            if (useBookStore.getState().enableCommandHistory) {
                                                                editorFacade.commitTransaction();
                                                            }
                                                        }}
                                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                                    />
                                                </div>

                                                {/* 行间距 */}
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                                        <span>行间距 (Line Height)</span>
                                                        <span className="text-indigo-650 font-mono">{localLineHeight}x</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="1.0"
                                                        max="2.5"
                                                        step="0.1"
                                                        value={localLineHeight}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value) || 1.6;
                                                            setLocalLineHeight(val);
                                                            debouncedUpdateText({ style: { lineHeight: val } }, updateSelectedTextSlot);
                                                        }}
                                                        onMouseDown={() => {
                                                            if (useBookStore.getState().enableCommandHistory) {
                                                                editorFacade.beginTransaction();
                                                            }
                                                        }}
                                                        onMouseUp={() => {
                                                            debouncedUpdateText.flush();
                                                            if (useBookStore.getState().enableCommandHistory) {
                                                                editorFacade.commitTransaction();
                                                            }
                                                        }}
                                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </>
                            ) : (
                                <p className="text-[9px] text-gray-400 italic">
                                    V1.0 排版模板文字插槽仅支持编辑纯文本内容，如需自定义字体、颜色和大小，请套用具有自由元素特性的 V2.0 模板。
                                </p>
                            )}
                        </div>
                    )}


                </div>
            ) : activeStickerEdit && selectedSticker ? (
                /* 贴纸属性编辑器 */
                <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">
                        贴纸微调属性
                    </div>

                    {activeInspectorSection === 'sticker-adjust' && (
                        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                    <span>贴图大小 (Scale)</span>
                                    <span className="text-indigo-655 font-mono">{localStickerSize}pt</span>
                                </div>
                                <input
                                    type="range"
                                    min="5"
                                    max="80"
                                    step="1"
                                    value={localStickerSize}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value) || 16;
                                        setLocalStickerSize(val);
                                        debouncedUpdateSticker({ size: val }, updateSticker);
                                    }}
                                    onMouseDown={() => {
                                        if (useBookStore.getState().enableCommandHistory) {
                                            editorFacade.beginTransaction();
                                        }
                                    }}
                                    onMouseUp={() => {
                                        debouncedUpdateSticker.flush();
                                        if (useBookStore.getState().enableCommandHistory) {
                                            editorFacade.commitTransaction();
                                        }
                                    }}
                                    className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                    <span>旋转角度 (Rotation)</span>
                                    <span className="text-indigo-655 font-mono">{localStickerRotate}°</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="-180"
                                        max="180"
                                        step="5"
                                        value={localStickerRotate}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            setLocalStickerRotate(val);
                                            debouncedUpdateSticker({ rotate: val }, updateSticker);
                                        }}
                                        onMouseDown={() => {
                                            if (useBookStore.getState().enableCommandHistory) {
                                                editorFacade.beginTransaction();
                                            }
                                        }}
                                        onMouseUp={() => {
                                            debouncedUpdateSticker.flush();
                                            if (useBookStore.getState().enableCommandHistory) {
                                                editorFacade.commitTransaction();
                                            }
                                        }}
                                        className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                    />
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const val = (localStickerRotate - 15 + 360) % 360;
                                                setLocalStickerRotate(val);
                                                lastSubmittedStickerRotate.current = val;
                                                updateSticker({ rotate: val });
                                            }}
                                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-all cursor-pointer"
                                        >
                                            -15°
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const val = (localStickerRotate + 15) % 360;
                                                setLocalStickerRotate(val);
                                                lastSubmittedStickerRotate.current = val;
                                                updateSticker({ rotate: val });
                                            }}
                                            className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-all cursor-pointer"
                                        >
                                            +15°
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Color Tint for V2.0 Stickers */}
                            {selectedSticker.isV2 && (
                                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                                    <span className="text-[10px] text-slate-455 font-bold uppercase tracking-wider pl-0.5">贴纸着色 (Color Tint)</span>
                                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                        <ColorPicker
                                            color={selectedSticker.colorTint || '#ffffff'}
                                            onChange={(color) => updateSticker({ colorTint: color })}
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
                                            triggerClassName="!w-7 !h-7 !rounded-lg border-slate-250 shrink-0"
                                        />
                                        <input
                                            type="text"
                                            placeholder="无着色"
                                            value={selectedSticker.colorTint || ''}
                                            onChange={(e) => updateSticker({ colorTint: e.target.value || undefined })}
                                            className="flex-1 bg-white border border-slate-150 rounded-md px-2 py-0.5 text-xs outline-none text-slate-700 focus:border-indigo-400 transition-all font-mono"
                                        />
                                        {selectedSticker.colorTint && (
                                            <button
                                                type="button"
                                                onClick={() => updateSticker({ colorTint: undefined })}
                                                className="text-[9px] text-red-500 hover:bg-red-50 px-1.5 py-0.5 rounded border border-red-200 cursor-pointer"
                                            >
                                                重置
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="pt-3 border-t border-slate-100 flex justify-end">
                                <button
                                    type="button"
                                    onClick={deleteSelectedSticker}
                                    className="py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold border border-red-100 transition-colors text-xs cursor-pointer flex items-center gap-1"
                                >
                                    <Trash2 size={13} />
                                    删除贴图
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] px-4 leading-relaxed">
                    请在左侧选中图片、文本或贴图，以在此处精细微调其属性参数。
                </div>
            )}
        </div>
    );
};
