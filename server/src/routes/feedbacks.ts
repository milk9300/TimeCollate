import { Router } from 'express';
import { FeedbackService } from '../services/FeedbackService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authMiddleware } from './authMiddleware.js';

const router = Router();
const feedbackService = new FeedbackService();

/**
 * 获取反馈列表 (仅限当前用户自己的反馈)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const feedbacks = await feedbackService.getFeedbacks(req.userId);
        sendSuccess(res, feedbacks);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * 获取公开反馈列表 (广场展示)
 */
router.get('/public', authMiddleware, async (req, res) => {
    try {
        const feedbacks = await feedbackService.getPublicFeedbacks();
        sendSuccess(res, feedbacks);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * 获取公开反馈详情 (广场详情展示)
 */
router.get('/public/:id', authMiddleware, async (req, res) => {
    try {
        const feedback = await feedbackService.getPublicFeedbackById(req.params.id);
        if (!feedback) {
            return sendError(res, new Error('未找到该反馈'), 404);
        }
        sendSuccess(res, feedback);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * 获取反馈详情 (仅限当前用户自己的反馈)
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const feedback = await feedbackService.getFeedbackById(req.params.id, req.userId);
        if (!feedback) {
            return sendError(res, new Error('未找到该反馈或无权访问'), 404);
        }
        sendSuccess(res, feedback);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * 提交反馈
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { content, images } = req.body;
        if (!content) {
            return sendError(res, new Error('反馈内容不能为空'), 400);
        }

        const feedback = await feedbackService.saveFeedback({
            content,
            images,
            userId: req.userId
        });

        sendSuccess(res, feedback);
    } catch (error) {
        sendError(res, error as Error);
    }
});

export default router;
