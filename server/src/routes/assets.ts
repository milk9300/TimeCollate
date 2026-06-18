import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import sharp from 'sharp';
import { pool } from '../db/index.js';
import { authMiddleware } from './authMiddleware.js';
import { uploadToOss, deleteFromOss, getSignedUrl } from '../services/OssService.js';
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

/**
 * 资产类型到旧素材类型的映射，用于向前兼容前端
 */
function mapAssetToLegacy(row: any) {
    const legacyType = row.type === 'decoration' ? 'decorator' : row.type;
    return {
        id: row.id,
        folder_id: row.folder_id,
        name: row.name,
        material_type: legacyType,
        scope: row.user_id ? 'user' : 'system',
        creator_id: row.user_id,
        file_url: row.url,
        cover_url: row.thumbnail,
        oss_key: row.oss_key,
        file_size: row.size || 0,
        metadata: {
            ...(row.metadata || {}),
            width: row.width,
            height: row.height
        },
        created_at: Number(row.created_at),
        is_favorite: row.is_favorite ? 1 : 0,
        // 同时提供新字段名，供后续新特性使用
        type: row.type,
        url: row.url,
        thumbnail: row.thumbnail,
        size: row.size || 0,
        width: row.width,
        height: row.height,
        user_id: row.user_id
    };
}

// #region ==================== 1. 文件夹接口 (Folder APIs) ====================

/**
 * GET /api/assets/folders
 * 获取用户的文件夹列表（树形结构由前端构建）
 */
