import { pool } from '../db/index.js';
import type { Book, Page, Photo, ThemeType, PageSize, PaginatedResponse } from '../types/index.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getSignedUrl, signAvatarUrl } from './OssService.js';
import { interactionService } from './InteractionService.js';
import { signCoverUrl } from '../utils/coverSigner.js';

/**
 * 书籍业务服务
 * 处理书籍的 CRUD 操作，包含嵌套的章节、页面、图片
 */
export class BookService {
    /**
     * 获取所有书籍列表（不含已删除的）
     */
    async getBooks(userId: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Book>> {
        const offset = (page - 1) * pageSize;

        // 1. 获取分页书籍（带统计数据与当前用户的互动状态）
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT 
                b.id, b.user_id, b.title, b.author, b.theme, b.page_size, b.cover_url, b.cover_oss_key, b.show_preface, b.is_public, b.status, b.category, b.created_at,
                COALESCE(v.metric_value, 0) as views,
                COALESCE(l.metric_value, 0) as likes,
                COALESCE(f.metric_value, 0) as favorites,
                IF(ul.id IS NOT NULL, 1, 0) as liked,
                IF(uf.id IS NOT NULL, 1, 0) as favorited,
                (SELECT COUNT(*) FROM pages p WHERE p.book_id = b.id) as page_count,
                (SELECT COUNT(*) FROM photos ph JOIN pages p ON ph.page_id = p.id WHERE p.book_id = b.id AND ph.url IS NOT NULL AND ph.url != '') as photo_count
             FROM books b
             LEFT JOIN entity_statistics v ON b.id = v.entity_id AND v.entity_type = 'book' AND v.metric_type = 'view'
             LEFT JOIN entity_statistics l ON b.id = l.entity_id AND l.entity_type = 'book' AND l.metric_type = 'like'
             LEFT JOIN entity_statistics f ON b.id = f.entity_id AND f.entity_type = 'book' AND f.metric_type = 'favorite'
             LEFT JOIN user_interactions ul ON b.id = ul.entity_id AND ul.entity_type = 'book' AND ul.action_type = 'like' AND ul.user_id = ?
             LEFT JOIN user_interactions uf ON b.id = uf.entity_id AND uf.entity_type = 'book' AND uf.action_type = 'favorite' AND uf.user_id = ?
             WHERE b.user_id = ? AND b.deleted_at IS NULL 
             ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
            [userId, userId, userId, pageSize, offset]
        );

        // 2. 获取总数
        const [totalRows] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as total FROM books WHERE user_id = ? AND deleted_at IS NULL',
            [userId]
        );
        const total = totalRows[0].total;

