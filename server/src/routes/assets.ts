import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import sharp from 'sharp';
import { pool } from '../db/index.js';
import { authMiddleware } from './authMiddleware.js';
import { uploadToOss, deleteFromOss, getSignedUrl, getFileSize } from '../services/OssService.js';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../utils/response.js';

const router = Router();

// 10MB upload limit for personal assets
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});

// 所有接口均要求登录授权
router.use(authMiddleware);

// #region ==================== 1. 文件夹接口 (Folder APIs) ====================

/**
 * GET /api/assets/folders
 * 获取用户的文件夹列表（树形结构由前端构建）
 */
router.get('/folders', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, parent_id, scope, creator_id, icon, sort_order, created_at
             FROM material_folders
             WHERE creator_id = ? OR scope = 'system'
             ORDER BY sort_order ASC, name ASC`,
            [req.userId]
        );
        sendSuccess(res, rows);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/assets/folders
 * 创建文件夹
 */
router.post('/folders', async (req, res) => {
    try {
        const { name, parentId } = req.body;
        if (!name) {
            return sendBadRequest(res, 'Folder name is required');
        }

        // 校验 parentId 是否合法
        if (parentId) {
            const [parent]: any = await pool.query(
                'SELECT id, scope, creator_id FROM material_folders WHERE id = ?',
                [parentId]
            );
            if (parent.length === 0) {
                return sendBadRequest(res, 'Parent folder does not exist');
            }
            if (parent[0].scope === 'system') {
                return sendError(res, 'Cannot create user subfolder under system folder', 403);
            }
            if (parent[0].creator_id !== req.userId) {
                return sendError(res, 'No permission to modify this parent folder', 403);
            }
        }

        const id = uuidv4();
        const createdAt = Date.now();
        await pool.query(
            `INSERT INTO material_folders (id, name, parent_id, scope, creator_id, created_at)
             VALUES (?, ?, ?, 'user', ?, ?)`,
            [id, name, parentId || null, req.userId, createdAt]
        );

        sendSuccess(res, { id, name, parentId }, 'Folder created successfully');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * PATCH /api/assets/folders/:id
 * 更新文件夹名称或移动父级目录
 */
router.patch('/folders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, parentId, sortOrder } = req.body;

        // 校验文件夹归属
        const [folder]: any = await pool.query(
            'SELECT id, creator_id, scope FROM material_folders WHERE id = ?',
            [id]
        );
        if (folder.length === 0) {
            return sendNotFound(res, 'Folder not found');
        }
        if (folder[0].scope === 'system' || folder[0].creator_id !== req.userId) {
            return sendError(res, 'Permission denied', 403);
        }

        // 如果要移动父文件夹，进行防循环嵌套校验 (Cycle Detection)
        if (parentId !== undefined) {
            if (parentId === id) {
                return sendBadRequest(res, 'Cannot move a folder into itself');
            }

            if (parentId !== null) {
                // 检查 parentId 是否是当前文件夹下的子文件夹 (利用递归查询)
                const [descendants]: any = await pool.query(
                    `WITH RECURSIVE subfolders AS (
                        SELECT id FROM material_folders WHERE id = ?
                        UNION ALL
                        SELECT f.id FROM material_folders f
                        INNER JOIN subfolders s ON f.parent_id = s.id
                     )
                     SELECT id FROM subfolders`,
                    [id]
                );

                const subfolderIds = descendants.map((f: any) => f.id);
                if (subfolderIds.includes(parentId)) {
                    return sendBadRequest(res, 'Cannot move a folder into its own subfolders');
                }

                // 检查目标父文件夹的归属
                const [parent]: any = await pool.query(
                    'SELECT id, creator_id FROM material_folders WHERE id = ?',
                    [parentId]
                );
                if (parent.length === 0) {
                    return sendBadRequest(res, 'Target parent folder not found');
                }
                if (parent[0].creator_id !== req.userId) {
                    return sendError(res, 'No permission to target parent folder', 403);
                }
            }
        }

        // 执行更新
        const updateFields: string[] = [];
        const updateParams: any[] = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            updateParams.push(name);
        }
        if (parentId !== undefined) {
            updateFields.push('parent_id = ?');
            updateParams.push(parentId || null);
        }
        if (sortOrder !== undefined) {
            updateFields.push('sort_order = ?');
            updateParams.push(sortOrder);
        }

        if (updateFields.length === 0) {
            return sendBadRequest(res, 'No fields to update');
        }

        updateParams.push(id);
        await pool.query(
            `UPDATE material_folders SET ${updateFields.join(', ')} WHERE id = ?`,
            updateParams
        );

        sendSuccess(res, null, 'Folder updated successfully');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * DELETE /api/assets/folders/:id
 * 递归删除文件夹及目录下所有子文件夹与素材文件
 */
router.delete('/folders/:id', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // 校验目标文件夹归属
        const [folder]: any = await connection.query(
            'SELECT id, creator_id, scope FROM material_folders WHERE id = ?',
            [id]
        );
        if (folder.length === 0) {
            return sendNotFound(res, 'Folder not found');
        }
        if (folder[0].scope === 'system' || folder[0].creator_id !== req.userId) {
            return sendError(res, 'Permission denied', 403);
        }

        // 1. 递归查询所有子文件夹 ID
        const [descendants]: any = await connection.query(
            `WITH RECURSIVE subfolders AS (
                SELECT id FROM material_folders WHERE id = ?
                UNION ALL
                SELECT f.id FROM material_folders f
                INNER JOIN subfolders s ON f.parent_id = s.id
             )
             SELECT id FROM subfolders`,
            [id]
        );
        const subfolderIds = descendants.map((f: any) => f.id);

        // 2. 查询这些文件夹下的所有素材 (用于清理 OSS 实体文件)
        const [materials]: any = await connection.query(
            'SELECT id, oss_key FROM materials WHERE folder_id IN (?)',
            [subfolderIds]
        );

        const ossKeys = materials.map((m: any) => m.oss_key).filter(Boolean);

        // 3. 删除数据库中的素材与关联关系
        if (materials.length > 0) {
            const materialIds = materials.map((m: any) => m.id);
            await connection.query('DELETE FROM material_tag_relations WHERE material_id IN (?)', [materialIds]);
            await connection.query('DELETE FROM material_favorites WHERE material_id IN (?)', [materialIds]);
            await connection.query('DELETE FROM materials WHERE id IN (?)', [materialIds]);
        }

        // 4. 删除文件夹数据记录
        await connection.query('DELETE FROM material_folders WHERE id IN (?)', [subfolderIds]);

        await connection.commit();

        // 5. 异步删除云存储上的实体文件（防止阻塞主 DB 事务提交）
        if (ossKeys.length > 0) {
            Promise.all(ossKeys.map((key: string) => deleteFromOss(key))).catch(err => {
                console.error('Failed to cleanup OSS files during recursive folder delete', err);
            });
        }

        sendSuccess(res, null, `Folder and ${subfolderIds.length} subfolders deleted successfully`);
    } catch (error) {
        await connection.rollback();
        sendError(res, error as Error);
    } finally {
        connection.release();
    }
});

// #endregion

// #region ==================== 2. 素材接口 (Material APIs) ====================

/**
 * GET /api/assets/materials
 * 分类、标签、文件夹多维过滤素材列表 (支持分页检索与签名展示)
 */
router.get('/materials', async (req, res) => {
    try {
        const folderId = req.query.folderId as string; // 'root' 代表根目录，或为空，或具体UUID
        const type = req.query.type as string; // 'photo', 'sticker', 'background', etc.
        const tag = req.query.tag as string; // 标签名过滤
        const favorite = req.query.favorite === 'true'; // 只看收藏
        const search = req.query.search as string; // 名称模糊搜索
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 24;
        const offset = (page - 1) * pageSize;

        const whereClauses = ['(m.creator_id = ? OR m.scope = \'system\')'];
        const queryParams: any[] = [req.userId];

        // 文件夹过滤
        if (folderId === 'root') {
            whereClauses.push('m.folder_id IS NULL');
        } else if (folderId) {
            whereClauses.push('m.folder_id = ?');
            queryParams.push(folderId);
        }

        // 类别过滤
        if (type) {
            whereClauses.push('m.material_type = ?');
            queryParams.push(type);
        }

        // 模糊搜索
        if (search) {
            whereClauses.push('m.name LIKE ?');
            queryParams.push(`%${search}%`);
        }

        // 收藏夹过滤
        if (favorite) {
            whereClauses.push('fav.user_id IS NOT NULL');
        }

        // 标签过滤
        if (tag) {
            whereClauses.push('t.name = ?');
            queryParams.push(tag);
        }

        // 查询 SQL 拼接
        let selectSql = `
            SELECT DISTINCT m.id, m.folder_id, m.name, m.material_type, m.scope, m.creator_id,
                            m.file_url, m.cover_url, m.oss_key, m.file_size, m.metadata, m.created_at,
                            IF(fav.user_id IS NOT NULL, 1, 0) as is_favorite
            FROM materials m
            LEFT JOIN material_favorites fav ON m.id = fav.material_id AND fav.user_id = ?
        `;
        queryParams.unshift(req.userId); // 对应 LEFT JOIN fav 中的占位符

        if (tag) {
            selectSql += `
                INNER JOIN material_tag_relations r ON m.id = r.material_id
                INNER JOIN material_tags t ON r.tag_id = t.id
            `;
        }

        selectSql += ` WHERE ${whereClauses.join(' AND ')} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(pageSize, offset);

        const [items]: any = await pool.query(selectSql, queryParams);

        // 统计总数用于前端分页计算
        let countSql = 'SELECT COUNT(DISTINCT m.id) as total FROM materials m';
        const countParams = [...queryParams];
        // 剥离 LIMIT 和 OFFSET 参数以及 fav.user_id
        countParams.splice(0, 1); // 剥离 LEFT JOIN 占位符
        countParams.splice(countParams.length - 2, 2); // 剥离 LIMIT & OFFSET

        if (tag) {
            countSql += `
                INNER JOIN material_tag_relations r ON m.id = r.material_id
                INNER JOIN material_tags t ON r.tag_id = t.id
            `;
        }

        const countClauses = [...whereClauses];
        if (favorite) {
            countSql += ` LEFT JOIN material_favorites fav ON m.id = fav.material_id AND fav.user_id = ?`;
            countParams.unshift(req.userId);
        }

        countSql += ` WHERE ${countClauses.join(' AND ')}`;
        const [countResult]: any = await pool.query(countSql, countParams);
        const total = countResult[0].total;

        // 对所有私有 OSS 键文件进行签名，确保前端可以正常访问大图/缩略图
        for (const item of items) {
            if (item.oss_key) {
                // 如果是用户上传的私有大图，签名有效期设为 2 小时
                item.file_url = getSignedUrl(item.oss_key, 7200);
                if (item.cover_url && item.cover_url.startsWith('materials/')) {
                    item.cover_url = getSignedUrl(item.cover_url, 7200);
                }
            }
        }

        sendSuccess(res, {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize)
        });
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/assets/upload
 * 上传个人素材 (支持配额限额校验与防地理隐私 Sharp 自动修正)
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return sendBadRequest(res, 'No file uploaded');
        }

        const folderId = req.body.folderId === 'root' ? null : req.body.folderId;
        const type = req.body.type || 'photo'; // photo, background, sticker etc.
        const tags = req.body.tags ? JSON.parse(req.body.tags) : []; // 关联标签名数组

        // 1. 容量空间校验（限额 500MB）
        const [quota]: any = await pool.query(
            'SELECT SUM(file_size) as used FROM materials WHERE creator_id = ?',
            [req.userId]
        );
        const currentUsed = quota[0].used ? parseInt(quota[0].used) : 0;
        const limitSize = 500 * 1024 * 1024; // 500MB
        if (currentUsed + req.file.size > limitSize) {
            return sendError(res, 'Storage quota exceeded (500MB limit)', 403);
        }

        let processedBuffer = req.file.buffer;
        let width: number | undefined;
        let height: number | undefined;

        // 如果是图片格式，使用 sharp 进行扶正并擦除地理 EXIF 元数据
        const isImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(req.file.mimetype);
        if (isImage) {
            try {
                const img = sharp(req.file.buffer).rotate();
                processedBuffer = await img.toBuffer();
                const meta = await sharp(processedBuffer).metadata();
                width = meta.width;
                height = meta.height;
            } catch (err) {
                console.warn('Sharp metadata processing skipped', err);
            }
        }

        // 2. 上传到云存储
        const { ossKey } = await uploadToOss(processedBuffer, req.file.originalname);

        // 记录上传流量统计
        const { trafficService } = await import('../services/TrafficService.js');
        await trafficService.recordTraffic('upload', processedBuffer.length);

        const id = uuidv4();
        const fileUrl = getSignedUrl(ossKey, 7200);
        const createdAt = Date.now();

        // 3. 构建元数据
        const metadata = {
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            width,
            height
        };

        // 4. 插入素材主表
        await pool.query(
            `INSERT INTO materials (id, folder_id, name, material_type, scope, creator_id, file_url, oss_key, file_size, metadata, created_at)
             VALUES (?, ?, ?, ?, 'user', ?, ?, ?, ?, ?, ?)`,
            [id, folderId || null, req.file.originalname, type, req.userId, fileUrl, ossKey, processedBuffer.length, JSON.stringify(metadata), createdAt]
        );

        // 5. 绑定或创建对应标签
        if (Array.isArray(tags) && tags.length > 0) {
            for (const tagName of tags) {
                if (!tagName) continue;
                
                // 写入用户标签
                await pool.query(
                    'INSERT IGNORE INTO material_tags (id, name, scope, creator_id) VALUES (?, ?, "user", ?)',
                    [uuidv4(), tagName, req.userId]
                );

                // 查询标签真实 ID
                const [tRows]: any = await pool.query(
                    'SELECT id FROM material_tags WHERE name = ?',
                    [tagName]
                );
                if (tRows.length > 0) {
                    await pool.query(
                        'INSERT IGNORE INTO material_tag_relations (material_id, tag_id) VALUES (?, ?)',
                        [id, tRows[0].id]
                    );
                }
            }
        }

        sendSuccess(res, {
            id,
            name: req.file.originalname,
            fileUrl,
            fileSize: processedBuffer.length,
            metadata
        }, 'Material uploaded successfully');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * PATCH /api/assets/materials/:id
 * 修改素材属性（更名、移动所属文件夹）
 */
