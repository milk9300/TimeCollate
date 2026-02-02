import type { IBookService } from './IBookService';
import type { Book, Photo } from '../types';

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

    async getBooks(): Promise<Book[]> {
        await this.delay();
        return this.loadFromStorage();
    }

    async getBook(id: string): Promise<Book | null> {
        await this.delay();
        const books = this.loadFromStorage();
        return books.find(b => b.id === id) || null;
    }

    async saveBook(book: Book): Promise<Book> {
        await this.delay();
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

    async uploadPhoto(file: File): Promise<Photo> {
        await this.delay();
        // 本地模式：使用 URL.createObjectURL 模拟上传
        const url = URL.createObjectURL(file);
        return {
            id: crypto.randomUUID(),
            url,
            caption: '',
            file, // 暂存 File 对象，虽然 LocalStorage 存不下，但在内存中有效
        };
    }
}
