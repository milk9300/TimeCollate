import { Router } from 'express';
import { authMiddleware } from './authMiddleware.js';
import { authService } from '../services/AuthService.js';
import { interactionService } from '../services/InteractionService.js';
import { bookService } from '../services/BookService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * 可选认证中间件
 * 用于记录阅读行为，即使未登录也能利用 IP 排重计入阅读量
 */
const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const userId = authService.verifyToken(token);
            req.userId = userId;
            req.token = token;
        } catch (error) {
            // 忽略非强校验情况下的 token 异常
        }
    }
    next();
};

/**
 * 辅助校验参数 (Fail-Fast)
 */
function validateParams(entityType: string, entityId: string) {
    if (!entityType || !entityId) {
        throw new Error('Missing parameter (entityType, entityId)');
    }
    if (!['book', 'template'].includes(entityType)) {
        throw new Error('Invalid entityType');
    }
}

/**
 * POST /api/interactions/like
 * 点赞/取消点赞 (双向切换)
 */
router.post('/like', authMiddleware, async (req, res) => {
    try {
        const { entityType, entityId } = req.body;
        validateParams(entityType, entityId);

        const result = await interactionService.toggleLike(req.userId!, entityType, entityId);
        sendSuccess(res, result, result.liked ? '点赞成功' : '已取消点赞');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/interactions/favorite
 * 收藏/取消收藏 (双向切换)
 */
router.post('/favorite', authMiddleware, async (req, res) => {
    try {
        const { entityType, entityId } = req.body;
        validateParams(entityType, entityId);

        const result = await interactionService.toggleFavorite(req.userId!, entityType, entityId);
        sendSuccess(res, result, result.favorited ? '收藏成功' : '已取消收藏');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/interactions/view
 * 记录一次阅读记录 (支持匿名防刷)
 */
router.post('/view', optionalAuthMiddleware, async (req, res) => {
    try {
        const { entityType, entityId } = req.body;
        validateParams(entityType, entityId);

        // 获取真实的客户端 IP 地址进行去重防刷
        const ipAddress = req.ip || req.socket.remoteAddress || '';
        const count = await interactionService.recordView(entityType, entityId, req.userId, ipAddress);
        
        sendSuccess(res, { views: count }, '阅读次数记录成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/interactions/status
 * 查询当前用户对指定实体的交互状态
 */
router.get('/status', optionalAuthMiddleware, async (req, res) => {
    try {
        const { entityType, entityId } = req.query;
        validateParams(entityType as string, entityId as string);

        const stats = await interactionService.getEntityInteractions(
            entityType as any,
            entityId as string,
            req.userId
        );

        sendSuccess(res, stats);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/interactions/favorites
 * 获取用户收藏的书籍列表 (支持分页，有权限与隐私验证)
 */
router.get('/favorites', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const targetUserId = (req.query.userId as string) || req.userId!;

        const result = await bookService.getFavoritedBooks(targetUserId, req.userId!, page, pageSize);
        sendSuccess(res, result);
    } catch (error) {
        sendError(res, error as Error);
    }
});

export default router;
