import { Router } from 'express';
import { authMiddleware } from './authMiddleware.js';
import { adminMiddleware } from './adminMiddleware.js';
import { adminService } from '../services/AdminService.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// 所有 admin 路由都需要认证且必须是管理员
router.use(authMiddleware, adminMiddleware);

/**
 * 获取系统概览数据
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await adminService.getSystemStats();
        sendSuccess(res, stats);
    } catch (error: any) {
        sendError(res, error.message || '获取统计数据失败');
    }
});

/**
 * 用户管理列表
 */
router.get('/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const search = req.query.search as string;
        const result = await adminService.getUsers(page, pageSize, search);
        sendSuccess(res, result);
    } catch (error: any) {
        sendError(res, error.message || '获取用户列表失败');
    }
});

/**
 * 更新用户信息 (角色/状态)
 */
router.patch('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { role, status } = req.body;
        await adminService.updateUser(id, { role, status });
        sendSuccess(res, null, '操作成功');
    } catch (error: any) {
        sendError(res, error.message || '更新用户信息失败');
    }
});

/**
 * 书籍管理列表
 */
router.get('/books', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const status = req.query.status as string;
        const result = await adminService.getAllBooks(page, pageSize, status);
        sendSuccess(res, result);
    } catch (error: any) {
        sendError(res, error.message || '获取书籍列表失败');
    }
});

/**
 * 删除书籍 (软删除)
 */
router.delete('/books/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await adminService.deleteBook(id);
        sendSuccess(res, null, '书籍已删除');
    } catch (error: any) {
        sendError(res, error.message || '删除书籍失败');
    }
});

/**
 * 审核书籍 (批准/拒绝)
 */
router.post('/books/:id/audit', async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'approve' | 'reject'
        const status = action === 'approve' ? 'published' : 'rejected';
        await adminService.auditBook(id, status);
        sendSuccess(res, null, '审核操作已完成');
    } catch (error: any) {
        sendError(res, error.message || '审核失败');
    }
});

/**
 * 反馈列表
 */
router.get('/feedbacks', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const result = await adminService.getFeedbacks(page, pageSize);
        sendSuccess(res, result);
    } catch (error: any) {
        sendError(res, error.message || '获取反馈列表失败');
    }
});

/**
 * 更新反馈状态及回复
 */
router.patch('/feedbacks/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, replyContent } = req.body;
        await adminService.updateFeedbackStatus(id, status, replyContent);
        sendSuccess(res, null, '操作成功');
    } catch (error: any) {
        sendError(res, error.message || '更新反馈状态失败');
    }
});

/**
 * 删除反馈记录
 */
router.delete('/feedbacks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await adminService.deleteFeedback(id);
        sendSuccess(res, null, '记录已删除');
    } catch (error: any) {
        sendError(res, error.message || '删除反馈失败');
    }
});

/**
 * 获取系统公告
 */
router.get('/announcement', async (req, res) => {
    try {
        const content = await adminService.getAnnouncement();
        sendSuccess(res, content);
    } catch (error: any) {
        sendError(res, error.message || '获取公告失败');
    }
});

/**
 * 更新系统公告
 */
router.post('/announcement', async (req, res) => {
    try {
        const { content, resetSeen } = req.body;
        await adminService.updateAnnouncement(content, resetSeen);
        sendSuccess(res, null, '公告已发布');
    } catch (error: any) {
        sendError(res, error.message || '发布公告失败');
    }
});

/**
 * 一键生成用户
 */
router.post('/users/generate', async (req, res) => {
    try {
        const { type, phone } = req.body;
        if (!type) {
            return res.status(400).json({ success: false, error: '账号类型不能为空' });
        }
        const result = await adminService.generateUser(type, phone);
        sendSuccess(res, result, '生成用户成功');
    } catch (error: any) {
        sendError(res, error.message || '生成用户失败');
    }
});

export default router;
