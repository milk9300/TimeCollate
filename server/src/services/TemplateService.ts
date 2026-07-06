import { pool } from '../db/index.js';
import type { Template } from '../types/index.js';
import type { RowDataPacket } from 'mysql2';

/**
 * 动态排版模板服务
 * 提供对 page_templates 表的 CRUD 操作
 */
export class TemplateService {
    /**
     * 获取动态模板列表（支持根据创建者、可见性进行筛选）
     */
    async getTemplates(filters?: { creatorId?: string; visibility?: 'private' | 'public' }): Promise<Template[]> {
        let sql = 'SELECT id, name, template_type, photo_count, category, elements, thumbnail_url, visibility, creator_id, created_at, tags, cover_url, favorite_count, use_count, template_origin_type, template_origin_id FROM page_templates';
        const params: any[] = [];
        const conditions: string[] = [];

        if (filters?.creatorId) {
            conditions.push('creator_id = ?');
            params.push(filters.creatorId);
        }
        if (filters?.visibility) {
            conditions.push('visibility = ?');
            params.push(filters.visibility);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY created_at DESC';

        const [rows] = await pool.query<RowDataPacket[]>(sql, params);

        return rows.map(row => this.mapRowToTemplate(row));
    }

    /**
     * 获取单个模板详情
     */
    async getTemplateById(id: string): Promise<Template | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, name, template_type, photo_count, category, elements, thumbnail_url, visibility, creator_id, created_at, tags, cover_url, favorite_count, use_count, template_origin_type, template_origin_id FROM page_templates WHERE id = ?',
            [id]
        );

