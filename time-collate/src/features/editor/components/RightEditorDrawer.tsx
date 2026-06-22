// #region Description
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useBookStore, getVirtualChapters } from '../../../store';
import { useMarketStore } from '../../../store/useMarketStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { CustomPhotoBrowser } from './CustomPhotoBrowser';
import { CustomDecorationBrowser } from './CustomDecorationBrowser';
import { PAGE_SIZES, type PageSize } from '../../../rendering/PhysicalConstants';
import type { CanvasElement, PhotoFrameElement, TextElement, StickerElement } from '../../../types';
import {
    parsePageContent,
    updatePageDecorations,
    getPageAtmosphere,
    getPageFontFamily,
    updatePageAtmosphere,
    updatePageFontFamily,
    getSlotText,
    getSlotStyle,
    updateSlotText,
    updateSlotStyle,
    updateElementOverride,
    getPageDecorations
} from '../../../utils/textSlotHelper';
import {
    LayoutTemplate,
    Sparkles,
    Settings2,
    Info,
    Upload,
    Save,
    Lock,
    Clock,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Loader2,
    Sliders,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Trash2,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify
} from 'lucide-react';
import { COVER_PRESET_BACKGROUNDS, parseCoverUrl } from './GeneratedCover';
import { BOOK_CATEGORIES } from '../../book/components/BookEditModal';
import { getBookService } from '../../../services/serviceFactory';

