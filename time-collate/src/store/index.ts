import { create } from 'zustand';
import type { Book, Chapter, Page, Photo, Template, BookTheme } from '../types';
import { getBookService } from '../services/serviceFactory';
import { useAuthStore } from './useAuthStore';
import { DEFAULT_TEMPLATES } from '../rendering/defaultTemplates';
import axios from 'axios';

// 获取 Service 单例（内部根据环境变量切换 Local/Cloud）
const bookService = getBookService();

interface BookState {
    // Data
    currentBook: Book | null;
    isLoading: boolean;
    error: string | null;
    editorMode: 'select' | 'hand'; // 编辑器操作模式
    historyPast: Book[];          // 历史状态栈（过去）
    historyFuture: Book[];        // 历史状态栈（未来）
    activePhotoEdit: { chapterId: string, pageId: string, photoId: string } | null; // 当前正在被编辑微调的图片
    activeTextEdit: { chapterId: string, pageId: string, slotId: string } | null; // 当前正在被编辑微调的文本槽位
    templates: Template[];        // 动态加载的排版模板库
    themes: BookTheme[];          // 动态加载的主题库

    // Mode Actions
    setEditorMode: (mode: 'select' | 'hand') => void;
    setActivePhotoEdit: (edit: { chapterId: string, pageId: string, photoId: string } | null) => void;
    setActiveTextEdit: (edit: { chapterId: string, pageId: string, slotId: string } | null) => void;
    loadTemplates: () => Promise<void>; // 加载动态排版模板列表
    loadThemes: () => Promise<void>;    // 加载动态主题列表

    // History Actions
    undo: () => Promise<void>;
    redo: () => Promise<void>;

    // Book Actions
    loadBook: (id: string) => Promise<void>;
    createBook: (title: string, author: string) => Promise<void>;
    updateBookSettings: (updates: Partial<Book>) => Promise<void>;

    // Chapter Actions
    addChapter: (title: string) => Promise<void>;
    updateChapter: (chapterId: string, updates: Partial<Chapter>) => Promise<void>;
    deleteChapter: (chapterId: string) => Promise<void>;
    reorderChapters: (newChapters: Chapter[]) => Promise<void>;
    reorderPages: (chapterId: string, newPages: Page[]) => Promise<void>;

    // Page Actions (新增)
    addPageToChapter: (chapterId: string) => Promise<string>;  // 返回新页面ID
    updatePage: (chapterId: string, pageId: string, updates: Partial<Page>) => Promise<void>;
    deletePage: (chapterId: string, pageId: string) => Promise<void>;
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
}

