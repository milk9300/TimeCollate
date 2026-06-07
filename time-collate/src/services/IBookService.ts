import type { Book, Photo, PaginatedResponse } from '../types';

export interface IBookService {
    /**
     * 获取所有书籍列表（摘要）
     */
    getBooks(page?: number, pageSize?: number): Promise<PaginatedResponse<Book>>;

    /**
     * 获取公开广场书籍列表
     */
    getPublicBooks(page?: number, pageSize?: number, category?: string): Promise<PaginatedResponse<Book>>;

    /**
     * 获取广场排行榜数据
     */
    getRankings(): Promise<{ hotBooks: any[]; activeCreators: any[] }>;

    /**
     * 获取单本书籍详情
     */
    getBook(id: string): Promise<Book | null>;

    /**
     * 保存书籍（新建或更新）
     */
    saveBook(book: Book): Promise<Book>;

    /**
     * 删除书籍
     */
    deleteBook(id: string): Promise<void>;

    /**
     * 上传图片
     * 在本地模式下，这可能只是返回一个本地 blob URL
     */
    uploadPhoto(file: File): Promise<Photo>;

    /**
     * 获取回收站中的书籍列表
     */
    getDeletedBooks(): Promise<(Book & { deletedAt: number; daysRemaining: number })[]>;

    /**
     * 恢复已删除的书籍
     */
    restoreBook(id: string): Promise<void>;

    /**
     * 永久删除书籍
     */
    permanentDeleteBook(id: string): Promise<void>;

    /**
     * 更新书籍状态（申请发布、撤回等）
     */
    updateStatus(id: string, status: 'private' | 'pending' | 'published' | 'rejected'): Promise<void>;

    /**
     * 导出书籍
     * @param id 书籍ID
     * @param type 导出类型
     */
    exportBook(id: string, type: 'pdf' | 'markdown'): Promise<void>;

    /**
     * 获取用户收藏的书籍列表
     */
    getFavoritedBooks(userId?: string, page?: number, pageSize?: number): Promise<PaginatedResponse<Book>>;
}
