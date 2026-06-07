import type { IBookService } from './IBookService';
import type { Book, Photo, PaginatedResponse } from '../types';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

/**
 * 云端书籍服务实现
 * 通过 Axios 与后端交互
 */
export class CloudBookService implements IBookService {
    private api;

    constructor(baseUrl: string = '/api') {
        this.api = axios.create({
            baseURL: baseUrl,
        });

        // 核心：绑定拦截器以自动注入 Token
        this.api.interceptors.request.use((config) => {
            const token = useAuthStore.getState().token;
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
    }

    async getBooks(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Book>> {
        const response = await this.api.get('/books', {
            params: { page, pageSize }
        });
        return response.data.data;
    }

    async getPublicBooks(page: number = 1, pageSize: number = 20, category?: string): Promise<PaginatedResponse<Book>> {
        const response = await this.api.get('/books/public', {
            params: { page, pageSize, category }
        });
        return response.data.data;
    }

    async getRankings(): Promise<{ hotBooks: any[]; activeCreators: any[] }> {
        const response = await this.api.get('/books/rankings');
        return response.data.data;
    }

    async getBook(id: string): Promise<Book | null> {
        try {
            const response = await this.api.get(`/books/${id}`);
            return response.data.data;
        } catch (error: any) {
            if (error.response?.status === 404) return null;
            throw error;
        }
    }

    async saveBook(book: Book): Promise<Book> {
        // 后端逻辑已统一为 POST /books (upsert)
        const response = await this.api.post('/books', book);
        return response.data.data;
    }

    async deleteBook(id: string): Promise<void> {
        await this.api.delete(`/books/${id}`);
    }

    async uploadPhoto(file: File): Promise<Photo> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await this.api.post('/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data;
    }

    async getDeletedBooks(): Promise<(Book & { deletedAt: number; daysRemaining: number })[]> {
        const response = await this.api.get('/books/trash/list');
        return response.data.data || [];
    }

    async restoreBook(id: string): Promise<void> {
        await this.api.post(`/books/${id}/restore`);
    }

    async permanentDeleteBook(id: string): Promise<void> {
        await this.api.delete(`/books/${id}/permanent`);
    }

    async exportBook(id: string, type: 'pdf' | 'markdown'): Promise<void> {
        const response = await this.api.post(`/export/${id}?type=${type}`, {}, {
            responseType: 'blob'
        });

        const blob = response.data;
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;

        const contentDisposition = response.headers['content-disposition'];
        let filename = `book-export.${type === 'markdown' ? 'zip' : 'pdf'}`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
    }

    async updateStatus(id: string, status: 'private' | 'pending' | 'published' | 'rejected'): Promise<void> {
        await this.api.patch(`/books/${id}/status`, { status });
    }

    async getFavoritedBooks(userId?: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Book>> {
        const response = await this.api.get('/interactions/favorites', {
            params: { userId, page, pageSize }
        });
        return response.data.data;
    }
}

export const cloudBookService = new CloudBookService(import.meta.env.VITE_API_BASE_URL || '/api');
