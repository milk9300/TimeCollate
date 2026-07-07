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

        // 获取当前登录用户及角色属性
        const user = await authService.getUserById(req.userId!);
        const isPrivileged = user?.role === 'admin' || (user?.role as string) === 'designer';

        // 零信任校验：仅限公开模板、创作者本人、或者管理员与设计师访问
        if (template.visibility !== 'public' && template.creatorId !== req.userId && !isPrivileged) {
            return res.status(403).json({ success: false, error: '权限不足，无法访问该私有模板' });
        }

        sendSuccess(res, template);
    } catch (error) {
        sendError(res, error as Error);
    }
});

import { authService } from '../services/AuthService.js';
import { sanitizePageToTemplate } from '../utils/templateSanitizer.js';

/**
 * POST /api/templates/publish
 * 创作者发布排版设计为公共模板（物理复制私照并脱敏）
 */
router.post('/publish', authMiddleware, async (req, res) => {
    try {
        const user = await authService.getUserById(req.userId!);
        if (!user || (user.role !== 'creator' && user.role !== 'admin' && (user.role as string) !== 'designer')) {
            return res.status(403).json({ success: false, error: '权限不足，仅允许创作者、设计师或管理员发布模板到公共市场' });
        }

        const { id, name, templateType, photoCount, category, elements, background, thumbnailUrl, coverUrl, tags } = req.body;
        
        if (!id || !name || !elements) {
            return res.status(400).json({ success: false, error: '必填参数缺失 (id, name, elements)' });
        }

        // 调用 Fail-Fast 数据脱敏与资源一键转公管道
        const sanitizedSchema = await sanitizePageToTemplate(elements, background || {}, req.userId!);

        const templateData = {
            id,
            name,
            templateType: templateType || 'content',
            photoCount: photoCount || 0,
            category: category || 'General',
            layoutSchema: sanitizedSchema,
            thumbnailUrl,
            coverUrl,
            visibility: 'public' as const,
            creatorId: req.userId!,
            createdAt: Date.now(),
            tags: tags || []
        };

        const saved = await templateService.saveTemplate(templateData);
        sendSuccess(res, saved, '发布模板成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/templates
 * 保存/更新动态模板 (支持普通用户、设计师与管理员角色自适应鉴权)
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const template = req.body;
        if (!template.id || !template.name || !template.layoutSchema) {
            return res.status(400).json({ success: false, error: '必填项缺失 (id, name, layoutSchema)' });
        }

        // 获取当前登录用户及角色属性
        const user = await authService.getUserById(req.userId!);
        const isPrivileged = user?.role === 'admin' || (user?.role as string) === 'designer';

        // 检查模板是否已存在
        const existingTemplate = await templateService.getTemplateById(template.id);
        
        if (existingTemplate) {
            // 水平/垂直越权防护：非管理员/非设计师只能更新属于自己的模板
            if (!isPrivileged && existingTemplate.creatorId !== req.userId) {
                return res.status(403).json({ success: false, error: '权限不足，无法修改他人或系统模板' });
            }
        }

        // 防御性净化与参数绑定
        if (!isPrivileged) {
            // 普通用户强制将其绑定为创作者
            template.creatorId = req.userId;
            // 确保可见性属于枚举值
            if (template.visibility !== 'public' && template.visibility !== 'private') {
                template.visibility = 'private';
            }
        } else {
            // 管理员/设计师若未指定则默认为 system
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
 * 删除动态模板 (支持所有者、设计师或管理员权限)
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;

        // 获取当前用户角色
        const user = await authService.getUserById(req.userId!);
        const isPrivileged = user?.role === 'admin' || (user?.role as string) === 'designer';

        // 获取目标模板详情
        const template = await templateService.getTemplateById(id);
        if (!template) {
            return res.status(404).json({ success: false, error: '模板不存在' });
        }

        // 防水平/垂直越权：非特权用户只能删除自己的模板
        if (!isPrivileged && template.creatorId !== req.userId) {
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

/**
 * POST /api/templates/publish-page
 * 用户或设计师在编辑器中将某一页发布为单页模板 (支持自适应公开/私有属性)
 */
router.post('/publish-page', authMiddleware, async (req, res) => {
    try {
        const { pageId, name, templateType, category, tags, thumbnailUrl, coverUrl, visibility } = req.body;
        if (!pageId || !name) {
            return res.status(400).json({ success: false, error: '必填参数缺失 (pageId, name)' });
        }

        // 1. 零信任校验：确保目标页面属于本人的书籍
        const [pages]: any[] = await pool.query(
            'SELECT book_id FROM pages WHERE id = ?',
            [pageId]
        );
        if (pages.length === 0) {
            return res.status(404).json({ success: false, error: '页面不存在' });
        }
        const bookId = pages[0].book_id;

        const [books]: any[] = await pool.query(
            'SELECT user_id FROM books WHERE id = ? AND deleted_at IS NULL',
            [bookId]
        );
        if (books.length === 0) {
            return res.status(404).json({ success: false, error: '书籍不存在' });
        }

        if (books[0].user_id !== req.userId) {
            return res.status(403).json({ success: false, error: '权限不足，无法将他人的页面发布为模板' });
        }

        // 2. 调用发布页面模板方法
        const template = await templateService.publishPageAsTemplate(pageId, {
            name,
            templateType,
            category,
            tags,
            thumbnailUrl,
            coverUrl,
            visibility: visibility || 'private',
            creatorId: req.userId!
        });

        sendSuccess(res, template, '页面发布模板成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/templates/:id/origin
 * 获取单页面模板发布来源的书籍和页面 ID
 */
router.get('/:id/origin', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        const template = await templateService.getTemplateById(id);
        if (!template) {
            return res.status(404).json({ success: false, error: '模板不存在' });
        }

        if (!template.templateOriginId || template.templateOriginType !== 'PAGE') {
            return res.status(404).json({ success: false, error: '该模板没有关联的来源页面' });
        }

        // 查询来源页面所在的 book_id
        const [pages]: any[] = await pool.query(
            'SELECT book_id FROM pages WHERE id = ?',
            [template.templateOriginId]
        );

        if (pages.length === 0) {
            return res.status(404).json({ success: false, error: '来源页面已被删除' });
        }

        sendSuccess(res, {
            bookId: pages[0].book_id,
            pageId: template.templateOriginId
        });
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/templates/:id/use
 * 增加单页模板的套用次数计数 (供前端在拖入应用模板时调用)
 */
router.post('/:id/use', authMiddleware, async (req, res) => {
    try {
        const id = req.params.id;
        await templateService.incrementUseCount(id);
        sendSuccess(res, null, '模板套用计数成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

export default router;
