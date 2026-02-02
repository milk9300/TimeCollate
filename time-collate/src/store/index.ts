import { create } from 'zustand';
import type { Book, Chapter } from '../types';
import type { IBookService } from '../services/IBookService';
import { LocalBookService } from '../services/LocalBookService';

// 实例化 Service (未来可在此处切换 CloudBookService)
const bookService: IBookService = new LocalBookService();

interface BookState {
    // Data
    currentBook: Book | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    loadBook: (id: string) => Promise<void>;
    createBook: (title: string, author: string) => Promise<void>;
    updateChapter: (chapterId: string, updates: Partial<Chapter>) => Promise<void>;
    addChapter: (title: string) => Promise<void>;
    deleteChapter: (chapterId: string) => Promise<void>;
    reorderChapters: (newChapters: Chapter[]) => Promise<void>;
    uploadPhotoToChapter: (chapterId: string, file: File) => Promise<void>;
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
            set({ isLoading: false, error: 'Failed to load book' });
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
                createdArt: Date.now(),
                chapters: [],
                theme: 'classic'
            };
            await bookService.saveBook(newBook);
            set({ currentBook: newBook, isLoading: false });
        } catch (e) {
            set({ isLoading: false, error: 'Failed to create book' });
            console.error(e);
        }
    },

    updateChapter: async (chapterId: string, updates: Partial<Chapter>) => {
        const { currentBook } = get();
        if (!currentBook) return;

        const updatedChapters = currentBook.chapters.map(c =>
            c.id === chapterId ? { ...c, ...updates } : c
        );

        const updatedBook = { ...currentBook, chapters: updatedChapters };

        // Optimistic update
        set({ currentBook: updatedBook });

        // Sync to service
        try {
            await bookService.saveBook(updatedBook);
        } catch (e) {
            // Revert on failure (omitted for brevity in MVP, but good practice)
            console.error('Failed to save chapter update', e);
        }
    },

    addChapter: async (title: string) => {
        const { currentBook } = get();
        if (!currentBook) return;

        const newChapter: Chapter = {
            id: crypto.randomUUID(),
            title,
            content: '',
            date: new Date().toISOString().split('T')[0],
            photos: [],
            layout: 'single'
        };

        const updatedBook = {
            ...currentBook,
            chapters: [...currentBook.chapters, newChapter]
        };

        set({ currentBook: updatedBook });
        await bookService.saveBook(updatedBook);
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

    uploadPhotoToChapter: async (chapterId: string, file: File) => {
        const { currentBook } = get();
        if (!currentBook) return;

        try {
            const photo = await bookService.uploadPhoto(file);

            const updatedChapters = currentBook.chapters.map(c => {
                if (c.id === chapterId) {
                    return { ...c, photos: [...c.photos, photo] };
                }
                return c;
            });

            const updatedBook = { ...currentBook, chapters: updatedChapters };
            set({ currentBook: updatedBook });
            await bookService.saveBook(updatedBook);
        } catch (e) {
            console.error('Failed to upload photo', e);
        }
    }
}));
