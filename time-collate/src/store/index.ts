import { create } from 'zustand';
import type { Book, BookCover, Document, Chapter, Page, Photo, Template, CanvasElement, PhotoFrameElement } from '../types';
import { getBookService } from '../services/serviceFactory';
import { useAuthStore } from './useAuthStore';
import { DEFAULT_TEMPLATES } from '../rendering/defaultTemplates';
import axios from 'axios';
import { debounce } from '../utils/debounce';
import { migrateBookToVirtualCoords } from '../utils/canvasMigrationAdapter';

// #region Cover Unified Helper Functions
function buildDefaultCoverPage(title: string, author: string, coverUrl?: string): Page {
    let backgroundImage: string | undefined = undefined;
    let backgroundColor: string = '#FAF8E7'; // 棉麻暖白作为默认颜色
    
    if (coverUrl && !coverUrl.startsWith('design://')) {
        backgroundImage = coverUrl;
    } else if (coverUrl && coverUrl.startsWith('design://')) {
        try {
            const queryStr = coverUrl.split('?')[1] || '';
            const params = new URLSearchParams(queryStr);
            const image = params.get('image') ? decodeURIComponent(params.get('image')!) : undefined;
            if (image) {
                backgroundImage = image;
            }
            const bgId = params.get('bg') || 'cotton-white';
            if (bgId === 'slate-blue') backgroundColor = '#1E293B';
            else if (bgId === 'forest-green') backgroundColor = '#1A332B';
            else if (bgId === 'vintage-red') backgroundColor = '#6B1D1D';
            else backgroundColor = '#FAF8E7';
        } catch (e) {
            console.error('Failed to parse coverUrl design protocol', e);
        }
    }
    
    return {
        id: crypto.randomUUID(),
        content: '',
        photos: [],
        templateId: 'book-cover',
        pageType: 'cover',
        background: {
            color: backgroundColor,
            backgroundImage
        },
        elements: [
            {
                id: crypto.randomUUID(),
                type: 'text',
                x: 100,
                y: 450,
                width: 800,
                height: 150,
                rotate: 0,
                zIndex: 10,
                role: 'cover-title',
                textConfig: {
                    content: title || '我的时光集',
                    fontFamily: 'inherit',
                    fontSize: '28pt',
                    fontWeight: 'bold',
                    color: '#3A2E2B',
                    textAlign: 'center'
                }
            },
            {
                id: crypto.randomUUID(),
                type: 'text',
                x: 200,
                y: 650,
                width: 600,
                height: 80,
                rotate: 0,
                zIndex: 9,
                role: 'cover-author',
                textConfig: {
                    content: author || '时光记录者',
                    fontFamily: 'inherit',
                    fontSize: '14pt',
                    color: '#8C7A76',
                    textAlign: 'center'
                }
            }
        ]
    };
}

function ensureCoverPageInPages(book: Book): Book {
    if (!book.pages) {
        book.pages = [];
    }
    
    // 1. 扫描并自动纠正具有 'book-cover' templateId 页面的 pageType
    book.pages.forEach(p => {
        if (p.templateId === 'book-cover') {
            p.pageType = 'cover';
        }
    });

    const hasCover = book.pages.some(p => p.pageType === 'cover');
    if (!hasCover) {
        const coverPage = buildDefaultCoverPage(book.title, book.author, book.coverUrl);
        book.pages = [coverPage, ...book.pages];
    }
    if ((book as any).coverPage) {
        delete (book as any).coverPage;
    }
    return book;
}
// #endregion

// 获取 Service 单例（内部根据环境变量切换 Local/Cloud）
const bookService = getBookService();

// 虚拟书籍转化为排版模板保存
async function saveTemplateFromVirtualBook(book: Book) {
    const templateId = book.id.replace('temp-book-', '');
    const page = book.pages[0];
    const elements = page.elements || [];
    const background = page.background || { color: '#FFFFFF', gridPattern: false };
    const photoCount = elements.filter(el => el.type === 'photo-frame').length;
    
    const templateMeta = (book as any).templateMeta || {
        name: book.title,
        category: 'general',
        templateType: 'content',
        visibility: 'private',
        creatorId: 'system'
    };

    const templateData = {
        id: templateId === 'new' ? `tpl-${Date.now()}` : templateId,
        name: book.title || templateMeta.name,
        photoCount,
        category: templateMeta.category || 'general',
        templateType: templateMeta.templateType || 'content',
        layoutSchema: {
            background,
            elements
        },
        visibility: templateMeta.visibility || 'private',
        creatorId: templateMeta.creatorId || 'system'
    };

    const response = await axios.post('/templates', templateData);
    if (response.data && response.data.success) {
        const savedTpl = response.data.data;
        if (templateId === 'new' && savedTpl && savedTpl.id) {
            const newTplId = savedTpl.id;
            const newBook = {
                ...book,
                id: `temp-book-${newTplId}`,
                pages: [{
                    ...page,
                    id: `temp-page-${newTplId}`,
                    templateId: newTplId
                }]
            };
            useBookStore.setState({ currentBook: newBook });
        }
    }
}

// 全局防抖保存执行器，只针对单个被修改的 Document 进行局部更新
const debouncedSaveDocFn = debounce(async (doc: Document, bookId: string, onSaveSuccess: () => void, onSaveError: () => void) => {
    try {
        if (doc.type === 'cover') {
            await bookService.saveCover(bookId, {
                frontElements: doc.elements,
                frontBackground: doc.background,
                backBackground: doc.background,
                frontThumbnail: doc.thumbnail
            });
        } else {
            await bookService.savePage(doc.id, {
                elements: doc.elements,
                background: doc.background,
                thumbnail: doc.thumbnail,
                pageTitle: doc.title
            });
        }
        onSaveSuccess();
    } catch (e) {
        console.error('Failed to save document (debounced)', e);
        onSaveError();
    }
}, 1000);

