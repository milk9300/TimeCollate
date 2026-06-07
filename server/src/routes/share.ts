import express from 'express';
import { shareService } from '../services/ShareService.js';

const router = express.Router();

/**
 * GET /api/share/:slug
 * 根据短码获取书籍数据（公开接口）
 */
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const book = await shareService.getBookBySlug(slug);

        if (!book) {
            res.status(404).json({ success: false, error: '分享链接无效或已过期' });
            return;
        }

        res.json({ success: true, data: book });
    } catch (error) {
        console.error('Fetch shared book failed:', error);
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

export default router;
