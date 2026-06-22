import { pool } from '../db/index.js';
import type { Book, Page, Photo, ThemeType, PageSize, PaginatedResponse } from '../types/index.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getSignedUrl, signAvatarUrl } from './OssService.js';
import { interactionService } from './InteractionService.js';
import { signCoverUrl } from '../utils/coverSigner.js';
import { v4 as uuidv4 } from 'uuid';

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
                b.id, b.user_id, b.title, b.author, b.type, b.theme, b.page_size, b.cover_url, b.cover_oss_key, b.show_preface, b.is_public, b.status, b.category, b.created_at,
                COALESCE(v.metric_value, 0) as views,
                COALESCE(l.metric_value, 0) as likes,
                COALESCE(f.metric_value, 0) as favorites,
                IF(ul.id IS NOT NULL, 1, 0) as liked,
                IF(uf.id IS NOT NULL, 1, 0) as favorited,
                (SELECT COUNT(*) FROM pages p WHERE p.book_id = b.id) as page_count,
                (SELECT SUM(COALESCE(JSON_LENGTH(p.elements->'$.photos'), 0)) FROM pages p WHERE p.book_id = b.id) as photo_count
             FROM books b
             LEFT JOIN entity_statistics v ON b.id = v.entity_id AND v.entity_type = 'book' AND v.metric_type = 'view'
             LEFT JOIN entity_statistics l ON b.id = l.entity_id AND l.entity_type = 'book' AND l.metric_type = 'like'
             LEFT JOIN entity_statistics f ON b.id = f.entity_id AND f.entity_type = 'book' AND f.metric_type = 'favorite'
             LEFT JOIN user_interactions ul ON b.id = ul.entity_id AND ul.entity_type = 'book' AND ul.action_type = 'like' AND ul.user_id = ?
             LEFT JOIN user_interactions uf ON b.id = uf.entity_id AND uf.entity_type = 'book' AND uf.action_type = 'favorite' AND uf.user_id = ?
             WHERE b.user_id = ? AND b.deleted_at IS NULL AND b.type = 'book'
             ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
            [userId, userId, userId, pageSize, offset]
        );

        // 2. 获取总数
        const [totalRows] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as total FROM books WHERE user_id = ? AND deleted_at IS NULL AND type = \'book\'',
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
                type: row.type as 'book' | 'template',
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
                b.id, b.user_id, b.title, b.author, b.type, b.theme, b.page_size, b.cover_url, b.cover_oss_key, b.show_preface, b.is_public, b.status, b.category, b.created_at,
                COALESCE(v.metric_value, 0) as views,
                COALESCE(l.metric_value, 0) as likes,
                COALESCE(f.metric_value, 0) as favorites,
                (SELECT COUNT(*) FROM pages p WHERE p.book_id = b.id) as page_count,
                (SELECT SUM(COALESCE(JSON_LENGTH(p.elements->'$.photos'), 0)) FROM pages p WHERE p.book_id = b.id) as photo_count
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

        query += ' WHERE b.status = "published" AND b.deleted_at IS NULL AND b.type = "book"';

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
        let countQuery = 'SELECT COUNT(*) as total FROM books WHERE status = "published" AND deleted_at IS NULL AND type = "book"';
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
                type: row.type as 'book' | 'template',
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

        const pages: Page[] = [];
        for (const page of pageRows) {
            let elements: any = {};
            if (page.elements) {
                try {
                    elements = typeof page.elements === 'string' ? JSON.parse(page.elements) : page.elements;
                } catch (e) {
                    // ignore
                }
            }

            if (elements.version === '2.0') {
                // 这是一个全新的 V2.0 自由画布页面，直接还原新版数据结构
                const elementsList = (elements.elements || []).map((el: any) => {
                    // 对图片组件进行 OSS 签名升级
                    if (el.type === 'photo-frame' && el.photo) {
                        const photoUrl = el.photo.ossKey
                            ? getSignedUrl(el.photo.ossKey, 7200)
                            : (el.photo.url && !el.photo.url.startsWith('blob:') && !el.photo.url.startsWith('data:') ? el.photo.url : '');
                        return {
                            ...el,
                            photo: {
                                ...el.photo,
                                url: photoUrl
                            }
                        };
                    }
                    return el;
                });

                pages.push({
                    id: page.id,
                    bookId: page.book_id,
                    pageTitle: page.page_title || '',
                    isChapterStart: Boolean(page.is_chapter_start),
                    content: '', // V2.0 下清空旧的正文文本
                    layout: page.layout_type,
                    sortOrder: Number(page.sort_order),
                    photos: [], // V2.0 下旧版照片列表清空，由 elements 的 photo-frame 接管
                    elements: elementsList,
                    background: elements.background
                });
            } else {
                // 传统 V1.0 页面还原逻辑
                const legacyContentJson = {
                    slots: elements.slots || {},
                    atmosphere: elements.atmosphere || 'default',
                    fontFamily: elements.fontFamily || 'sans',
                    backgroundImage: elements.backgroundImage || null,
                    decorations: elements.decorations || [],
                    elementOverrides: elements.elementOverrides || {}
                };
                const content = JSON.stringify(legacyContentJson);

                const photosList: Photo[] = [];
                const photos = elements.photos || [];
                for (const photo of photos) {
                    const photoUrl = photo.ossKey
                        ? getSignedUrl(photo.ossKey, 7200)
                        : (photo.url && !photo.url.startsWith('blob:') && !photo.url.startsWith('data:') ? photo.url : '');
                    const thumbnailUrl = photo.ossKey
                        ? getSignedUrl(photo.ossKey, 7200, 'image/resize,w_300/format,webp/quality,q_60')
                        : (photo.url && !photo.url.startsWith('blob:') && !photo.url.startsWith('data:') ? photo.url : '');

                    photosList.push({
                        id: photo.id,
                        url: photoUrl,
                        thumbnailUrl: thumbnailUrl,
                        caption: photo.caption || '',
                        width: photo.width,
                        height: photo.height,
                        ossKey: photo.ossKey,
                        scale: photo.scale !== null ? Number(photo.scale) : 1.0,
                        xOffset: photo.xOffset !== null ? Number(photo.xOffset) : 50,
                        yOffset: photo.yOffset !== null ? Number(photo.yOffset) : 50,
                        assetId: photo.assetId
                    });
                }

                pages.push({
                    id: page.id,
                    bookId: page.book_id,
                    pageTitle: page.page_title || '',
                    isChapterStart: Boolean(page.is_chapter_start),
                    content,
                    layout: page.layout_type,
                    sortOrder: Number(page.sort_order),
                    photos: photosList,
                });
            }
        }

        // 获取实时统计与互动状态 (缓存优先)
        const stats = await interactionService.getEntityInteractions('book', id, userId);

        return {
            id: bookRow.id,
            userId: bookRow.user_id,
            title: bookRow.title,
            author: bookRow.author || '',
            type: bookRow.type as 'book' | 'template',
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
                const [pageRows] = await connection.query<RowDataPacket[]>(
                    'SELECT elements FROM pages WHERE book_id = ?',
                    [book.id]
                );
                for (const row of pageRows) {
                    if (row.elements) {
                        try {
                            const parsed = typeof row.elements === 'string' ? JSON.parse(row.elements) : row.elements;
                            const photos = parsed.photos || [];
                            for (const p of photos) {
                                if (p.ossKey) {
                                    oldOssKeys.add(p.ossKey);
                                }
                            }
                        } catch (e) {
                            // ignore
                        }
                    }
                }
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
                    'UPDATE books SET title = ?, author = ?, type = ?, theme = ?, page_size = ?, cover_url = ?, cover_oss_key = ?, preface = ?, show_preface = ?, is_public = ?, category = ? WHERE id = ?',
                    [book.title, book.author, book.type || 'book', book.theme, book.pageSize, coverUrl || null, book.coverOssKey || null, book.preface || null, book.showPreface !== false ? 1 : 0, book.isPublic ? 1 : 0, book.category || null, book.id]
                );

                // 删除旧的页面
                await connection.query('DELETE FROM pages WHERE book_id = ?', [book.id]);
            } else {
                // 新建书籍
                let coverUrl = book.coverUrl;
                if (coverUrl && (coverUrl.startsWith('blob:') || coverUrl.startsWith('data:'))) {
                    coverUrl = undefined;
                }
                await connection.query(
                    'INSERT INTO books (id, user_id, title, author, type, theme, page_size, cover_url, cover_oss_key, preface, show_preface, is_public, status, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [book.id, book.userId, book.title, book.author, book.type || 'book', book.theme, book.pageSize, coverUrl || null, book.coverOssKey || null, book.preface || null, book.showPreface !== false ? 1 : 0, book.isPublic ? 1 : 0, book.status || 'private', book.category || null, book.createdAt]
                );
            }

            // 3. 收集所有 ossKeys，防 N+1 预查询并自动注册素材
            const allOssKeys = new Set<string>();
            const newOssKeys = new Set<string>();
            if (book.coverOssKey) {
                newOssKeys.add(book.coverOssKey);
            }
            for (const page of book.pages) {
                if (page.elements && Array.isArray(page.elements)) {
                    // V2.0 自由组件提取 ossKeys
                    for (const el of page.elements) {
                        if (el.type === 'photo-frame' && el.photo && el.photo.ossKey) {
                            allOssKeys.add(el.photo.ossKey);
                            newOssKeys.add(el.photo.ossKey);
                        }
                    }
                } else if (page.photos) {
                    // V1.0 照片提取 ossKeys
                    for (const photo of page.photos) {
                        if (photo.ossKey) {
                            allOssKeys.add(photo.ossKey);
                            newOssKeys.add(photo.ossKey);
                        }
                    }
                }
            }

            const registeredAssetIds = new Map<string, string>();
            if (allOssKeys.size > 0) {
                const [existingAssets] = await connection.query<RowDataPacket[]>(
                    'SELECT id, oss_key FROM assets WHERE oss_key IN (?)',
                    [Array.from(allOssKeys)]
                );
                for (const asset of existingAssets) {
                    registeredAssetIds.set(asset.oss_key, asset.id);
                }
            }

            // 4. 遍历插入页面，并构建 elements JSON
            for (let pi = 0; pi < book.pages.length; pi++) {
                const page = book.pages[pi];
                let elementsJson: any;

                if (page.elements && Array.isArray(page.elements)) {
                    // 这是一个全新的 V2.0 画布页面
                    const processedElements = [];
                    for (const el of page.elements) {
                        const cloneEl = { ...el };
                        if (cloneEl.type === 'photo-frame' && cloneEl.photo) {
                            let photoUrl = cloneEl.photo.url;
                            if (photoUrl && (photoUrl.startsWith('blob:') || photoUrl.startsWith('data:'))) {
                                photoUrl = '';
                            }

                            let assetId = cloneEl.photo.assetId || (cloneEl.photo.ossKey ? registeredAssetIds.get(cloneEl.photo.ossKey) : undefined);
                            if (!assetId && cloneEl.photo.ossKey) {
                                assetId = uuidv4();
                                const now = Date.now();
                                const defaultName = cloneEl.photo.caption || '上传照片';
                                const defaultMeta = JSON.stringify({
                                    originalName: defaultName,
                                    mimeType: 'image/jpeg',
                                    width: cloneEl.photo.width || null,
                                    height: cloneEl.photo.height || null
                                });

                                await connection.query(
                                    `INSERT INTO assets (id, folder_id, name, type, user_id, url, thumbnail, oss_key, size, width, height, metadata, created_at)
                                     VALUES (?, NULL, ?, 'photo', ?, '', NULL, ?, 0, ?, ?, ?, ?)`,
                                    [assetId, defaultName, book.userId, cloneEl.photo.ossKey, cloneEl.photo.width || null, cloneEl.photo.height || null, defaultMeta, now]
                                );

                                await connection.query(
                                    `INSERT INTO photo_metadata (id, asset_id, ai_tags) VALUES (?, ?, '[]')`,
                                    [uuidv4(), assetId]
                                );

                                registeredAssetIds.set(cloneEl.photo.ossKey, assetId);
                            }

                            cloneEl.photo = {
                                ...cloneEl.photo,
                                url: photoUrl,
                                assetId
                            };
                        }
                        processedElements.push(cloneEl);
                    }

                    elementsJson = {
                        version: "2.0",
                        background: page.background || { color: '#FFFFFF' },
                        elements: processedElements
                    };
                } else {
                    // 传统 V1.0 页面还原逻辑
                    let parsedContent: any = {};
                    if (page.content) {
                        try {
                            parsedContent = typeof page.content === 'string' ? JSON.parse(page.content) : page.content;
                        } catch (e) {
                            parsedContent = {
                                slots: {
                                    'page-content': { content: page.content },
                                    'default': { content: page.content }
                                }
                            };
                        }
                    }

                    const processedPhotos = [];
                    for (const photo of page.photos) {
                        let photoUrl = photo.url;
                        if (photoUrl && (photoUrl.startsWith('blob:') || photoUrl.startsWith('data:'))) {
                            photoUrl = '';
                        }

                        let assetId = photo.assetId || (photo.ossKey ? registeredAssetIds.get(photo.ossKey) : undefined);
                        if (!assetId && photo.ossKey) {
                            assetId = uuidv4();
                            const now = Date.now();
                            const defaultName = photo.caption || '上传照片';
                            const defaultMeta = JSON.stringify({
                                originalName: defaultName,
                                mimeType: 'image/jpeg',
                                width: photo.width || null,
                                height: photo.height || null
                            });

                            await connection.query(
                                `INSERT INTO assets (id, folder_id, name, type, user_id, url, thumbnail, oss_key, size, width, height, metadata, created_at)
                                 VALUES (?, NULL, ?, 'photo', ?, '', NULL, ?, 0, ?, ?, ?, ?)`,
                                [assetId, defaultName, book.userId, photo.ossKey, photo.width || null, photo.height || null, defaultMeta, now]
                            );

                            await connection.query(
                                `INSERT INTO photo_metadata (id, asset_id, ai_tags) VALUES (?, ?, '[]')`,
                                [uuidv4(), assetId]
                            );

                            registeredAssetIds.set(photo.ossKey, assetId);
                        }

                        processedPhotos.push({
                            id: photo.id || uuidv4(),
                            url: photoUrl,
                            caption: photo.caption || '',
                            width: photo.width || null,
                            height: photo.height || null,
                            ossKey: photo.ossKey || undefined,
                            scale: photo.scale !== undefined ? Number(photo.scale) : 1.0,
                            xOffset: photo.xOffset !== undefined ? Number(photo.xOffset) : 50,
                            yOffset: photo.yOffset !== undefined ? Number(photo.yOffset) : 50,
                            assetId
                        });
                    }

                    elementsJson = {
                        version: "1.0",
                        slots: parsedContent.slots || {},
                        atmosphere: parsedContent.atmosphere || 'default',
                        fontFamily: parsedContent.fontFamily || 'sans',
                        backgroundImage: parsedContent.backgroundImage || null,
                        decorations: parsedContent.decorations || [],
                        elementOverrides: parsedContent.elementOverrides || {},
                        photos: processedPhotos
                    };
                }

                let pageType = 'content';
                if (page.layout === 'book-cover') {
                    pageType = 'cover';
                } else if (page.layout === 'back-cover') {
                    pageType = 'ending';
                }

                await connection.query(
                    'INSERT INTO pages (id, book_id, page_title, is_chapter_start, elements, page_type, layout_type, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [page.id, book.id, page.pageTitle || '', page.isChapterStart ? 1 : 0, JSON.stringify(elementsJson), pageType, page.layout || 'grid', pi]
                );
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

        const [pageRows] = await pool.query<RowDataPacket[]>(
            'SELECT elements FROM pages WHERE book_id = ?',
            [id]
        );
        const bookOssKeys = new Set<string>();
        for (const row of pageRows) {
            if (row.elements) {
                try {
                    const parsed = typeof row.elements === 'string' ? JSON.parse(row.elements) : row.elements;
                    const photos = parsed.photos || [];
                    for (const p of photos) {
                        if (p.ossKey) {
                            bookOssKeys.add(p.ossKey);
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }
        }

        const keysToDelete = Array.from(bookOssKeys);
        let safeToDeleteKeys: string[] = [];
        if (keysToDelete.length > 0) {
            const [assetsWithKeys] = await pool.query<RowDataPacket[]>(
                'SELECT oss_key FROM assets WHERE oss_key IN (?)',
                [keysToDelete]
            );
            const keysInAssets = new Set(assetsWithKeys.map(row => row.oss_key));
            safeToDeleteKeys = keysToDelete.filter(key => !keysInAssets.has(key));
        }

        if (bookRows[0].cover_oss_key) {
            safeToDeleteKeys.push(bookRows[0].cover_oss_key);
        }

        // 删除书籍（级联删除页面）
        await pool.query('DELETE FROM books WHERE id = ?', [id]);

        return safeToDeleteKeys;
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
                (SELECT SUM(COALESCE(JSON_LENGTH(p.elements->'$.photos'), 0)) FROM pages p WHERE p.book_id = b.id) as photo_count
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

    /**
     * 获取用户本人的书模板列表（包含公开的和自己拥有的）
     */
    async getBookTemplates(userId: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<Book>> {
        const offset = (page - 1) * pageSize;

        // 获取当前用户拥有或公开的书模板
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT 
                b.id, b.user_id, b.title, b.author, b.type, b.theme, b.page_size, b.cover_url, b.cover_oss_key, b.show_preface, b.is_public, b.status, b.category, b.created_at,
                COALESCE(v.metric_value, 0) as views,
                COALESCE(l.metric_value, 0) as likes,
                COALESCE(f.metric_value, 0) as favorites,
                IF(ul.id IS NOT NULL, 1, 0) as liked,
                IF(uf.id IS NOT NULL, 1, 0) as favorited,
                (SELECT COUNT(*) FROM pages p WHERE p.book_id = b.id) as page_count,
                (SELECT SUM(COALESCE(JSON_LENGTH(p.elements->'$.photos'), 0)) FROM pages p WHERE p.book_id = b.id) as photo_count
             FROM books b
             LEFT JOIN entity_statistics v ON b.id = v.entity_id AND v.entity_type = 'book' AND v.metric_type = 'view'
             LEFT JOIN entity_statistics l ON b.id = l.entity_id AND l.entity_type = 'book' AND l.metric_type = 'like'
             LEFT JOIN entity_statistics f ON b.id = f.entity_id AND f.entity_type = 'book' AND f.metric_type = 'favorite'
             LEFT JOIN user_interactions ul ON b.id = ul.entity_id AND ul.entity_type = 'book' AND ul.action_type = 'like' AND ul.user_id = ?
             LEFT JOIN user_interactions uf ON b.id = uf.entity_id AND uf.entity_type = 'book' AND uf.action_type = 'favorite' AND uf.user_id = ?
             WHERE (b.user_id = ? OR b.status = 'published') AND b.deleted_at IS NULL AND b.type = 'template'
             ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
            [userId, userId, userId, pageSize, offset]
        );

        const [totalRows] = await pool.query<RowDataPacket[]>(
            `SELECT COUNT(*) as total FROM books 
             WHERE (user_id = ? OR status = 'published') AND deleted_at IS NULL AND type = 'template'`,
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
                type: row.type as 'book' | 'template',
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

    /**
     * 获取公开的书模板市场列表
     */
    async getMarketBookTemplates(page: number = 1, pageSize: number = 20, category?: string, currentUserId?: string): Promise<PaginatedResponse<Book>> {
        const offset = (page - 1) * pageSize;

        let query = `
            SELECT 
                b.id, b.user_id, b.title, b.author, b.type, b.theme, b.page_size, b.cover_url, b.cover_oss_key, b.show_preface, b.is_public, b.status, b.category, b.created_at,
                COALESCE(v.metric_value, 0) as views,
                COALESCE(l.metric_value, 0) as likes,
                COALESCE(f.metric_value, 0) as favorites,
                (SELECT COUNT(*) FROM pages p WHERE p.book_id = b.id) as page_count,
                (SELECT SUM(COALESCE(JSON_LENGTH(p.elements->'$.photos'), 0)) FROM pages p WHERE p.book_id = b.id) as photo_count
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

        query += ' WHERE b.status = "published" AND b.deleted_at IS NULL AND b.type = "template"';

        if (category && category !== 'all') {
            query += ' AND b.category = ?';
            params.push(category);
        }

        query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        const [rows] = await pool.query<RowDataPacket[]>(query, params);

        let countQuery = 'SELECT COUNT(*) as total FROM books WHERE status = "published" AND deleted_at IS NULL AND type = "template"';
        const countParams: any[] = [];

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
                type: row.type as 'book' | 'template',
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
     * 克隆书籍（整书深度拷贝）
     * 支持将普通作品发布为模板，以及将模板克隆为普通作品
     */
    async cloneBook(sourceBookId: string, targetUserId: string, newTitle: string, makeTemplate: boolean): Promise<string> {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. 获取源书籍数据
            const [books] = await connection.query<RowDataPacket[]>(
                'SELECT * FROM books WHERE id = ? AND deleted_at IS NULL',
                [sourceBookId]
            );
            if (books.length === 0) {
                throw new Error('源书籍不存在');
            }
            const srcBook = books[0];

            // 生成新书 ID
            const newBookId = uuidv4();
            const newType = makeTemplate ? 'template' : 'book';
            const newStatus = makeTemplate ? 'published' : 'private'; // 模板默认发布，普通书默认私有
            const newIsPublic = makeTemplate ? 1 : 0;

            // 2. 插入新书籍记录
            await connection.query(
                `INSERT INTO books 
                 (id, user_id, title, author, type, theme, page_size, cover_url, cover_oss_key, preface, show_preface, is_public, status, category, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    newBookId,
                    targetUserId,
                    newTitle,
                    srcBook.author || '',
                    newType,
                    srcBook.theme,
                    srcBook.page_size,
                    srcBook.cover_url || null,
                    srcBook.cover_oss_key || null,
                    makeTemplate ? null : (srcBook.preface || null), // 模板不保留源书的自定义前言文字
                    srcBook.show_preface,
                    newIsPublic,
                    newStatus,
                    srcBook.category || null,
                    Date.now()
                ]
            );

            // 3. 获取所有源页面
            const [srcPages] = await connection.query<RowDataPacket[]>(
                'SELECT * FROM pages WHERE book_id = ? ORDER BY sort_order',
                [sourceBookId]
            );

            for (const page of srcPages) {
                const newPageId = uuidv4();
                
                let elements: any = {};
                if (page.elements) {
                    try {
                        elements = typeof page.elements === 'string' ? JSON.parse(page.elements) : page.elements;
                    } catch (e) {
                        // ignore
                    }
                }

                if (makeTemplate) {
                    // 模板模式下，对内容数据进行脱敏与净化
                    if (elements.version === '2.0') {
                        // V2.0 页面净化
                        if (elements.elements && Array.isArray(elements.elements)) {
                            elements.elements = elements.elements.map((el: any) => {
                                const cloneEl = { ...el };
                                if (cloneEl.type === 'photo-frame') {
                                    cloneEl.photo = null;
                                } else if (cloneEl.type === 'text') {
                                    cloneEl.textConfig = {
                                        ...cloneEl.textConfig,
                                        content: getPlaceholderByRole(cloneEl.role)
                                    };
                                }
                                return cloneEl;
                            });
                        }
                        if (elements.background) {
                            if (!elements.background.isSystemTheme) {
                                delete elements.background.backgroundImage;
                            }
                        }
                    } else {
                        // V1.0 页面净化
                        if (elements.slots) {
                            for (const key of Object.keys(elements.slots)) {
                                if (elements.slots[key]) {
                                    elements.slots[key].content = '';
                                }
                            }
                        }
                        delete elements.backgroundImage;
                        elements.photos = [];
                    }
                } else {
                    // 非模板复制模式下（如套用模板为新书，或者复制书籍）
                    // 必须重新生成自由组件元素的 UUID，防止新书与旧书的组件实例 ID 冲突
                    if (elements.version === '2.0' && elements.elements && Array.isArray(elements.elements)) {
                        const idMapping = new Map<string, string>();
                        // 1. 生成新 ID 映射关系
                        elements.elements.forEach((el: any) => {
                            const newElId = uuidv4();
                            idMapping.set(el.id, newElId);
                            el.id = newElId;
                        });
                        // 2. 依据映射关系重构建组 (groupId) 关联
                        elements.elements.forEach((el: any) => {
                            if (el.groupId && idMapping.has(el.groupId)) {
                                el.groupId = idMapping.get(el.groupId);
                            }
                        });
                    }
                }

                await connection.query(
                    `INSERT INTO pages (id, book_id, page_title, is_chapter_start, page_type, layout_type, sort_order, elements) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        newPageId,
                        newBookId,
                        page.page_title || '',
                        page.is_chapter_start,
                        page.page_type || 'content',
                        page.layout_type || 'grid',
                        page.sort_order,
                        JSON.stringify(elements)
                    ]
                );
            }

            // 本地辅助函数，用以在模板模式下脱敏占位
            function getPlaceholderByRole(role?: string): string {
                if (role === 'chapter-title') return '章节标题';
                if (role === 'chapter-date') return '2026.06.22';
                return '双击输入此处的感悟文字...';
            }

            await connection.commit();
            return newBookId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

// 导出单例
export const bookService = new BookService();
