import { Router } from 'express';
import { authService } from '../services/AuthService.js';
import { authMiddleware } from './authMiddleware.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * POST /api/auth/register
 * 用户注册
 */
router.post('/register', async (req, res) => {
    return res.status(403).json({ 
        success: false, 
        error: 'For safety reasons, public registration is currently disabled. Please contact the administrator for an account.' 
    });
});

/**
 * POST /api/auth/login
 * 用户登录
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, error: '用户名或密码不能为空' });
        }

        const data = await authService.login(username, password);
        // 响应结构：{ user, accessToken, refreshToken }
        // 为向后兼容保留 token 别名（等前端全部迁移完成后可移除）
        sendSuccess(res, {
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            token: data.accessToken,
        }, '登录成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/auth/refresh
 * 使用 Refresh Token 续签新的双令牌对
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, error: 'refreshToken is required' });
        }

        const tokens = await authService.refreshAccessToken(refreshToken);
        // 同样保留 token 别名以兼容
        sendSuccess(res, {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            token: tokens.accessToken,
        }, 'Token refreshed');
    } catch (error) {
        // Refresh Token 无效或过期返回 401
        return res.status(401).json({ success: false, error: (error as Error).message });
    }
});

/**
 * POST /api/auth/logout
 * 登出，吊销当前用户的所有 Refresh Token
 */
router.post('/logout', authMiddleware, async (req, res) => {
    try {
        await authService.revokeRefreshTokensByUser(req.userId!);
        sendSuccess(res, null, '已安全登出');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await authService.getUserById(req.userId!);
        if (!user) {
            return res.status(404).json({ success: false, error: '用户未找到' });
        }
        sendSuccess(res, user);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * PUT /api/auth/profile
 * 更新用户资料
 */
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { nickname, avatarUrl } = req.body;
        const user = await authService.updateProfile(req.userId!, { nickname, avatarUrl });
        sendSuccess(res, user, '资料更新成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * PUT /api/auth/password
 * 修改用户密码
 */
router.put('/password', authMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, error: '旧密码和新密码不能为空' });
        }

        await authService.updatePassword(req.userId!, oldPassword, newPassword);
        sendSuccess(res, null, '密码修改成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * PUT /api/auth/announcement-seen
 * 标记用户已阅读公告
 */
router.put('/announcement-seen', authMiddleware, async (req, res) => {
    try {
        await authService.markAnnouncementAsSeen(req.userId!);
        sendSuccess(res, null, '状态更新成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/auth/announcement
 * 获取全局公告 (公开)
 */
router.get('/announcement', async (req, res) => {
    try {
        const content = await authService.getGlobalAnnouncement();
        sendSuccess(res, content);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/auth/user/:id
 * 获取指定用户的信息 (公开)
 */
router.get('/user/:id', async (req, res) => {
    try {
        const user = await authService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, error: '用户未找到' });
        }
        sendSuccess(res, {
            id: user.id,
            nickname: user.nickname,
            username: user.username,
            avatarUrl: user.avatarUrl,
            createdAt: user.createdAt
        });
    } catch (error) {
        sendError(res, error as Error);
    }
});

export default router;
