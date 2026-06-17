import type { IBookService } from './IBookService';
import type { Book, Photo, PaginatedResponse } from '../types';

const STORAGE_KEY = 'timecollate_books';
const SIMULATED_DELAY = 300; // ms

export class LocalBookService implements IBookService {

    private async delay() {
        return new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
    }

    private loadFromStorage(): Book[] {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse books from localStorage', e);
            return [];
        }
    }

    private saveToStorage(books: Book[]) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    }

    async getBooks(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Book>> {
        await this.delay();
        const allBooks = this.loadFromStorage();
        const total = allBooks.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const items = allBooks.slice(startIndex, startIndex + pageSize);

        return {
            items,
            total,
            page,
            pageSize,
            totalPages
        };
    }

    async getPublicBooks(page: number = 1, pageSize: number = 20, category?: string): Promise<PaginatedResponse<Book>> {
        await this.delay();
        let allBooks = this.loadFromStorage().filter(b => b.isPublic);
        if (category && category !== 'all') {
            allBooks = allBooks.filter(b => b.category === category);
        }
        const total = allBooks.length;
        const totalPages = Math.ceil(total / pageSize);
        const startIndex = (page - 1) * pageSize;
        const items = allBooks.slice(startIndex, startIndex + pageSize);

        return {
            items,
            total,
            page,
            pageSize,
            totalPages
        };
    }

    async getRankings(): Promise<{ hotBooks: any[]; activeCreators: any[] }> {
        await this.delay();
        return {
            hotBooks: [
                { id: 'mock-b1', title: '毕业，是青涩的终点 🎓', author: '拾光小助手', coverUrl: '', theme: 'magazine', views: 560, likes: 120 },
                { id: 'mock-b2', title: '西藏骑行记 🚴‍♂️', author: '旅行家老张', coverUrl: '', theme: 'modern', views: 420, likes: 98 },
                { id: 'mock-b3', title: '可乐的成长日记 🐶', author: '可乐粑粑', coverUrl: '', theme: 'warm', views: 350, likes: 85 },
                { id: 'mock-b4', title: '恋爱两周年纪念 👩‍❤️‍👨', author: '心动收集器', coverUrl: '', theme: 'classic', views: 280, likes: 72 },
                { id: 'mock-b5', title: '夏日海滨慢生活 🏖️', author: '慵懒的树懒', coverUrl: '', theme: 'modern', views: 210, likes: 60 }
            ],
            activeCreators: [
                { id: 'mock-u1', nickname: 'Milk', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80', bookCount: 8, totalViews: 2450, totalLikes: 820 },
                { id: 'mock-u2', nickname: '旅行足迹家', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80', bookCount: 5, totalViews: 1890, totalLikes: 610 },
                { id: 'mock-u3', nickname: '拾光小甜心', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80', bookCount: 4, totalViews: 1200, totalLikes: 430 },
                { id: 'mock-u4', nickname: '萌宠记录官', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80', bookCount: 3, totalViews: 950, totalLikes: 310 },
                { id: 'mock-u5', nickname: '岁月神偷', avatarUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=150&h=150&q=80', bookCount: 2, totalViews: 710, totalLikes: 250 }
            ]
        };
    }

    async getBook(id: string): Promise<Book | null> {
        await this.delay();
        const books = this.loadFromStorage();
        return books.find(b => b.id === id) || null;
    }

    async saveBook(book: Book): Promise<Book> {
        await this.delay();
        if (!book.userId) book.userId = 'local-user';
        const books = this.loadFromStorage();
        const index = books.findIndex(b => b.id === book.id);

        if (index >= 0) {
            books[index] = book;
        } else {
            books.push(book);
        }

        this.saveToStorage(books);
        return book;
    }

    async deleteBook(id: string): Promise<void> {
        await this.delay();
        let books = this.loadFromStorage();
        books = books.filter(b => b.id !== id);
        this.saveToStorage(books);
    }

    async uploadPhoto(file: File, onProgress?: (percent: number) => void): Promise<Photo> {
        // 本地模式：通过定时器模拟上传进度的逐步推进
        if (onProgress) {
            onProgress(10);
            await new Promise(r => setTimeout(r, 100));
            onProgress(40);
            await new Promise(r => setTimeout(r, 100));
            onProgress(80);
            await new Promise(r => setTimeout(r, 100));
            onProgress(100);
        }

        await this.delay();
        const url = URL.createObjectURL(file);
        
        // 前端本地提取宽高作为 fallback 保障
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => {
                resolve({ width: 800, height: 600 });
            };
            img.src = url;
        });

        return {
            id: `local-photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url,
            caption: file.name,
            width: dimensions.width,
            height: dimensions.height
        };
    }

    async getDeletedBooks(): Promise<(Book & { deletedAt: number; daysRemaining: number })[]> {
        return [];
    }

    async restoreBook(): Promise<void> {
        // Local mode doesn't support trash yet
    }

    async permanentDeleteBook(): Promise<void> {
        // Local mode doesn't support trash yet
    }

    async exportBook(_id: string, _type: 'pdf' | 'markdown'): Promise<void> {
        console.warn('Backend export is only available in cloud mode.');
        alert('本地预览模式不支持后端 PDF/Markdown 导出。请切换至云端模式以使用此功能。');
    }

    async updateStatus(id: string, status: 'private' | 'pending' | 'published' | 'rejected'): Promise<void> {
        await this.delay();
        const books = this.loadFromStorage();
        const index = books.findIndex(b => b.id === id);
        if (index >= 0) {
            books[index].status = status;
            books[index].isPublic = status === 'published';
            this.saveToStorage(books);
        }
    }

    async getFavoritedBooks(userId?: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Book>> {
        await this.delay();
        return {
            items: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0
        };
    }
}