interface BookState {
    // Data
    currentBook: Book | null;
    cover: BookCover | null;
    documents: Document[];
    activeDocumentId: string;
    isLoading: boolean;
    error: string | null;
    saveStatus: 'saved' | 'saving' | 'error'; // 新增：云同步保存状态
    thumbnailStatus: 'READY' | 'PENDING' | 'FAILED' | 'NOT_GENERATED'; // 新增：缩略图生成状态
    uploadingJobs: Record<string, { name: string; progress: number; status: 'uploading' | 'success' | 'error' }>; // 新增：全局直传任务管理
    editorMode: 'select' | 'hand'; // 编辑器操作模式
    editorScope: 'cover' | 'chapters'; // 当前处于“书封扉页”还是“正文章节”大模态
    activeFrontPage: 'cover' | 'backCover'; // 书封扉页大模式下，当前编辑的页面
    historyPast: Document[][];          // 历史状态栈（过去）
    historyFuture: Document[][];        // 历史状态栈（未来）
    activePhotoEdit: { chapterId: string, pageId: string, photoId: string } | null; // 当前正在被编辑微调的图片
    activeTextEdit: { chapterId: string, pageId: string, slotId: string } | null; // 当前正在被编辑微调的文本槽位
    activeStickerEdit: { chapterId: string, pageId: string, stickerId: string } | null; // 当前正在被编辑微调的贴纸
    selectedElementIds: string[]; // Canva 风格自由画布当前选中的元素 ID 列表
    alignLines: { type: 'v' | 'h'; val: number }[]; // 智能对齐吸附参考线
    templates: Template[];        // 动态加载的排版模板库
    interactionStartDocs: Document[] | null; // 交互开始前的画布文档状态备份

    // 双轨制 Command 撤销栈 Feature Flag
    enableCommandHistory: boolean; // 是否启用新 Command 原子撤销栈（替代大快照）
    commandCanUndo: boolean;       // 底层 Command 栈是否可撤销
    commandCanRedo: boolean;       // 底层 Command 栈是否可重做

    // UI Drawer States
    rightActiveTab: 'templates' | 'photos' | 'text' | 'decorations' | 'global' | 'inspector' | null;
    isDrawerOpen: boolean;
    activeInspectorSection: 'edit' | 'crop' | 'frame' | 'font' | 'color' | 'position' | 'sticker-adjust' | null;

    // Mode Actions
    setEditorMode: (mode: 'select' | 'hand') => void;
    setEditorScope: (scope: 'cover' | 'chapters') => void;
    setActiveFrontPage: (page: 'cover' | 'backCover') => void;
    setActivePhotoEdit: (edit: { chapterId: string, pageId: string, photoId: string } | null) => void;
    setActiveTextEdit: (edit: { chapterId: string, pageId: string, slotId: string } | null) => void;
    setActiveStickerEdit: (edit: { chapterId: string, pageId: string, stickerId: string } | null) => void; // 新增：设置贴纸编辑状态
    setSelectedElementIds: (ids: string[]) => void; // 设置选中的元素 ID
    commitPageElements: (chapterId: string, pageId: string, elements: CanvasElement[]) => Promise<void>; // 低频提交更新入历史栈
    updatePageElementsLocal: (chapterId: string, pageId: string, elements: CanvasElement[]) => void; // 交互高频更新，不进历史栈
    
    // UI Drawer Actions
    setRightActiveTab: (tab: 'templates' | 'photos' | 'text' | 'decorations' | 'global' | 'inspector' | null) => void;
    setIsDrawerOpen: (open: boolean) => void;
    setActiveInspectorSection: (section: 'edit' | 'crop' | 'frame' | 'font' | 'color' | 'position' | 'sticker-adjust' | null) => void;
    
    loadTemplates: () => Promise<void>; // 加载动态排版模板列表

    // History Actions
    undo: () => Promise<void>;
    redo: () => Promise<void>;
    setEnableCommandHistory: (enabled: boolean) => void;
    setCommandHistoryState: (canUndo: boolean, canRedo: boolean) => void;

    // Book Actions
    loadBook: (id: string) => Promise<void>;
    createBook: (title: string, author: string) => Promise<void>;
    updateBookSettings: (updates: Partial<Book>) => Promise<void>;

    // Chapter Actions
    addChapter: (title: string) => Promise<string | undefined>;
    updateChapter: (chapterId: string, updates: Partial<Chapter>) => Promise<void>;
    deleteChapter: (chapterId: string) => Promise<void>;
    reorderChapters: (newChapters: Chapter[]) => Promise<void>;
    reorderPages: (chapterId: string, newPages: Page[]) => Promise<void>;

    // Page Actions (新增)
    addPageToChapter: (chapterId: string) => Promise<string>;  // 返回新页面ID
    updatePage: (chapterId: string, pageId: string, updates: Partial<Page>) => Promise<void>;
    deletePage: (chapterId: string, pageId: string) => Promise<void>;
    duplicatePage: (chapterId: string, pageId: string) => Promise<string>;  // 复制页面（共享照片引用），返回新页面ID
    uploadPhotoToPage: (chapterId: string, pageId: string, file: File, slotIndex?: number) => Promise<void>;
    addMockPhotoToPage: (chapterId: string, pageId: string, url: string, caption: string, slotIndex?: number) => Promise<void>;
    deletePhotoFromPage: (chapterId: string, pageId: string, photoId: string) => Promise<void>;
    reorderPhotosInPage: (chapterId: string, pageId: string, newPhotoIds: string[]) => Promise<void>;
    updatePhotoSettings: (chapterId: string, pageId: string, photoId: string, updates: Partial<Photo>) => Promise<void>;
    assignPhotoToSlot: (
        chapterId: string,
        pageId: string,
        photoId: string,
        targetSlotIndex: number,
        sourceSlotIndex?: number
    ) => Promise<void>;
    clearPhotoSlot: (chapterId: string, pageId: string, photoId: string) => Promise<void>;
    movePhotoBetweenPages: (
        sourceChapterId: string,
        sourcePageId: string,
        targetChapterId: string,
        targetPageId: string,
        photoId: string,
        targetSlotIndex: number
    ) => Promise<void>;

    // Export Actions
    exportBook: (type: 'pdf' | 'markdown') => Promise<void>;

    // 新增：自动保存与上传动作
    debouncedSave: () => void;
    triggerSaveBook: () => Promise<void>;
    flushSaveBook: () => void;
    updateUploadJob: (id: string, name: string, progress: number, status?: 'uploading' | 'success' | 'error') => void;
    clearUploadJob: (id: string) => void;
}

