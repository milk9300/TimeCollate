import { Router } from 'express';
import { authMiddleware } from './authMiddleware.js';
import { notificationService } from '../services/NotificationService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * GET /api/notifications
 * 分页拉取当前用户的通知列表
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page as string || '1', 10);
        const limit = parseInt(req.query.limit as string || '20', 10);

        const list = await notificationService.getNotifications(req.userId!, page, limit);
        sendSuccess(res, list);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/notifications/unread-count
 * 获取当前用户的未读通知计数
 */
router.get('/unread-count', authMiddleware, async (req, res) => {
    try {
        const count = await notificationService.getUnreadCount(req.userId!);
        sendSuccess(res, { count });
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/notifications/read
 * 批量或一键标记通知已读
 */
router.post('/read', authMiddleware, async (req, res) => {
    try {
        const { notificationIds } = req.body;
        
        // 传递可选的 ID 列表，如果为空则将该用户所有消息设为已读
        await notificationService.markAsRead(req.userId!, notificationIds);
        sendSuccess(res, null, '消息已成功设为已读');
    } catch (error) {
        sendError(res, error as Error);
    }
});

export default router;
