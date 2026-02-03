import { create } from 'zustand';
import type { Book, Chapter, Page } from '../types';
import type { IBookService } from '../services/IBookService';
import { LocalBookService } from '../services/LocalBookService';

// 实例化 Service (未来可在此处切换 CloudBookService)
const bookService: IBookService = new LocalBookService();

interface BookState {
    // Data
    currentBook: Book | null;
    isLoading: boolean;
    error: string | null;

    // Book Actions
    loadBook: (id: string) => Promise<void>;
    createBook: (title: string, author: string) => Promise<void>;
    updateBookSettings: (updates: Partial<Book>) => Promise<void>;

    // Chapter Actions
    addChapter: (title: string) => Promise<void>;
    updateChapter: (chapterId: string, updates: Partial<Chapter>) => Promise<void>;
    deleteChapter: (chapterId: string) => Promise<void>;
    reorderChapters: (newChapters: Chapter[]) => Promise<void>;

    // Page Actions (新增)
    addPageToChapter: (chapterId: string) => Promise<string>;  // 返回新页面ID
    updatePage: (chapterId: string, pageId: string, updates: Partial<Page>) => Promise<void>;
    deletePage: (chapterId: string, pageId: string) => Promise<void>;
    uploadPhotoToPage: (chapterId: string, pageId: string, file: File) => Promise<void>;
    deletePhotoFromPage: (chapterId: string, pageId: string, photoId: string) => Promise<void>;
    reorderPhotosInPage: (chapterId: string, pageId: string, newPhotoIds: string[]) => Promise<void>;
}