// #region Helper functions for Virtual Chapters mapping
export function getVirtualChapters(pages: Page[]): Chapter[] {
    const chapters: Chapter[] = [];
    if (!pages || pages.length === 0) return chapters;

    // 过滤掉封面页，仅对正文页进行章节拆分
    const contentPages = pages.filter(p => p.pageType !== 'cover');
    if (contentPages.length === 0) return chapters;

    let currentChapter: Chapter | null = null;

    for (const page of contentPages) {
        if (page.isChapterStart || !currentChapter) {
            currentChapter = {
                id: page.id, // 章节 ID 对应其第一页的 ID
                title: page.pageTitle || '未命名章节',
                date: new Date(page.sortOrder ? Number(page.sortOrder) * 86400000 : Date.now()).toISOString().split('T')[0], // 默认日期
                pages: [page]
            };
            chapters.push(currentChapter);
        } else {
            currentChapter.pages.push(page);
        }
    }
    return chapters;
}

export function flattenChapters(chapters: Chapter[], bookId: string, originalPages: Page[] = []): Page[] {
    const pages: Page[] = [];
    
    // 1. 提取并保留已有的封面页
    const coverPages = (originalPages || []).filter(p => p.pageType === 'cover');
    pages.push(...coverPages);

    let sortOrder = coverPages.length;
    for (const chapter of chapters) {
        for (let i = 0; i < chapter.pages.length; i++) {
            const page = chapter.pages[i];
            pages.push({
                ...page,
                bookId,
                pageTitle: i === 0 ? chapter.title : '',
                isChapterStart: i === 0,
                sortOrder: sortOrder++
            });
        }
    }
    return pages;
}
// #endregion

let lastCaptureTime = 0;

