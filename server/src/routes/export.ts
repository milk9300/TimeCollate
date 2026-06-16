import express from 'express';
import { exportQueue } from '../queue/exportQueue.js';
import { authMiddleware } from './authMiddleware.js';
import { pool } from '../db/index.js';
import { bookService } from '../services/BookService.js';
import { storageService } from '../services/OssService.js';
import { authService } from '../services/AuthService.js';
import { fcService } from '../services/FcService.js';
import { config } from '../config/index.js';
import crypto from 'crypto';

const router = express.Router();

// 1. 公开的 Webhook 回调路由 (在 authMiddleware 之前，使用自定义 secret 鉴权)
router.post('/webhook/video', async (req, res) => {
    try {
        const { secret } = req.query;
        // Zero Trust: 验证秘钥，确保回调可信
        if (!secret || secret !== config.fc.webhookSecret) {
            res.status(401).json({ success: false, error: 'Unauthorized callback: invalid secret' });
            return;
        }

        const { taskId, success, videoUrl, ossKey, errorMessage, progress, fileSize } = req.body;
        if (!taskId) {
            res.status(400).json({ success: false, error: 'Missing taskId in body' });
            return;
        }

        // 如果是中间进度汇报
        if (progress !== undefined) {
            console.log(`[FC Webhook] Task ${taskId} reported progress: ${progress}%`);
            await pool.query(
                `UPDATE export_tasks SET progress = ?, status = 'active' WHERE id = ?`,
                [progress, taskId]
            );
            res.json({ success: true });
            return;
        }

        console.log(`[FC Webhook] Received completion status for task ${taskId}: success=${success}`);

        if (success) {
            // 支持对不同导出格式进行合理的大小估算，并优先采用云端上报的真实体积
            const defaultSize = 5 * 1024 * 1024;
            const finalSize = fileSize || defaultSize;

            await pool.query(
                `UPDATE export_tasks 
                 SET status = 'completed', progress = 100, download_url = ?, oss_key = ?, file_size = ? 
                 WHERE id = ?`,
                [videoUrl, ossKey || null, finalSize, taskId]
            );
            // 记录导出流量
            const { trafficService } = await import('../services/TrafficService.js');
            await trafficService.recordTraffic('export', finalSize);
        } else {
            await pool.query(
                `UPDATE export_tasks 
                 SET status = 'failed', error_message = ? 
                 WHERE id = ?`,
                [errorMessage || 'Unknown FC error', taskId]
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[FC Webhook] Error processing callback:', error);
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

// 2. 应用用户会话鉴权中间件 (在此之后的路由均需验证用户 session)
router.use(authMiddleware);

/**
 * GET /api/export/tasks
 * 获取用户的导出任务历史与实时状态列表
 */
router.get('/tasks', async (req, res) => {
    try {
        const [tasks]: any = await pool.query(
            `SELECT * FROM export_tasks 
             WHERE user_id = ? 
             ORDER BY created_at DESC 
             LIMIT 50`,
            [req.userId]
        );

        // 动态计算并更新已完成任务的 24 小时预签名临时下载链接
        for (const task of tasks) {
            if (task.status === 'completed' && task.oss_key) {
                try {
                    task.download_url = await storageService.getSignedUrl(task.oss_key, 86400);
                } catch (e) {
                    console.error(`[Export API] Failed to sign URL for task ${task.id}:`, e);
                }
            }
        }

        res.json({ success: true, tasks });
    } catch (error) {
        console.error('Get export tasks list failed:', error);
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});



/**
 * POST /api/export/:bookId
 * 异步导出 PDF / 其他格式 (后端通过 Playwright 动态渲染)
 * Query: ?type=pdf
 */
router.post('/:bookId', async (req, res) => {
    try {
        const { bookId } = req.params;
        const { type } = req.query;

        if (!type || (type !== 'pdf' && type !== 'video')) {
            res.status(400).json({ success: false, error: 'Invalid or missing export type. Use ?type=pdf or ?type=video' });
            return;
        }

        // 零信任校验：确认书籍所有权与标题
        const book = await bookService.getBook(bookId, req.userId);
        if (!book) {
            res.status(404).json({ success: false, error: 'Book not found' });
            return;
        }
        if (book.userId !== req.userId) {
            res.status(403).json({ success: false, error: 'Permission denied: Not the owner of the book' });
            return;
        }

        const taskId = crypto.randomUUID();

        // 写入任务数据表，设为 waiting 状态
        await pool.query(
            `INSERT INTO export_tasks (id, user_id, book_id, book_title, format, status, progress)
             VALUES (?, ?, ?, ?, ?, 'waiting', 0)`,
            [taskId, req.userId, bookId, book.title, type]
        );

        const user = await authService.getUserById(req.userId!);

        // 统一通过阿里云函数计算（FC 3.0）进行异步导出
        try {
            await fcService.invokeExportAsync({
                bookId,
                taskId,
                token: req.token || '',
                user,
                type: type as 'pdf' | 'video',
                pageSize: book.pageSize || 'A4'
            });

            res.status(202).json({
                success: true,
                jobId: taskId,
                message: type === 'pdf' 
                    ? 'PDF export job initiated via Aliyun FC'
                    : '3D Video export job initiated via Aliyun FC'
            });
        } catch (err) {
            // 触发失败，立即置状态为失败并写入错误信息
            await pool.query(
                `UPDATE export_tasks SET status = 'failed', error_message = ? WHERE id = ?`,
                [(err as Error).message, taskId]
            );
            throw err;
        }
    } catch (error) {
        console.error('Queue export failed:', error);
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

/**
 * GET /api/export/status/:jobId
 * 轮询数据库获取任务处理状态及下载链接
 */
router.get('/status/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const [rows]: any = await pool.query(
            `SELECT * FROM export_tasks WHERE id = ? AND user_id = ?`,
            [jobId, req.userId]
        );

        if (rows.length === 0) {
            res.status(404).json({ success: false, error: 'Export job not found' });
            return;
        }

        const task = rows[0];
        let downloadUrl = task.download_url;

        // 动态续签 URL 连接，保证轮询获取的下载地址时刻处于可用期内
        if (task.status === 'completed' && task.oss_key) {
            try {
                downloadUrl = await storageService.getSignedUrl(task.oss_key, 86400);
            } catch (e) {
                console.error(`[Export API] Failed to sign URL for status check of task ${task.id}:`, e);
            }
        }

        res.json({
            success: true,
            status: task.status, // 'waiting' | 'active' | 'completed' | 'failed'
            progress: task.progress || 0,
            downloadUrl,
            error: task.error_message || undefined,
        });
    } catch (error) {
        console.error('Get export job status failed:', error);
        res.status(500).json({ success: false, error: (error as Error).message });
    }
});

export default router;