export const useBookStore = create<BookState>((set, get) => ({
    currentBook: null,
    isLoading: false,
    error: null,

    loadBook: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
            const book = await bookService.getBook(id);
            set({ currentBook: book, isLoading: false });
        } catch (e) {
            set({ isLoading: false, error: '加载作品失败' });
            console.error(e);
        }
    },

    createBook: async (title: string, author: string) => {
        set({ isLoading: true, error: null });
        try {
            const newBook: Book = {
                id: crypto.randomUUID(),
                title,
                author,
                createdAt: Date.now(),
                chapters: [],
                theme: 'classic',
                pageSize: 'A4'
            };
            await bookService.saveBook(newBook);
            set({ currentBook: newBook, isLoading: false });
        } catch (e) {
            set({ isLoading: false, error: '创建作品失败' });
            console.error(e);
        }
    },

    updateBookSettings: async (updates: Partial<Book>) => {
        const { currentBook } = get();
        if (!currentBook) return;

        const updatedBook = { ...currentBook, ...updates };
        set({ currentBook: updatedBook });
        await bookService.saveBook(updatedBook);
    },

    addChapter: async (title: string) => {
        const { currentBook } = get();
        if (!currentBook) return;

        // 创建章节时自动创建第一个页面
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

        const updatedBook = {
            ...currentBook,
            chapters: [...currentBook.chapters, newChapter]
        };

        set({ currentBook: updatedBook });
        await bookService.saveBook(updatedBook);
    },

    updateChapter: async (chapterId: string, updates: Partial<Chapter>) => {
        const { currentBook } = get();
        if (!currentBook) return;

        const updatedChapters = currentBook.chapters.map(c =>
            c.id === chapterId ? { ...c, ...updates } : c
        );

        const updatedBook = { ...currentBook, chapters: updatedChapters };
        set({ currentBook: updatedBook });

        try {
            await bookService.saveBook(updatedBook);
        } catch (e) {
            console.error('Failed to save chapter update', e);
        }
    },

    deleteChapter: async (chapterId: string) => {
        const { currentBook } = get();
        if (!currentBook) return;

        const updatedBook = {
            ...currentBook,
            chapters: currentBook.chapters.filter(c => c.id !== chapterId)
        };

        set({ currentBook: updatedBook });
        await bookService.saveBook(updatedBook);
    },

    reorderChapters: async (newChapters: Chapter[]) => {
        const { currentBook } = get();
        if (!currentBook) return;

        const updatedBook = { ...currentBook, chapters: newChapters };
        set({ currentBook: updatedBook });
        await bookService.saveBook(updatedBook);
    },

    // ============ Page Actions ============

    addPageToChapter: async (chapterId: string) => {
        const { currentBook } = get();
        if (!currentBook) return '';

        const newPage: Page = {
            id: crypto.randomUUID(),
            content: '',
            photos: [],
            layout: 'single'
        };

        const updatedChapters = currentBook.chapters.map(c => {
            if (c.id === chapterId) {
                return { ...c, pages: [...c.pages, newPage] };
            }
            return c;
        });

        const updatedBook = { ...currentBook, chapters: updatedChapters };
        set({ currentBook: updatedBook });
        await bookService.saveBook(updatedBook);

        return newPage.id;
    },

    updatePage: async (chapterId: string, pageId: string, updates: Partial<Page>) => {
        const { currentBook } = get();
        if (!currentBook) return;

        const updatedChapters = currentBook.chapters.map(c => {
            if (c.id === chapterId) {
                const updatedPages = c.pages.map(p =>
                    p.id === pageId ? { ...p, ...updates } : p
                );
                return { ...c, pages: updatedPages };
            }
            return c;
        });

        const updatedBook = { ...currentBook, chapters: updatedChapters };
        set({ currentBook: updatedBook });

        try {
            await bookService.saveBook(updatedBook);
        } catch (e) {
            console.error('Failed to save page update', e);
        }
    },

    deletePage: async (chapterId: string, pageId: string) => {
        const { currentBook } = get();
        if (!currentBook) return;

        const updatedChapters = currentBook.chapters.map(c => {
            if (c.id === chapterId) {
                // 至少保留一页
                if (c.pages.length <= 1) return c;
                return { ...c, pages: c.pages.filter(p => p.id !== pageId) };
            }
            return c;
        });

        const updatedBook = { ...currentBook, chapters: updatedChapters };
        set({ currentBook: updatedBook });
        await bookService.saveBook(updatedBook);
    },

    uploadPhotoToPage: async (chapterId: string, pageId: string, file: File) => {
        const { currentBook } = get();
        if (!currentBook) return;

        try {
            const photo = await bookService.uploadPhoto(file);

            const updatedChapters = currentBook.chapters.map(c => {
                if (c.id === chapterId) {
                    const updatedPages = c.pages.map(p => {
                        if (p.id === pageId) {
                            return { ...p, photos: [...p.photos, photo] };
                        }
                        return p;
                    });
                    return { ...c, pages: updatedPages };
                }
                return c;
            });

            const updatedBook = { ...currentBook, chapters: updatedChapters };
            set({ currentBook: updatedBook });
            await bookService.saveBook(updatedBook);
        } catch (e) {
            console.error('Failed to upload photo', e);
        }
    },

    deletePhotoFromPage: async (chapterId: string, pageId: string, photoId: string) => {
        const { currentBook } = get();
        if (!currentBook) return;

        const updatedChapters = currentBook.chapters.map(c => {
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

        const updatedBook = { ...currentBook, chapters: updatedChapters };
        set({ currentBook: updatedBook });
        await bookService.saveBook(updatedBook);
    },

    reorderPhotosInPage: async (chapterId: string, pageId: string, newPhotoIds: string[]) => {
        const { currentBook } = get();
        if (!currentBook) return;

        const updatedChapters = currentBook.chapters.map(c => {
            if (c.id === chapterId) {
                const updatedPages = c.pages.map(p => {
                    if (p.id === pageId) {
                        // 根据 newPhotoIds 顺序重排 photos 数组
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

        const updatedBook = { ...currentBook, chapters: updatedChapters };
        set({ currentBook: updatedBook });
        await bookService.saveBook(updatedBook);
    }
}));
