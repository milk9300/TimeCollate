import { Router } from 'express';
import { themeService } from '../services/ThemeService.js';
import { authMiddleware } from './authMiddleware.js';
import { adminMiddleware } from './adminMiddleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { pool } from '../db/index.js';

const router = Router();

/**
 * GET /api/themes
 * 获取用户当前可用的主题列表 (系统预置 + 个人创建 + 收藏订阅)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const themes = await themeService.getUserThemes(req.userId!);
        sendSuccess(res, themes);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/themes/market
 * 获取主题市场列表 (公开且非本人创建的主题)
 */
router.get('/market', authMiddleware, async (req, res) => {
    try {
        const themes = await themeService.getMarketThemes(req.userId!);
        sendSuccess(res, themes);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/themes/:id
 * 获取单个主题详情 (包含零信任鉴权，非公开且非本人的私有主题拒绝访问)
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const theme = await themeService.getThemeById(id);
        if (!theme) {
            return res.status(404).json({ success: false, error: '主题不存在' });
        }

        // 零信任校验：仅限公开主题或创作者本人访问
        if (theme.visibility !== 'public' && theme.creatorId !== req.userId) {
            return res.status(403).json({ success: false, error: '权限不足，无法访问该私有主题' });
        }

        sendSuccess(res, theme);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/themes
 * 保存/更新动态主题 (管理员权限)
 */
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const theme = req.body;
        if (!theme.id || !theme.name || !theme.themeSchema) {
            return res.status(400).json({ success: false, error: '必填项缺失 (id, name, themeSchema)' });
        }
        const saved = await themeService.saveTheme(theme);
        sendSuccess(res, saved, '保存主题成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * DELETE /api/themes/:id
 * 删除动态主题 (管理员权限)
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await themeService.deleteTheme(id);
        if (deleted) {
            sendSuccess(res, null, '删除主题成功');
        } else {
            res.status(404).json({ success: false, error: '主题不存在' });
        }
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/themes/:id/collect
 * 收藏/订阅主题
 */
router.post('/:id/collect', authMiddleware, async (req, res) => {
    try {
        const themeId = req.params.id;
        const userId = req.userId!;

        // 1. 零信任校验：确保被订阅主题存在，且为公开资产或创作者自己的资产
        const theme = await themeService.getThemeById(themeId);
        if (!theme) {
            return res.status(404).json({ success: false, error: '主题不存在' });
        }

        if (theme.visibility !== 'public' && theme.creatorId !== userId) {
            return res.status(403).json({ success: false, error: '无权收藏该私有主题' });
        }

        // 2. 幂等式写入收藏表
        const collectedAt = Date.now();
        await pool.query(
            `INSERT INTO user_collected_themes (user_id, theme_id, collected_at) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE collected_at = ?`,
            [userId, themeId, collectedAt, collectedAt]
        );

        sendSuccess(res, null, '主题收藏成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * DELETE /api/themes/:id/collect
 * 取消收藏/订阅主题
 */
router.delete('/:id/collect', authMiddleware, async (req, res) => {
    try {
        const themeId = req.params.id;
        const userId = req.userId!;

        const [result]: any = await pool.query(
            'DELETE FROM user_collected_themes WHERE user_id = ? AND theme_id = ?',
            [userId, themeId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: '未收藏该主题' });
        }

        sendSuccess(res, null, '取消收藏成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

export default router;
