import type { Book, Photo } from '../types';

export interface IBookService {
    /**
     * 获取所有书籍列表（摘要）
     */
    getBooks(): Promise<Book[]>;

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
}
