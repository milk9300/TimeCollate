import { pool } from '../db/index.js';
import type { BookTheme } from '../types/index.js';
import type { RowDataPacket } from 'mysql2';

/**
 * 动态主题服务
 * 提供对 book_themes 表的 CRUD 操作
 */
export class ThemeService {
    /**
     * 获取主题列表（支持根据创建者、可见性进行筛选）
     */
    async getThemes(filters?: { creatorId?: string; visibility?: 'private' | 'public' }): Promise<BookTheme[]> {
        let sql = 'SELECT id, name, creator_id, visibility, theme_schema, created_at FROM book_themes';
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

        return rows.map(row => this.mapRowToTheme(row));
    }

    /**
     * 获取单个主题详情
     */
    async getThemeById(id: string): Promise<BookTheme | null> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, name, creator_id, visibility, theme_schema, created_at FROM book_themes WHERE id = ?',
            [id]
        );

        if (rows.length === 0) return null;
        return this.mapRowToTheme(rows[0]);
    }

    /**
     * 加载用户可用的主题列表（系统预置 + 用户自己创建 + 用户已从市场订阅）
     */
    async getUserThemes(userId: string): Promise<BookTheme[]> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT t.id, t.name, t.creator_id, t.visibility, t.theme_schema, t.created_at 
             FROM book_themes t
             LEFT JOIN user_collected_themes uct ON t.id = uct.theme_id AND uct.user_id = ?
             WHERE 
               (t.creator_id = 'system' AND t.visibility = 'public')
               OR t.creator_id = ?
               OR uct.user_id IS NOT NULL
             ORDER BY t.created_at DESC`,
            [userId, userId]
        );

        return rows.map(row => this.mapRowToTheme(row));
    }

    /**
     * 获取主题市场列表（公开且非当前用户自己创建的主题）
     */
    async getMarketThemes(excludeUserId: string): Promise<BookTheme[]> {
        const [rows] = await pool.query<RowDataPacket[]>(
            `SELECT id, name, creator_id, visibility, theme_schema, created_at 
             FROM book_themes 
             WHERE visibility = 'public' AND creator_id != ?
             ORDER BY created_at DESC`,
            [excludeUserId]
        );

        return rows.map(row => this.mapRowToTheme(row));
    }

    /**
     * 保存主题（新增或更新）
     */
    async saveTheme(theme: BookTheme): Promise<BookTheme> {
        const schemaStr = typeof theme.themeSchema === 'string' 
            ? theme.themeSchema 
            : JSON.stringify(theme.themeSchema);

        const visibility = theme.visibility || 'private';
        const creatorId = theme.creatorId || 'system';

        await pool.query(
            `INSERT INTO book_themes (id, name, creator_id, visibility, theme_schema) 
             VALUES (?, ?, ?, ?, ?) 
             ON DUPLICATE KEY UPDATE name = ?, creator_id = ?, visibility = ?, theme_schema = ?`,
            [
                theme.id, 
                theme.name, 
                creatorId, 
                visibility, 
                schemaStr,
                theme.name, 
                creatorId, 
                visibility, 
                schemaStr
            ]
        );

        return theme;
    }

    /**
     * 删除主题
     */
    async deleteTheme(id: string): Promise<boolean> {
        const [result] = await pool.query<any>(
            'DELETE FROM book_themes WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    /**
     * 辅助方法：将数据库行映射为 BookTheme 实体对象
     */
    private mapRowToTheme(row: RowDataPacket): BookTheme {
        let themeSchema = row.theme_schema;
        if (typeof themeSchema === 'string') {
            try {
                themeSchema = JSON.parse(themeSchema);
            } catch (e) {
                console.error('Failed to parse theme_schema JSON', e);
                themeSchema = {};
            }
        }
        return {
            id: row.id,
            name: row.name,
            creatorId: row.creator_id,
            visibility: row.visibility,
            themeSchema,
            createdAt: row.created_at ? new Date(row.created_at).getTime() : undefined
        };
    }
}

export const themeService = new ThemeService();
