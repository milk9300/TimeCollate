import axios from 'axios';

export type NotificationActionType = 'like' | 'favorite' | 'comment' | 'follow' | 'clone' | 'system';
export type NotificationEntityType = 'book' | 'template' | 'theme' | 'user' | 'comment' | 'system';

export interface Notification {
    id: string;
    receiverId: string;
    senderId: string | null;
    senderNickname: string;
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
     * 分页拉取用户的通知列表
     */
    async getNotifications(page: number = 1, limit: number = 20): Promise<Notification[]> {
        const response = await axios.get('/notifications', {
            params: { page, limit }
        });
        return response.data.data;
    }

    /**
     * 获取未读通知计数
     */
    async getUnreadCount(): Promise<number> {
        const response = await axios.get('/notifications/unread-count');
        return response.data.data.count;
    }

    /**
     * 标记已读 (不传参数代表一键全部已读)
     */
    async markAsRead(notificationIds?: string[]): Promise<boolean> {
        const response = await axios.post('/notifications/read', { notificationIds });
        return response.data.success;
    }
}

export const notificationService = new NotificationService();