        const items = rows.map((row: RowDataPacket) => {
            const coverUrl = signCoverUrl(row.cover_url, row.cover_oss_key, 7200);
            const coverThumbnailUrl = signCoverUrl(row.cover_url, row.cover_oss_key, 7200, 'image/resize,w_300/format,webp/quality,q_60');

            return {
                id: row.id,
                userId: row.user_id,
                title: row.title,
                author: row.author || '',
                theme: row.theme as ThemeType,
                pageSize: row.page_size as PageSize,
                coverUrl: coverUrl || '',
                coverThumbnailUrl: coverThumbnailUrl || '',
                coverOssKey: row.cover_oss_key,
                showPreface: row.show_preface !== undefined ? Boolean(row.show_preface) : true,
                isPublic: Boolean(row.is_public),
                status: row.status,
                category: row.category || undefined,
                createdAt: Number(row.created_at),
                pages: [], // 列表接口不返回详细页面
                views: row.views,
                likes: row.likes,
                favorites: row.favorites,
                liked: Boolean(row.liked),
                favorited: Boolean(row.favorited),
                pageCount: row.page_count,
                photoCount: row.photo_count
            };
        });

        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }

    /**
     * 获取所有公开书籍列表 (可指定作者)
     */
    async getPublicBooks(page: number = 1, pageSize: number = 20, category?: string, currentUserId?: string, targetUserId?: string): Promise<PaginatedResponse<Book>> {
        const offset = (page - 1) * pageSize;

        let query = `
            SELECT 
                b.id, b.user_id, b.title, b.author, b.theme, b.page_size, b.cover_url, b.cover_oss_key, b.show_preface, b.is_public, b.status, b.category, b.created_at,
                COALESCE(v.metric_value, 0) as views,
                COALESCE(l.metric_value, 0) as likes,
                COALESCE(f.metric_value, 0) as favorites,
                (SELECT COUNT(*) FROM pages p WHERE p.book_id = b.id) as page_count,
                (SELECT COUNT(*) FROM photos ph JOIN pages p ON ph.page_id = p.id WHERE p.book_id = b.id AND ph.url IS NOT NULL AND ph.url != '') as photo_count
        `;
        const params: any[] = [];

        if (currentUserId) {
            query += `,
                IF(ul.id IS NOT NULL, 1, 0) as liked,
                IF(uf.id IS NOT NULL, 1, 0) as favorited
            `;
        }

        query += `
            FROM books b
            LEFT JOIN entity_statistics v ON b.id = v.entity_id AND v.entity_type = 'book' AND v.metric_type = 'view'
            LEFT JOIN entity_statistics l ON b.id = l.entity_id AND l.entity_type = 'book' AND l.metric_type = 'like'
            LEFT JOIN entity_statistics f ON b.id = f.entity_id AND f.entity_type = 'book' AND f.metric_type = 'favorite'
        `;

        if (currentUserId) {
            query += `
                LEFT JOIN user_interactions ul ON b.id = ul.entity_id AND ul.entity_type = 'book' AND ul.action_type = 'like' AND ul.user_id = ?
                LEFT JOIN user_interactions uf ON b.id = uf.entity_id AND uf.entity_type = 'book' AND uf.action_type = 'favorite' AND uf.user_id = ?
            `;
            params.push(currentUserId, currentUserId);
        }

        query += ' WHERE b.status = "published" AND b.deleted_at IS NULL';

        if (targetUserId) {
            query += ' AND b.user_id = ?';
            params.push(targetUserId);
        }

        if (category && category !== 'all') {
            query += ' AND b.category = ?';
            params.push(category);
        }

        query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        // 1. 获取分页公开书籍
        const [rows] = await pool.query<RowDataPacket[]>(query, params);

        // 2. 获取总条数
        let countQuery = 'SELECT COUNT(*) as total FROM books WHERE status = "published" AND deleted_at IS NULL';
        const countParams: any[] = [];

        if (targetUserId) {
            countQuery += ' AND user_id = ?';
            countParams.push(targetUserId);
        }

        if (category && category !== 'all') {
            countQuery += ' AND category = ?';
            countParams.push(category);
        }

        const [totalRows] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = totalRows[0].total;

        const items = rows.map((row: RowDataPacket) => {
            const coverUrl = signCoverUrl(row.cover_url, row.cover_oss_key, 7200);
            const coverThumbnailUrl = signCoverUrl(row.cover_url, row.cover_oss_key, 7200, 'image/resize,w_300/format,webp/quality,q_60');

            return {
                id: row.id,
                userId: row.user_id,
                title: row.title,
                author: row.author || '',
                theme: row.theme as ThemeType,
                pageSize: row.page_size as PageSize,
                coverUrl: coverUrl || '',
                coverThumbnailUrl: coverThumbnailUrl || '',
                coverOssKey: row.cover_oss_key,
                showPreface: row.show_preface !== undefined ? Boolean(row.show_preface) : true,
                isPublic: Boolean(row.is_public),
                status: row.status,
                category: row.category || undefined,
                createdAt: Number(row.created_at),
                pages: [],
                views: row.views,
                likes: row.likes,
                favorites: row.favorites,
                liked: currentUserId ? Boolean(row.liked) : false,
                favorited: currentUserId ? Boolean(row.favorited) : false,
                pageCount: row.page_count,
                photoCount: row.photo_count
            };
        });

        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }

    /**
     * 获取广场排行榜数据（包含高光作品及活跃创作者）
     * 智能合并点赞与阅读量，具备 Fail-Safe 兜底机制
     */
    async getRankings(): Promise<{ hotBooks: any[]; activeCreators: any[] }> {
        try {
            // 1. 从数据库获取最热公开作品
            const [hotBooksRows] = await pool.query<RowDataPacket[]>(
                `SELECT 
                    b.id, b.title, b.author, b.cover_url, b.cover_oss_key, b.theme,
                    COALESCE(v.metric_value, 0) as views,
                    COALESCE(l.metric_value, 0) as likes
                 FROM books b
                 LEFT JOIN entity_statistics v ON b.id = v.entity_id AND v.entity_type = 'book' AND v.metric_type = 'view'
                 LEFT JOIN entity_statistics l ON b.id = l.entity_id AND l.entity_type = 'book' AND l.metric_type = 'like'
                 WHERE b.status = 'published' AND b.deleted_at IS NULL
                 ORDER BY (COALESCE(l.metric_value, 0) * 3 + COALESCE(v.metric_value, 0)) DESC
                 LIMIT 5`
            );

            // 2. 从数据库获取活跃公开创作者
            const [creatorsRows] = await pool.query<RowDataPacket[]>(
                `SELECT 
                    u.id, u.nickname, u.avatar_url,
                    COUNT(b.id) as book_count,
                    SUM(COALESCE(v.metric_value, 0)) as total_views,
                    SUM(COALESCE(l.metric_value, 0)) as total_likes
                 FROM users u
                 JOIN books b ON u.id = b.user_id
                 LEFT JOIN entity_statistics v ON b.id = v.entity_id AND v.entity_type = 'book' AND v.metric_type = 'view'
                 LEFT JOIN entity_statistics l ON b.id = l.entity_id AND l.entity_type = 'book' AND l.metric_type = 'like'
                 WHERE b.status = 'published' AND b.deleted_at IS NULL
                 GROUP BY u.id, u.nickname, u.avatar_url
                 ORDER BY (SUM(COALESCE(l.metric_value, 0)) * 3 + SUM(COALESCE(v.metric_value, 0)) + COUNT(b.id) * 10) DESC
                 LIMIT 5`
            );

            // 3. 构造兜底与真实数据的合并逻辑
            let hotBooks = hotBooksRows.map((row: RowDataPacket) => {
                const coverUrl = signCoverUrl(row.cover_url, row.cover_oss_key, 7200);
                return {
                    id: row.id,
                    title: row.title,
                    author: row.author || '未知作者',
                    coverUrl: coverUrl || '',
                    theme: row.theme,
                    views: Number(row.views),
                    likes: Number(row.likes)
                };
            });

            let activeCreators = creatorsRows.map((row: RowDataPacket) => ({
                id: row.id,
                nickname: row.nickname,
                avatarUrl: signAvatarUrl(row.avatar_url) || '',
                bookCount: Number(row.book_count),
                totalViews: Number(row.total_views),
                totalLikes: Number(row.total_likes)
            }));

            // 兜底高光作品
            const defaultHotBooks = [
                { id: 'mock-b1', title: '毕业，是青涩的终点 🎓', author: '拾光小助手', coverUrl: '', theme: 'magazine', views: 560, likes: 120 },
                { id: 'mock-b2', title: '西藏骑行记 🚴‍♂️', author: '旅行家老张', coverUrl: '', theme: 'modern', views: 420, likes: 98 },
                { id: 'mock-b3', title: '可乐的成长日记 🐶', author: '可乐粑粑', coverUrl: '', theme: 'warm', views: 350, likes: 85 },
                { id: 'mock-b4', title: '恋爱两周年纪念 👩‍❤️‍👨', author: '心动收集器', coverUrl: '', theme: 'classic', views: 280, likes: 72 },
                { id: 'mock-b5', title: '夏日海滨慢生活 🏖️', author: '慵懒的树懒', coverUrl: '', theme: 'modern', views: 210, likes: 60 }
            ];

            // 兜底创作者
            const defaultCreators = [
                { id: 'mock-u1', nickname: 'Milk', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80', bookCount: 8, totalViews: 2450, totalLikes: 820 },
                { id: 'mock-u2', nickname: '旅行足迹家', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80', bookCount: 5, totalViews: 1890, totalLikes: 610 },
                { id: 'mock-u3', nickname: '拾光小甜心', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80', bookCount: 4, totalViews: 1200, totalLikes: 430 },
                { id: 'mock-u4', nickname: '萌宠记录官', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80', bookCount: 3, totalViews: 950, totalLikes: 310 },
                { id: 'mock-u5', nickname: '岁月神偷', avatarUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=150&h=150&q=80', bookCount: 2, totalViews: 710, totalLikes: 250 }
            ];

            // 填充逻辑，如果真实数据少于 5 条，使用兜底数据补齐，以体现“冷启动防御”
            if (hotBooks.length < 5) {
                const existingIds = new Set(hotBooks.map(b => b.id));
                const needed = 5 - hotBooks.length;
                let added = 0;
                for (const db of defaultHotBooks) {
                    if (added >= needed) break;
                    if (!existingIds.has(db.id)) {
                        hotBooks.push(db);
                        added++;
                    }
                }
            }

            if (activeCreators.length < 5) {
                const existingIds = new Set(activeCreators.map(c => c.id));
                const needed = 5 - activeCreators.length;
                let added = 0;
                for (const dc of defaultCreators) {
                    if (added >= needed) break;
                    if (!existingIds.has(dc.id)) {
                        activeCreators.push(dc);
                        added++;
                    }
                }
            }

            return { hotBooks, activeCreators };
        } catch (error) {
            console.error('[BookService] Failed to compute rankings:', error);
            throw error;
        }
    }

    /**
     * 获取单本书籍详情（含所有嵌套数据）
     */
    async getBook(id: string, userId?: string): Promise<Book | null> {
        // 1. 获取书籍基础信息
        let query = 'SELECT * FROM books WHERE id = ? AND deleted_at IS NULL';
        let params: any[] = [id];

        if (userId) {
            // 如果提供了 userId，则允许访问：本人书籍 OR 公开书籍
            query += ' AND (user_id = ? OR status = "published")';
            params.push(userId);
        } else {
            // 如果未提供 userId（通常是未登录或特定查询），则只允许访问：公开书籍
            query += ' AND status = "published"';
        }

        const [bookRows] = await pool.query<RowDataPacket[]>(query, params);

        if (bookRows.length === 0) {
            return null;
        }

        const bookRow = bookRows[0];
        const coverUrl = signCoverUrl(bookRow.cover_url, bookRow.cover_oss_key, 7200);
        const coverThumbnailUrl = signCoverUrl(bookRow.cover_url, bookRow.cover_oss_key, 7200, 'image/resize,w_600/format,webp/quality,q_60');

        // 2. 获取所有页面
        const [pageRows] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM pages WHERE book_id = ? ORDER BY sort_order',
            [id]
        );

        // 3. 获取所有图片
        const pageIds = pageRows.map(p => p.id);
        let photoRows: RowDataPacket[] = [];
        if (pageIds.length > 0) {
            const [photos] = await pool.query<RowDataPacket[]>(
                'SELECT * FROM photos WHERE page_id IN (?) ORDER BY sort_order',
                [pageIds]
            );
            photoRows = photos;
        }

        // 4. 组装嵌套结构
        const photosMap = new Map<string, Photo[]>();
        for (const photo of photoRows) {
            const pageId = photo.page_id;
            if (!photosMap.has(pageId)) {
                photosMap.set(pageId, []);
            }
            // 如果有 ossKey，生成签名 URL；否则使用原 URL
            const photoUrl = photo.oss_key
                ? getSignedUrl(photo.oss_key, 7200) // 2小时有效期
                : (photo.url && !photo.url.startsWith('blob:') && !photo.url.startsWith('data:') ? photo.url : '');
            const thumbnailUrl = photo.oss_key
                ? getSignedUrl(photo.oss_key, 7200, 'image/resize,w_300/format,webp/quality,q_60')
                : (photo.url && !photo.url.startsWith('blob:') && !photo.url.startsWith('data:') ? photo.url : '');

            photosMap.get(pageId)!.push({
                id: photo.id,
                url: photoUrl,
                thumbnailUrl: thumbnailUrl,
                caption: photo.caption || '',
                width: photo.width,
                height: photo.height,
                ossKey: photo.oss_key,
                scale: photo.scale !== null ? Number(photo.scale) : 1.0,
                xOffset: photo.x_offset !== null ? Number(photo.x_offset) : 50,
                yOffset: photo.y_offset !== null ? Number(photo.y_offset) : 50,
            });
        }

        const pages: Page[] = pageRows.map((page: RowDataPacket) => ({
            id: page.id,
            bookId: page.book_id,
            pageTitle: page.page_title || '',
            isChapterStart: Boolean(page.is_chapter_start),
            content: page.content || '',
            layout: page.layout,
            sortOrder: Number(page.sort_order),
            photos: photosMap.get(page.id) || [],
        }));

        // 获取实时统计与互动状态 (缓存优先)
        const stats = await interactionService.getEntityInteractions('book', id, userId);

        return {
            id: bookRow.id,
            userId: bookRow.user_id,
            title: bookRow.title,
            author: bookRow.author || '',
            theme: bookRow.theme as ThemeType,
            pageSize: bookRow.page_size as PageSize,
            coverUrl: coverUrl || '',
            coverThumbnailUrl: coverThumbnailUrl || '',
            coverOssKey: bookRow.cover_oss_key,
            preface: bookRow.preface || '',
            showPreface: bookRow.show_preface !== undefined ? Boolean(bookRow.show_preface) : true,
            isPublic: Boolean(bookRow.is_public),
            status: bookRow.status,
            category: bookRow.category || undefined,
            createdAt: Number(bookRow.created_at),
            pages,
            views: stats.views,
            likes: stats.likes,
            favorites: stats.favorites,
            liked: stats.liked,
            favorited: stats.favorited
        };
    }

    /**
     * 保存书籍（新建或更新）
     * 使用事务确保数据一致性
     */
    async saveBook(book: Book): Promise<Book> {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. 获取现有书籍的所有 OSS keys（用于后续清理孤儿文件）
            const [existingRows] = await connection.query<RowDataPacket[]>(
                'SELECT id, cover_oss_key FROM books WHERE id = ?',
                [book.id]
            );

            const oldOssKeys = new Set<string>();
            if (existingRows.length > 0) {
                if (existingRows[0].cover_oss_key) {
                    oldOssKeys.add(existingRows[0].cover_oss_key);
                }
                const [photoRows] = await connection.query<RowDataPacket[]>(
                    `SELECT p.oss_key FROM photos p
                     JOIN pages pg ON p.page_id = pg.id
                     WHERE pg.book_id = ? AND p.oss_key IS NOT NULL`,
                    [book.id]
                );
                photoRows.forEach((row: RowDataPacket) => oldOssKeys.add(row.oss_key));
            }

            // 2. 更新或新建书籍流程
            if (existingRows.length > 0) {
                // 更新时校验所有权
                const [ownerCheck] = await connection.query<RowDataPacket[]>(
                    'SELECT id FROM books WHERE id = ? AND user_id = ?',
                    [book.id, book.userId]
                );
                if (ownerCheck.length === 0) {
                    throw new Error('无权修改此书籍');
                }

                // 更新书籍
                let coverUrl = book.coverUrl;
                if (coverUrl && (coverUrl.startsWith('blob:') || coverUrl.startsWith('data:'))) {
                    coverUrl = undefined;
                }
                await connection.query(
                    'UPDATE books SET title = ?, author = ?, theme = ?, page_size = ?, cover_url = ?, cover_oss_key = ?, preface = ?, show_preface = ?, is_public = ?, category = ? WHERE id = ?',
                    [book.title, book.author, book.theme, book.pageSize, coverUrl || null, book.coverOssKey || null, book.preface || null, book.showPreface !== false ? 1 : 0, book.isPublic ? 1 : 0, book.category || null, book.id]
                );

                // 删除旧的页面（级联删除图片）
                await connection.query('DELETE FROM pages WHERE book_id = ?', [book.id]);
            } else {
                // 新建书籍
                let coverUrl = book.coverUrl;
                if (coverUrl && (coverUrl.startsWith('blob:') || coverUrl.startsWith('data:'))) {
                    coverUrl = undefined;
                }
                await connection.query(
                    'INSERT INTO books (id, user_id, title, author, theme, page_size, cover_url, cover_oss_key, preface, show_preface, is_public, status, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [book.id, book.userId, book.title, book.author, book.theme, book.pageSize, coverUrl || null, book.coverOssKey || null, book.preface || null, book.showPreface !== false ? 1 : 0, book.isPublic ? 1 : 0, book.status || 'private', book.category || null, book.createdAt]
                );
            }

            // 3. 收集新的 OSS keys 并插入新数据
            const newOssKeys = new Set<string>();
            if (book.coverOssKey) {
                newOssKeys.add(book.coverOssKey);
            }
            for (let pi = 0; pi < book.pages.length; pi++) {
                const page = book.pages[pi];
                await connection.query(
                    'INSERT INTO pages (id, book_id, page_title, is_chapter_start, content, layout, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [page.id, book.id, page.pageTitle || '', page.isChapterStart ? 1 : 0, page.content, page.layout, pi]
                );

                for (let phi = 0; phi < page.photos.length; phi++) {
                    const photo = page.photos[phi];
                    let photoUrl = photo.url;
                    if (photoUrl && (photoUrl.startsWith('blob:') || photoUrl.startsWith('data:'))) {
                        photoUrl = '';
                    }
                    await connection.query(
                        'INSERT INTO photos (id, page_id, url, oss_key, caption, width, height, sort_order, scale, x_offset, y_offset) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [photo.id, page.id, photoUrl, photo.ossKey || null, photo.caption || '', photo.width || null, photo.height || null, phi, photo.scale !== undefined ? photo.scale : 1.0, photo.xOffset !== undefined ? photo.xOffset : 50, photo.yOffset !== undefined ? photo.yOffset : 50]
                    );
                    if (photo.ossKey) {
                        newOssKeys.add(photo.ossKey);
                    }
                }
            }

            await connection.commit();

            // 4. 异步清理不再使用的 OSS 文件
            const orphanedKeys = Array.from(oldOssKeys).filter(key => !newOssKeys.has(key));
            if (orphanedKeys.length > 0) {
                // 动态导入避免循环依赖
                import('./OssService.js').then(({ deleteFromOss }) => {
                    orphanedKeys.forEach(key => {
                        deleteFromOss(key).catch(err => {
                            console.error(`🗑️ Failed to delete orphaned OSS file: ${key}`, err);
                        });
                        console.log(`🗑️ Triggered deletion for orphaned OSS file: ${key}`);
                    });
                }).catch(err => {
                    console.error('Failed to import OssService for cleanup', err);
                });
            }

            return book;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 软删除书籍（移入回收站）
     */
    async softDeleteBook(id: string, userId: string): Promise<void> {
        const [result] = await pool.query<ResultSetHeader>(
            'UPDATE books SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
            [id, userId]
        );
        if (result.affectedRows === 0) {
            throw new Error('未发现书籍或无权操作');
        }
    }

    /**
     * 获取回收站中的书籍列表
     */
    async getDeletedBooks(userId: string): Promise<(Book & { deletedAt: number; daysRemaining: number })[]> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT id, title, author, theme, page_size, created_at, deleted_at,
             DATEDIFF(DATE_ADD(deleted_at, INTERVAL 30 DAY), NOW()) as days_remaining
             FROM books 
             WHERE user_id = ? AND deleted_at IS NOT NULL 
             ORDER BY deleted_at DESC`,
            [userId]
        );

        return rows.map((row: RowDataPacket) => ({
            id: row.id,
            userId: row.user_id,
            title: row.title,
            author: row.author || '',
            theme: row.theme as ThemeType,
            pageSize: row.page_size as PageSize,
            createdAt: Number(row.created_at),
            pages: [],
            deletedAt: new Date(row.deleted_at).getTime(),
            daysRemaining: Math.max(0, row.days_remaining),
        }));
    }

    /**
     * 恢复已删除的书籍
     */
    async restoreBook(id: string, userId: string): Promise<void> {
        const [result] = await pool.query<ResultSetHeader>(
            'UPDATE books SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL',
            [id, userId]
        );
        if (result.affectedRows === 0) {
            throw new Error('未发现书籍或无权操作');
        }
    }

    /**
     * 永久删除书籍（并返回需要删除的 OSS keys）
     */
    async permanentDeleteBook(id: string, userId: string): Promise<string[]> {
        // 先获取所有关联的 OSS keys，同时校验权限
        const [bookRows] = await pool.query<RowDataPacket[]>(
            'SELECT cover_oss_key FROM books WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (bookRows.length === 0) {
            throw new Error('未发现书籍或无权操作');
        }

        const [photoRows] = await pool.query<RowDataPacket[]>(
            `SELECT p.oss_key FROM photos p
             JOIN pages pg ON p.page_id = pg.id
             WHERE pg.book_id = ? AND p.oss_key IS NOT NULL`,
            [id]
        );

        const ossKeys = photoRows.map((row: RowDataPacket) => row.oss_key).filter(Boolean);
        if (bookRows[0].cover_oss_key) {
            ossKeys.push(bookRows[0].cover_oss_key);
        }

        // 删除书籍（级联删除页面、图片记录）
        await pool.query('DELETE FROM books WHERE id = ?', [id]);

        return ossKeys;
    }

    /**
     * 获取超过30天的已删除书籍（用于自动清理）
     */
    async getExpiredDeletedBooks(): Promise<{ id: string; title: string; userId: string }[]> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT id, title, user_id FROM books 
             WHERE deleted_at IS NOT NULL 
             AND deleted_at < DATE_SUB(NOW(), INTERVAL 30 DAY)`
        );
        return rows.map((row: RowDataPacket) => ({ id: row.id, title: row.title, userId: row.user_id }));
    }

    /**
     * 更新书籍状态
     */
    async updateStatus(id: string, status: 'private' | 'pending' | 'published' | 'rejected', userId?: string) {
        let query = 'UPDATE books SET status = ?';
        const params: any[] = [status];

        // 联动 is_public 字段：published -> 1, 其他 -> 0
        const isPublic = status === 'published' ? 1 : 0;
        query += ', is_public = ?';
        params.push(isPublic);

        query += ' WHERE id = ?';
        params.push(id);

        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }

        const [result] = await pool.query<ResultSetHeader>(query, params);
        if (result.affectedRows === 0) {
            throw new Error(userId ? '找不到书籍或无权操作' : '找不到书籍');
        }
    }

    /**
     * 获取用户收藏的书籍列表 (含权限/隐私判定)
     */
    async getFavoritedBooks(targetUserId: string, requesterUserId: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Book>> {
        const offset = (page - 1) * pageSize;

        // 1. 分页查询收藏书籍 (加入安全性防线：如果不是本人，则只能查询公开书籍；如果是本人，允许查询被收藏的非公开/公开书籍)
        const isOwn = targetUserId === requesterUserId;

        let query = `
            SELECT 
                b.id, b.user_id, b.title, b.author, b.theme, b.page_size, b.cover_url, b.cover_oss_key, b.show_preface, b.is_public, b.status, b.category, b.created_at,
                COALESCE(v.metric_value, 0) as views,
                COALESCE(l.metric_value, 0) as likes,
                COALESCE(f.metric_value, 0) as favorites,
                IF(ul.id IS NOT NULL, 1, 0) as liked,
                IF(uf.id IS NOT NULL, 1, 0) as favorited,
                (SELECT COUNT(*) FROM pages p WHERE p.book_id = b.id) as page_count,
                (SELECT COUNT(*) FROM photos ph JOIN pages p ON ph.page_id = p.id WHERE p.book_id = b.id AND ph.url IS NOT NULL AND ph.url != '') as photo_count
             FROM user_interactions ui
             JOIN books b ON ui.entity_id = b.id AND ui.entity_type = 'book'
             LEFT JOIN entity_statistics v ON b.id = v.entity_id AND v.entity_type = 'book' AND v.metric_type = 'view'
             LEFT JOIN entity_statistics l ON b.id = l.entity_id AND l.entity_type = 'book' AND l.metric_type = 'like'
             LEFT JOIN entity_statistics f ON b.id = f.entity_id AND f.entity_type = 'book' AND f.metric_type = 'favorite'
             LEFT JOIN user_interactions ul ON b.id = ul.entity_id AND ul.entity_type = 'book' AND ul.action_type = 'like' AND ul.user_id = ?
             LEFT JOIN user_interactions uf ON b.id = uf.entity_id AND uf.entity_type = 'book' AND uf.action_type = 'favorite' AND uf.user_id = ?
             WHERE ui.user_id = ? AND ui.action_type = 'favorite' AND b.deleted_at IS NULL
        `;
        const params: any[] = [requesterUserId, requesterUserId, targetUserId];

        if (!isOwn) {
            // 他人空间：只公开显示状态为 published 的书籍，或该书籍属于请求者本人
            query += ' AND (b.status = "published" OR b.user_id = ?)';
            params.push(requesterUserId);
        }

        query += ' ORDER BY ui.created_at DESC LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        const [rows] = await pool.query<RowDataPacket[]>(query, params);

        // 2. 统计总数 (同上安全防线条件)
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM user_interactions ui
            JOIN books b ON ui.entity_id = b.id AND ui.entity_type = 'book'
            WHERE ui.user_id = ? AND ui.action_type = 'favorite' AND b.deleted_at IS NULL
        `;
        const countParams: any[] = [targetUserId];

        if (!isOwn) {
            countQuery += ' AND (b.status = "published" OR b.user_id = ?)';
            countParams.push(requesterUserId);
        }

        const [totalRows] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = totalRows[0].total;

        const items = rows.map((row: RowDataPacket) => {
            const coverUrl = signCoverUrl(row.cover_url, row.cover_oss_key, 7200);
            const coverThumbnailUrl = signCoverUrl(row.cover_url, row.cover_oss_key, 7200, 'image/resize,w_300/format,webp/quality,q_60');

            return {
                id: row.id,
                userId: row.user_id,
                title: row.title,
                author: row.author || '',
                theme: row.theme as ThemeType,
                pageSize: row.page_size as PageSize,
                coverUrl: coverUrl || '',
                coverThumbnailUrl: coverThumbnailUrl || '',
                coverOssKey: row.cover_oss_key,
                showPreface: row.show_preface !== undefined ? Boolean(row.show_preface) : true,
                isPublic: Boolean(row.is_public),
                status: row.status,
                category: row.category || undefined,
                createdAt: Number(row.created_at),
                pages: [],
                views: row.views,
                likes: row.likes,
                favorites: row.favorites,
                liked: Boolean(row.liked),
                favorited: Boolean(row.favorited),
                pageCount: row.page_count,
                photoCount: row.photo_count
            };
        });

        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        };
    }
}

// 导出单例
export const bookService = new BookService();