export const useBookStore = create<BookState>((set, get) => {
    // 异步生成并上传书籍当前被激活文档 of 缩略图 (带冷却 Cooldown 降频)
    const triggerAsyncThumbnailUpdate = async (bookId: string, force = false) => {
        const { activeDocumentId } = get();
        
        const now = Date.now();
        // 只有非强制更新，且距离上次截图不足 15 秒时触发 Cooldown
        if (!force && (now - lastCaptureTime < 15000)) {
            console.log('📷 [Thumbnail] Cooldown active (last captured', now - lastCaptureTime, 'ms ago), skipping canvas snapshot.');
            return;
        }
        
        lastCaptureTime = now;
        console.log('📷 [Thumbnail] triggerAsyncThumbnailUpdate triggered for bookId:', bookId, 'activeDocumentId:', activeDocumentId, 'force:', force);
        
        const isCover = activeDocumentId === 'cover';
        const elementId = isCover ? 'book-cover-page-capture-container' : 'editor-active-page-canvas';
        const element = document.getElementById(elementId);
        console.log(`📷 [Thumbnail] DOM Element #${elementId} found:`, !!element);
        if (!element) {
            console.log('📷 [Thumbnail] Capture element not found in DOM, aborting.');
            return;
        }

        set({ thumbnailStatus: 'PENDING' });
        try {
            console.log('📷 [Thumbnail] Importing coverCaptureHelper dynamically...');
            const { captureCoverToBlob, uploadCoverThumbnail } = await import('../utils/coverCaptureHelper');
            console.log('📷 [Thumbnail] Running DOM captureCoverToBlob...');
            const blob = await captureCoverToBlob(element);
            console.log('📷 [Thumbnail] Blob generation finished. Success:', !!blob);
            if (!blob) {
                set({ thumbnailStatus: 'FAILED' });
                return;
            }

            console.log('📷 [Thumbnail] Uploading thumbnail to OSS...');
            const uploadResult = await uploadCoverThumbnail(bookId, blob, isCover ? undefined : activeDocumentId);
            console.log('📷 [Thumbnail] Upload result from OSS:', uploadResult);
            if (!uploadResult) {
                set({ thumbnailStatus: 'FAILED' });
                return;
            }

            // 更新云端数据
            if (isCover) {
                await bookService.saveCover(bookId, { frontThumbnail: uploadResult.url });
            } else {
                await bookService.savePage(activeDocumentId, { thumbnail: uploadResult.url });
            }
            console.log('📷 [Thumbnail] PATCH update to backend success!');

            // 同步更新本地状态中的 thumbnail 属性
            const { documents, cover } = get();
            const nextDocs = documents.map(d =>
                d.id === activeDocumentId ? { ...d, thumbnail: uploadResult.url } : d
            );
            
            let nextCover = cover;
            if (isCover && cover) {
                nextCover = { ...cover, frontThumbnail: uploadResult.url };
            }

            set({
                documents: nextDocs,
                cover: nextCover,
                thumbnailStatus: 'READY'
            });
            console.log('📷 [Thumbnail] Zustand store thumbnail state synced successfully!');
        } catch (error) {
            console.error('📷 [Thumbnail] Failed to trigger async thumbnail update with error:', error);
            set({ thumbnailStatus: 'FAILED' });
        }
    };

    // 内部帮助函数：深拷贝并推送当前状态到撤销栈，保存新状态 (按页/按封面增量写时复制)
    const saveStateAndHistory = async (
        updatedDocs: Document[], 
        skipHistoryPush: boolean = false, 
        immediate: boolean = false,
        keepFuture: boolean = false
    ) => {
        const { documents, historyPast, historyFuture, currentBook } = get();
        if (!currentBook) return;
        
        let newPast = historyPast;
        const isCommandMode = get().enableCommandHistory;
        if (!skipHistoryPush && !isCommandMode) {
            // 浅拷贝 documents 数组，只深拷贝当前正在编辑的 activeDocument，大幅节省内存
            const snapshot = documents.map(d => 
                d.id === get().activeDocumentId ? JSON.parse(JSON.stringify(d)) : d
            );
            newPast = [...historyPast.slice(-49), snapshot];
        }

        const nextPages = updatedDocs
            .filter(d => d.type === 'page')
            .map((d, idx) => ({
                id: d.id,
                pageTitle: d.title,
                isChapterStart: d.isChapterStart,
                templateId: d.templateId || 'custom',
                elements: d.elements,
                background: d.background,
                thumbnail: d.thumbnail,
                sortOrder: idx,
                content: '',
                photos: []
            }));

        set({
            documents: updatedDocs,
            currentBook: { ...currentBook, pages: nextPages },
            historyPast: newPast,
            historyFuture: keepFuture ? historyFuture : [], // 只有在 keepFuture 为 true 时保留，常规修改一律清空
            saveStatus: 'saving'
        });

        // 局部防抖/即时保存被更新的 Document
        const activeDoc = updatedDocs.find(d => d.id === get().activeDocumentId);
        if (!activeDoc) return;

        if (immediate) {
            debouncedSaveDocFn.cancel();
            try {
                if (activeDoc.type === 'cover') {
                    await bookService.saveCover(currentBook.id, {
                        frontElements: activeDoc.elements,
                        frontBackground: activeDoc.background,
                        backBackground: activeDoc.background,
                        frontThumbnail: activeDoc.thumbnail
                    });
                } else {
                    await bookService.savePage(activeDoc.id, {
                        elements: activeDoc.elements,
                        background: activeDoc.background,
                        thumbnail: activeDoc.thumbnail,
                        pageTitle: activeDoc.title
                    });
                }
                set({ saveStatus: 'saved' });
                triggerAsyncThumbnailUpdate(currentBook.id);
            } catch (e) {
                console.error('Failed to save document immediately', e);
                set({ saveStatus: 'error' });
            }
        } else {
            debouncedSaveDocFn(
                activeDoc,
                currentBook.id,
                () => {
                    set({ saveStatus: 'saved' });
                    triggerAsyncThumbnailUpdate(currentBook.id);
                },
                () => set({ saveStatus: 'error' })
            );
        }
    };

    return {
        currentBook: null,
        cover: null,
        documents: [],
        activeDocumentId: '',
        isLoading: false,
        error: null,
        saveStatus: 'saved',
        thumbnailStatus: 'NOT_GENERATED',
        uploadingJobs: {},
        editorMode: 'select',
        editorScope: 'chapters',
        activeFrontPage: 'cover',
        historyPast: [],
        historyFuture: [],
        activePhotoEdit: null,
        activeTextEdit: null,
        activeStickerEdit: null, // 新增贴纸编辑状态初始值
        selectedElementIds: [], // Canva 风格自由画布当前选中的元素 ID 列表
        alignLines: [], // 智能对齐吸附参考线初始值
        templates: [],
        interactionStartDocs: null,
        enableCommandHistory: false,
        commandCanUndo: false,
        commandCanRedo: false,

        // UI Drawer Initial values
        rightActiveTab: null,
        isDrawerOpen: false,
        activeInspectorSection: null,

        setEditorMode: (mode) => {
            set({ editorMode: mode });
        },

        setEditorScope: (scope) => {
            const { documents, activeDocumentId } = get();
            let nextActiveId = activeDocumentId;
            if (scope === 'cover') {
                nextActiveId = 'cover';
            } else if (scope === 'chapters') {
                const isCurrentPage = documents.some(d => d.id === activeDocumentId && d.type === 'page');
                if (!isCurrentPage) {
                    const firstPage = documents.find(d => d.type === 'page');
                    nextActiveId = firstPage ? firstPage.id : '';
                }
            }

            set({
                editorScope: scope,
                activeDocumentId: nextActiveId,
                activePhotoEdit: null,
                activeTextEdit: null,
                activeStickerEdit: null,
                selectedElementIds: []
            });
        },

        setActiveFrontPage: (page: 'cover' | 'backCover') => {
            set({
                activeFrontPage: page,
                activePhotoEdit: null,
                activeTextEdit: null,
                activeStickerEdit: null,
                selectedElementIds: []
            });
        },

        setActivePhotoEdit: (edit) => {
            const currentSection = get().activeInspectorSection;
            const photoSections = ['edit', 'crop', 'frame', 'position'];
            const isCompatible = currentSection && photoSections.includes(currentSection);
            
            set({
                activePhotoEdit: edit,
                selectedElementIds: edit 
                    ? [edit.photoId] 
                    : (get().selectedElementIds.includes('page-background') ? ['page-background'] : [])
            });
            if (edit) {
                set({
                    activeTextEdit: null,
                    activeStickerEdit: null,
                    activeInspectorSection: isCompatible ? currentSection : 'edit'
                });
            } else {
                const { rightActiveTab } = get();
                if (rightActiveTab === 'inspector') {
                    set({ rightActiveTab: null, isDrawerOpen: false, activeInspectorSection: null });
                }
            }
        },

        setActiveTextEdit: (edit) => {
            const currentSection = get().activeInspectorSection;
            const textSections = ['font', 'color', 'position'];
            const isCompatible = currentSection && textSections.includes(currentSection);

            set({
                activeTextEdit: edit,
                selectedElementIds: edit 
                    ? [edit.slotId] 
                    : (get().selectedElementIds.includes('page-background') ? ['page-background'] : [])
            });
            if (edit) {
                set({
                    activePhotoEdit: null,
                    activeStickerEdit: null,
                    activeInspectorSection: isCompatible ? currentSection : 'font'
                });
            } else {
                const { rightActiveTab } = get();
                if (rightActiveTab === 'inspector') {
                    set({ rightActiveTab: null, isDrawerOpen: false, activeInspectorSection: null });
                }
            }
        },

        setActiveStickerEdit: (edit) => {
            const currentSection = get().activeInspectorSection;
            const stickerSections = ['sticker-adjust', 'position'];
            const isCompatible = currentSection && stickerSections.includes(currentSection);

            set({
                activeStickerEdit: edit,
                selectedElementIds: edit 
                    ? [edit.stickerId] 
                    : (get().selectedElementIds.includes('page-background') ? ['page-background'] : [])
            });
            if (edit) {
                set({
                    activePhotoEdit: null,
                    activeTextEdit: null,
                    activeInspectorSection: isCompatible ? currentSection : 'sticker-adjust'
                });
            } else {
                const { rightActiveTab } = get();
                if (rightActiveTab === 'inspector') {
                    set({ rightActiveTab: null, isDrawerOpen: false, activeInspectorSection: null });
                }
            }
        },

        setSelectedElementIds: (ids) => {
            set({ selectedElementIds: ids });
            if (ids.length === 1) {
                const targetId = ids[0];
                const { documents } = get();
                
                let foundElement: CanvasElement | null = null;
                let foundDocId = '';
                
                for (const doc of documents) {
                    if (doc.elements) {
                        const el = doc.elements.find(e => e.id === targetId);
                        if (el) {
                            foundElement = el;
                            foundDocId = doc.id;
                            break;
                        }
                    }
                }

                if (foundElement) {
                    if (foundElement.type === 'photo-frame') {
                        set({
                            activePhotoEdit: { chapterId: '', pageId: foundDocId, photoId: foundElement.id },
                            activeTextEdit: null,
                            activeStickerEdit: null,
                            activeInspectorSection: 'edit'
                        });
                    } else if (foundElement.type === 'text') {
                        set({
                            activeTextEdit: { chapterId: '', pageId: foundDocId, slotId: foundElement.id },
                            activePhotoEdit: null,
                            activeStickerEdit: null,
                            activeInspectorSection: 'font'
                        });
                    } else if (foundElement.type === 'sticker') {
                        set({
                            activeStickerEdit: { chapterId: '', pageId: foundDocId, stickerId: foundElement.id },
                            activePhotoEdit: null,
                            activeTextEdit: null,
                            activeInspectorSection: 'sticker-adjust'
                        });
                    }
                    return;
                }
            }
            
            // 多选或没选中
            set({
                activePhotoEdit: null,
                activeTextEdit: null,
                activeStickerEdit: null
            });
        },

        commitPageElements: async (chapterId, pageId, elements) => {
            const { documents, interactionStartDocs, historyPast } = get();

            const nextDocs = documents.map(d =>
                d.id === pageId ? { ...d, elements } : d
            );

            const docsToPush = interactionStartDocs || documents;
            const snapshot = docsToPush.map(d => 
                d.id === pageId ? JSON.parse(JSON.stringify(d)) : d
            );
            const newPast = [...historyPast.slice(-49), snapshot];

            set({
                historyPast: newPast,
                interactionStartDocs: null
            });

            await saveStateAndHistory(nextDocs, true);
        },

        updatePageElementsLocal: (chapterId, pageId, elements) => {
            const { documents, interactionStartDocs } = get();

            let nextInteractionStartDocs = interactionStartDocs;
            if (!interactionStartDocs) {
                nextInteractionStartDocs = documents.map(d => 
                    d.id === pageId ? JSON.parse(JSON.stringify(d)) : d
                );
            }

            const nextDocs = documents.map(d =>
                d.id === pageId ? { ...d, elements } : d
            );

            set({
                documents: nextDocs,
                interactionStartDocs: nextInteractionStartDocs
            });
        },

        setRightActiveTab: (tab) => {
            set({ rightActiveTab: tab });
        },

        setIsDrawerOpen: (open) => {
            set({ isDrawerOpen: open });
        },

        setActiveInspectorSection: (section) => {
            set({ activeInspectorSection: section });
        },

        loadTemplates: async () => {
            try {
                const response = await axios.get('/templates');
                if (response.data && response.data.success) {
                    const backendTemplates = response.data.data as Template[];
                    set({ templates: backendTemplates });
                }
            } catch (e) {
                console.error('Failed to load templates from database', e);
                set({ templates: [] });
            }
        },

        undo: async () => {
            if (get().enableCommandHistory) {
                const { editorFacade } = await import('../features/editor/runtime/EditorFacade');
                await editorFacade.undo();
                return;
            }
            const { historyPast, historyFuture, documents } = get();
            if (historyPast.length === 0) return;

            const previousDocs = historyPast[historyPast.length - 1];
            const newPast = historyPast.slice(0, historyPast.length - 1);
            // 压入 historyFuture 前，对 activeDocument 进行深拷贝，其他共享引用
            const activeId = get().activeDocumentId;
            const snapshot = documents.map(d => d.id === activeId ? JSON.parse(JSON.stringify(d)) : d);
            const newFuture = [snapshot, ...historyFuture];

            set({
                historyPast: newPast,
                historyFuture: newFuture
            });

            await saveStateAndHistory(previousDocs, true, false, true);
        },

        redo: async () => {
            if (get().enableCommandHistory) {
                const { editorFacade } = await import('../features/editor/runtime/EditorFacade');
                await editorFacade.redo();
                return;
            }
            const { historyPast, historyFuture, documents } = get();
            if (historyFuture.length === 0) return;

            const nextDocs = historyFuture[0];
            const newFuture = historyFuture.slice(1);
            const activeId = get().activeDocumentId;
            const snapshot = documents.map(d => d.id === activeId ? JSON.parse(JSON.stringify(d)) : d);
            const newPast = [...historyPast, snapshot];

            set({
                historyPast: newPast,
                historyFuture: newFuture
            });

            await saveStateAndHistory(nextDocs, true, false, true);
        },

        setEnableCommandHistory: (enabled: boolean) => {
            set({ enableCommandHistory: enabled });
        },

        setCommandHistoryState: (canUndo: boolean, canRedo: boolean) => {
            set({ commandCanUndo: canUndo, commandCanRedo: canRedo });
        },

        loadBook: async (id: string) => {
            set({ isLoading: true, error: null });
            try {
                const result = await bookService.getBook(id);
                if (result) {
                    const { book, cover, pages } = result;
                    const documents: Document[] = [];
                    
                    if (cover) {
                        documents.push({
                            id: 'cover',
                            type: 'cover',
                            sourceId: cover.id,
                            title: '书封',
                            elements: cover.frontElements || [],
                            background: cover.frontBackground || { color: '#FFFFFF', gridPattern: false },
                            thumbnail: cover.frontThumbnail || ''
                        });
                    } else {
                        documents.push({
                            id: 'cover',
                            type: 'cover',
                            sourceId: crypto.randomUUID(),
                            title: '书封',
                            elements: [],
                            background: { color: '#FFFFFF', gridPattern: false },
                            thumbnail: ''
                        });
                    }

                    const pageDocs = pages.map((p, idx) => ({
                        id: p.id,
                        type: 'page' as const,
                        sourceId: p.id,
                        title: p.pageTitle || `第 ${idx + 1} 页`,
                        elements: p.elements || [],
                        background: p.background || { color: '#FFFFFF', gridPattern: false },
                        thumbnail: p.thumbnail || '',
                        isChapterStart: p.isChapterStart,
                        templateId: p.templateId
                    }));
                    documents.push(...pageDocs);

                    set({
                        currentBook: { ...book, pages: pages },
                        cover: cover,
                        documents,
                        activeDocumentId: 'cover',
                        isLoading: false,
                        historyPast: [],
                        historyFuture: [],
                        editorScope: 'cover', // 默认激活封面
                        activePhotoEdit: null,
                        activeTextEdit: null,
                        activeStickerEdit: null
                    });
                } else {
                    set({ isLoading: false, error: '加载作品失败: 未找到对应作品' });
                }
                get().loadTemplates();
            } catch (e) {
                set({ isLoading: false, error: '加载作品失败' });
                console.error(e);
            }
        },

        createBook: async (title: string, author: string) => {
            set({ isLoading: true, error: null });
            try {
                const newBookId = crypto.randomUUID();
                const newBook: Book = {
                    id: newBookId,
                    userId: useAuthStore.getState().user?.id || '',
                    title,
                    author,
                    createdAt: Date.now(),
                    pages: [],
                    pageSize: 'A4'
                };
                // 保存新书，后端会自动分配并创建空白 cover_id 封面
                await bookService.saveBook(newBook);
                
                // 再次读取刚创建的书籍，以获得完整的 V2 结构
                const result = await bookService.getBook(newBookId);
                if (result) {
                    const { book, cover, pages } = result;
                    const documents: Document[] = [];
                    if (cover) {
                        documents.push({
                            id: 'cover',
                            type: 'cover',
                            sourceId: cover.id,
                            title: '书封',
                            elements: cover.frontElements || [],
                            background: cover.frontBackground || { color: '#FFFFFF', gridPattern: false },
                            thumbnail: cover.frontThumbnail || ''
                        });
                    }
                    
                    set({
                        currentBook: { ...book, pages: pages },
                        cover: cover,
                        documents,
                        activeDocumentId: 'cover',
                        isLoading: false,
                        historyPast: [],
                        historyFuture: [],
                        editorScope: 'cover',
                        activePhotoEdit: null,
                        activeTextEdit: null,
                        activeStickerEdit: null
                    });
                }
                get().loadTemplates();
            } catch (e) {
                set({ isLoading: false, error: '创建作品失败' });
                console.error(e);
            }
        },

        updateBookSettings: async (updates: Partial<Book>) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const updatedBook = { ...currentBook, ...updates };
            await bookService.saveBook(updatedBook);
            set({ currentBook: updatedBook });
        },

        addChapter: async (title: string) => {
            const { currentBook, documents } = get();
            if (!currentBook) return undefined;

            const newPageId = crypto.randomUUID();
            const newPageDoc: Document = {
                id: newPageId,
                type: 'page',
                sourceId: newPageId,
                title,
                elements: [],
                background: { color: '#FFFFFF', gridPattern: false },
                thumbnail: ''
            };

            const updatedDocs = [...documents, newPageDoc];
            await saveStateAndHistory(updatedDocs);
            
            await bookService.addPage(currentBook.id, {
                id: newPageId,
                pageTitle: title,
                isChapterStart: true,
                templateId: 'custom',
                sortOrder: updatedDocs.length,
                elements: [],
                background: { color: '#FFFFFF', gridPattern: false }
            });

            return newPageId;
        },

        updateChapter: async (chapterId: string, updates: Partial<Chapter>) => {
            const { documents } = get();
            const updatedDocs = documents.map(d =>
                d.id === chapterId ? { ...d, title: updates.title || d.title } : d
            );
            await saveStateAndHistory(updatedDocs);
        },

        deleteChapter: async (chapterId: string) => {
            const { documents } = get();
            const updatedDocs = documents.map(d =>
                d.id === chapterId ? { ...d, title: '未命名页面' } : d
            );
            await saveStateAndHistory(updatedDocs);
        },

        reorderChapters: async (newChapters: Chapter[]) => {
            const { documents } = get();
            const coverDoc = documents.find(d => d.type === 'cover');
            const nextPages: Document[] = [];
            newChapters.forEach(chap => {
                chap.pages.forEach(p => {
                    const found = documents.find(d => d.id === p.id);
                    if (found) nextPages.push(found);
                });
            });

            const nextDocs = coverDoc ? [coverDoc, ...nextPages] : nextPages;
            await saveStateAndHistory(nextDocs);
            
            nextPages.forEach((p, idx) => {
                bookService.savePage(p.id, { sortOrder: idx }).catch(console.error);
            });
        },

        reorderPages: async (chapterId: string, newPages: Page[]) => {
            const { documents } = get();
            const coverDoc = documents.find(d => d.type === 'cover');
            const newPageIds = new Set(newPages.map(p => p.id));
            const otherPages = documents.filter(d => d.type === 'page' && !newPageIds.has(d.id));

            const orderedDocs = newPages.map(p => {
                const found = documents.find(d => d.id === p.id);
                return found || {
                    id: p.id,
                    type: 'page' as const,
                    sourceId: p.id,
                    title: p.pageTitle || '',
                    elements: p.elements || [],
                    background: p.background || { color: '#FFFFFF' },
                    thumbnail: p.thumbnail || ''
                };
            });

            const nextDocs = coverDoc ? [coverDoc, ...otherPages, ...orderedDocs] : [...otherPages, ...orderedDocs];
            await saveStateAndHistory(nextDocs);

            const onlyPages = nextDocs.filter(d => d.type === 'page');
            onlyPages.forEach((p, idx) => {
                bookService.savePage(p.id, { sortOrder: idx }).catch(console.error);
            });
        },

        addPageToChapter: async (chapterId: string) => {
            const { currentBook, documents } = get();
            if (!currentBook) return '';

            const newPageId = crypto.randomUUID();
            const newPageDoc: Document = {
                id: newPageId,
                type: 'page',
                sourceId: newPageId,
                title: `第 ${documents.length} 页`,
                elements: [],
                background: { color: '#FFFFFF', gridPattern: false },
                thumbnail: ''
            };

            const updatedDocs = [...documents, newPageDoc];
            await saveStateAndHistory(updatedDocs);

            await bookService.addPage(currentBook.id, {
                id: newPageId,
                pageTitle: `第 ${documents.length} 页`,
                isChapterStart: false,
                templateId: 'custom',
                sortOrder: updatedDocs.length,
                elements: [],
                background: { color: '#FFFFFF', gridPattern: false }
            });

            return newPageId;
        },

        updatePage: async (chapterId: string, pageId: string, updates: Partial<Page>) => {
            const { documents } = get();
            const updatedDocs = documents.map(d => {
                if (d.id === pageId) {
                    return {
                        ...d,
                        title: updates.pageTitle !== undefined ? updates.pageTitle : d.title,
                        background: updates.background !== undefined ? updates.background : d.background,
                        elements: updates.elements !== undefined ? updates.elements : d.elements,
                        thumbnail: updates.thumbnail !== undefined ? updates.thumbnail : d.thumbnail
                    };
                }
                return d;
            });
            await saveStateAndHistory(updatedDocs);
        },

        deletePage: async (chapterId: string, pageId: string) => {
            const { documents } = get();
            const updatedDocs = documents.filter(d => d.id !== pageId);
            await saveStateAndHistory(updatedDocs);
            await bookService.deletePage(pageId);
        },

        duplicatePage: async (chapterId: string, pageId: string) => {
            const { currentBook, documents } = get();
            if (!currentBook) return '';

            const sourceDoc = documents.find(d => d.id === pageId);
            if (!sourceDoc) return '';

            const newPageId = crypto.randomUUID();
            const copiedElements = JSON.parse(JSON.stringify(sourceDoc.elements || [])) as CanvasElement[];
            const idMapping = new Map<string, string>();
            copiedElements.forEach(el => {
                const newElId = crypto.randomUUID();
                idMapping.set(el.id, newElId);
                el.id = newElId;
            });
            copiedElements.forEach(el => {
                if (el.groupId && idMapping.has(el.groupId)) {
                    el.groupId = idMapping.get(el.groupId);
                }
            });

            const duplicatedDoc: Document = {
                id: newPageId,
                type: 'page',
                sourceId: newPageId,
                title: `${sourceDoc.title} (副本)`,
                elements: copiedElements,
                background: { ...sourceDoc.background },
                thumbnail: sourceDoc.thumbnail
            };

            const sourceIdx = documents.findIndex(d => d.id === pageId);
            const nextDocs = [...documents];
            nextDocs.splice(sourceIdx + 1, 0, duplicatedDoc);

            await saveStateAndHistory(nextDocs);

            await bookService.addPage(currentBook.id, {
                id: newPageId,
                pageTitle: `${sourceDoc.title} (副本)`,
                isChapterStart: false,
                templateId: 'custom',
                sortOrder: sourceIdx + 1,
                elements: copiedElements,
                background: sourceDoc.background
            });

            return newPageId;
        },

        uploadPhotoToPage: async (chapterId: string, pageId: string, file: File, slotIndex?: number) => {
            const { currentBook, updateUploadJob, clearUploadJob, documents } = get();
            if (!currentBook) return;

            const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            updateUploadJob(jobId, file.name, 0, 'uploading');

            try {
                const uploadedPhoto = await bookService.uploadPhoto(file, (percent) => {
                    updateUploadJob(jobId, file.name, percent, 'uploading');
                });
                updateUploadJob(jobId, file.name, 100, 'success');
                
                setTimeout(() => {
                    clearUploadJob(jobId);
                }, 1500);

                const photo = { ...uploadedPhoto, slotIndex };

                const updatedDocs = documents.map(d => {
                    if (d.id === pageId) {
                        if (d.elements) {
                            const updatedElements = d.elements.map(el => {
                                if (el.type === 'photo-frame' && (slotIndex === undefined || (el as any).slotIndex === slotIndex)) {
                                    return { ...el, photo };
                                }
                                return el;
                            });
                            return { ...d, elements: updatedElements };
                        }
                    }
                    return d;
                });

                await saveStateAndHistory(updatedDocs);
            } catch (e) {
                console.error('Failed to upload photo', e);
                updateUploadJob(jobId, file.name, 0, 'error');
                setTimeout(() => {
                    clearUploadJob(jobId);
                }, 5000);
            }
        },

        addMockPhotoToPage: async (chapterId: string, pageId: string, url: string, caption: string, slotIndex?: number) => {
            const { documents } = get();
            const photo = {
                id: crypto.randomUUID(),
                url,
                caption,
                slotIndex
            };

            const updatedDocs = documents.map(d => {
                if (d.id === pageId) {
                    if (d.elements) {
                        const updatedElements = d.elements.map(el => {
                            if (el.type === 'photo-frame' && (slotIndex === undefined || (el as any).slotIndex === slotIndex)) {
                                return { ...el, photo };
                            }
                            return el;
                        });
                        return { ...d, elements: updatedElements };
                    }
                }
                return d;
            });

            await saveStateAndHistory(updatedDocs);
        },

        deletePhotoFromPage: async (chapterId: string, pageId: string, photoId: string) => {
            const { documents } = get();
            const updatedDocs = documents.map(d => {
                if (d.id === pageId) {
                    if (d.elements) {
                        const updatedElements = d.elements.filter(el => el.id !== photoId);
                        return { ...d, elements: updatedElements };
                    }
                }
                return d;
            });
            await saveStateAndHistory(updatedDocs);
        },

        reorderPhotosInPage: async (chapterId: string, pageId: string, newPhotoIds: string[]) => {
            // 在 V2 Canvas 体系中，图片是 Canvas 组件，层级由元素本身表示
        },

        updatePhotoSettings: async (chapterId: string, pageId: string, photoId: string, updates: Partial<Photo>) => {
            const { documents } = get();
            const updatedDocs = documents.map(d => {
                if (d.id === pageId) {
                    if (d.elements) {
                        const updatedElements = d.elements.map(el => {
                            if (el.id === photoId && el.type === 'photo-frame') {
                                const pf = el as PhotoFrameElement;
                                return {
                                    ...pf,
                                    photo: pf.photo ? { ...pf.photo, ...updates } : {
                                        id: `photo-${Date.now()}`,
                                        url: updates.url || '',
                                        ...updates
                                    }
                                } as PhotoFrameElement;
                            }
                            return el;
                        });
                        return { ...d, elements: updatedElements };
                    }
                }
                return d;
            });
            await saveStateAndHistory(updatedDocs);
        },

        assignPhotoToSlot: async (
            chapterId: string,
            pageId: string,
            photoId: string,
            targetSlotIndex: number,
            sourceSlotIndex?: number
        ) => {
            const { documents } = get();
            const updatedDocs = documents.map(d => {
                if (d.id === pageId && d.elements) {
                    const updatedElements = d.elements.map(el => {
                        if (el.type === 'photo-frame') {
                            const pf = el as any;
                            if (pf.photo?.id === photoId) {
                                return { ...pf, slotIndex: targetSlotIndex };
                            }
                            if (pf.slotIndex === targetSlotIndex) {
                                return { ...pf, slotIndex: sourceSlotIndex };
                            }
                        }
                        return el;
                    });
                    return { ...d, elements: updatedElements };
                }
                return d;
            });
            await saveStateAndHistory(updatedDocs);
        },

        clearPhotoSlot: async (chapterId: string, pageId: string, photoId: string) => {
            const { documents } = get();
            const updatedDocs = documents.map(d => {
                if (d.id === pageId && d.elements) {
                    const updatedElements = d.elements.map(el => {
                        if (el.type === 'photo-frame') {
                            const pf = el as any;
                            if (pf.photo?.id === photoId) {
                                return { ...pf, slotIndex: undefined };
                            }
                        }
                        return el;
                    });
                    return { ...d, elements: updatedElements };
                }
                return d;
            });
            await saveStateAndHistory(updatedDocs);
        },

        movePhotoBetweenPages: async (
            sourceChapterId: string,
            sourcePageId: string,
            targetChapterId: string,
            targetPageId: string,
            photoId: string,
            targetSlotIndex: number
        ) => {
            const { documents } = get();
            let photoToMove: any = null;
            const sourceDoc = documents.find(d => d.id === sourcePageId);
            if (sourceDoc && sourceDoc.elements) {
                const el = sourceDoc.elements.find(e => e.type === 'photo-frame' && (e as any).photo?.id === photoId);
                if (el) photoToMove = (el as any).photo;
            }

            if (!photoToMove) return;

            const updatedDocs = documents.map(d => {
                if (d.id === sourcePageId && d.elements) {
                    return {
                        ...d,
                        elements: d.elements.map(el => {
                            if (el.type === 'photo-frame' && (el as any).photo?.id === photoId) {
                                return { ...el, photo: null };
                            }
                            return el;
                        })
                    };
                }
                if (d.id === targetPageId && d.elements) {
                    return {
                        ...d,
                        elements: d.elements.map(el => {
                            if (el.type === 'photo-frame' && (el as any).slotIndex === targetSlotIndex) {
                                return { ...el, photo: { ...photoToMove, slotIndex: targetSlotIndex } };
                            }
                            return el;
                        })
                    };
                }
                return d;
            });

            await saveStateAndHistory(updatedDocs);
        },

        exportBook: async (type: 'pdf' | 'markdown') => {
            const { currentBook } = get();
            if (!currentBook) return;

            set({ isLoading: true, error: null });
            try {
                await bookService.exportBook(currentBook.id, type);
                set({ isLoading: false });
            } catch (e) {
                set({ isLoading: false, error: '导出失败' });
                console.error('Export failed', e);
                throw e;
            }
        },

        triggerSaveBook: async () => {
            const { currentBook, documents, activeDocumentId } = get();
            if (!currentBook) return;
            const activeDoc = documents.find(d => d.id === activeDocumentId);
            if (!activeDoc) return;
            
            set({ saveStatus: 'saving' });
            try {
                if (activeDoc.type === 'cover') {
                    await bookService.saveCover(currentBook.id, {
                        frontElements: activeDoc.elements,
                        frontBackground: activeDoc.background,
                        backBackground: activeDoc.background,
                        frontThumbnail: activeDoc.thumbnail
                    });
                } else {
                    await bookService.savePage(activeDoc.id, {
                        elements: activeDoc.elements,
                        background: activeDoc.background,
                        thumbnail: activeDoc.thumbnail,
                        pageTitle: activeDoc.title
                    });
                }
                set({ saveStatus: 'saved' });
                triggerAsyncThumbnailUpdate(currentBook.id, true);
            } catch (e) {
                console.error('Failed to manually save book state', e);
                set({ saveStatus: 'error' });
            }
        },

        debouncedSave: () => {
            const { currentBook, documents, activeDocumentId } = get();
            if (!currentBook) return;
            const activeDoc = documents.find(d => d.id === activeDocumentId);
            if (!activeDoc) return;
            
            set({ saveStatus: 'saving' });
            debouncedSaveDocFn(
                activeDoc,
                currentBook.id,
                () => {
                    set({ saveStatus: 'saved' });
                    triggerAsyncThumbnailUpdate(currentBook.id);
                },
                () => set({ saveStatus: 'error' })
            );
        },

        flushSaveBook: () => {
            debouncedSaveDocFn.flush();
        },

        updateUploadJob: (id, name, progress, status = 'uploading') => {
            set((state) => ({
                uploadingJobs: {
                    ...state.uploadingJobs,
                    [id]: { name, progress, status }
                }
            }));
        },

        clearUploadJob: (id) => {
            set((state) => {
                const newJobs = { ...state.uploadingJobs };
                delete newJobs[id];
                return { uploadingJobs: newJobs };
            });
        }
    };
});

import React from 'react';

export const useConvertedPages = () => {
    const documents = useBookStore(state => state.documents);
    return React.useMemo(() => {
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
            photos: [] as Photo[]
        }));
    }, [documents]);
};