router.patch('/materials/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, folderId } = req.body;

        // 验证所有权
        const [material]: any = await pool.query(
            'SELECT id, creator_id, scope FROM materials WHERE id = ?',
            [id]
        );
        if (material.length === 0) {
            return sendNotFound(res, 'Material not found');
        }
        if (material[0].scope === 'system' || material[0].creator_id !== req.userId) {
            return sendError(res, 'Permission denied', 403);
        }

        // 验证目标文件夹所有权
        if (folderId !== undefined && folderId !== null) {
            const [folder]: any = await pool.query(
                'SELECT id, creator_id FROM material_folders WHERE id = ?',
                [folderId]
            );
            if (folder.length === 0) {
                return sendBadRequest(res, 'Target folder not found');
            }
            if (folder[0].creator_id !== req.userId) {
                return sendError(res, 'No permission to target folder', 403);
            }
        }

        const updateFields: string[] = [];
        const updateParams: any[] = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            updateParams.push(name);
        }
        if (folderId !== undefined) {
            updateFields.push('folder_id = ?');
            updateParams.push(folderId || null);
        }

        if (updateFields.length === 0) {
            return sendBadRequest(res, 'No fields to update');
        }

        updateParams.push(id);
        await pool.query(
            `UPDATE materials SET ${updateFields.join(', ')} WHERE id = ?`,
            updateParams
        );

        sendSuccess(res, null, 'Material updated successfully');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * DELETE /api/assets/materials/:id
 * 删除素材并清理 OSS 云文件
 */
