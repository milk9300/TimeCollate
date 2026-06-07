import { pool } from '../db/index.js';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';
import type { RowDataPacket } from 'mysql2';
import { bookService } from './BookService.js';
import { config } from '../config/index.js';

export class ShareService {
    /**
     * 为书籍生成分享链接
     * 如果已存在分享链接，则直接返回
     */
    async createShare(bookId: string): Promise<string> {
        // 1. 检查是否已存在
        const [existing] = await pool.query<RowDataPacket[]>(
            'SELECT slug FROM shared_links WHERE book_id = ?',
            [bookId]
        );

        if (existing.length > 0) {
            return `${config.shareBaseUrl}/s/${existing[0].slug}`;
        }

        // 2. 生成新短码
        const slug = nanoid(8);
        const id = uuidv4();

        await pool.query(
            'INSERT INTO shared_links (id, book_id, slug) VALUES (?, ?, ?)',
            [id, bookId, slug]
        );

        return `${config.shareBaseUrl}/s/${slug}`;
    }

    /**
     * 根据短码获取书籍数据
     */
    async getBookBySlug(slug: string) {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT book_id FROM shared_links WHERE slug = ?',
            [slug]
        );

        if (rows.length === 0) {
            return null;
        }

        const bookId = rows[0].book_id;
        return await bookService.getBook(bookId);
    }
}

export const shareService = new ShareService();
