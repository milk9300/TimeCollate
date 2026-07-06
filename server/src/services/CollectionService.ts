import { pool } from '../db/index.js';
import type { TemplateCollection, TemplateCollectionItem, Template, Page } from '../types/index.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { v4 as uuidv4 } from 'uuid';

export class CollectionService {
    /**
     * 获取合集列表（支持根据用户、可见性进行筛选）
     */
    async getCollections(userId: string, filters?: { my?: boolean; visibility?: 'private' | 'public' }): Promise<TemplateCollection[]> {
        let sql = 'SELECT id, title, description, cover, author, visibility, created_at, updated_at FROM template_collections';
        const params: any[] = [];
        const conditions: string[] = [];

        if (filters?.my) {
            conditions.push('author = ?');
            params.push(userId);
        } else if (filters?.visibility) {
            conditions.push('visibility = ?');
            params.push(filters.visibility);
        } else {
            // 默认展示系统或公开可见的，或自己拥有的
            conditions.push('(visibility = \'public\' OR author = ?)');
            params.push(userId);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY created_at DESC';

        const [rows] = await pool.query<RowDataPacket[]>(sql, params);
        return rows.map(row => this.mapRowToCollection(row));
    }

    /**
     * 获取模板合集市场列表 (公开且非当前用户自己创建的合集)
     */
    async getMarketCollections(excludeUserId: string): Promise<TemplateCollection[]> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT id, title, description, cover, author, visibility, created_at, updated_at 
             FROM template_collections 
             WHERE visibility = 'public' AND author != ?
             ORDER BY created_at DESC`,
            [excludeUserId]
        );
        return rows.map(row => this.mapRowToCollection(row));
    }

    /**
     * 获取合集详情（包含合集子项列表）
     */
    async getCollectionById(id: string, userId: string): Promise<(TemplateCollection & { items: TemplateCollectionItem[] }) | null> {
        // 1. 获取合集头信息
        const [collections] = await pool.query<RowDataPacket[]>(
            'SELECT id, title, description, cover, author, visibility, created_at, updated_at FROM template_collections WHERE id = ?',
            [id]
        );
        if (collections.length === 0) return null;
        const collection = this.mapRowToCollection(collections[0]);

        // 零信任越权检查：若非公开且非本人，则无权访问
        if (collection.visibility !== 'public' && collection.author !== userId) {
            throw new Error('权限不足，无法访问该私有模板合集');
        }

        // 2. 获取合集子项明细，并联表获取页面模板属性
        const [itemRows] = await pool.query<RowDataPacket[]>(
            `SELECT 
                tci.collection_id, tci.page_template_id, tci.sort,
                pt.name, pt.template_type, pt.photo_count, pt.category, pt.elements, pt.thumbnail_url, pt.cover_url, pt.visibility, pt.creator_id, pt.created_at, pt.tags, pt.favorite_count, pt.use_count
             FROM template_collection_items tci
             JOIN page_templates pt ON tci.page_template_id = pt.id
             WHERE tci.collection_id = ?
             ORDER BY tci.sort ASC`,
            [id]
        );

        const items: TemplateCollectionItem[] = itemRows.map(row => {
            let layoutSchema = row.elements;
            if (typeof layoutSchema === 'string') {
                try {
                    layoutSchema = JSON.parse(layoutSchema);
                } catch (e) {
                    layoutSchema = {};
                }
            }
            let tags: string[] = [];
            if (row.tags) {
                try {
                    tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
                } catch (e) {
                    tags = [];
                }
            }

            const pageTemplate: Template = {
                id: row.page_template_id,
                name: row.name,
                templateType: row.template_type,
                photoCount: row.photo_count,
                category: row.category,
                layoutSchema,
                thumbnailUrl: row.thumbnail_url || undefined,
                coverUrl: row.cover_url || undefined,
                visibility: row.visibility,
                creatorId: row.creator_id,
                createdAt: row.created_at ? Number(row.created_at) : undefined,
                tags,
                favoriteCount: row.favorite_count || 0,
                useCount: row.use_count || 0
            };

            return {
                collectionId: row.collection_id,
                pageTemplateId: row.page_template_id,
                sort: row.sort,
                pageTemplate
            };
        });

        return {
            ...collection,
            items
        };
    }

    /**
     * 保存/更新合集（包含增删明细，开启事务）
     */
    async saveCollection(
        collection: Partial<TemplateCollection> & { items: { pageTemplateId: string; sort: number }[] },
        userId: string
    ): Promise<TemplateCollection> {
        const id = collection.id || uuidv4();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. 判断是否已存在以进行越权校验
            const [existing] = await connection.query<RowDataPacket[]>(
                'SELECT author FROM template_collections WHERE id = ?',
                [id]
            );

            const isNew = existing.length === 0;
            if (!isNew && existing[0].author !== userId) {
                throw new Error('权限不足，仅允许所有者修改该合集');
            }

            const title = collection.title || '新建页面合集';
            const description = collection.description || null;
            const cover = collection.cover || null;
            const visibility = collection.visibility || 'private';
            const now = Date.now();

            // 2. 插入或更新头部
            if (isNew) {
                await connection.query(
                    `INSERT INTO template_collections (id, title, description, cover, author, visibility, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [id, title, description, cover, userId, visibility, now]
                );
            } else {
                await connection.query(
                    `UPDATE template_collections 
                     SET title = ?, description = ?, cover = ?, visibility = ? 
                     WHERE id = ?`,
                    [title, description, cover, visibility, id]
                );
            }