const PRESET_PHOTOS = [
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

interface RightEditorDrawerProps {
    activeTab: 'templates' | 'photos' | 'decorations' | 'global' | 'inspector' | null;
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
    const currentBook = useBookStore(state => state.currentBook);
    const updateBookSettings = useBookStore(state => state.updateBookSettings);
    const updatePage = useBookStore(state => state.updatePage);
    const templates = useBookStore(state => state.templates);
    const { user } = useAuthStore();

    // Filters for templates
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

    const categories = useMemo(() => {
        const cats = new Set<string>();
        templates.forEach(t => {
            if (t.category) cats.add(t.category);
        });
        return Array.from(cats);
    }, [templates]);

    const CATEGORY_NAMES: Record<string, string> = {
        general: '通用',
        travel: '旅行',
        journal: '手帐',
        family: '家庭',
        minimalist: '极简',
        retro: '复古',
        classic: '经典',
        magazine: '杂志',
        warm: '温馨',
        modern: '现代'
    };

    const TEMPLATE_TYPES = [
        { id: 'all', name: '全部' },
        { id: 'content', name: '内容页' },
        { id: 'cover', name: '书封' },
        { id: 'preface', name: '前言' },
        { id: 'structural', name: '过渡页' }
    ];

    const filteredTemplates = useMemo(() => {
        return templates.filter(t => {
            const tType = t.templateType || 'content';
            const matchesCategory = selectedCategoryFilter === 'all' || t.category === selectedCategoryFilter;
            const matchesType = selectedTypeFilter === 'all' || tType === selectedTypeFilter;
            return matchesCategory && matchesType;
        });
    }, [templates, selectedCategoryFilter, selectedTypeFilter]);

    // Zustand editor state bindings
    const activePhotoEdit = useBookStore(state => state.activePhotoEdit);
    const setActivePhotoEdit = useBookStore(state => state.setActivePhotoEdit);
    const activeTextEdit = useBookStore(state => state.activeTextEdit);
    const setActiveTextEdit = useBookStore(state => state.setActiveTextEdit);
    const activeStickerEdit = useBookStore(state => state.activeStickerEdit);
    const setActiveStickerEdit = useBookStore(state => state.setActiveStickerEdit);
    const activeInspectorSection = useBookStore(state => state.activeInspectorSection);
    const updatePhotoSettings = useBookStore(state => state.updatePhotoSettings);
    const deletePhotoFromPage = useBookStore(state => state.deletePhotoFromPage);
    const marketTemplates = useMarketStore(state => state.marketTemplates);

    // 封面编辑相关 Local State
    const [isUploading, setIsUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 自动命名随机数生成
    const generateRandomSuffix = (type: 'number' | 'letters' | 'mixed') => {
        if (type === 'number') {
            const num = Math.floor(Math.random() * 1000); // 0-999
            return num.toString().padStart(3, '0');
        } else if (type === 'letters') {
            const chars = 'abcdefghijklmnopqrstuvwxyz';
            let res = '';
            for (let i = 0; i < 3; i++) {
                res += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return res;
        } else {
            const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
            let res = '';
            for (let i = 0; i < 3; i++) {
                res += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return res;
        }
    };

    const handleSuffixTypeChange = (type: 'number' | 'letters' | 'mixed' | 'custom') => {
        setSuffixType(type);
        if (type !== 'custom') {
            const newSuffix = generateRandomSuffix(type);
            setNameSuffix(newSuffix);
        }
    };

    const handleRegenerateSuffix = () => {
        if (suffixType !== 'custom') {
            const newSuffix = generateRandomSuffix(suffixType);
            setNameSuffix(newSuffix);
        }
    };

    // 智能自动命名状态
    const [useAutoName, setUseAutoName] = useState(false);
    const [namePrefix, setNamePrefix] = useState('拾光集#');
    const [nameInitials, setNameInitials] = useState('zx');
    const [suffixType, setSuffixType] = useState<'number' | 'letters' | 'mixed' | 'custom'>('number');
    const [nameSuffix, setNameSuffix] = useState(() => generateRandomSuffix('number')); // 避免延迟渲染警告
    const [customSuffix, setCustomSuffix] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    // 解析当前封皮配置
    const parsedCover = useMemo(() => {
        if (!currentBook) return { layout: 'classic', bgId: 'cotton-white', image: '', ossKey: '' } as any;
        return parseCoverUrl(currentBook.coverUrl, currentBook.title);
    }, [currentBook?.coverUrl, currentBook?.title]);

    const isLocked = currentBook?.status === 'pending' || currentBook?.status === 'published';

    const chapters = useMemo(() => {
        if (!currentBook || !currentBook.pages) return [];
        return getVirtualChapters(currentBook.pages);
    }, [currentBook]);

    const activeChapter = chapters.find(c => c.id === activeChapterId) || null;
    const activePage = activeChapter?.pages.find(p => p.id === activePageId) || null;

    // 选中元素属性提取辅助
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

    const selectedTextSlot = useMemo(() => {
        if (!activeTextEdit || !currentBook) return null;
        const chapter = chapters.find(c => c.id === activeTextEdit.chapterId);
        const page = chapter?.pages.find(p => p.id === activeTextEdit.pageId);
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
                        letterSpacing: textEl.textConfig.letterSpacing || '0px'
                    },
                    rawStyle: {}
                };
            }
        }

        const template = templates.find((t) => t.id === page.layout);
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
    }, [activeTextEdit, currentBook, templates]);

    const selectedSticker = useMemo(() => {
        if (!activeStickerEdit || !currentBook) return null;
        const chapter = chapters.find(c => c.id === activeStickerEdit.chapterId);
        const page = chapter?.pages.find(p => p.id === activeStickerEdit.pageId);
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
    }, [activeStickerEdit, currentBook, chapters]);

    const stickerRotation = useMemo(() => {
        if (!selectedSticker) return 0;
        return selectedSticker.rotate || 0;
    }, [selectedSticker]);

    // 更新函数与操作 Actions
    const updateSelectedTextSlot = useCallback((updates: { text?: string; style?: Partial<any> }) => {
        if (!activeTextEdit || !currentBook) return;
        const { chapterId, pageId, slotId } = activeTextEdit;
        const chapter = chapters.find(c => c.id === chapterId);
        const page = chapter?.pages.find(p => p.id === pageId);
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
                            } : {})
                        }
                    } as TextElement;
                }
                return el;
            });
            updatePage(chapterId, pageId, { elements: updatedElements });
            return;
        }

        let content = page.content || '';
        if (updates.text !== undefined) {
            content = updateSlotText(content, slotId, updates.text);
        }
        if (updates.style !== undefined) {
            content = updateSlotStyle(content, slotId, updates.style);
        }

        updatePage(chapterId, pageId, { content });
    }, [activeTextEdit, currentBook, updatePage, chapters]);

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

    const handleMicroAdjust = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
        if (!activePage || !activeChapter) return;

        if (activePage.elements) {
            const targetId = activeTextEdit?.slotId || activeStickerEdit?.stickerId || activePhotoEdit?.photoId;
            if (!targetId) return;

            const updatedElements = activePage.elements.map(el => {
                if (el.id === targetId) {
                    let nextX = el.x;
                    let nextY = el.y;
                    const STEP = 0.5;
                    if (direction === 'left') nextX -= STEP;
                    if (direction === 'right') nextX += STEP;
                    if (direction === 'up') nextY -= STEP;
                    if (direction === 'down') nextY += STEP;
                    return {
                        ...el,
                        x: Math.max(0, Math.min(100, nextX)),
                        y: Math.max(0, Math.min(100, nextY))
                    };
                }
                return el;
            });
            updatePage(activeChapter.id, activePage.id, { elements: updatedElements });
            return;
        }

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
        } else if (activeStickerEdit) {
            const parsed = parsePageContent(activePage.content);
            const decorations = parsed.decorations || [];
            const sticker = decorations.find(d => d.id === activeStickerEdit.stickerId);
            if (sticker) {
                let leftNum = sticker.x || 50;
                let topNum = sticker.y || 50;
                const STEP = 0.5;
                if (direction === 'left') leftNum -= STEP;
                if (direction === 'right') leftNum += STEP;
                if (direction === 'up') topNum -= STEP;
                if (direction === 'down') topNum += STEP;

                const updatedDecorations = decorations.map(d => 
                    d.id === activeStickerEdit.stickerId ? { ...d, x: Math.max(0, Math.min(100, leftNum)), y: Math.max(0, Math.min(100, topNum)) } : d
                );
                const updatedContent = updatePageDecorations(activePage.content, updatedDecorations);
                updatePage(activeChapter.id, activePage.id, { content: updatedContent });
                return;
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
    }, [activePage, activeChapter, activeTextEdit, activePhotoEdit, activeStickerEdit, templates, marketTemplates, updatePage]);

    // 更新封面 URL parameters 串
    const updateCoverProperty = useCallback((updates: {
        layout?: 'classic' | 'minimal' | 'modern' | 'art';
        bgId?: string;
        image?: string | null;
        ossKey?: string | null;
    }) => {
        if (!currentBook) return;
        const layout = updates.layout !== undefined ? updates.layout : parsedCover.layout;
        const bgId = updates.bgId !== undefined ? updates.bgId : parsedCover.bgId;
        
        let image = parsedCover.image;
        if (updates.image === null) image = undefined;
        else if (updates.image !== undefined) image = updates.image;

        let ossKey = parsedCover.ossKey;
        if (updates.ossKey === null) ossKey = undefined;
        else if (updates.ossKey !== undefined) ossKey = updates.ossKey;

        let newCoverUrl = `design://?layout=${layout}&bg=${bgId}`;
        if (image) {
            newCoverUrl += `&image=${encodeURIComponent(image)}`;
        }
        if (ossKey) {
            newCoverUrl += `&ossKey=${encodeURIComponent(ossKey)}`;
        }

        updateBookSettings({
            coverUrl: newCoverUrl,
            coverOssKey: ossKey || undefined
        });
    }, [parsedCover, currentBook, updateBookSettings]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const bookService = getBookService();
            const photo = await bookService.uploadPhoto(file);
            updateCoverProperty({ image: photo.url, ossKey: photo.ossKey || '' });
        } catch (error) {
            console.error('Failed to upload cover illustration:', error);
            alert('上传插画失败');
        } finally {
            setIsUploading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!currentBook) return;
        setIsSaving(true);
        try {
            const bookService = getBookService();
            await bookService.updateStatus(currentBook.id, 'private');
            updateBookSettings({ status: 'private', isPublic: false });
        } catch (error) {
            console.error('Failed to withdraw book:', error);
            alert('撤回失败，请稍后重试');
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusToggle = async (checked: boolean) => {
        if (!currentBook) return;
        const newStatus = checked ? 'pending' : 'private';
        setIsSaving(true);
        try {
            const bookService = getBookService();
            await bookService.updateStatus(currentBook.id, newStatus);
            updateBookSettings({ status: newStatus, isPublic: checked });
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('更新发布状态失败');
        } finally {
            setIsSaving(false);
        }
    };









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

    const renderLayoutBlueprintSvg = (tpl: any) => {
        const elements = tpl?.layoutSchema?.elements || [];
        return (
            <svg className="w-14 h-20 border border-gray-200 rounded-lg bg-white text-indigo-500/80 p-1 transition-transform group-hover:scale-105 shadow-sm" viewBox="0 0 100 141.4">
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
                                strokeWidth="1.2"
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
                                strokeWidth="0.6"
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

    const renderLayoutWireframe = (layout: 'classic' | 'minimal' | 'modern' | 'art') => {
        const isSelected = parsedCover.layout === layout;
        const strokeColor = isSelected ? 'stroke-indigo-650' : 'stroke-slate-400';
        const fillColor = isSelected ? 'fill-indigo-50/60' : 'fill-slate-50';
        
        switch (layout) {
            case 'classic':
                return (
                    <svg className="w-10 h-14 mx-auto mb-1 border border-slate-200 rounded p-1 bg-white" viewBox="0 0 24 32">
                        <rect x="2" y="2" width="20" height="28" rx="1" fill="none" className={strokeColor} strokeWidth="1" />
                        <rect x="4" y="4" width="16" height="24" rx="0.5" fill="none" className={strokeColor} strokeWidth="0.5" strokeDasharray="1 1" />
                        <rect x="10" y="8" width="4" height="4" rx="0.5" className={`${strokeColor} ${fillColor}`} strokeWidth="1" />
                        <line x1="8" y1="16" x2="16" y2="16" className={strokeColor} strokeWidth="1" strokeLinecap="round" />
                        <line x1="10" y1="20" x2="14" y2="20" className={strokeColor} strokeWidth="1" strokeLinecap="round" />
                    </svg>
                );
            case 'minimal':
                return (
                    <svg className="w-10 h-14 mx-auto mb-1 border border-slate-200 rounded p-1 bg-white" viewBox="0 0 24 32">
                        <rect x="2" y="2" width="20" height="28" rx="1" fill="none" className={strokeColor} strokeWidth="1" />
                        <line x1="5" y1="6" x2="12" y2="6" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
                        <rect x="5" y="10" width="10" height="12" rx="0.5" className={`${strokeColor} ${fillColor}`} strokeWidth="0.8" />
                        <line x1="5" y1="25" x2="15" y2="25" className={strokeColor} strokeWidth="1" strokeLinecap="round" />
                    </svg>
                );
            case 'modern':
                return (
                    <svg className="w-10 h-14 mx-auto mb-1 border border-slate-200 rounded p-1 bg-white" viewBox="0 0 24 32">
                        <rect x="2" y="2" width="20" height="28" rx="1" fill="none" className={strokeColor} strokeWidth="1" />
                        <line x1="2" y1="12" x2="22" y2="12" className={strokeColor} strokeWidth="0.5" strokeDasharray="1 1" />
                        <line x1="7" y1="2" x2="7" y2="30" className={strokeColor} strokeWidth="0.5" strokeDasharray="1 1" />
                        <line x1="9" y1="6" x2="18" y2="6" className={strokeColor} strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="9" y1="9" x2="15" y2="9" className={strokeColor} strokeWidth="1" strokeLinecap="round" />
                        <rect x="9" y="14" width="12" height="9" rx="0.5" className={`${strokeColor} ${fillColor}`} strokeWidth="0.8" />
                    </svg>
                );
            case 'art':
                return (
                    <svg className="w-10 h-14 mx-auto mb-1 border border-slate-200 rounded p-1 bg-white" viewBox="0 0 24 32">
                        <rect x="2" y="2" width="20" height="28" rx="1" fill="none" className={strokeColor} strokeWidth="1" />
                        <path d="M12,6 C16,6 18,10 18,14 L6,14 C6,10 8,6 12,6 Z" className={`${strokeColor} ${fillColor}`} strokeWidth="0.8" />
                        <circle cx="12" cy="18" r="4" className={`${strokeColor} ${fillColor}`} strokeWidth="0.8" />
                        <rect x="5" y="24" width="14" height="4" rx="0.5" fill="none" className={strokeColor} strokeWidth="0.8" />
                    </svg>
                );
        }
    };

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

    return (
        <div className="w-[320px] bg-white border-l border-gray-200/80 flex flex-col h-full z-10 shrink-0 select-none shadow-sm transition-all duration-300 relative">


            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-50/20">
                
                {/* 仅在编辑书封时，且锁定状态下显示警告 */}
                {isEditingCover && renderLockBanner()}

                {/* 0. INSPECTOR TAB (属性设置微调) */}
                {activeTab === 'inspector' && (
                    <div className="space-y-6 text-xs text-gray-650 font-['Outfit',_sans-serif]">
                        {activePhotoEdit && selectedPhoto ? (
                            /* 图片属性编辑器 */
                            <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">
                                    图片属性设置
                                </div>

                                <div className="w-full aspect-video rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 relative group">
                                    <img
                                        src={selectedPhoto.url}
                                        alt="Selected"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white text-[10px] font-bold">选中编辑中</span>
                                    </div>
                                </div>

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
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-xs text-slate-700 focus:border-indigo-650 focus:bg-white focus:ring-1 focus:ring-indigo-650 transition-all resize-none"
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

                                        {/* 替换/删除动作 */}
                                        <div className="flex gap-2 pt-3 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    const choosePreset = window.confirm("点击确定选择上传本地图片，点击取消自动替换为一张随机精美的风景插画：");
                                                    if (choosePreset) {
                                                        const input = document.createElement('input');
                                                        input.type = 'file';
                                                        input.accept = 'image/*';
                                                        input.onchange = async (e: any) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                try {
                                                                    const newPhoto = await getBookService().uploadPhoto(file);
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
                                                className="flex-1 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold border border-slate-200 transition-colors text-center text-xs cursor-pointer"
                                            >
                                                替换图片
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (window.confirm('确定要删除这张图片吗？')) {
                                                        await deletePhotoFromPage(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId);
                                                        setActivePhotoEdit(null);
                                                    }
                                                }}
                                                className="py-2 px-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold border border-red-100 transition-colors text-xs cursor-pointer flex items-center gap-1"
                                            >
                                                <Trash2 size={13} />
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeInspectorSection === 'crop' && (
                                    <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                                <span>缩放倍率 (Zoom)</span>
                                                <span className="text-indigo-650 font-mono">{(selectedPhoto.scale || 1.0).toFixed(2)}x</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1.0"
                                                max="3.0"
                                                step="0.05"
                                                value={selectedPhoto.scale || 1.0}
                                                onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { scale: parseFloat(e.target.value) })}
                                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                                <span>水平偏移 (Offset X)</span>
                                                <span className="text-indigo-650 font-mono">{selectedPhoto.xOffset !== undefined ? selectedPhoto.xOffset : 50}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={selectedPhoto.xOffset !== undefined ? selectedPhoto.xOffset : 50}
                                                onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { xOffset: parseInt(e.target.value) })}
                                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                                <span>垂直偏移 (Offset Y)</span>
                                                <span className="text-indigo-650 font-mono">{selectedPhoto.yOffset !== undefined ? selectedPhoto.yOffset : 50}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={selectedPhoto.yOffset !== undefined ? selectedPhoto.yOffset : 50}
                                                onChange={(e) => updatePhotoSettings(activePhotoEdit.chapterId, activePhotoEdit.pageId, activePhotoEdit.photoId, { yOffset: parseInt(e.target.value) })}
                                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeInspectorSection === 'frame' && (
                                    <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">相框样式 (Frame Style)</span>
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

                                {activeInspectorSection === 'position' && (
                                    <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                                            插槽位置微调 (0.5% 步长)
                                        </span>
                                        <div className="relative w-24 h-24 flex items-center justify-center bg-slate-50/50 rounded-full border border-slate-200/50 shadow-inner">
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('up')}
                                                className="absolute top-0.5 p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向上微调"
                                            >
                                                <ChevronUp size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('left')}
                                                className="absolute left-0.5 p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向左微调"
                                            >
                                                <ChevronLeft size={13} />
                                            </button>
                                            <div className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('right')}
                                                className="absolute right-0.5 p-1.5 rounded-lg bg-white border border-gray-250 shadow-sm text-gray-650 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向右微调"
                                            >
                                                <ChevronRight size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('down')}
                                                className="absolute bottom-0.5 p-1.5 rounded-lg bg-white border border-gray-250 shadow-sm text-gray-650 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向下微调"
                                            >
                                                <ChevronDown size={13} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : activeTextEdit && selectedTextSlot ? (
                            /* 文本属性编辑器 */
                            <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-0.5">
                                    文本属性设置
                                </div>

                                {activeInspectorSection === 'font' && (
                                    <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">文本内容 (Text Content)</span>
                                            <textarea
                                                rows={4}
                                                placeholder="在此输入想要写入的句子..."
                                                value={selectedTextSlot.text}
                                                onChange={(e) => updateSelectedTextSlot({ text: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-xs text-slate-700 focus:border-indigo-650 focus:bg-white focus:ring-1 focus:ring-indigo-650 transition-all resize-y"
                                            />
                                        </div>

                                        {selectedTextSlot.isV2 ? (
                                            <>
                                                {/* Font Family */}
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">字体系列 (Font Family)</span>
                                                    <select
                                                        value={selectedTextSlot.style.fontFamily || 'sans-serif'}
                                                        onChange={(e) => updateSelectedTextSlot({ style: { fontFamily: e.target.value } })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-xs font-bold text-slate-700 focus:border-indigo-650 focus:bg-white transition-colors cursor-pointer"
                                                    >
                                                        <option value="sans-serif">默认无衬线</option>
                                                        <option value="Outfit">Outfit (英文标牌)</option>
                                                        <option value="Inter">Inter (现代科技)</option>
                                                        <option value="sans">现代黑体 (中文)</option>
                                                        <option value="serif">优雅衬线 (中文)</option>
                                                        <option value="handwriting">硬笔手写</option>
                                                    </select>
                                                </div>

                                                {/* Font Size (Slider + Input) */}
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center text-[10px] text-slate-455 font-bold uppercase tracking-wider pl-0.5">
                                                        <span>字体大小 (Font Size)</span>
                                                        <span className="text-indigo-655 font-mono">{parseInt(String(selectedTextSlot.style.fontSize || '14')) || 14}px</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="range"
                                                            min="9"
                                                            max="96"
                                                            step="1"
                                                            value={parseInt(String(selectedTextSlot.style.fontSize || '14')) || 14}
                                                            onChange={(e) => updateSelectedTextSlot({ style: { fontSize: `${e.target.value}px` } })}
                                                            className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                                        />
                                                        <input
                                                            type="number"
                                                            min="8"
                                                            max="200"
                                                            value={parseInt(String(selectedTextSlot.style.fontSize || '14')) || 14}
                                                            onChange={(e) => updateSelectedTextSlot({ style: { fontSize: `${e.target.value}px` } })}
                                                            className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 text-center text-xs outline-none text-slate-700 font-bold focus:border-indigo-400 focus:bg-white"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Font Weight */}
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">字体粗细 (Font Weight)</span>
                                                    <select
                                                        value={selectedTextSlot.style.fontWeight || 'normal'}
                                                        onChange={(e) => updateSelectedTextSlot({ style: { fontWeight: e.target.value } })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-xs font-bold text-slate-700 focus:border-indigo-650 focus:bg-white transition-colors cursor-pointer"
                                                    >
                                                        <option value="normal">常规 (Normal)</option>
                                                        <option value="bold">加粗 (Bold)</option>
                                                        <option value="300">细体 (Light 300)</option>
                                                        <option value="400">常规 (Regular 400)</option>
                                                        <option value="500">中黑 (Medium 500)</option>
                                                        <option value="700">粗体 (Bold 700)</option>
                                                        <option value="850">特粗 (Extra Bold 850)</option>
                                                    </select>
                                                </div>

                                                {/* Text Alignment */}
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">对齐方式 (Alignment)</span>
                                                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 w-fit">
                                                        {[
                                                            { id: 'left', icon: <AlignLeft size={14} /> },
                                                            { id: 'center', icon: <AlignCenter size={14} /> },
                                                            { id: 'right', icon: <AlignRight size={14} /> },
                                                            { id: 'justify', icon: <AlignJustify size={14} /> }
                                                        ].map(align => {
                                                            const isAct = (selectedTextSlot.style.textAlign || 'left') === align.id;
                                                            return (
                                                                <button
                                                                    key={align.id}
                                                                    type="button"
                                                                    onClick={() => updateSelectedTextSlot({ style: { textAlign: align.id } })}
                                                                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${isAct ? 'bg-white text-indigo-650 shadow-sm border border-slate-200/50 scale-102' : 'text-slate-400 hover:text-slate-650'}`}
                                                                >
                                                                    {align.icon}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Line Height */}
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                                        <span>文本行高 (Line Height)</span>
                                                        <span className="text-indigo-655 font-mono">{(selectedTextSlot.style.lineHeight || 1.6)}</span>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="1.0"
                                                        max="3.0"
                                                        step="0.1"
                                                        value={selectedTextSlot.style.lineHeight || 1.6}
                                                        onChange={(e) => updateSelectedTextSlot({ style: { lineHeight: parseFloat(e.target.value) } })}
                                                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                                    />
                                                </div>

                                                {/* Letter Spacing */}
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                                        <span>字符间距 (Letter Spacing)</span>
                                                        <span className="text-indigo-655 font-mono">{selectedTextSlot.style.letterSpacing || '0px'}</span>
                                                    </div>
                                                    <select
                                                        value={selectedTextSlot.style.letterSpacing || '0px'}
                                                        onChange={(e) => updateSelectedTextSlot({ style: { letterSpacing: e.target.value } })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-xs font-bold text-slate-700 focus:border-indigo-650 focus:bg-white transition-colors cursor-pointer"
                                                    >
                                                        <option value="0px">常规 (0px)</option>
                                                        <option value="0.5px">紧凑 (0.5px)</option>
                                                        <option value="1px">略宽 (1px)</option>
                                                        <option value="2px">宽 (2px)</option>
                                                        <option value="4px">超宽 (4px)</option>
                                                        <option value="6px">特宽 (6px)</option>
                                                        <option value="10px">极宽 (10px)</option>
                                                    </select>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">字体大小 (Font Size)</span>
                                                <select
                                                    value={selectedTextSlot.rawStyle.fontSize || ''}
                                                    onChange={(e) => updateSelectedTextSlot({ style: { fontSize: e.target.value || undefined } })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none text-xs font-bold text-slate-700 focus:border-indigo-650 focus:bg-white transition-colors cursor-pointer"
                                                >
                                                    <option value="">默认 (Default)</option>
                                                    <option value="9pt">超小 (9pt)</option>
                                                    <option value="10pt">小 (10pt)</option>
                                                    <option value="12pt">标准 (12pt)</option>
                                                    <option value="14pt">中等 (14pt)</option>
                                                    <option value="16pt">大 (16pt)</option>
                                                    <option value="18pt">超大 (18pt)</option>
                                                    <option value="24pt">小标题 (24pt)</option>
                                                    <option value="28pt">大标题 (28pt)</option>
                                                    <option value="32pt">超大标题 (32pt)</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeInspectorSection === 'color' && (
                                    <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">字体颜色 (Font Color)</span>
                                            <div className="flex flex-wrap gap-2.5 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                                                {[
                                                    { value: '', label: '默认', color: 'transparent', border: 'border-slate-300' },
                                                    { value: 'var(--theme-primary)', label: '主色', color: 'var(--theme-primary)' },
                                                    { value: 'var(--theme-secondary)', label: '辅色', color: 'var(--theme-secondary)' },
                                                    { value: 'var(--theme-accent)', label: '强调色', color: 'var(--theme-accent)' },
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
                                                        type="button"
                                                        onClick={() => updateSelectedTextSlot({ style: { color: col.value || undefined } })}
                                                        className={`w-6 h-6 rounded-full border transition-all relative flex items-center justify-center cursor-pointer ${selectedTextSlot.style?.color === col.value || (!selectedTextSlot.style?.color && col.value === '') ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105'} ${col.border || 'border-transparent'}`}
                                                        style={{ backgroundColor: col.color }}
                                                        title={col.label}
                                                    >
                                                        {col.value === '' && <span className="text-[8px] text-slate-400">×</span>}
                                                    </button>
                                                ))}
                                            </div>

                                            {selectedTextSlot.isV2 && (
                                                <div className="flex flex-col gap-1.5 mt-3 animate-in fade-in duration-200">
                                                    <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">自定义颜色 (Custom Color)</span>
                                                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                                        <input
                                                            type="color"
                                                            value={selectedTextSlot.style.color?.startsWith('#') ? selectedTextSlot.style.color : '#334155'}
                                                            onChange={(e) => updateSelectedTextSlot({ style: { color: e.target.value } })}
                                                            className="w-8 h-8 rounded-lg border border-slate-250 cursor-pointer p-0 bg-transparent"
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="#334155"
                                                            value={selectedTextSlot.style.color || ''}
                                                            onChange={(e) => updateSelectedTextSlot({ style: { color: e.target.value } })}
                                                            className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-0.5 text-xs outline-none text-slate-700 focus:border-indigo-400 transition-all font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeInspectorSection === 'position' && (
                                    <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                                            组件位置微调 (0.5% 步长)
                                        </span>
                                        <div className="relative w-24 h-24 flex items-center justify-center bg-slate-50/50 rounded-full border border-slate-200/50 shadow-inner">
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('up')}
                                                className="absolute top-0.5 p-1.5 rounded-lg bg-white border border-gray-250 shadow-sm text-gray-650 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向上微调"
                                            >
                                                <ChevronUp size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('left')}
                                                className="absolute left-0.5 p-1.5 rounded-lg bg-white border border-gray-250 shadow-sm text-gray-650 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向左微调"
                                            >
                                                <ChevronLeft size={13} />
                                            </button>
                                            <div className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('right')}
                                                className="absolute right-0.5 p-1.5 rounded-lg bg-white border border-gray-250 shadow-sm text-gray-650 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向右微调"
                                            >
                                                <ChevronRight size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('down')}
                                                className="absolute bottom-0.5 p-1.5 rounded-lg bg-white border border-gray-250 shadow-sm text-gray-650 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向下微调"
                                            >
                                                <ChevronDown size={13} />
                                            </button>
                                        </div>
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
                                                <span className="text-indigo-655 font-mono">{selectedSticker.size || 16}pt</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="5"
                                                max="80"
                                                step="1"
                                                value={selectedSticker.size || 16}
                                                onChange={(e) => updateSticker({ size: parseInt(e.target.value) })}
                                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex justify-between items-center text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">
                                                <span>旋转角度 (Rotation)</span>
                                                <span className="text-indigo-655 font-mono">{stickerRotation}°</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    min="-180"
                                                    max="180"
                                                    step="5"
                                                    value={stickerRotation}
                                                    onChange={(e) => updateSticker({ rotate: parseInt(e.target.value) })}
                                                    className="flex-1 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                                                />
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSticker({ rotate: (stickerRotation - 15 + 360) % 360 })}
                                                        className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-all cursor-pointer"
                                                    >
                                                        -15°
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateSticker({ rotate: (stickerRotation + 15) % 360 })}
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
                                                <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider pl-0.5">贴纸着色 (Color Tint)</span>
                                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                                                    <input
                                                        type="color"
                                                        value={selectedSticker.colorTint || '#ffffff'}
                                                        onChange={(e) => updateSticker({ colorTint: e.target.value })}
                                                        className="w-7 h-7 rounded-lg border border-slate-250 cursor-pointer p-0 bg-transparent"
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

                                {activeInspectorSection === 'position' && (
                                    <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
                                            贴图位置微调 (0.5% 步长)
                                        </span>
                                        <div className="relative w-24 h-24 flex items-center justify-center bg-slate-50/50 rounded-full border border-gray-250 shadow-inner">
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('up')}
                                                className="absolute top-0.5 p-1.5 rounded-lg bg-white border border-gray-250 shadow-sm text-gray-650 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向上微调"
                                            >
                                                <ChevronUp size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('left')}
                                                className="absolute left-0.5 p-1.5 rounded-lg bg-white border border-gray-250 shadow-sm text-gray-650 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向左微调"
                                            >
                                                <ChevronLeft size={13} />
                                            </button>
                                            <div className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('right')}
                                                className="absolute right-0.5 p-1.5 rounded-lg bg-white border border-gray-250 shadow-sm text-gray-650 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向右微调"
                                            >
                                                <ChevronRight size={13} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMicroAdjust('down')}
                                                className="absolute bottom-0.5 p-1.5 rounded-lg bg-white border border-gray-250 shadow-sm text-gray-650 hover:text-indigo-650 hover:border-indigo-400 active:scale-95 transition-all cursor-pointer"
                                                title="向下微调"
                                            >
                                                <ChevronDown size={13} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : activePage ? (
                            <div className="space-y-4 animate-in fade-in duration-200 text-left">
                                <div className="p-3 bg-indigo-50/20 border border-indigo-100/50 rounded-2xl">
                                    <h4 className="text-[10px] font-bold text-indigo-950 flex items-center gap-1.5 mb-1">
                                        <Sparkles size={12} className="text-indigo-650" />
                                        页面视觉微调
                                    </h4>
                                    <p className="text-[9px] text-gray-450 leading-relaxed font-bold">
                                        此处参数仅应用于当前选中的单页，不会影响整书其他页面。
                                    </p>
                                </div>

                                {/* 页面排版氛围 */}
                                <div className="space-y-2">
                                    <div className="text-[10px] text-gray-450 font-bold uppercase tracking-wider pl-0.5">
                                        页面排版氛围
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-2 rounded-2xl border border-gray-100">
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
                                                    type="button"
                                                    onClick={() => {
                                                        const updatedContent = updatePageAtmosphere(activePage.content, atm.id);
                                                        updatePage(activeChapter!.id, activePage.id, { content: updatedContent });
                                                    }}
                                                    className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold text-center transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-indigo-650 text-white shadow-md shadow-indigo-100 scale-102 font-black'
                                                            : 'bg-white text-gray-500 hover:bg-slate-100 border border-slate-200/80'
                                                    }`}
                                                >
                                                    {atm.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 页面排版字体 */}
                                <div className="space-y-2">
                                    <div className="text-[10px] text-gray-450 font-bold uppercase tracking-wider pl-0.5">
                                        页面排版字体
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5 bg-slate-50/50 p-2 rounded-2xl border border-gray-100">
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
                                                    type="button"
                                                    onClick={() => {
                                                        const updatedContent = updatePageFontFamily(activePage.content, fnt.id);
                                                        updatePage(activeChapter!.id, activePage.id, { content: updatedContent });
                                                    }}
                                                    className={`py-1.5 rounded-xl text-[10px] font-bold text-center transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-indigo-650 text-white shadow-md shadow-indigo-100 scale-102 font-black'
                                                            : 'bg-white text-gray-500 hover:bg-slate-100 border border-slate-200/80'
                                                    }`}
                                                >
                                                    {fnt.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] px-4 leading-relaxed">
                                请在左侧选中图片、文本或贴图，以在此处精细微调其属性参数。
                            </div>
                        )}
                    </div>
                )}

                {/* 1. TEMPLATES TAB */}
                {activeTab === 'templates' && (
                    <div className="space-y-5">
                        {isEditingCover ? (
                            /* --- 书封视角：展示封面版式、配色与配图配置 --- */
                            <div className="space-y-5 font-['Outfit',_sans-serif] text-xs">
                                
                                {/* 1. 版式格局选择 */}
                                <div className="space-y-2">
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5">
                                        选择版式格局
                                    </div>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        {(['classic', 'minimal', 'modern', 'art'] as const).map((l) => (
                                            <button
                                                key={l}
                                                type="button"
                                                disabled={isLocked}
                                                onClick={() => updateCoverProperty({ layout: l })}
                                                className={`p-2 flex flex-col justify-between border-2 rounded-xl transition-all ${
                                                    parsedCover.layout === l 
                                                        ? 'border-indigo-650 bg-indigo-50/20 text-indigo-650 shadow-sm font-black' 
                                                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-350 hover:scale-[1.01]'
                                                } ${isLocked ? 'opacity-65 cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                {renderLayoutWireframe(l)}
                                                <span className="text-[9px] text-center w-full block mt-0.5 font-bold">
                                                    {l === 'classic' && '经典精装'}
                                                    {l === 'minimal' && '大字极简'}
                                                    {l === 'modern' && '现代主义'}
                                                    {l === 'art' && '几何艺术'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. 背景配色选择 */}
                                <div className="space-y-2 border-t border-gray-100/70 pt-4">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 block">
                                        背景底色: <span className="text-slate-700 font-black ml-1">{COVER_PRESET_BACKGROUNDS.find(bg => bg.id === parsedCover.bgId)?.name || ''}</span>
                                    </span>
                                    <div className="flex flex-wrap gap-2 py-1 pl-0.5">
                                        {COVER_PRESET_BACKGROUNDS.map((bg) => (
                                            <button
                                                key={bg.id}
                                                type="button"
                                                disabled={isLocked}
                                                onClick={() => updateCoverProperty({ bgId: bg.id })}
                                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-115 shadow-sm border border-black/10 relative ${
                                                    parsedCover.bgId === bg.id 
                                                        ? 'ring-2 ring-indigo-650 ring-offset-2 scale-110 shadow-md' 
                                                        : ''
                                                } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                                style={{ background: bg.value }}
                                                title={bg.name}
                                            >
                                                {parsedCover.bgId === bg.id && (
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bg.textColor }} />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. 封面插画配置 */}
                                <div className="space-y-2 border-t border-gray-100/70 pt-4">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 block">封面配图插画 (可选)</span>
                                    
                                    {parsedCover.image ? (
                                        <div className="flex items-center gap-3 bg-white border border-gray-150 p-2.5 rounded-xl">
                                            <div className="w-11 h-14 bg-slate-100 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                                                <img src={parsedCover.image} className="w-full h-full object-cover" alt="已上传配图" />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[9px] text-gray-400 font-bold leading-tight">
                                                    已成功配图，将依据当前版式自适应排布
                                                </span>
                                                <div className="flex gap-2 mt-1">
                                                    <button
                                                        type="button"
                                                        disabled={isLocked}
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className={`px-2.5 py-1 bg-gray-50 text-[9px] font-bold text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-lg transition-all ${
                                                            isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                                        }`}
                                                    >
                                                        替换图片
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isLocked}
                                                        onClick={() => updateCoverProperty({ image: null, ossKey: null })}
                                                        className={`px-2.5 py-1 text-[9px] font-bold text-red-500 hover:bg-red-50 rounded-lg transition-all ${
                                                            isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                                        }`}
                                                    >
                                                        清除
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div 
                                            onClick={() => {
                                                if (!isLocked) {
                                                    fileInputRef.current?.click();
                                                }
                                            }}
                                            className={`border-2 border-dashed border-gray-250 hover:border-indigo-400 rounded-xl p-4 bg-white text-center transition-all flex flex-col items-center justify-center gap-1 ${
                                                isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.005]'
                                            }`}
                                        >
                                            <Upload size={16} className="text-gray-400 animate-bounce" />
                                            <span className="text-[10px] font-bold text-gray-650">上传本地插画</span>
                                            <span className="text-[8px] text-gray-400 leading-tight">建议 3:4 比例，将自动融合至版面</span>
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                    />
                                </div>
                            </div>
                        ) : activePage ? (
                            /* --- 普通页面视角：网格布局模板 --- */
                            <>
                                {/* 页面网格布局 */}
                                <div className="space-y-2">
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
{/* 结构与分类筛选栏 */}
                                        <div className="space-y-3 mb-4 text-left">
                                            {/* 结构类型 */}
                                            <div className="space-y-1">
                                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                                                    结构布局 (Structure)
                                                </div>
                                                <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                                                    {TEMPLATE_TYPES.map(t => {
                                                        const isActive = selectedTypeFilter === t.id;
                                                        return (
                                                            <button
                                                                key={t.id}
                                                                type="button"
                                                                onClick={() => setSelectedTypeFilter(t.id)}
                                                                className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                                                    isActive
                                                                        ? 'bg-indigo-650 text-white shadow-sm font-black'
                                                                        : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-700'
                                                                }`}
                                                            >
                                                                {t.name}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* 主题分类 */}
                                            <div className="space-y-1">
                                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-0.5">
                                                    回忆主题 (Category)
                                                </div>
                                                <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedCategoryFilter('all')}
                                                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                                            selectedCategoryFilter === 'all'
                                                                ? 'bg-indigo-650 text-white shadow-sm font-black'
                                                                : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-700'
                                                        }`}
                                                    >
                                                        全部
                                                    </button>
                                                    {categories.map(cat => {
                                                        const isActive = selectedCategoryFilter === cat;
                                                        return (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                onClick={() => setSelectedCategoryFilter(cat)}
                                                                className={`px-2.5 py-1 rounded-full text-[9px] font-bold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                                                                    isActive
                                                                        ? 'bg-indigo-650 text-white shadow-sm font-black'
                                                                        : 'bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-700'
                                                                }`}
                                                            >
                                                                {CATEGORY_NAMES[cat] || cat}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        应用网格排版模板 ({filteredTemplates.length})
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {filteredTemplates.length > 0 ? (
                                            filteredTemplates.map(t => {
                                                const isSelected = activePage.layout === t.id;
                                                return (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => updatePage(activeChapterId!, activePage.id, { layout: t.id })}
                                                        className={`p-3 rounded-2xl border flex flex-col items-center gap-2.5 transition-all group cursor-pointer ${
                                                            isSelected
                                                                ? 'border-indigo-650 bg-indigo-50/20 shadow-sm'
                                                                : 'border-gray-250/50 bg-white hover:border-gray-350 hover:bg-slate-50/50'
                                                        }`}
                                                    >
                                                        {/* SVG Blueprint */}
                                                        <div className="w-full flex justify-center">
                                                            {renderLayoutBlueprintSvg(t)}
                                                        </div>

                                                        {/* Text detail */}
                                                        <div className="text-center w-full min-w-0">
                                                            <p className={`text-[10px] font-bold truncate leading-tight ${
                                                                isSelected ? 'text-indigo-950 font-black' : 'text-gray-700'
                                                            }`}>
                                                                {t.name}
                                                            </p>
                                                            <span className="text-[8px] text-gray-400 block mt-0.5 font-bold font-mono">
                                                                {t.photoCount} 张照片
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="col-span-2 text-center py-10 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400 text-[10px] px-4 select-none leading-relaxed">
                                                该筛选条件下暂无排版模板
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] px-4 leading-relaxed">
                                请在左侧选择具体的回忆页，以开始配置单页排版及氛围模板。
                            </div>
                        )}
                    </div>
                )}

                {/* 2. PHOTOS TAB */}
                {activeTab === 'photos' && (
                    <div className="h-full flex flex-col min-h-0">
                        {isEditingCover ? (
                            <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] px-5 leading-relaxed font-['Outfit',_sans-serif] space-y-3 select-none">
                                <Sparkles size={24} className="text-indigo-500/80 mx-auto" />
                                <h4 className="font-black text-slate-700 text-xs">书封暂不支持直接拖入照片</h4>
                                <p className="text-slate-450 leading-relaxed font-medium">
                                    书封和序言采用精美的系统硬装结构。您可以切换到<strong>「排版模板」</strong>选项卡，在其中配置精美的封面插图。
                                </p>
                            </div>
                        ) : activePage ? (
                            <CustomPhotoBrowser
                                activeChapterId={activeChapter?.id || null}
                                activePageId={activePage?.id || null}
                            />
                        ) : (
                            <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] px-4 leading-relaxed">
                                请在左侧选择普通回忆页，以激活照片素材管理器。
                            </div>
                        )}
                    </div>
                )}

                {/* 2.5 DECORATIONS TAB */}
                {activeTab === 'decorations' && (
                    <div className="h-full flex flex-col min-h-0">
                        {isEditingCover ? (
                            <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] px-5 leading-relaxed font-['Outfit',_sans-serif] space-y-3 select-none">
                                <Sparkles size={24} className="text-indigo-500/80 mx-auto" />
                                <h4 className="font-black text-slate-700 text-xs">书封暂不支持装饰素材</h4>
                                <p className="text-slate-450 leading-relaxed font-medium">
                                    书封和序言采用精美的系统硬装结构。您可以切换到<strong>「排版模板」</strong>选项卡，在其中配置精美的封面底色背景。
                                </p>
                            </div>
                        ) : activePage ? (
                            <CustomDecorationBrowser
                                activeChapterId={activeChapter?.id || null}
                                activePageId={activePage?.id || null}
                                handleAddSticker={handleAddSticker}
                            />
                        ) : (
                            <div className="text-center py-12 bg-white border border-dashed border-gray-200 rounded-2xl text-gray-400 text-[10px] px-4 leading-relaxed">
                                请在左侧选择普通回忆页，以激活设计素材面板。
                            </div>
                        )}
                    </div>
                )}

                {/* 3. GLOBAL TAB */}
                {activeTab === 'global' && (
                    <div className="space-y-6 text-xs text-gray-650">
                        {isEditingCover ? (
                            /* --- 书封视角：展示元数据与发布状态控制 --- */
                            <div className="space-y-5 font-['Outfit',_sans-serif] text-xs">
                                
                                {/* 1. 书籍名称编辑 */}
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 block">
                                        书籍名称
                                    </label>
                                    <input
                                        type="text"
                                        value={currentBook.title || ''}
                                        disabled={isLocked}
                                        onChange={(e) => {
                                            setUseAutoName(false); // 手动修改断开自动命名绑定
                                            updateBookSettings({ title: e.target.value });
                                        }}
                                        placeholder="输入书籍名称..."
                                        className={`w-full bg-white border border-gray-200/90 rounded-xl py-2 px-3 text-slate-800 font-bold placeholder-slate-400 outline-none transition-all focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650 ${
                                            isLocked ? 'opacity-65 cursor-not-allowed' : ''
                                        }`}
                                    />
                                </div>

                                {/* 2. 智能自动命名助手 (折叠展示) */}
                                {!isLocked && (
                                    <div className="border border-slate-150 rounded-xl p-3 bg-white/40 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <Sparkles size={13} className="text-indigo-600 animate-pulse" />
                                                <span className="text-[10px] font-black text-slate-700">智能命名助手</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={useAutoName}
                                                    onChange={(e) => setUseAutoName(e.target.checked)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-655"></div>
                                            </label>
                                        </div>

                                        {useAutoName && (
                                            <div className="space-y-2 pt-2 border-t border-slate-150/60 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <div className="flex gap-2">
                                                    <div className="flex-1 flex flex-col gap-0.5">
                                                        <label className="text-[8px] font-bold text-slate-400 uppercase">前缀</label>
                                                        <input
                                                            type="text"
                                                            value={namePrefix}
                                                            onChange={(e) => setNamePrefix(e.target.value)}
                                                            className="px-2.5 py-1 bg-white border border-slate-200 text-[10px] font-bold rounded-lg outline-none focus:border-indigo-500"
                                                        />
                                                    </div>
                                                    <div className="flex-1 flex flex-col gap-0.5">
                                                        <label className="text-[8px] font-bold text-slate-400 uppercase">标识</label>
                                                        <input
                                                            type="text"
                                                            value={nameInitials}
                                                            maxLength={2}
                                                            onChange={(e) => setNameInitials(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 2))}
                                                            className="px-2.5 py-1 bg-white border border-slate-200 text-[10px] font-bold rounded-lg outline-none focus:border-indigo-500"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <label className="text-[8px] font-bold text-slate-400 uppercase">模式</label>
                                                    <select
                                                        value={suffixType}
                                                        onChange={(e) => handleSuffixTypeChange(e.target.value as any)}
                                                        className="px-2 py-1 bg-white border border-slate-200 text-[10px] font-bold rounded-lg outline-none cursor-pointer"
                                                    >
                                                        <option value="number">随机数字 (如 028)</option>
                                                        <option value="letters">随机字母 (如 kfy)</option>
                                                        <option value="mixed">随机混编 (如 7m3)</option>
                                                        <option value="custom">自定义后缀</option>
                                                    </select>
                                                </div>

                                                {suffixType === 'custom' ? (
                                                    <input
                                                        type="text"
                                                        value={customSuffix}
                                                        onChange={(e) => setCustomSuffix(e.target.value)}
                                                        placeholder="输入自定义后缀..."
                                                        className="w-full px-2.5 py-1 bg-white border border-slate-200 text-[10px] font-bold rounded-lg outline-none focus:border-indigo-500"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-1.5 pt-0.5">
                                                        <div className="flex-1 px-2 py-1 bg-slate-100 border border-slate-150 text-[9px] font-black text-slate-600 rounded-lg flex items-center justify-between">
                                                            <span>后缀: {nameSuffix}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleRegenerateSuffix}
                                                            className="p-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all text-slate-500 hover:text-indigo-650 flex items-center justify-center shrink-0"
                                                        >
                                                            <RefreshCw size={11} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 3. 作者署名编辑 */}
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 block">
                                        作者署名
                                    </label>
                                    <input
                                        type="text"
                                        value={currentBook.author || ''}
                                        disabled={isLocked}
                                        onChange={(e) => updateBookSettings({ author: e.target.value })}
                                        placeholder="输入作者署名..."
                                        className={`w-full bg-white border border-gray-200/90 rounded-xl py-2 px-3 text-slate-800 font-bold placeholder-slate-400 outline-none transition-all focus:border-indigo-650 focus:ring-1 focus:ring-indigo-650 ${
                                            isLocked ? 'opacity-65 cursor-not-allowed' : ''
                                        }`}
                                    />
                                </div>

                                {/* 4. 书籍分类选择 */}
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 block">
                                        所属分类
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {BOOK_CATEGORIES.map((cat) => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                disabled={isLocked}
                                                onClick={() => updateBookSettings({ category: cat.id })}
                                                className={`py-1.5 px-2.5 text-[10px] font-bold border-2 rounded-xl transition-all flex items-center gap-1 ${
                                                    currentBook.category === cat.id 
                                                        ? 'border-indigo-650 bg-indigo-50/30 text-indigo-655 font-black' 
                                                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                                } ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01]'}`}
                                            >
                                                <span>{cat.emoji}</span>
                                                <span>{cat.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 5. 广场发布与隐私控制项 */}
                                <div className="space-y-2 border-t border-gray-100/70 pt-4">
                                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pl-0.5 block">
                                        隐私与广场发布
                                    </label>
                                    
                                    {(currentBook.status === 'pending' || currentBook.status === 'published') ? (
                                        <div className="bg-white border border-slate-150 rounded-xl p-3">
                                            <div className="flex flex-col gap-2.5">
                                                <div className="flex items-center gap-2">
                                                    {currentBook.status === 'pending' ? (
                                                        <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center animate-pulse shrink-0">
                                                            <Clock size={13} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                                            <CheckCircle2 size={13} />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-800 leading-tight">
                                                            {currentBook.status === 'pending' ? '审核中 (当前锁定)' : '已公开至大厅 (当前锁定)'}
                                                        </p>
                                                        <p className="text-[8px] text-slate-450 mt-0.5 font-medium leading-normal">
                                                            {currentBook.status === 'pending' ? '管理员正在审核内容，请耐心等待' : '其他用户可在广场大厅中浏览此书'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={isSaving}
                                                    onClick={handleWithdraw}
                                                    className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 active:scale-[0.98] cursor-pointer"
                                                >
                                                    {isSaving && <Clock size={11} className="animate-spin" />}
                                                    撤回发布以修改
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white border border-slate-150 rounded-xl p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-0.5 leading-normal">
                                                    <p className="text-[10px] font-black text-slate-800 flex items-center gap-1">
                                                        {currentBook.status === 'rejected' ? (
                                                            <span className="text-red-500 flex items-center gap-0.5"><AlertCircle size={12} /> 公开申请被退回</span>
                                                        ) : (
                                                            <span className="text-slate-700 flex items-center gap-0.5"><Lock size={12} /> 私密时光集（仅自己可见）</span>
                                                        )}
                                                    </p>
                                                    <p className="text-[8px] text-slate-400 font-medium">
                                                        开启后将提交至广场审核。审核通过后，所有人均可在大厅中浏览。
                                                    </p>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
                                                    <input
                                                        type="checkbox"
                                                        disabled={isSaving}
                                                        checked={(currentBook.status as any) === 'pending'}
                                                        onChange={(e) => handleStatusToggle(e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* --- 普通页面视角：展示纸张物理尺寸及视觉主题 --- */
                            <>
                                {/* Page Size */}
                                <div className="space-y-2">
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                        全局纸张规格
                                    </div>
                                    <select
                                        value={currentBook.pageSize}
                                        onChange={(e) => updateBookSettings({ pageSize: e.target.value as PageSize })}
                                        className="w-full text-xs font-bold bg-white hover:bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none text-gray-700 transition-colors cursor-pointer"
                                    >
                                        {Object.entries(PAGE_SIZES).map(([key, val]) => (
                                            <option key={key} value={key}>{val.name} ({val.width}x{val.height}mm)</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Themes visual selection */}
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
                                                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${isThemeSelected ? 'bg-indigo-50 border-indigo-650 text-indigo-700 shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50/50'}`}
                                                >
                                                    <div className="font-bold text-xs">{themeOpt.name}</div>
                                                    <div className="text-[8px] text-gray-400 mt-0.5 font-mono font-normal">{themeOpt.desc}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* 插画上传遮罩层 */}
            {isUploading && (
                <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center text-white z-[100] animate-in fade-in duration-150">
                    <div className="bg-slate-900/80 px-4 py-3 rounded-2xl flex items-center gap-2 text-xs font-bold shadow-lg">
                        <Loader2 className="animate-spin text-indigo-400" size={14} />
                        <span>正在上传插画...</span>
                    </div>
                </div>
            )}
        </div>
    );
};
// #endregion