router.delete('/materials/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 验证所有权
        const [material]: any = await pool.query(
            'SELECT id, creator_id, scope, oss_key FROM materials WHERE id = ?',
            [id]
        );
        if (material.length === 0) {
            return sendNotFound(res, 'Material not found');
        }
        if (material[0].scope === 'system' || material[0].creator_id !== req.userId) {
            return sendError(res, 'Permission denied', 403);
        }

        // 删除数据库关联
        await pool.query('DELETE FROM material_tag_relations WHERE material_id = ?', [id]);
        await pool.query('DELETE FROM material_favorites WHERE material_id = ?', [id]);
        await pool.query('DELETE FROM materials WHERE id = ?', [id]);

        // 异步物理清除云存储中的文件，避免 DB 延迟
        if (material[0].oss_key) {
            deleteFromOss(material[0].oss_key).catch(err => {
                console.error(`Failed to delete physical file for material ${id} from OSS:`, err);
            });
        }

        sendSuccess(res, null, 'Material deleted successfully');
    } catch (error) {
        sendError(res, error as Error);
    }
});

// #endregion

// #region ==================== 3. 收藏夹与空间额度 (Favorites & Storage) ====================

/**
 * GET /api/assets/storage-quota
 * 获取个人存储空间限额使用量
 */
