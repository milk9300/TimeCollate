import { pool } from '../db/index.js';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Feedback } from '../types/index.js';
import { getSignedUrl } from './OssService.js';

export class FeedbackService {
    /**
     * 保存一条反馈
     */
    async saveFeedback(data: { content: string; images?: string[]; userId?: string }): Promise<Feedback> {
        const id = crypto.randomUUID();
        const createdAt = Date.now();
        const imagesJson = data.images ? JSON.stringify(data.images) : '[]';

        await pool.query<ResultSetHeader>(
            'INSERT INTO feedbacks (id, content, images, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
            [id, data.content, imagesJson, data.userId || null, createdAt]
        );

        return {
            id,
            content: data.content,
            images: data.images || [],
            userId: data.userId,
            createdAt
        };
    }

    /**
     * 获取反馈列表（轻型列表，不含完整图片URL，支持按用户过滤）
     */
    async getFeedbacks(userId?: string): Promise<(Feedback & { hasImages: boolean })[]> {
        let sql = 'SELECT id, content, images, created_at, user_id, status, reply_content, reply_at FROM feedbacks';
        const params: any[] = [];
        
        if (userId) {
            sql += ' WHERE user_id = ?';
            params.push(userId);
        }
        
        sql += ' ORDER BY created_at DESC';

        const [rows] = await pool.query<RowDataPacket[]>(sql, params);

        return rows.map(row => {
            let images: string[] = [];
            if (row.images) {
                try {
                    images = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
                } catch (e) {
                    console.error('Failed to parse feedback images:', row.images, e);
                }
            }
            return {
                id: row.id,
                content: row.content,
                images,
                hasImages: images.length > 0,
                userId: row.user_id || undefined,
                createdAt: Number(row.created_at),
                status: row.status,
                replyContent: row.reply_content || undefined,
                replyAt: row.reply_at ? Number(row.reply_at) : undefined
            };
        });
    }

    /**
     * 根据 ID 获取反馈详情（含压缩后的图片URL，支持所有权校验）
     */
    async getFeedbackById(id: string, userId?: string): Promise<Feedback | null> {
        let sql = 'SELECT id, content, images, created_at, user_id, status, reply_content, reply_at FROM feedbacks WHERE id = ?';
        const params: any[] = [id];

        if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }

        const [rows] = await pool.query<RowDataPacket[]>(sql, params);

        if (rows.length === 0) return null;

        const row = rows[0];
        let images: string[] = [];
        if (row.images) {
            try {
                images = typeof row.images === 'string' ? JSON.parse(row.images) : row.images;
            } catch (e) {
                console.error('Failed to parse feedback detail images:', row.images, e);
            }
        }

        // 核心优化：详情页缩略图集成 OSS 处理，等比缩放至宽度 500px，质量压缩至 80%
        const imageUrls = images.map(key =>
            getSignedUrl(key, 7200, 'image/resize,w_500/format,webp/quality,q_60')
        );

        // 原图/高清图：质量保持在 95% 或更高，用于全屏查看
        const originalImageUrls = images.map(key =>
            getSignedUrl(key, 7200, 'image/format,webp/quality,q_80')
        );

        return {
            id: row.id,
            content: row.content,
            images,
            imageUrls,
            originalImageUrls,
            userId: row.user_id || undefined,
            createdAt: Number(row.created_at),
            status: row.status,
            replyContent: row.reply_content || undefined,
            replyAt: row.reply_at ? Number(row.reply_at) : undefined
        };
    }

    /**
     * 获取公开的所有反馈 (不含 user_id，确保零信任匿名性)
     */
    async getPublicFeedbacks(): Promise<(Feedback & { hasImages: boolean })[]> {
        const sql = 'SELECT id, content, images, created_at FROM feedbacks ORDER BY created_at DESC';
        const [rows] = await pool.query<RowDataPacket[]>(sql);

        return rows.map(row => {
            const images: string[] = JSON.parse(row.images || '[]');
            return {
                id: row.id,
                content: row.content,
                images,
                hasImages: images.length > 0,
                createdAt: Number(row.created_at)
            };
        });
    }

    /**
     * 根据 ID 获取公开反馈详情 (不含 user_id，确保零信任匿名性)
     */
    async getPublicFeedbackById(id: string): Promise<Feedback | null> {
        const sql = 'SELECT id, content, images, created_at FROM feedbacks WHERE id = ?';
        const [rows] = await pool.query<RowDataPacket[]>(sql, [id]);

        if (rows.length === 0) return null;

        const row = rows[0];
        const images: string[] = JSON.parse(row.images || '[]');

        // 详情页缩略图集成 OSS 处理
        const imageUrls = images.map(key =>
            getSignedUrl(key, 7200, 'image/resize,w_500/format,webp/quality,q_60')
        );

        // 原图/高清图
        const originalImageUrls = images.map(key =>
            getSignedUrl(key, 7200, 'image/format,webp/quality,q_80')
        );

        return {
            id: row.id,
            content: row.content,
            images,
            imageUrls,
            originalImageUrls,
            createdAt: Number(row.created_at)
        };
    }
}
