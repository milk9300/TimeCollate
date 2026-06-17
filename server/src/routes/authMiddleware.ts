import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService.js';
import { sendError } from '../utils/response.js';
import { pool } from '../db/index.js';

// 扩展 Express Request 类型以包含用户 ID 和凭证 Token
declare global {
    namespace Express {
        interface Request {
            userId?: string;
            token?: string;
        }
    }
}

/**
 * 认证中间件
 * 校验请求头中的 Authorization: Bearer <token>
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: '请先登录' });
        }

        const token = authHeader.split(' ')[1];
        const userId = authService.verifyToken(token);

        // 零信任拦截校验：从数据库实时查询状态和过期时间
        const [rows]: any = await pool.query('SELECT status, expires_at FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) {
            return res.status(401).json({ success: false, error: '用户不存在' });
        }
        
        const user = rows[0];
        
        // 校验是否过期
        if (user.expires_at !== null && Number(user.expires_at) < Date.now()) {
            await pool.query("UPDATE users SET status = 'banned' WHERE id = ?", [userId]);
            return res.status(401).json({ success: false, error: '账户已过期，请联系管理员' });
        }

        // 校验是否被封禁
        if (user.status === 'banned') {
            return res.status(401).json({ success: false, error: '账户已被封禁，请联系管理员' });
        }

        req.userId = userId;
        req.token = token;

        // 异步更新用户最后活跃时间戳，Fail-Safe 设计不阻塞主流程响应
        pool.query('UPDATE users SET last_active_at = ? WHERE id = ?', [Date.now(), userId]).catch(err => {
            console.error('[AuthMiddleware] Failed to update last_active_at:', err);
        });

        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: '登录已过期或无效，请重新登录' });
    }
};
