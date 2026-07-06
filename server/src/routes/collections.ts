import { Router } from 'express';
import { collectionService } from '../services/CollectionService.js';
import { authMiddleware } from './authMiddleware.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

// 模板合集接口统一要求登录访问
router.use(authMiddleware);

/**
 * GET /api/template-collections
 * 获取可用的模板合集列表 (默认返回公开的和个人拥有的)
 */
router.get('/', async (req, res) => {
    try {
        const my = req.query.my === 'true';
        const collections = await collectionService.getCollections(req.userId!, { my });
        sendSuccess(res, collections);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/template-collections/market
 * 获取模板合集市场列表 (公开且非当前用户拥有的合集)
 */
router.get('/market', async (req, res) => {
    try {
        const collections = await collectionService.getMarketCollections(req.userId!);
        sendSuccess(res, collections);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * GET /api/template-collections/:id
 * 获取合集详情 (包含关联的子页面模板明细，含越权保护)
 */
router.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const collection = await collectionService.getCollectionById(id, req.userId!);
        if (!collection) {
            return res.status(404).json({ success: false, error: '合集不存在' });
        }
        sendSuccess(res, collection);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/template-collections
 * 保存/更新模板合集 (含关联子项，支持防越权自适应)
 */
router.post('/', async (req, res) => {
    try {
        const { id, title, description, cover, visibility, items } = req.body;
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, error: '合集必须包含有效的子页面模板列表 (items)' });
        }

        const saved = await collectionService.saveCollection({
            id,
            title,
            description,
            cover,
            visibility,
            items
        }, req.userId!);

        sendSuccess(res, saved, '保存合集成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * DELETE /api/template-collections/:id
 * 删除合集 (仅限所有者，含防越权)
 */
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const deleted = await collectionService.deleteCollection(id, req.userId!);
        if (!deleted) {
            return res.status(404).json({ success: false, error: '合集不存在或已被删除' });
        }
        sendSuccess(res, null, '删除合集成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/template-collections/:id/apply
 * 将合集内的所有页面模板克隆应用至指定时光集中
 */
router.post('/:id/apply', async (req, res) => {
    try {
        const collectionId = req.params.id;
        const { bookId, afterPageId } = req.body;
        if (!bookId) {
            return res.status(400).json({ success: false, error: '目标书籍 ID (bookId) 不能为空' });
        }

        const newPageIds = await collectionService.applyCollectionToBook(
            collectionId,
            bookId,
            afterPageId || null,
            req.userId!
        );

        sendSuccess(res, { pageIds: newPageIds }, '套用合集模板成功');
    } catch (error) {
        sendError(res, error as Error);
    }
});

export default router;
