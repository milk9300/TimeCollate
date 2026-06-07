import { Redis } from 'ioredis';
import { config } from '../config/index.js';

/**
 * 全局共享的 Redis 客户端连接单例
 */
export const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null, // 与 BullMQ 规范保持一致，允许持久订阅与自增
});

redis.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err);
});

redis.on('connect', () => {
    console.log('✅ Redis Connected');
});
