import { Router } from 'express';
import { getSignedUrl } from '../services/OssService.js';
import { sendSuccess, sendBadRequest } from '../utils/response.js';

const router = Router();

/**
 * GET /api/sign-url
 * 为 OSS 私有文件生成临时签名 URL
 * Query: ossKey - OSS 存储键
 * Query: expires - 过期时间（秒），默认 3600
 */
router.get('/', (req, res) => {
    const ossKey = req.query.ossKey as string;
    const expires = parseInt(req.query.expires as string) || 3600;

    if (!ossKey) {
        return sendBadRequest(res, 'ossKey is required');
    }

    const signedUrl = getSignedUrl(ossKey, expires);
    sendSuccess(res, { signedUrl });
});

/**
 * POST /api/sign-url/batch
 * 批量生成签名 URL
 * Body: { ossKeys: string[], expires?: number }
 */
router.post('/batch', (req, res) => {
    const { ossKeys, expires = 3600 } = req.body;

    if (!ossKeys || !Array.isArray(ossKeys) || ossKeys.length === 0) {
        return sendBadRequest(res, 'ossKeys array is required');
    }

    const signedUrls = ossKeys.map((ossKey: string) => ({
        ossKey,
        signedUrl: getSignedUrl(ossKey, expires),
    }));

    sendSuccess(res, signedUrls);
});

export default router;
