import { Router } from 'express';
import { authMiddleware } from './authMiddleware.js';
import { pexelsService } from '../services/PexelsService.js';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response.js';

const router = Router();

// 所有 Pexels 代理接口均要求登录授权
router.use(authMiddleware);

/**
 * GET /api/pexels/search
 * 搜索 Pexels 图片
 *
 * Query Params:
 *   - query (string, 必填): 搜索关键词
 *   - page (number, 可选): 页码，默认 1
 *   - per_page (number, 可选): 每页数量，默认 24，最大 80
 *   - locale (string, 可选): 语言代码，默认 zh-CN
 */
router.get('/search', async (req, res) => {
    try {
        const query = req.query.query as string;
        if (!query || query.trim().length === 0) {
            return sendBadRequest(res, 'Search query is required');
        }

        const page = parseInt(req.query.page as string) || 1;
        const perPage = parseInt(req.query.per_page as string) || 24;
        const locale = (req.query.locale as string) || 'zh-CN';

        const result = await pexelsService.searchPhotos(query, page, perPage, locale);
        sendSuccess(res, result);
    } catch (error) {
        const err = error as Error;
        // 区分速率限制错误和其他错误
        if (err.message.includes('rate limit')) {
            sendError(res, err.message, 429);
        } else if (err.message.includes('not configured')) {
            sendError(res, err.message, 503);
        } else {
            sendError(res, err);
        }
    }
});

/**
 * GET /api/pexels/curated
 * 获取 Pexels 精选推荐图片
 *
 * Query Params:
 *   - page (number, 可选): 页码，默认 1
 *   - per_page (number, 可选): 每页数量，默认 24，最大 80
 */
router.get('/curated', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const perPage = parseInt(req.query.per_page as string) || 24;

        const result = await pexelsService.getCuratedPhotos(page, perPage);
        sendSuccess(res, result);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('rate limit')) {
            sendError(res, err.message, 429);
        } else if (err.message.includes('not configured')) {
            sendError(res, err.message, 503);
        } else {
            sendError(res, err);
        }
    }
});

/**
 * GET /api/pexels/photos/:id
 * 获取 Pexels 单张照片详情
 *
 * Params:
 *   - id (number, 必填): Pexels 照片 ID
 */
router.get('/photos/:id', async (req, res) => {
    try {
        const photoId = parseInt(req.params.id);
        if (isNaN(photoId) || photoId <= 0) {
            return sendBadRequest(res, 'Valid photo ID is required');
        }

        const result = await pexelsService.getPhotoById(photoId);
        sendSuccess(res, result);
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('rate limit')) {
            sendError(res, err.message, 429);
        } else if (err.message.includes('not configured')) {
            sendError(res, err.message, 503);
        } else {
            sendError(res, err);
        }
    }
});

export default router;
