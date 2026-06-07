import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService.js';

/**
 * 管理员权限中间件
 * 必须在 authMiddleware 之后使用
 */
export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ success: false, error: '未认证' });
        }

        const user = await authService.getUserById(req.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, error: '权限不足，仅管理员可访问' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ success: false, error: '服务器内部错误' });
    }
};