router.get('/folders', async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, parent_id, scope, creator_id, icon, sort_order, created_at
             FROM asset_folders
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
                'SELECT id, scope, creator_id FROM asset_folders WHERE id = ?',
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
            `INSERT INTO asset_folders (id, name, parent_id, scope, creator_id, created_at)
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
            'SELECT id, creator_id, scope FROM asset_folders WHERE id = ?',
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
                        SELECT id FROM asset_folders WHERE id = ?
                        UNION ALL
                        SELECT f.id FROM asset_folders f
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
                    'SELECT id, creator_id FROM asset_folders WHERE id = ?',
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
            `UPDATE asset_folders SET ${updateFields.join(', ')} WHERE id = ?`,
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
            'SELECT id, creator_id, scope FROM asset_folders WHERE id = ?',
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
                SELECT id FROM asset_folders WHERE id = ?
                UNION ALL
                SELECT f.id FROM asset_folders f
                INNER JOIN subfolders s ON f.parent_id = s.id
             )
             SELECT id FROM subfolders`,
            [id]
        );
        const subfolderIds = descendants.map((f: any) => f.id);

        // 2. 查询这些文件夹下的所有资产 (用于清理 OSS 实体文件)
        const [assets]: any = await connection.query(
            'SELECT id, oss_key FROM assets WHERE folder_id IN (?)',
            [subfolderIds]
        );

        const ossKeys = assets.map((a: any) => a.oss_key).filter(Boolean);

        // 3. 删除数据库中的资产与关联关系
        if (assets.length > 0) {
            const assetIds = assets.map((a: any) => a.id);
            await connection.query('DELETE FROM asset_tag_relations WHERE asset_id IN (?)', [assetIds]);
            await connection.query('DELETE FROM asset_favorites WHERE asset_id IN (?)', [assetIds]);
            await connection.query('DELETE FROM assets WHERE id IN (?)', [assetIds]);
        }

        // 4. 删除文件夹数据记录
        await connection.query('DELETE FROM asset_folders WHERE id IN (?)', [subfolderIds]);

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
        let type = req.query.type as string; // 'photo', 'sticker', 'background', etc.
        const tag = req.query.tag as string; // 标签名过滤
        const favorite = req.query.favorite === 'true'; // 只看收藏
        const search = req.query.search as string; // 名称模糊搜索
        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 24;
        const offset = (page - 1) * pageSize;

        // 兼容映射：前端传 decorator 时转为新字段 decoration
        if (type === 'decorator') {
            type = 'decoration';
        }

        const whereClauses = ['(m.user_id = ? OR m.user_id IS NULL)'];
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
            whereClauses.push('m.type = ?');
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
            SELECT DISTINCT m.id, m.folder_id, m.name, m.type, m.user_id,
                            m.url, m.thumbnail, m.oss_key, m.size, m.width, m.height, m.metadata, m.created_at,
                            IF(fav.user_id IS NOT NULL, 1, 0) as is_favorite
            FROM assets m
            LEFT JOIN asset_favorites fav ON m.id = fav.asset_id AND fav.user_id = ?
        `;
        queryParams.unshift(req.userId); // 对应 LEFT JOIN fav 中的占位符

        if (tag) {
            selectSql += `
                INNER JOIN asset_tag_relations r ON m.id = r.asset_id
                INNER JOIN asset_tags t ON r.tag_id = t.id
            `;
        }

        selectSql += ` WHERE ${whereClauses.join(' AND ')} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(pageSize, offset);

        const [items]: any = await pool.query(selectSql, queryParams);

        // 统计总数用于前端分页计算
        let countSql = 'SELECT COUNT(DISTINCT m.id) as total FROM assets m';
        const countParams = [...queryParams];
        // 剥离 LIMIT 和 OFFSET 参数以及 fav.user_id
        countParams.splice(0, 1); // 剥离 LEFT JOIN 占位符
        countParams.splice(countParams.length - 2, 2); // 剥离 LIMIT & OFFSET

        if (tag) {
            countSql += `
                INNER JOIN asset_tag_relations r ON m.id = r.asset_id
                INNER JOIN asset_tags t ON r.tag_id = t.id
            `;
        }

        const countClauses = [...whereClauses];
        if (favorite) {
            countSql += ` LEFT JOIN asset_favorites fav ON m.id = fav.asset_id AND fav.user_id = ?`;
            countParams.unshift(req.userId);
        }

        countSql += ` WHERE ${countClauses.join(' AND ')}`;
        const [countResult]: any = await pool.query(countSql, countParams);
        const total = countResult[0].total;

        // 对所有私有 OSS 键文件进行签名，并封装向下兼容结构
        const legacyItems = items.map((item: any) => {
            if (item.oss_key) {
                // 如果是用户上传的私有大图，签名有效期设为 2 小时
                item.url = getSignedUrl(item.oss_key, 7200);
                if (item.thumbnail && item.thumbnail.startsWith('materials/')) {
                    item.thumbnail = getSignedUrl(item.thumbnail, 7200);
                }
            }
            return mapAssetToLegacy(item);
        });

        sendSuccess(res, {
            items: legacyItems,
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
    const connection = await pool.getConnection();
    try {
        if (!req.file) {
            return sendBadRequest(res, 'No file uploaded');
        }

        await connection.beginTransaction();

        const folderId = req.body.folderId === 'root' ? null : req.body.folderId;
        let type = req.body.type || 'photo'; // photo, background, sticker etc.
        const tags = req.body.tags ? JSON.parse(req.body.tags) : []; // 关联标签名数组

        // 兼容映射：前端传 decorator 时转为新字段 decoration
        if (type === 'decorator') {
            type = 'decoration';
        }

        // 1. 容量空间校验（限额 500MB）
        const [quota]: any = await connection.query(
            'SELECT SUM(size) as used FROM assets WHERE user_id = ?',
            [req.userId]
        );
        const currentUsed = quota[0].used ? parseInt(quota[0].used) : 0;
        const limitSize = 500 * 1024 * 1024; // 500MB
        if (currentUsed + req.file.size > limitSize) {
            await connection.rollback();
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
        };

        // 4. 插入资产表
        await connection.query(
            `INSERT INTO assets (id, folder_id, name, type, user_id, url, thumbnail, oss_key, size, width, height, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, folderId || null, req.file.originalname, type, req.userId, fileUrl, null, ossKey, processedBuffer.length, width || null, height || null, JSON.stringify(metadata), createdAt]
        );

        // 如果是照片，自动建立一笔空白照片元数据
        if (type === 'photo') {
            await connection.query(
                `INSERT INTO photo_metadata (id, asset_id, ai_tags) VALUES (?, ?, '[]')`,
                [uuidv4(), id]
            );
        }

        // 5. 绑定或创建对应标签
        if (Array.isArray(tags) && tags.length > 0) {
            for (const tagName of tags) {
                if (!tagName) continue;
                
                // 写入用户标签
                await connection.query(
                    'INSERT IGNORE INTO asset_tags (id, name, scope, creator_id) VALUES (?, ?, "user", ?)',
                    [uuidv4(), tagName, req.userId]
                );

                // 查询标签真实 ID
                const [tRows]: any = await connection.query(
                    'SELECT id FROM asset_tags WHERE name = ?',
                    [tagName]
                );
                if (tRows.length > 0) {
                    await connection.query(
                        'INSERT IGNORE INTO asset_tag_relations (asset_id, tag_id) VALUES (?, ?)',
                        [id, tRows[0].id]
                    );
                }
            }
        }

        await connection.commit();

        sendSuccess(res, {
            id,
            name: req.file.originalname,
            fileUrl,
            fileSize: processedBuffer.length,
            metadata: {
                ...metadata,
                width,
                height
            }
        }, 'Material uploaded successfully');
    } catch (error) {
        await connection.rollback();
        sendError(res, error as Error);
    } finally {
        connection.release();
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
            'SELECT id, user_id FROM assets WHERE id = ?',
            [id]
        );
        if (material.length === 0) {
            return sendNotFound(res, 'Material not found');
        }
        if (material[0].user_id !== req.userId) {
            return sendError(res, 'Permission denied', 403);
        }

        // 验证目标文件夹所有权
        if (folderId !== undefined && folderId !== null) {
            const [folder]: any = await pool.query(
                'SELECT id, creator_id FROM asset_folders WHERE id = ?',
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
            `UPDATE assets SET ${updateFields.join(', ')} WHERE id = ?`,
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
            'SELECT id, user_id, oss_key FROM assets WHERE id = ?',
            [id]
        );
        if (material.length === 0) {
            return sendNotFound(res, 'Material not found');
        }
        if (material[0].user_id !== req.userId) {
            return sendError(res, 'Permission denied', 403);
        }

        // 删除数据库关联 (cascade 会自动清理 photo_metadata)
        await pool.query('DELETE FROM asset_tag_relations WHERE asset_id = ?', [id]);
        await pool.query('DELETE FROM asset_favorites WHERE asset_id = ?', [id]);
        await pool.query('DELETE FROM assets WHERE id = ?', [id]);

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

/**
 * POST /api/assets/materials/batch-delete
 * 批量删除素材并清理 OSS 云文件
 */
router.post('/materials/batch-delete', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return sendBadRequest(res, 'Invalid or empty ids array');
        }

        // 查出所有属于当前用户且非系统预设的素材，获取其 oss_key
        const [assets]: any = await pool.query(
            'SELECT id, oss_key FROM assets WHERE id IN (?) AND user_id = ?',
            [ids, req.userId]
        );

        if (assets.length === 0) {
            return sendSuccess(res, { deletedCount: 0 }, 'No eligible materials to delete');
        }

        const validIds = assets.map((m: any) => m.id);

        // 删除数据库关联
        await pool.query('DELETE FROM asset_tag_relations WHERE asset_id IN (?)', [validIds]);
        await pool.query('DELETE FROM asset_favorites WHERE asset_id IN (?)', [validIds]);
        await pool.query('DELETE FROM assets WHERE id IN (?)', [validIds]);

        // 异步物理清除云存储中的文件
        assets.forEach((m: any) => {
            if (m.oss_key) {
                deleteFromOss(m.oss_key).catch(err => {
                    console.error(`Failed to delete physical file for material ${m.id} from OSS during batch delete:`, err);
                });
            }
        });

        sendSuccess(res, { deletedCount: validIds.length }, `Successfully deleted ${validIds.length} materials`);
    } catch (error) {
        sendError(res, error as Error);
    }
});

/**
 * POST /api/assets/materials/batch-move
 * 批量移动素材到指定文件夹
 */
router.post('/materials/batch-move', async (req, res) => {
    try {
        const { ids, folderId } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return sendBadRequest(res, 'Invalid or empty ids array');
        }

        const targetFolderId = folderId === 'root' ? null : folderId;

        // 验证目标文件夹所有权
        if (targetFolderId !== null) {
            const [folder]: any = await pool.query(
                'SELECT id, creator_id FROM asset_folders WHERE id = ?',
                [targetFolderId]
            );
            if (folder.length === 0) {
                return sendBadRequest(res, 'Target folder not found');
            }
            if (folder[0].creator_id !== req.userId) {
                return sendError(res, 'No permission to target folder', 403);
            }
        }

        // 过滤出属于当前用户且非系统预设的素材
        const [assets]: any = await pool.query(
            'SELECT id FROM assets WHERE id IN (?) AND user_id = ?',
            [ids, req.userId]
        );

        if (assets.length === 0) {
            return sendSuccess(res, { movedCount: 0 }, 'No eligible materials to move');
        }

        const validIds = assets.map((m: any) => m.id);

        await pool.query(
            'UPDATE assets SET folder_id = ? WHERE id IN (?)',
            [targetFolderId, validIds]
        );

        sendSuccess(res, { movedCount: validIds.length }, `Successfully moved ${validIds.length} materials`);
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
            'SELECT SUM(size) as used FROM assets WHERE user_id = ?',
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
            'INSERT IGNORE INTO asset_favorites (user_id, asset_id, created_at) VALUES (?, ?, ?)',
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
            'DELETE FROM asset_favorites WHERE user_id = ? AND asset_id = ?',
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
 * 已停用
 */
router.post('/sync-photos', async (req, res) => {
    try {
        sendSuccess(res, { imported: 0 }, 'Sync photos service is disabled');
    } catch (error) {
        sendError(res, error as Error);
    }
});

// #endregion

export default router;
