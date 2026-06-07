import { Router } from 'express';
import { authMiddleware } from './authMiddleware.js';
import { socialService } from '../services/SocialService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * POST /api/social/follow
 * 关注/取消关注用户 (双向切换)
 */
router.post('/follow', authMiddleware, async (req, res) => {
    try {
        const { leaderId } = req.body;
        if (!leaderId) {
            return res.status(400).json({ success: false, error: '目标用户ID不能为空' });
        }

        const result = await socialService.toggleFollow(req.userId!, leaderId);
        sendSuccess(res, result, result.followed ? '关注成功' : '已取消关注');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/social/follow-status/:leaderId
 * 获取当前用户对某用户的关注状态
 */
router.get('/follow-status/:leaderId', authMiddleware, async (req, res) => {
    try {
        const isFollowing = await socialService.isFollowing(req.userId!, req.params.leaderId);
        sendSuccess(res, { following: isFollowing });
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/social/stats/:userId
 * 获取创作者主页的粉丝、关注数与获赞数
 */
router.get('/stats/:userId', async (req, res) => {
    try {
        const stats = await socialService.getSocialStats(req.params.userId);
        sendSuccess(res, stats);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/social/followers/:userId
 * 获取指定用户的粉丝列表
 */
router.get('/followers/:userId', async (req, res) => {
    try {
        const list = await socialService.getFollowers(req.params.userId);
        sendSuccess(res, list);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/social/following/:userId
 * 获取指定用户关注的创作者列表
 */
router.get('/following/:userId', async (req, res) => {
    try {
        const list = await socialService.getFollowing(req.params.userId);
        sendSuccess(res, list);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/social/comment
 * 发表评论或页面贴纸留言
 */
router.post('/comment', authMiddleware, async (req, res) => {
    try {
        const { bookId, pageId, content, stickerType, xPercent, yPercent } = req.body;
        if (!bookId || !content) {
            return res.status(400).json({ success: false, error: '书籍ID与评论内容不能为空' });
        }

        const comment = await socialService.addComment(
            req.userId!,
            bookId,
            pageId || null,
            content,
            stickerType,
            xPercent,
            yPercent
        );
        sendSuccess(res, comment, '评论成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/social/comments
 * 获取评论/贴纸列表
 * query 参数: bookId, pageId (可选)
 */
router.get('/comments', async (req, res) => {
    try {
        const bookId = req.query.bookId as string;
        const pageId = req.query.pageId as string || null;

        if (!bookId) {
            return res.status(400).json({ success: false, error: '必须指定书籍ID' });
        }

        const comments = await socialService.getComments(bookId, pageId);
        sendSuccess(res, comments);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * DELETE /api/social/comment/:commentId
 * 删除评论 (带本人/书主鉴权)
 */
router.delete('/comment/:commentId', authMiddleware, async (req, res) => {
    try {
        await socialService.deleteComment(req.params.commentId, req.userId!);
        sendSuccess(res, null, '评论已成功删除');
    } catch (error) {
        sendError(res, error as Error);
    }
});

export default router;