router.get('/storage-quota', async (req, res) => {
    try {
        const [quota]: any = await pool.query(
            'SELECT SUM(file_size) as used FROM materials WHERE creator_id = ?',
            [req.userId]
        );
        const used = quota[0].used ? parseInt(quota[0].used) : 0;
        const total = 500 * 1024 * 1024; // 500MB 限额

        sendSuccess(res, {
            used,
            total,
            percentage: parseFloat(((used / total) * 100).toFixed(2))
        });
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/assets/materials/:id/favorite
 * 添加收藏
 */
router.post('/materials/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        const createdAt = Date.now();
        await pool.query(
            'INSERT IGNORE INTO material_favorites (user_id, material_id, created_at) VALUES (?, ?, ?)',
            [req.userId, id, createdAt]
        );
        sendSuccess(res, null, 'Added to favorites');
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * DELETE /api/assets/materials/:id/favorite
 * 取消收藏
 */
router.delete('/materials/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(
            'DELETE FROM material_favorites WHERE user_id = ? AND material_id = ?',
            [req.userId, id]
        );
        sendSuccess(res, null, 'Removed from favorites');
    } catch (error) {
        sendError(res, error as Error);
    }
});

// #endregion

// #region ==================== 5. 照片同步接口 (Photo Sync API) ====================

/**
 * POST /api/assets/sync-photos
 * 将当前用户 photos 表中已有的图片批量导入到 materials 表
 * 幂等操作：按 oss_key 去重，已存在的不会重复插入
 */
router.post('/sync-photos', async (req, res) => {
    try {
        // 该接口已停用，用户选择手动重新上传素材
        sendSuccess(res, { imported: 0 }, 'Sync photos service is disabled');
    } catch (error) {
        sendError(res, error as Error);
    }
});

// #endregion

export default router;
