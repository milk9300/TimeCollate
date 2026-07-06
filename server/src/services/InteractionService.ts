import { pool } from '../db/index.js';
import { redis } from '../utils/redis.js';
import { v4 as uuidv4 } from 'uuid';
import type { RowDataPacket } from 'mysql2';
import { notificationService } from './NotificationService.js';

export type EntityType = 'book' | 'template';
export type MetricType = 'view' | 'like' | 'favorite';

/**
 * 互动与统计业务服务 (方案 B 生产级实现)
 * 采用 Redis 内存自增计数器与异步批量刷盘（Write-Back）机制以应对高并发写压力
 */
export class InteractionService {
    private syncTimer: NodeJS.Timeout | null = null;

    /**
     * 点赞或取消点赞 (双向切换)
     */
    async toggleLike(userId: string, entityType: EntityType, entityId: string): Promise<{ liked: boolean; likeCount: number }> {
        // 1. 检查当前是否已点赞 (幂等与零信任防御)
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM user_interactions WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND action_type = "like"',
            [userId, entityType, entityId]
        );

        const alreadyLiked = rows.length > 0;
        const redisCountKey = `stats:count:${entityType}:${entityId}:like`;
        const dirtyKey = `${entityType}:${entityId}:like`;

        if (alreadyLiked) {
            // 已点赞 -> 取消点赞
            await pool.query(
                'DELETE FROM user_interactions WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND action_type = "like"',
                [userId, entityType, entityId]
            );
            // Redis 内存计数递减
            let currentCount = await redis.decr(redisCountKey);
            if (currentCount < 0) {
                await redis.set(redisCountKey, 0);
                currentCount = 0;
            }
            // 标记为脏数据以便异步刷盘
            await redis.sadd('stats:dirty_keys', dirtyKey);

            return { liked: false, likeCount: currentCount };
        } else {
            // 未点赞 -> 极速插入
            const newId = uuidv4();
            const now = Date.now();
            await pool.query(
                'INSERT INTO user_interactions (id, user_id, entity_type, entity_id, action_type, created_at) VALUES (?, ?, ?, ?, "like", ?)',
                [newId, userId, entityType, entityId, now]
            );
            // Redis 内存计数递增
            const currentCount = await redis.incr(redisCountKey);
            // 标记为脏数据以便异步刷盘
            await redis.sadd('stats:dirty_keys', dirtyKey);

            // 异步触发通知给实体所有者 (避免自嗨式通知)
            this.getEntityOwnerAndName(entityType, entityId).then(entity => {
                if (entity.ownerId && entity.ownerId !== 'system' && entity.ownerId !== userId) {
                    notificationService.createNotification(
                        entity.ownerId,
                        userId,
                        'like',
                        entityType,
                        entityId,
                        entity.name || undefined
                    ).catch(err => console.warn('[InteractionService] Failed to create like notification:', err.message));
                }
            });

            return { liked: true, likeCount: currentCount };
        }
    }

    /**
     * 收藏或取消收藏 (双向切换)
     */
    async toggleFavorite(userId: string, entityType: EntityType, entityId: string): Promise<{ favorited: boolean; favoriteCount: number }> {
        // 1. 检查当前是否已收藏
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM user_interactions WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND action_type = "favorite"',
            [userId, entityType, entityId]
        );

        const alreadyFavorited = rows.length > 0;
        const redisCountKey = `stats:count:${entityType}:${entityId}:favorite`;
        const dirtyKey = `${entityType}:${entityId}:favorite`;

        if (alreadyFavorited) {
            // 取消收藏
            await pool.query(
                'DELETE FROM user_interactions WHERE user_id = ? AND entity_type = ? AND entity_id = ? AND action_type = "favorite"',
                [userId, entityType, entityId]
            );
            // Redis 内存计数递减
            let currentCount = await redis.decr(redisCountKey);
            if (currentCount < 0) {
                await redis.set(redisCountKey, 0);
                currentCount = 0;
            }
            await redis.sadd('stats:dirty_keys', dirtyKey);

            return { favorited: false, favoriteCount: currentCount };
        } else {
            // 添加收藏
            const newId = uuidv4();
            const now = Date.now();
            await pool.query(
                'INSERT INTO user_interactions (id, user_id, entity_type, entity_id, action_type, created_at) VALUES (?, ?, ?, ?, "favorite", ?)',
                [newId, userId, entityType, entityId, now]
            );
            // Redis 内存计数递增
            const currentCount = await redis.incr(redisCountKey);
            await redis.sadd('stats:dirty_keys', dirtyKey);

            // 异步触发通知给实体所有者 (避免自嗨式通知)
            this.getEntityOwnerAndName(entityType, entityId).then(entity => {
                if (entity.ownerId && entity.ownerId !== 'system' && entity.ownerId !== userId) {
                    notificationService.createNotification(
                        entity.ownerId,
                        userId,
                        'favorite',
                        entityType,
                        entityId,
                        entity.name || undefined
                    ).catch(err => console.warn('[InteractionService] Failed to create favorite notification:', err.message));
                }
            });

            return { favorited: true, favoriteCount: currentCount };
        }
    }

    /**
     * 记录阅读量 (防刷机制)
     * 同一 IP 或同一用户在 10 分钟内阅读同一实体，只计算一次 PV
     */
    async recordView(entityType: EntityType, entityId: string, userId?: string, ipAddress?: string): Promise<number> {
        const clientIdentifier = userId || ipAddress || 'anonymous';
        const dedupKey = `view_dedup:${entityType}:${entityId}:${clientIdentifier}`;
        
        // 1. 使用 Redis 分布式防重，如果返回 null 说明 10 分钟内已记录过
        const isNewView = await redis.set(dedupKey, '1', 'EX', 600, 'NX');
        
        const redisCountKey = `stats:count:${entityType}:${entityId}:view`;
        const dirtyKey = `${entityType}:${entityId}:view`;

        if (isNewView) {
            // 首次访问：递增内存计数，并标记为脏数据待落库
            const currentCount = await redis.incr(redisCountKey);
            await redis.sadd('stats:dirty_keys', dirtyKey);

            // 如果是有登录用户的阅读，写入一条流水（非强制，仅作为分析使用）
            if (userId) {
                const newId = uuidv4();
                const now = Date.now();
                await pool.query(
                    'INSERT IGNORE INTO user_interactions (id, user_id, entity_type, entity_id, action_type, created_at) VALUES (?, ?, ?, ?, "view", ?)',
                    [newId, userId, entityType, entityId, now]
                ).catch(err => {
                    // 忽略插入主键冲突，仅作为流水记录不阻塞核心阅读数增加
                    console.warn('[InteractionService] Failed to insert view log:', err.message);
                });
            }

            return currentCount;
        }

        // 重复访问：仅返回当前累积数，不计入新 PV
        const currentCountStr = await redis.get(redisCountKey);
        if (currentCountStr) {
            return parseInt(currentCountStr, 10);
        }

        // 缓存未命中：兜底从数据库读取并载入 Redis
        const dbCount = await this.getDbMetricValue(entityType, entityId, 'view');
        await redis.set(redisCountKey, dbCount);
        return dbCount;
    }

    /**
     * 批量获取实体的交互统计与用户激活状态
     */
    async getEntityInteractions(entityType: EntityType, entityId: string, currentUserId?: string) {
        const [views, likes, favorites] = await Promise.all([
            this.getMetricValue(entityType, entityId, 'view'),
            this.getMetricValue(entityType, entityId, 'like'),
            this.getMetricValue(entityType, entityId, 'favorite'),
        ]);

        let liked = false;
        let favorited = false;

        if (currentUserId) {
            const [rows] = await pool.query<RowDataPacket[]>(
                'SELECT action_type FROM user_interactions WHERE user_id = ? AND entity_type = ? AND entity_id = ?',
                [currentUserId, entityType, entityId]
            );
            rows.forEach(row => {
                if (row.action_type === 'like') liked = true;
                if (row.action_type === 'favorite') favorited = true;
            });
        }

        return { views, likes, favorites, liked, favorited };
    }

    /**
     * 获取单一指标（带 Redis 缓存的高效查询）
     */
    async getMetricValue(entityType: EntityType, entityId: string, metricType: MetricType): Promise<number> {
        const redisCountKey = `stats:count:${entityType}:${entityId}:${metricType}`;
        const cached = await redis.get(redisCountKey);
        
        if (cached !== null) {
            return parseInt(cached, 10);
        }

        // 缓存穿透兜底：从 MySQL 中获取，并写入 Redis
        const dbValue = await this.getDbMetricValue(entityType, entityId, metricType);
        await redis.set(redisCountKey, dbValue);
        return dbValue;
    }

    /**
     * 启动写回 Worker 定时任务 (Write-Back)
     */
    startSyncWorker(intervalMs: number = 60000) {
        if (this.syncTimer) return;
        
        console.log(`[Interaction Worker] Starting stats sync worker (interval: ${intervalMs}ms)`);
        this.syncTimer = setInterval(async () => {
            try {
                await this.flushDirtyKeys();
            } catch (err) {
                console.error('[Interaction Worker] Sync task error:', err);
            }
        }, intervalMs);
    }

    /**
     * 停止写回 Worker
     */
    stopSyncWorker() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            console.log('[Interaction Worker] Stats sync worker stopped.');
        }
    }

    /**
     * 执行内存写回 MySQL (把脏数据行刷回 MySQL 数据库)
     */
    async flushDirtyKeys(): Promise<number> {
        // 1. 获取所有脏数据 Key 标识
        const dirtyKeys = await redis.smembers('stats:dirty_keys');
        if (dirtyKeys.length === 0) return 0;

        console.log(`[Interaction Worker] Flushing ${dirtyKeys.length} dirty stats keys to DB...`);
        let syncedCount = 0;

        for (const key of dirtyKeys) {
            const parts = key.split(':');
            if (parts.length !== 3) continue;

            const [entityType, entityId, metricType] = parts as [EntityType, string, MetricType];
            const redisCountKey = `stats:count:${entityType}:${entityId}:${metricType}`;
            
            const countStr = await redis.get(redisCountKey);
            if (countStr === null) continue;

            const metricValue = parseInt(countStr, 10);

            // 批量 Upsert 进 MySQL
            await pool.query(
                `INSERT INTO entity_statistics (entity_type, entity_id, metric_type, metric_value) 
                 VALUES (?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE metric_value = VALUES(metric_value)`,
                [entityType, entityId, metricType, metricValue]
            );

            // 成功落库后，将其从 Redis 脏集合中移出
            await redis.srem('stats:dirty_keys', key);
            syncedCount++;
        }

        if (syncedCount > 0) {
            console.log(`[Interaction Worker] Successfully flushed ${syncedCount} keys.`);
        }
        return syncedCount;
    }

    /**
     * 私有辅助：从数据库直接查询某指标的计数值
     */
    private async getDbMetricValue(entityType: EntityType, entityId: string, metricType: MetricType): Promise<number> {
        const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT metric_value FROM entity_statistics WHERE entity_type = ? AND entity_id = ? AND metric_type = ?',
            [entityType, entityId, metricType]
        );

        if (rows.length === 0) return 0;
        return rows[0].metric_value;
    }

    /**
     * 获取被操作实体的所有者/创建者以及名字快照
     */
    private async getEntityOwnerAndName(entityType: EntityType, entityId: string): Promise<{ ownerId: string | null; name: string | null }> {
        let query = '';
        if (entityType === 'book') {
            query = 'SELECT user_id as ownerId, title as name FROM books WHERE id = ?';
        } else if (entityType === 'template') {
            query = 'SELECT creator_id as ownerId, name FROM book_templates WHERE id = ?';
        } else {
            return { ownerId: null, name: null };
        }

        try {
            const [rows] = await pool.query<RowDataPacket[]>(query, [entityId]);
            if (rows.length > 0) {
                return {
                    ownerId: rows[0].ownerId || null,
                    name: rows[0].name || null
                };
            }
        } catch (err: any) {
            console.error(`[InteractionService] Failed to query entity ${entityType} owner:`, err.message);
        }
        return { ownerId: null, name: null };
    }
}

export const interactionService = new InteractionService();
