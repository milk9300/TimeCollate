import { Router } from 'express';
import { templateService } from '../services/TemplateService.js';
import { authMiddleware } from './authMiddleware.js';
import { adminMiddleware } from './adminMiddleware.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { pool } from '../db/index.js';

const router = Router();

/**
 * GET /api/templates
 * 获取用户当前可用的动态模板列表 (系统预置 + 个人创建 + 收藏订阅)
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await authService.getUserById(req.userId!);
        const isAdmin = user?.role === 'admin';
        const templates = await templateService.getUserTemplates(req.userId!, isAdmin);
        sendSuccess(res, templates);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/templates/market
 * 获取模板市场列表 (公开且非本人创建的模板)
 */
router.get('/market', authMiddleware, async (req, res) => {
    try {
        const templates = await templateService.getMarketTemplates(req.userId!);
        sendSuccess(res, templates);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/templates/:id
 * 获取单个模板详情 (包含零信任鉴权，非公开且非本人的私有模板拒绝访问)
 */
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const template = await templateService.getTemplateById(id);
        if (!template) {
            return res.status(404).json({ success: false, error: '模板不存在' });
        }

        // 零信任校验：仅限公开模板或创作者本人访问
        if (template.visibility !== 'public' && template.creatorId !== req.userId) {
            return res.status(403).json({ success: false, error: '权限不足，无法访问该私有模板' });
        }

        sendSuccess(res, template);
    } catch (error) {
        sendError(res, error as Error);
    }
});

import { authService } from '../services/AuthService.js';

/**
 * POST /api/templates
 * 保存/更新动态模板 (支持普通用户与管理员角色自适应鉴权)
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const template = req.body;
        if (!template.id || !template.name || !template.layoutSchema) {
            return res.status(400).json({ success: false, error: '必填项缺失 (id, name, layoutSchema)' });
        }

        // 获取当前登录用户及角色属性
        const user = await authService.getUserById(req.userId!);
        const isAdmin = user?.role === 'admin';

        // 检查模板是否已存在
        const existingTemplate = await templateService.getTemplateById(template.id);
        
        if (existingTemplate) {
            // 水平/垂直越权防护：非管理员只能更新属于自己的模板
            if (!isAdmin && existingTemplate.creatorId !== req.userId) {
                return res.status(403).json({ success: false, error: '权限不足，无法修改他人或系统模板' });
            }
        }

        // 防御性净化与参数绑定
        if (!isAdmin) {
            // 普通用户强制将其绑定为创作者
            template.creatorId = req.userId;
            // 确保可见性属于枚举值
            if (template.visibility !== 'public' && template.visibility !== 'private') {
                template.visibility = 'private';
            }
        } else {
            // 管理员若未指定则默认为 system
            if (!template.creatorId) {
                template.creatorId = 'system';
            }
        }

        const saved = await templateService.saveTemplate(template);
        sendSuccess(res, saved, '保存模板成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * DELETE /api/templates/:id
 * 删除动态模板 (支持所有者或管理员权限)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;

        // 获取当前用户角色
        const user = await authService.getUserById(req.userId!);
        const isAdmin = user?.role === 'admin';

        // 获取目标模板详情
        const template = await templateService.getTemplateById(id);
        if (!template) {
            return res.status(404).json({ success: false, error: '模板不存在' });
        }

        // 防水平/垂直越权：非管理员只能删除自己的模板
        if (!isAdmin && template.creatorId !== req.userId) {
            return res.status(403).json({ success: false, error: '权限不足，无法删除他人或系统模板' });
        }

        await templateService.deleteTemplate(id);
        sendSuccess(res, null, '删除模板成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/templates/:id/collect
 * 收藏/订阅模板
 */
router.post('/:id/collect', authMiddleware, async (req, res) => {
    try {
        const templateId = req.params.id;
        const userId = req.userId!;

        // 1. 零信任校验：确保被订阅模板存在，且为公开资产或创作者自己的资产
        const template = await templateService.getTemplateById(templateId);
        if (!template) {
            return res.status(404).json({ success: false, error: '模板不存在' });
        }

        if (template.visibility !== 'public' && template.creatorId !== userId) {
            return res.status(403).json({ success: false, error: '无权收藏该私有模板' });
        }

        // 2. 幂等式写入收藏表
        const collectedAt = Date.now();
        await pool.query(
            `INSERT INTO user_collected_templates (user_id, template_id, collected_at) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE collected_at = ?`,
            [userId, templateId, collectedAt, collectedAt]
        );

        sendSuccess(res, null, '模板收藏成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * DELETE /api/templates/:id/collect
 * 取消收藏/订阅模板
 */
router.delete('/:id/collect', authMiddleware, async (req, res) => {
    try {
        const templateId = req.params.id;
        const userId = req.userId!;

        const [result]: any = await pool.query(
            'DELETE FROM user_collected_templates WHERE user_id = ? AND template_id = ?',
            [userId, templateId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: '未收藏该模板' });
        }

        sendSuccess(res, null, '取消收藏成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

export default router;
