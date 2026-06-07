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
    try {
        const { nickname, username, password } = req.body;
        if (!nickname || !username || !password) {
            return res.status(400).json({ success: false, error: '必填项不能为空' });
        }

        const user = await authService.register(nickname, username, password);
        sendSuccess(res, user, '注册成功');
    } catch (error) {
        sendError(res, error as Error);
    }
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
        sendSuccess(res, data, '登录成功');
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
