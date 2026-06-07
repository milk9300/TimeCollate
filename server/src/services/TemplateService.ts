import { pool } from '../db/index.js';
import type { Template } from '../types/index.js';
import type { RowDataPacket } from 'mysql2';

/**
 * 动态排版模板服务
 * 提供对 book_templates 表的 CRUD 操作
 */
export class TemplateService {
    /**
     * 获取动态模板列表（支持根据创建者、可见性进行筛选）
     */
    async getTemplates(filters?: { creatorId?: string; visibility?: 'private' | 'public' }): Promise<Template[]> {
        let sql = 'SELECT id, name, photo_count, category, layout_schema, visibility, creator_id, created_at FROM book_templates';
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
            'SELECT id, name, photo_count, category, layout_schema, visibility, creator_id, created_at FROM book_templates WHERE id = ?',
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
            `SELECT t.id, t.name, t.photo_count, t.category, t.layout_schema, t.visibility, t.creator_id, t.created_at 
             FROM book_templates t
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
            `SELECT id, name, photo_count, category, layout_schema, visibility, creator_id, created_at 
             FROM book_templates 
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
        const schemaStr = typeof template.layoutSchema === 'string' 
            ? template.layoutSchema 
            : JSON.stringify(template.layoutSchema);

        const visibility = template.visibility || 'private';
        const creatorId = template.creatorId || 'system';

        await pool.query(
            `INSERT INTO book_templates (id, name, photo_count, category, layout_schema, visibility, creator_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE name = ?, photo_count = ?, category = ?, layout_schema = ?, visibility = ?, creator_id = ?`,
            [
                template.id, 
                template.name, 
                template.photoCount, 
                template.category, 
                schemaStr,
                visibility,
                creatorId,
                template.name, 
                template.photoCount, 
                template.category, 
                schemaStr,
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
            'DELETE FROM book_templates WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    /**
     * 辅助方法：将数据库行映射为 Template 实体对象
     */
    private mapRowToTemplate(row: RowDataPacket): Template {
        let layoutSchema = row.layout_schema;
        if (typeof layoutSchema === 'string') {
            try {
                layoutSchema = JSON.parse(layoutSchema);
            } catch (e) {
                console.error('Failed to parse layout_schema JSON', e);
                layoutSchema = {};
            }
        }
        return {
            id: row.id,
            name: row.name,
            photoCount: row.photo_count,
            category: row.category,
            layoutSchema,
            visibility: row.visibility,
            creatorId: row.creator_id,
            createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined
        };
    }
}

export const templateService = new TemplateService();
