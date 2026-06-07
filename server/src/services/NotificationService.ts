import { pool } from '../db/index.js';
import { RowDataPacket } from 'mysql2/promise';
import { signAvatarUrl } from './OssService.js';

export type NotificationActionType = 'like' | 'favorite' | 'comment' | 'follow' | 'clone' | 'system';
export type NotificationEntityType = 'book' | 'template' | 'theme' | 'user' | 'comment' | 'system';

export interface Notification {
    id: string;
    receiverId: string;
    senderId: string | null;
    senderNickname?: string;
    senderAvatarUrl?: string;
    actionType: NotificationActionType;
    entityType: NotificationEntityType;
    entityId: string;
    entityName: string | null;
    isRead: boolean;
    createdAt: number;
}

export class NotificationService {
    /**
     * 创建一条通知
     */
    async createNotification(
        receiverId: string,
        senderId: string | null,
        actionType: NotificationActionType,
        entityType: NotificationEntityType,
        entityId: string,
        entityName?: string
    ): Promise<string> {
        // 如果原生自娱自乐就不发送了
        if (senderId === receiverId) {
            return '';
        }

        const id = crypto.randomUUID();
        const createdAt = Date.now();

        await pool.query(
            `INSERT INTO notifications (id, receiver_id, sender_id, action_type, entity_type, entity_id, entity_name, is_read, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
            [id, receiverId, senderId, actionType, entityType, entityId, entityName || null, createdAt]
        );

        return id;
    }

    /**
     * 分页拉取用户的通知列表
     */
    async getNotifications(receiverId: string, page: number = 1, limit: number = 20): Promise<Notification[]> {
        const offset = (page - 1) * limit;

        const sql = `
            SELECT 
                n.id, n.receiver_id, n.sender_id, n.action_type, n.entity_type, n.entity_id, n.entity_name, n.is_read, n.created_at,
                u.nickname as sender_nickname, u.avatar_url as sender_avatar_url
            FROM notifications n
            LEFT JOIN users u ON n.sender_id = u.id
            WHERE n.receiver_id = ?
            ORDER BY n.created_at DESC
            LIMIT ? OFFSET ?
        `;

        const [rows] = await pool.query<RowDataPacket[]>(sql, [receiverId, limit, offset]);

        return rows.map(row => ({
            id: row.id,
            receiverId: row.receiver_id,
            senderId: row.sender_id,
            senderNickname: row.sender_nickname || '系统用户',
            senderAvatarUrl: signAvatarUrl(row.sender_avatar_url) || undefined,
            actionType: row.action_type as NotificationActionType,
            entityType: row.entity_type as NotificationEntityType,
            entityId: row.entity_id,
            entityName: row.entity_name,
            isRead: row.is_read === 1,
            createdAt: Number(row.created_at)
        }));
    }

    /**
     * 获取未读通知计数
     */
    async getUnreadCount(receiverId: string): Promise<number> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM notifications WHERE receiver_id = ? AND is_read = 0',
            [receiverId]
        );
        return rows[0].count;
    }

    /**
     * 批量或一键标记已读
     */
    async markAsRead(receiverId: string, notificationIds?: string[]): Promise<void> {
        if (notificationIds && notificationIds.length > 0) {
            // 批量已读 (添加 receiver_id 防越权)
            await pool.query(
                'UPDATE notifications SET is_read = 1 WHERE receiver_id = ? AND id IN (?)',
                [receiverId, notificationIds]
            );
        } else {
            // 一键全部已读
            await pool.query(
                'UPDATE notifications SET is_read = 1 WHERE receiver_id = ?',
                [receiverId]
            );
        }
    }
}

export const notificationService = new NotificationService();
