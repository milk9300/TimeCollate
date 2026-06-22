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
        let sql = 'SELECT id, name, template_type, photo_count, category, elements, thumbnail_url, visibility, creator_id, created_at FROM page_templates';
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
            'SELECT id, name, template_type, photo_count, category, elements, thumbnail_url, visibility, creator_id, created_at FROM page_templates WHERE id = ?',
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
            `SELECT t.id, t.name, t.template_type, t.photo_count, t.category, t.elements, t.thumbnail_url, t.visibility, t.creator_id, t.created_at 
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
            `SELECT id, name, template_type, photo_count, category, elements, thumbnail_url, visibility, creator_id, created_at 
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
    async saveTemplate(template: Template): Promise<Template> {
        const elementsStr = typeof template.layoutSchema === 'string' 
            ? template.layoutSchema 
            : JSON.stringify(template.layoutSchema);

        const templateType = template.templateType || 'content';
        const visibility = template.visibility || 'private';
        const creatorId = template.creatorId || 'system';
        const thumbnailUrl = template.thumbnailUrl || null;
        const now = template.createdAt || Date.now();

        await pool.query(
            `INSERT INTO page_templates (id, name, template_type, photo_count, category, elements, thumbnail_url, visibility, creator_id, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE name = ?, template_type = ?, photo_count = ?, category = ?, elements = ?, thumbnail_url = ?, visibility = ?, creator_id = ?`,
            [
                template.id, 
                template.name, 
                templateType,
                template.photoCount, 
                template.category, 
                elementsStr,
                thumbnailUrl,
                visibility,
                creatorId,
                now,
                template.name, 
                templateType,
                template.photoCount, 
                template.category, 
                elementsStr,
                thumbnailUrl,
                visibility,
                creatorId
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
        return {
            id: row.id,
            name: row.name,
            templateType: row.template_type,
            photoCount: row.photo_count,
            category: row.category,
            layoutSchema,
            thumbnailUrl: row.thumbnail_url,
            visibility: row.visibility,
            creatorId: row.creator_id,
            createdAt: row.created_at ? Number(row.created_at) : undefined
        };
    }
}

export const templateService = new TemplateService();