            // 3. 物理删除所有已有关联明细
            await connection.query(
                'DELETE FROM template_collection_items WHERE collection_id = ?',
                [id]
            );

            // 4. 重新批量插入新明细
            if (collection.items && collection.items.length > 0) {
                const insertValues = collection.items.map(item => [id, item.pageTemplateId, item.sort]);
                await connection.query(
                    'INSERT INTO template_collection_items (collection_id, page_template_id, sort) VALUES ?',
                    [insertValues]
                );
            }

            await connection.commit();

            return {
                id,
                title,
                description: description || undefined,
                cover: cover || undefined,
                author: isNew ? userId : existing[0].author,
                visibility,
                createdAt: isNew ? now : Number(existing[0].created_at)
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 删除合集
     */
    async deleteCollection(id: string, userId: string): Promise<boolean> {
        // 先校验所有权
        const [existing] = await pool.query<RowDataPacket[]>(
            'SELECT author FROM template_collections WHERE id = ?',
            [id]
        );
        if (existing.length === 0) return false;
        if (existing[0].author !== userId) {
            throw new Error('权限不足，仅允许所有者删除该合集');
        }

        const [result] = await pool.query<ResultSetHeader>(
            'DELETE FROM template_collections WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    /**
     * 批量应用合集到某本时光集（克隆合集下的全部页面模板，批量插入并重新计算 sort_order）
     */
    async applyCollectionToBook(
        collectionId: string,
        bookId: string,
        afterPageId: string | null,
        userId: string
    ): Promise<string[]> {
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. 验证目标书籍所有权
            const [books] = await connection.query<RowDataPacket[]>(
                'SELECT user_id FROM books WHERE id = ? AND deleted_at IS NULL',
                [bookId]
            );
            if (books.length === 0) {
                throw new Error('目标书籍不存在');
            }
            if (books[0].user_id !== userId) {
                throw new Error('权限不足，无法修改他人书籍');
            }

            // 2. 获取合集下所有页面模板
            const [templates] = await connection.query<RowDataPacket[]>(
                `SELECT pt.id, pt.name, pt.template_type, pt.elements 
                 FROM template_collection_items tci
                 JOIN page_templates pt ON tci.page_template_id = pt.id
                 WHERE tci.collection_id = ?
                 ORDER BY tci.sort ASC`,
                [collectionId]
            );

            if (templates.length === 0) {
                throw new Error('合集中没有可用的页面模板');
            }

            // 3. 获取书籍的所有页面以进行精准定位与排序重构
            const [existingPages] = await connection.query<RowDataPacket[]>(
                'SELECT id, sort_order FROM pages WHERE book_id = ? ORDER BY sort_order ASC',
                [bookId]
            );

            // 查找插入锚点位置
            let insertIndex = existingPages.length; // 默认追加末尾
            if (afterPageId) {
                const idx = existingPages.findIndex(p => p.id === afterPageId);
                if (idx !== -1) {
                    insertIndex = idx + 1;
                }
            }

            const newPageIds: string[] = [];
            const newInsertedPages: any[] = [];

            // 4. 循环克隆每一个页面模板，生成 Page 记录
            for (const pt of templates) {
                const newPageId = uuidv4();
                newPageIds.push(newPageId);

                let elements = pt.elements;
                if (typeof elements === 'string') {
                    try {
                        elements = JSON.parse(elements);
                    } catch (e) {
                        elements = {};
                    }
                }

                // 物理克隆：由于是应用模板为新页面，需要重新生成 V2.0 自由组件的实例 UUID 隔离冲突
                if (elements.version === '2.0' && elements.elements && Array.isArray(elements.elements)) {
                    const idMapping = new Map<string, string>();
                    // 1. 生成新 ID 映射
                    elements.elements.forEach((el: any) => {
                        const newElId = uuidv4();
                        idMapping.set(el.id, newElId);
                        el.id = newElId;
                    });
                    // 2. 依据映射重构建组关系
                    elements.elements.forEach((el: any) => {
                        if (el.groupId && idMapping.has(el.groupId)) {
                            el.groupId = idMapping.get(el.groupId);
                        }
                    });
                }

                newInsertedPages.push({
                    id: newPageId,
                    pageTitle: pt.name,
                    isChapterStart: 0,
                    pageType: pt.template_type || 'content',
                    templateId: pt.id,
                    elements: JSON.stringify(elements)
                });
            }

            // 5. 组装最终的页面列表顺序，并进行批量数据库更新
            const finalPagesList: any[] = [];
            
            // 插入点之前的页面
            for (let i = 0; i < insertIndex; i++) {
                finalPagesList.push(existingPages[i]);
            }
            // 新插入的页面
            for (const newPage of newInsertedPages) {
                finalPagesList.push(newPage);
            }
            // 插入点之后的页面
            for (let i = insertIndex; i < existingPages.length; i++) {
                finalPagesList.push(existingPages[i]);
            }

            // 6. 清理时光集原页面排序，并重新写入页面（由于在事务中，可先批量插入新页面，再统一更新 sort_order）
            for (const newPage of newInsertedPages) {
                await connection.query(
                    `INSERT INTO pages (id, book_id, page_title, is_chapter_start, page_type, template_id, elements, template_origin_type, template_origin_id, sort_order) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                    [
                        newPage.id,
                        bookId,
                        newPage.pageTitle,
                        newPage.isChapterStart,
                        newPage.pageType,
                        newPage.templateId,
                        newPage.elements,
                        'COLLECTION',
                        collectionId
                    ]
                );
            }

            // 统一修正最终 sort_order
            for (let idx = 0; idx < finalPagesList.length; idx++) {
                await connection.query(
                    'UPDATE pages SET sort_order = ? WHERE id = ?',
                    [idx, finalPagesList[idx].id]
                );
            }

            // 7. 递增各单页模板使用计数 (use_count)
            const templateIds = templates.map(t => t.id);
            await connection.query(
                'UPDATE page_templates SET use_count = use_count + 1 WHERE id IN (?)',
                [templateIds]
            );

            await connection.commit();
            return newPageIds;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    private mapRowToCollection(row: RowDataPacket): TemplateCollection {
        return {
            id: row.id,
            title: row.title,
            description: row.description || undefined,
            cover: row.cover || undefined,
            author: row.author,
            visibility: row.visibility,
            createdAt: Number(row.created_at),
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined
        };
    }
}

export const collectionService = new CollectionService();
