import type { IBookService } from './IBookService';
import type { Book, BookCover, Page, Photo, PaginatedResponse } from '../types';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

/**
 * 云端书籍服务实现
 * 通过 Axios 与后端交互
 */
export class CloudBookService implements IBookService {
    private api = axios;

    constructor(_baseUrl?: string) {
        // 统一使用全局共享的 axios 实例，避免重复创建实例导致 401 续签重试机制失效
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

    async getBook(id: string): Promise<{ book: Book; cover: BookCover | null; pages: Page[] } | null> {
        try {
            const response = await this.api.get(`/books/${id}`);
            return response.data.data;
        } catch (error: any) {
            if (error.response?.status === 404) return null;
            throw error;
        }
    }

    async saveCover(bookId: string, cover: Partial<BookCover>): Promise<BookCover> {
        const response = await this.api.patch(`/books/${bookId}/cover`, cover);
        return response.data.data;
    }

    async savePage(pageId: string, page: Partial<Page>): Promise<Page> {
        const response = await this.api.patch(`/books/pages/${pageId}`, page);
        return response.data.data;
    }

    async addPage(bookId: string, page: Partial<Page>): Promise<{ id: string }> {
        const response = await this.api.post(`/books/${bookId}/pages`, page);
        return response.data.data;
    }

    async deletePage(pageId: string): Promise<void> {
        await this.api.delete(`/books/pages/${pageId}`);
    }

    async saveBook(book: Book): Promise<Book> {
        // 后端逻辑已统一为 POST /books (upsert)
        const response = await this.api.post('/books', book);
        return response.data.data;
    }

    async deleteBook(id: string): Promise<void> {
        await this.api.delete(`/books/${id}`);
    }

    async uploadPhoto(file: File, onProgress?: (percent: number) => void): Promise<Photo> {
        // 1. 请求后端的预签名直传凭证
        const res = await this.api.get('/upload/presigned', {
            params: {
                fileName: file.name,
                contentType: file.type
            }
        });
        const { uploadUrl, ossKey, url } = res.data.data;

        // 2. 利用纯净的 axios 实例直传 OSS，避免后端拦截器携带 Authorization 破坏签名
        await axios.put(uploadUrl, file, {
            headers: {
                'Content-Type': file.type
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total && onProgress) {
                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percent);
                }
            }
        });

        // 3. 本地构建 Image 获取宽高物理尺寸
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
            const tempUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(tempUrl);
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = () => {
                URL.revokeObjectURL(tempUrl);
                resolve({ width: 800, height: 600 }); // fallback 默认尺寸
            };
            img.src = tempUrl;
        });

        return {
            id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            url, // 预签名读取的 URL（含CDN解析）
            ossKey,
            caption: '',
            width: dimensions.width,
            height: dimensions.height
        };
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

    async getBookTemplates(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Book>> {
        const response = await this.api.get('/books/templates', {
            params: { page, pageSize }
        });
        return response.data.data;
    }

    async getMarketBookTemplates(page: number = 1, pageSize: number = 20, category?: string): Promise<PaginatedResponse<Book>> {
        const response = await this.api.get('/books/templates/market', {
            params: { page, pageSize, category }
        });
        return response.data.data;
    }

    async publishTemplate(bookId: string, title: string): Promise<string> {
        const response = await this.api.post(`/books/${bookId}/publish-template`, { title });
        return response.data.data.templateId;
    }

    async applyTemplate(templateId: string, title: string): Promise<string> {
        const response = await this.api.post(`/books/templates/${templateId}/apply`, { title });
        return response.data.data.bookId;
    }

    async updateThumbnail(id: string, coverUrl: string, coverOssKey: string): Promise<void> {
        await this.api.patch(`/books/${id}/thumbnail`, { coverUrl, coverOssKey });
    }

    async publishPageTemplate(
        pageId: string,
        name: string,
        templateType: string,
        category: string,
        tags: string[],
        thumbnailUrl: string,
        coverUrl: string,
        visibility: string
    ): Promise<any> {
        const response = await this.api.post('/templates/publish-page', {
            pageId,
            name,
            templateType,
            category,
            tags,
            thumbnailUrl,
            coverUrl,
            visibility
        });
        return response.data.data;
    }

    async getTemplateOrigin(templateId: string): Promise<{ bookId: string; pageId: string } | null> {
        const response = await this.api.get(`/templates/${templateId}/origin`);
        return response.data.data;
    }

    async usePageTemplate(templateId: string): Promise<void> {
        await this.api.post(`/templates/${templateId}/use`);
    }

    async getTemplateCollections(my?: boolean): Promise<any[]> {
        const response = await this.api.get('/template-collections', {
            params: { my }
        });
        return response.data.data || [];
    }

    async getMarketTemplateCollections(): Promise<any[]> {
        const response = await this.api.get('/template-collections/market');
        return response.data.data || [];
    }

    async getTemplateCollection(id: string): Promise<any> {
        const response = await this.api.get(`/template-collections/${id}`);
        return response.data.data;
    }

    async saveTemplateCollection(collection: any): Promise<any> {
        const response = await this.api.post('/template-collections', collection);
        return response.data.data;
    }

    async deleteTemplateCollection(id: string): Promise<void> {
        await this.api.delete(`/template-collections/${id}`);
    }

    async applyTemplateCollection(collectionId: string, bookId: string, afterPageId: string | null): Promise<string[]> {
        const response = await this.api.post(`/template-collections/${collectionId}/apply`, {
            bookId,
            afterPageId
        });
        return response.data.data.pageIds;
    }
}

export const cloudBookService = new CloudBookService(import.meta.env.VITE_API_BASE_URL || '/api');