        if (rows.length === 0) return null;
        return this.mapRowToTemplate(rows[0]);
    }

    /**
     * 加载用户可用的模板列表（系统预置 + 用户自己创建 + 用户已从市场订阅）
     */
    async getUserTemplates(userId: string, isAdmin: boolean = false): Promise<Template[]> {
        const systemCondition = isAdmin 
            ? "t.creator_id = 'system'" 
            : "(t.creator_id = 'system' AND t.visibility = 'public')";

        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT t.id, t.name, t.template_type, t.photo_count, t.category, t.elements, t.thumbnail_url, t.visibility, t.creator_id, t.created_at, t.tags, t.cover_url, t.favorite_count, t.use_count, t.template_origin_type, t.template_origin_id 
             FROM page_templates t
             LEFT JOIN user_collected_templates uct ON t.id = uct.template_id AND uct.user_id = ?
             WHERE 
               ${systemCondition}
               OR t.creator_id = ?
               OR uct.user_id IS NOT NULL
             ORDER BY t.created_at DESC`,
            [userId, userId]
        );

        return rows.map(row => this.mapRowToTemplate(row));
    }

    /**
     * 获取模板市场列表（公开且非当前用户自己创建的模板）
     */
    async getMarketTemplates(excludeUserId: string): Promise<Template[]> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT id, name, template_type, photo_count, category, elements, thumbnail_url, visibility, creator_id, created_at, tags, cover_url, favorite_count, use_count, template_origin_type, template_origin_id 
             FROM page_templates 
             WHERE visibility = 'public' AND creator_id != ?
             ORDER BY created_at DESC`,
            [excludeUserId]
        );

        return rows.map(row => this.mapRowToTemplate(row));
    }

    /**
     * 保存模板（新增或更新）
     */
    /**
     * 保存模板（新增或更新）
     */
    async saveTemplate(template: Template): Promise<Template> {
        const elementsStr = typeof template.layoutSchema === 'string' 
            ? template.layoutSchema 
            : JSON.stringify(template.layoutSchema);

        const templateType = template.templateType || 'content';
        const visibility = template.visibility || 'private';
        const creatorId = template.creatorId || 'system';
        const thumbnailUrl = template.thumbnailUrl || null;
        const coverUrl = template.coverUrl || null;
        const now = template.createdAt || Date.now();
        const tagsStr = template.tags ? JSON.stringify(template.tags) : null;

        await pool.query(
            `INSERT INTO page_templates (id, name, template_type, photo_count, category, elements, thumbnail_url, cover_url, visibility, creator_id, created_at, tags, template_origin_type, template_origin_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE name = ?, template_type = ?, photo_count = ?, category = ?, elements = ?, thumbnail_url = ?, cover_url = ?, visibility = ?, creator_id = ?, tags = ?`,
            [
                template.id, 
                template.name, 
                templateType,
                template.photoCount, 
                template.category, 
                elementsStr,
                thumbnailUrl,
                coverUrl,
                visibility,
                creatorId,
                now,
                tagsStr,
                template.templateOriginType || null,
                template.templateOriginId || null,
                // UPDATE 部分
                template.name, 
                templateType,
                template.photoCount, 
                template.category, 
                elementsStr,
                thumbnailUrl,
                coverUrl,
                visibility,
                creatorId,
                tagsStr
            ]
        );

        return template;
    }

    /**
     * 删除模板
     */
    async deleteTemplate(id: string): Promise<boolean> {
        const [result] = await pool.query<any>(
            'DELETE FROM page_templates WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    /**
     * 累加页面模板的使用次数
     */
    async incrementUseCount(id: string): Promise<void> {
        await pool.query(
            'UPDATE page_templates SET use_count = use_count + 1 WHERE id = ?',
            [id]
        );
    }

    /**
     * 累加整书模板的使用次数
     */
    async incrementBookUseCount(id: string): Promise<void> {
        await pool.query(
            'UPDATE books SET use_count = use_count + 1 WHERE id = ?',
            [id]
        );
    }

    /**
     * 从已有页面发布为页面模板（保留照片和文字）
     */
    async publishPageAsTemplate(pageId: string, templateData: Partial<Template> & { creatorId: string }): Promise<Template> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT elements, template_id FROM pages WHERE id = ?',
            [pageId]
        );
        if (rows.length === 0) {
            throw new Error('源页面不存在');
        }
        const pageRow = rows[0];

        let elements = pageRow.elements;
        if (typeof elements === 'string') {
            try {
                elements = JSON.parse(elements);
            } catch (e) {
                elements = {};
            }
        }

        let photoCount = 0;
        if (elements.version === '2.0' && Array.isArray(elements.elements)) {
            photoCount = elements.elements.filter((el: any) => el.type === 'photo-frame').length;
        } else if (Array.isArray(elements.photos)) {
            photoCount = elements.photos.length;
        }

        // 检查当前页面是否已经发布过单页模板 (同源 template_origin_id = pageId)
        const [existing]: any[] = await pool.query(
            'SELECT id FROM page_templates WHERE template_origin_type = ? AND template_origin_id = ? LIMIT 1',
            ['PAGE', pageId]
        );

        const { v4: uuidv4 } = await import('uuid');
        const templateId = existing.length > 0 ? existing[0].id : (templateData.id || uuidv4());
        const tagsStr = templateData.tags ? JSON.stringify(templateData.tags) : null;

        const template: Template = {
            id: templateId,
            name: templateData.name || '未命名页面模板',
            templateType: templateData.templateType || 'content',
            photoCount,
            category: templateData.category || 'general',
            layoutSchema: elements,
            thumbnailUrl: templateData.thumbnailUrl || undefined,
            coverUrl: templateData.coverUrl || undefined,
            visibility: templateData.visibility || 'private',
            creatorId: templateData.creatorId,
            createdAt: Date.now(),
            tags: templateData.tags || [],
            favoriteCount: 0,
            useCount: 0,
            templateOriginType: 'PAGE',
            templateOriginId: pageId
        };

        if (existing.length > 0) {
            // 如果已存在该页面发布的模板，则执行覆盖更新
            await pool.query(
                `UPDATE page_templates 
                 SET name = ?, template_type = ?, photo_count = ?, category = ?, elements = ?, thumbnail_url = ?, cover_url = ?, tags = ? 
                 WHERE id = ?`,
                [
                    template.name,
                    template.templateType,
                    template.photoCount,
                    template.category,
                    JSON.stringify(elements),
                    template.thumbnailUrl || null,
                    template.coverUrl || null,
                    tagsStr,
                    template.id
                ]
            );
        } else {
            // 如果是全新发布，则执行插入
            await pool.query(
                `INSERT INTO page_templates (id, name, template_type, photo_count, category, elements, thumbnail_url, cover_url, visibility, creator_id, created_at, tags, template_origin_type, template_origin_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    template.id,
                    template.name,
                    template.templateType,
                    template.photoCount,
                    template.category,
                    JSON.stringify(elements),
                    template.thumbnailUrl || null,
                    template.coverUrl || null,
                    template.visibility,
                    template.creatorId,
                    template.createdAt,
                    tagsStr,
                    'PAGE',
                    pageId
                ]
            );
        }

        return template;
    }

    /**
     * 辅助方法：将数据库行映射为 Template 实体对象
     */
    private mapRowToTemplate(row: RowDataPacket): Template {
        let layoutSchema = row.elements;
        if (typeof layoutSchema === 'string') {
            try {
                layoutSchema = JSON.parse(layoutSchema);
            } catch (e) {
                console.error('Failed to parse elements JSON', e);
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

        return {
            id: row.id,
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
            useCount: row.use_count || 0,
            templateOriginType: row.template_origin_type || undefined,
            templateOriginId: row.template_origin_id || undefined
        };
    }
}

export const templateService = new TemplateService();