// #region Helper functions for Virtual Chapters mapping
export function getVirtualChapters(pages: Page[]): Chapter[] {
    const chapters: Chapter[] = [];
    if (!pages || pages.length === 0) return chapters;

    let currentChapter: Chapter | null = null;

    for (const page of pages) {
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

export function flattenChapters(chapters: Chapter[], bookId: string): Page[] {
    const pages: Page[] = [];
    let sortOrder = 0;
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

export const useBookStore = create<BookState>((set, get) => {
    // 内部帮助函数：深拷贝并推送当前状态到撤销栈，保存新状态
    const saveStateAndHistory = async (updatedBook: Book, skipHistoryPush: boolean = false) => {
        const { currentBook, historyPast } = get();
        
        let newPast = historyPast;
        if (!skipHistoryPush && currentBook) {
            newPast = [...historyPast.slice(-49), JSON.parse(JSON.stringify(currentBook))];
        }

        set({
            currentBook: updatedBook,
            historyPast: newPast,
            historyFuture: [] // 产生新改变时清空 redo 栈
        });

        try {
            await bookService.saveBook(updatedBook);
        } catch (e) {
            console.error('Failed to save book state', e);
        }
    };

    return {
        currentBook: null,
        isLoading: false,
        error: null,
        editorMode: 'select',
        historyPast: [],
        historyFuture: [],
        activePhotoEdit: null,
        activeTextEdit: null,
        templates: DEFAULT_TEMPLATES,
        themes: [],

        setEditorMode: (mode) => {
            set({ editorMode: mode });
        },

        setActivePhotoEdit: (edit) => {
            set({ activePhotoEdit: edit });
            if (edit) {
                set({ activeTextEdit: null });
            }
        },

        setActiveTextEdit: (edit) => {
            set({ activeTextEdit: edit });
            if (edit) {
                set({ activePhotoEdit: null });
            }
        },

        loadTemplates: async () => {
            try {
                const response = await axios.get('/templates');
                if (response.data && response.data.success) {
                    const backendTemplates = response.data.data as Template[];
                    const mergedTemplates = [...DEFAULT_TEMPLATES];
                    backendTemplates.forEach(bt => {
                        const idx = mergedTemplates.findIndex(t => t.id === bt.id);
                        if (idx >= 0) {
                            mergedTemplates[idx] = bt;
                        } else {
                            mergedTemplates.push(bt);
                        }
                    });
                    set({ templates: mergedTemplates });
                }
            } catch (e) {
                console.error('Failed to load templates, using local default templates fallback', e);
                set({ templates: DEFAULT_TEMPLATES });
            }
        },

        loadThemes: async () => {
            try {
                const response = await axios.get('/themes');
                if (response.data && response.data.success) {
                    set({ themes: response.data.data });
                }
            } catch (e) {
                console.error('Failed to load themes', e);
            }
        },

        undo: async () => {
            const { historyPast, historyFuture, currentBook } = get();
            if (historyPast.length === 0 || !currentBook) return;

            const previousBook = historyPast[historyPast.length - 1];
            const newPast = historyPast.slice(0, historyPast.length - 1);
            const newFuture = [JSON.parse(JSON.stringify(currentBook)), ...historyFuture];

            set({
                currentBook: previousBook,
                historyPast: newPast,
                historyFuture: newFuture
            });

            try {
                await bookService.saveBook(previousBook);
            } catch (e) {
                console.error('Failed to save book during undo', e);
            }
        },

        redo: async () => {
            const { historyPast, historyFuture, currentBook } = get();
            if (historyFuture.length === 0 || !currentBook) return;

            const nextBook = historyFuture[0];
            const newFuture = historyFuture.slice(1);
            const newPast = [...historyPast, JSON.parse(JSON.stringify(currentBook))];

            set({
                currentBook: nextBook,
                historyPast: newPast,
                historyFuture: newFuture
            });

            try {
                await bookService.saveBook(nextBook);
            } catch (e) {
                console.error('Failed to save book during redo', e);
            }
        },

        loadBook: async (id: string) => {
            set({ isLoading: true, error: null });
            try {
                const book = await bookService.getBook(id);
                set({ currentBook: book, isLoading: false, historyPast: [], historyFuture: [] });
                // 异步预载模板和主题
                get().loadTemplates();
                get().loadThemes();
            } catch (e) {
                set({ isLoading: false, error: '加载作品失败' });
                console.error(e);
            }
        },

        createBook: async (title: string, author: string) => {
            set({ isLoading: true, error: null });
            try {
                // 先尝试获取已有书籍
                const response = await bookService.getBooks(1, 1);
                if (response.items.length > 0) {
                    const fullBook = await bookService.getBook(response.items[0].id);
                    if (fullBook) {
                        set({ currentBook: fullBook, isLoading: false, historyPast: [], historyFuture: [] });
                        // 异步预载模板和主题
                        get().loadTemplates();
                        get().loadThemes();
                        return;
                    }
                }

                const newBook: Book = {
                    id: crypto.randomUUID(),
                    userId: useAuthStore.getState().user?.id || '',
                    title,
                    author,
                    createdAt: Date.now(),
                    pages: [],
                    theme: 'classic',
                    pageSize: 'A4',
                    showPreface: true
                };
                await bookService.saveBook(newBook);
                set({ currentBook: newBook, isLoading: false, historyPast: [], historyFuture: [] });
                // 异步预载模板和主题
                get().loadTemplates();
                get().loadThemes();
            } catch (e) {
                set({ isLoading: false, error: '创建作品失败' });
                console.error(e);
            }
        },

        updateBookSettings: async (updates: Partial<Book>) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const updatedBook = { ...currentBook, ...updates };
            await saveStateAndHistory(updatedBook);
        },

        addChapter: async (title: string) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);

            const firstPage: Page = {
                id: crypto.randomUUID(),
                content: '',
                photos: [],
                layout: 'single'
            };

            const newChapter: Chapter = {
                id: crypto.randomUUID(),
                title,
                date: new Date().toISOString().split('T')[0],
                pages: [firstPage]
            };

            const updatedChapters = [...chapters, newChapter];
            const updatedBook = {
                ...currentBook,
                pages: flattenChapters(updatedChapters, currentBook.id)
            };

            await saveStateAndHistory(updatedBook);
        },

        updateChapter: async (chapterId: string, updates: Partial<Chapter>) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.map(c =>
                c.id === chapterId ? { ...c, ...updates } : c
            );

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
        },

        deleteChapter: async (chapterId: string) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.filter(c => c.id !== chapterId);

            const updatedBook = {
                ...currentBook,
                pages: flattenChapters(updatedChapters, currentBook.id)
            };

            await saveStateAndHistory(updatedBook);
        },

        reorderChapters: async (newChapters: Chapter[]) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const updatedBook = { ...currentBook, pages: flattenChapters(newChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
        },

        reorderPages: async (chapterId: string, newPages: Page[]) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.map(c =>
                c.id === chapterId ? { ...c, pages: newPages } : c
            );

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
        },

        addPageToChapter: async (chapterId: string) => {
            const { currentBook } = get();
            if (!currentBook) return '';

            const newPage: Page = {
                id: crypto.randomUUID(),
                content: '',
                photos: [],
                layout: 'single'
            };

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.map(c => {
                if (c.id === chapterId) {
                    return { ...c, pages: [...c.pages, newPage] };
                }
                return c;
            });

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);

            return newPage.id;
        },

        updatePage: async (chapterId: string, pageId: string, updates: Partial<Page>) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.map(c => {
                if (c.id === chapterId) {
                    const updatedPages = c.pages.map(p =>
                        p.id === pageId ? { ...p, ...updates } : p
                    );
                    return { ...c, pages: updatedPages };
                }
                return c;
            });

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
        },

        deletePage: async (chapterId: string, pageId: string) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.map(c => {
                if (c.id === chapterId) {
                    if (c.pages.length <= 1) return c;
                    return { ...c, pages: c.pages.filter(p => p.id !== pageId) };
                }
                return c;
            });

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
        },

        uploadPhotoToPage: async (chapterId: string, pageId: string, file: File, slotIndex?: number) => {
            const { currentBook } = get();
            if (!currentBook) return;

            try {
                const uploadedPhoto = await bookService.uploadPhoto(file);
                const photo = { ...uploadedPhoto, slotIndex };

                const chapters = getVirtualChapters(currentBook.pages);
                const updatedChapters = chapters.map(c => {
                    if (c.id === chapterId) {
                        const updatedPages = c.pages.map(p => {
                            if (p.id === pageId) {
                                let updatedPhotos = p.photos;
                                if (slotIndex !== undefined) {
                                    updatedPhotos = p.photos.map(ph =>
                                        ph.slotIndex === slotIndex ? { ...ph, slotIndex: undefined } : ph
                                    );
                                }
                                return { ...p, photos: [...updatedPhotos, photo] };
                            }
                            return p;
                        });
                        return { ...c, pages: updatedPages };
                    }
                    return c;
                });

                const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
                await saveStateAndHistory(updatedBook);
            } catch (e) {
                console.error('Failed to upload photo', e);
            }
        },

        addMockPhotoToPage: async (chapterId: string, pageId: string, url: string, caption: string, slotIndex?: number) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const photo = {
                id: crypto.randomUUID(),
                url,
                caption,
                slotIndex
            };

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.map(c => {
                if (c.id === chapterId) {
                    const updatedPages = c.pages.map(p => {
                        if (p.id === pageId) {
                            let updatedPhotos = p.photos;
                            if (slotIndex !== undefined) {
                                updatedPhotos = p.photos.map(ph =>
                                    ph.slotIndex === slotIndex ? { ...ph, slotIndex: undefined } : ph
                                );
                            }
                            return { ...p, photos: [...updatedPhotos, photo] };
                        }
                        return p;
                    });
                    return { ...c, pages: updatedPages };
                }
                return c;
            });

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
        },

        deletePhotoFromPage: async (chapterId: string, pageId: string, photoId: string) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.map(c => {
                if (c.id === chapterId) {
                    const updatedPages = c.pages.map(p => {
                        if (p.id === pageId) {
                            return { ...p, photos: p.photos.filter(photo => photo.id !== photoId) };
                        }
                        return p;
                    });
                    return { ...c, pages: updatedPages };
                }
                return c;
            });

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
        },

        reorderPhotosInPage: async (chapterId: string, pageId: string, newPhotoIds: string[]) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.map(c => {
                if (c.id === chapterId) {
                    const updatedPages = c.pages.map(p => {
                        if (p.id === pageId) {
                            const photoMap = new Map(p.photos.map(photo => [photo.id, photo]));
                            const reorderedPhotos = newPhotoIds
                                .map(id => photoMap.get(id))
                                .filter(Boolean) as typeof p.photos;
                            return { ...p, photos: reorderedPhotos };
                        }
                        return p;
                    });
                    return { ...c, pages: updatedPages };
                }
                return c;
            });

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
        },

        updatePhotoSettings: async (chapterId: string, pageId: string, photoId: string, updates: Partial<Photo>) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.map(c => {
                if (c.id === chapterId) {
                    const updatedPages = c.pages.map(p => {
                        if (p.id === pageId) {
                            const updatedPhotos = p.photos.map(photo =>
                                photo.id === photoId ? { ...photo, ...updates } : photo
                            );
                            return { ...p, photos: updatedPhotos };
                        }
                        return p;
                    });
                    return { ...c, pages: updatedPages };
                }
                return c;
            });

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
        },

        assignPhotoToSlot: async (
            chapterId: string,
            pageId: string,
            photoId: string,
            targetSlotIndex: number,
            sourceSlotIndex?: number
        ) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.map(c => {
                if (c.id === chapterId) {
                    const updatedPages = c.pages.map(p => {
                        if (p.id === pageId) {
                            const updatedPhotos = p.photos.map(photo => {
                                if (photo.id === photoId) {
                                    return { ...photo, slotIndex: targetSlotIndex };
                                }
                                if (photo.slotIndex === targetSlotIndex) {
                                    return { ...photo, slotIndex: sourceSlotIndex };
                                }
                                return photo;
                            });
                            return { ...p, photos: updatedPhotos };
                        }
                        return p;
                    });
                    return { ...c, pages: updatedPages };
                }
                return c;
            });

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
        },

        clearPhotoSlot: async (chapterId: string, pageId: string, photoId: string) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);
            const updatedChapters = chapters.map(c => {
                if (c.id === chapterId) {
                    const updatedPages = c.pages.map(p => {
                        if (p.id === pageId) {
                            const updatedPhotos = p.photos.map(photo =>
                                photo.id === photoId ? { ...photo, slotIndex: undefined } : photo
                            );
                            return { ...p, photos: updatedPhotos };
                        }
                        return p;
                    });
                    return { ...c, pages: updatedPages };
                }
                return c;
            });

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
        },

        movePhotoBetweenPages: async (
            sourceChapterId: string,
            sourcePageId: string,
            targetChapterId: string,
            targetPageId: string,
            photoId: string,
            targetSlotIndex: number
        ) => {
            const { currentBook } = get();
            if (!currentBook) return;

            const chapters = getVirtualChapters(currentBook.pages);
            const sourceChapter = chapters.find(c => c.id === sourceChapterId);
            const sourcePage = sourceChapter?.pages.find(p => p.id === sourcePageId);
            const photoToMove = sourcePage?.photos.find(p => p.id === photoId);

            if (!photoToMove) return;

            const updatedPhotoToMove = { ...photoToMove, slotIndex: targetSlotIndex };

            const updatedChapters = chapters.map(c => {
                let newPages = c.pages;

                if (c.id === sourceChapterId) {
                    newPages = newPages.map(p => {
                        if (p.id === sourcePageId) {
                            return { ...p, photos: p.photos.filter(photo => photo.id !== photoId) };
                        }
                        return p;
                    });
                }

                if (c.id === targetChapterId) {
                    newPages = newPages.map(p => {
                        if (p.id === targetPageId) {
                            const cleanedPhotos = p.photos.map(ph =>
                                ph.slotIndex === targetSlotIndex ? { ...ph, slotIndex: undefined } : ph
                            );
                            return { ...p, photos: [...cleanedPhotos, updatedPhotoToMove] };
                        }
                        return p;
                    });
                }

                return { ...c, pages: newPages };
            });

            const updatedBook = { ...currentBook, pages: flattenChapters(updatedChapters, currentBook.id) };
            await saveStateAndHistory(updatedBook);
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
        }
    };
});
