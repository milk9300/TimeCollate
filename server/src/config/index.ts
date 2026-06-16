import dotenv from 'dotenv';
dotenv.config();

/**
 * 应用配置
 * 从环境变量读取，提供类型安全的配置访问
 */
export const config = {
    // 服务配置
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // MySQL 配置
    mysql: {
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'timecollate',
        ssl: process.env.MYSQL_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    },

    // 阿里云 OSS 配置 (S3 兼容，保持 oss 键名避免大范围修改)
    oss: {
        region: process.env.OSS_REGION || 'oss-cn-hangzhou',
        accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.OSS_ACCESS_KEY_SECRET || '',
        bucket: process.env.OSS_BUCKET_NAME || '',
        prefix: process.env.OSS_PREFIX || 'uploads/',
        customDomain: process.env.OSS_CUSTOM_DOMAIN || '',
    },
    // 存储服务商选择 ('oss' 为阿里云原生 OSS，'r2' 为 S3 兼容 R2)
    storageProvider: (process.env.STORAGE_PROVIDER || 'oss') as 'oss' | 'r2',
    // 分享配置
    shareBaseUrl: process.env.SHARE_BASE_URL || 'http://localhost:5173',
    // Redis 配置
    redis: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || '123456',
    },
    // 阿里云 FC 3.0 配置
    fc: {
        httpUrl: process.env.FC_HTTP_URL || '', // HTTP 触发器公网访问地址
        functionName: process.env.FC_FUNCTION_NAME || 'fc-video-generator', // 函数名称
        webhookSecret: process.env.FC_WEBHOOK_SECRET || '', // Webhook 安全令牌
    },
};

/**
 * 验证必要配置是否存在
 */
export function validateConfig(): void {
    const required = [
        'OSS_REGION',
        'OSS_ACCESS_KEY_ID',
        'OSS_ACCESS_KEY_SECRET',
        'OSS_BUCKET_NAME',
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
