import { Router } from 'express';
import { bookService } from '../services/BookService.js';
import { shareService } from '../services/ShareService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { authMiddleware } from './authMiddleware.js';

const router = Router();

// 所有书籍接口均需要登录访问
router.use(authMiddleware);

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const result = await bookService.getBooks(req.userId!, page, pageSize);
        sendSuccess(res, result);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/books/public
 * 获取广场书籍列表（公开）
 */
router.get('/public', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 20;
        const category = req.query.category as string;
        const targetUserId = req.query.userId as string;
        const result = await bookService.getPublicBooks(page, pageSize, category, req.userId, targetUserId);
        sendSuccess(res, result);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/books/rankings
 * 获取广场排行榜数据（高光作品与活跃创作者）
 */
router.get('/rankings', async (req, res) => {
    try {
        const result = await bookService.getRankings();
        sendSuccess(res, result);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/books/trash/list
 * 获取回收站中的书籍列表
 */
router.get('/trash/list', async (req, res) => {
    try {
        const books = await bookService.getDeletedBooks(req.userId!);
        sendSuccess(res, books);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/books/:id
 * 获取书籍详情
 */
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const book = await bookService.getBook(id, req.userId);
        if (!book) {
            return res.status(404).json({ success: false, error: '书籍不存在或无权访问' });
        }
        sendSuccess(res, book);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/books
 * 保存书籍（新建或更新）
 */
router.post('/', async (req, res) => {
    try {
        const book = req.body;
        book.userId = req.userId;
        const savedBook = await bookService.saveBook(book);
        sendSuccess(res, savedBook, '保存成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/books/:id/share
 * 生成分享链接
 */
router.post('/:id/share', async (req, res) => {
    try {
        const id = req.params.id;
        const book = await bookService.getBook(id, req.userId);
        if (!book) {
            return res.status(403).json({ success: false, error: '无权分享此书籍' });
        }
        const shareUrl = await shareService.createShare(id);
        sendSuccess(res, { shareUrl }, '分享链接生成成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * PATCH /api/books/:id/status
 * 更新书籍发布状态 (用户端：申请发布/撤回)
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const id = req.params.id;
        const { status } = req.body;

        // 用户只能执行以下操作：
        // 1. private -> pending (申请发布)
        // 2. pending/published/rejected -> private (撤回/下架)

        const book = await bookService.getBook(id, req.userId);
        if (!book) {
            return res.status(404).json({ success: false, error: '书籍不存在' });
        }

        if (status === 'pending') {
            // 申请发布
            if (book.status !== 'private' && book.status !== 'rejected') {
                // 允许从 rejected 重新提交，或者从 private 提交
                // 如果已经是 pending 或 published，理论上前端不应该允许，后端做个拦截
                if (book.status === 'published') return sendError(res, new Error('书籍已发布'));
                if (book.status === 'pending') return sendError(res, new Error('书籍正在审核中'));
            }
            await bookService.updateStatus(id, 'pending', req.userId);
            sendSuccess(res, null, '已提交审核');
        } else if (status === 'private') {
            // 撤回/下架
            await bookService.updateStatus(id, 'private', req.userId);
            sendSuccess(res, null, '已撤回转为私密');
        } else {
            return sendError(res, new Error('无效的状态操作'));
        }
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * DELETE /api/books/:id
 * 软删除书籍
 */
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await bookService.softDeleteBook(id, req.userId!);
        sendSuccess(res, null, '已移入回收站');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/books/:id/restore
 * 恢复已删除的书籍
 */
router.post('/:id/restore', async (req, res) => {
    try {
        const id = req.params.id;
        await bookService.restoreBook(id, req.userId!);
        sendSuccess(res, null, '书籍已恢复');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * DELETE /api/books/:id/permanent
 * 永久删除书籍
 */
router.delete('/:id/permanent', async (req, res) => {
    try {
        const id = req.params.id;
        const ossKeys = await bookService.permanentDeleteBook(id, req.userId!);

        if (ossKeys.length > 0) {
            const { deleteFromOss } = await import('../services/OssService.js');
            Promise.all(ossKeys.map(key => deleteFromOss(key))).catch(err => {
                console.error('Failed to cleanup OSS files during permanent delete', err);
            });
        }

        sendSuccess(res, null, '书籍已永久删除');
    } catch (error) {
        sendError(res, error as Error);
    }
});

export default router;
