import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config/index.js';
import { pool, testConnection } from './db/index.js';
import booksRouter from './routes/books.js';
import uploadRouter from './routes/upload.js';
import signUrlRouter from './routes/signUrl.js';
import exportRouter from './routes/export.js';
import shareRouter from './routes/share.js';
import authRouter from './routes/auth.js';
import feedbacksRouter from './routes/feedbacks.js';
import adminRouter from './routes/admin.js';
import templatesRouter from './routes/templates.js';
import themesRouter from './routes/themes.js';
import interactionsRouter from './routes/interactions.js';
import socialRouter from './routes/social.js';
import notificationsRouter from './routes/notifications.js';
import { interactionService } from './services/InteractionService.js';
import { cleanupService } from './services/CleanupService.js';
import './queue/exportQueue.js';

// 验证配置
validateConfig();

const app = express();

// #region 中间件配置
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.get('Origin')}`);
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'http://localhost:3001',
            'http://timecollate.foez.top',
            'https://timecollate.foez.top',
            'http://www.timecollate.foez.top',  // 补上 www
            'https://www.timecollate.foez.top', // 补上 www
            'http://api.timecollate.foez.top',
            'https://api.timecollate.foez.top'
        ];
        // !origin 允许没有来源的请求（如 Postman, 手机App, 后端服务器之间的调用）
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`[CORS Blocked] Origin: ${origin}`);
            // 不要抛出 Error，而是返回 false，让 cors 库自己处理失败响应
            callback(null, false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // 明确允许的方法
    allowedHeaders: ['Content-Type', 'Authorization'] // 明确允许的 Header
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// #endregion

// #region 路由注册
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/sign-url', signUrlRouter);
app.use('/api/export', exportRouter);
app.use('/api/share', shareRouter);
app.use('/api/feedbacks', feedbacksRouter);
app.use('/api/admin', adminRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/themes', themesRouter);
app.use('/api/interactions', interactionsRouter);
app.use('/api/social', socialRouter);
app.use('/api/notifications', notificationsRouter);

// 健康检查
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
// #endregion

// #region 错误处理
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        error: config.nodeEnv === 'development' ? err.message : 'Internal server error',
    });
});
// #endregion

// #region 启动服务
async function start() {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
        console.error('Failed to connect to database, exiting...');
        process.exit(1);
    }

    // 自动清洗数据库中的残留本地临时 URL (blob: 或 data:image/)
    await sanitizeDatabaseUrls();

    // 确保 export_tasks 表已创建
    await ensureExportTasksTable();

    // 确保数据统计表已创建
    await ensureStatisticsTables();

    // 确保社交系统相关表已创建
    await ensureSocialTables();

    app.listen(config.port, () => {
        console.log(`
╔══════════════════════════════════════════════════════════╗
║  TimeCollate Server started successfully!                ║
║                                                          ║
║  🌐 API:    http://localhost:${config.port}/api              ║
║  📦 Env:    ${config.nodeEnv.padEnd(41)}║
║  🗄️  MySQL:  ${config.mysql.host}:${config.mysql.port}                           ║
║  ☁️  OSS:    ${config.oss.bucket}                           ║
╚══════════════════════════════════════════════════════════╝
        `);

        // 启动定时清理服务
        cleanupService.start();

        // 启动统计数据定时批量同步服务 (1分钟一次)
        interactionService.startSyncWorker(60000);
    });
}

/**
 * 确保 export_tasks 数据库表存在
 */
async function ensureExportTasksTable() {
    try {
        console.log('🔄 Checking database for export_tasks table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS export_tasks (
                id VARCHAR(36) PRIMARY KEY COMMENT '任务唯一标识',
                user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
                book_id VARCHAR(36) NOT NULL COMMENT '书籍ID',
                book_title VARCHAR(255) NOT NULL COMMENT '书籍标题',
                format VARCHAR(50) NOT NULL COMMENT '导出格式',
                status ENUM('waiting', 'active', 'completed', 'failed') DEFAULT 'waiting' COMMENT '任务状态',
                progress INT DEFAULT 0 COMMENT '处理进度',
                oss_key VARCHAR(255) DEFAULT NULL COMMENT '云存储存储键',
                download_url VARCHAR(1000) DEFAULT NULL COMMENT '预签名下载链接',
                error_message TEXT DEFAULT NULL COMMENT '异常错误描述',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at),
                INDEX idx_status (status)
            ) ENGINE=InnoDB COMMENT='导出任务表';
        `);
        
        // 检查并自动补充可能缺失的列及类型改造
        const [columns]: any = await pool.query('SHOW COLUMNS FROM export_tasks');
        const columnNames = columns.map((c: any) => c.Field);
        
        if (!columnNames.includes('oss_key')) {
            console.log('🔄 Adding missing column oss_key to export_tasks table...');
            await pool.query('ALTER TABLE export_tasks ADD COLUMN oss_key VARCHAR(255) DEFAULT NULL COMMENT \'云存储存储键\' AFTER progress');
            console.log('✅ Column oss_key added successfully.');
        }

        if (!columnNames.includes('file_size')) {
            console.log('🔄 Adding missing column file_size to export_tasks table...');
            await pool.query('ALTER TABLE export_tasks ADD COLUMN file_size BIGINT DEFAULT NULL COMMENT \'导出文件大小(字节)\' AFTER download_url');
            console.log('✅ Column file_size added successfully.');
        }

        // 检查 format 的类型是否为 ENUM，如果是则更改为 VARCHAR(50)
        const formatCol = columns.find((c: any) => c.Field === 'format');
        if (formatCol && formatCol.Type.includes('enum')) {
            console.log('🔄 Modifying format column from ENUM to VARCHAR(50) for export_tasks table...');
            await pool.query("ALTER TABLE export_tasks MODIFY COLUMN format VARCHAR(50) NOT NULL COMMENT '导出格式'");
            console.log('✅ Column format modified successfully.');
        }

        // 清洗卡在 active 95% 的历史脏任务（将其标为失败并提示重新导出）
        const [stuckJobs]: any = await pool.query(`
            SELECT id FROM export_tasks 
            WHERE status = 'active' AND progress = 95
        `);
        if (stuckJobs.length > 0) {
            console.log(`🧹 Found ${stuckJobs.length} stuck jobs at 95%. Marking as failed.`);
            await pool.query(`
                UPDATE export_tasks 
                SET status = 'failed', error_message = '导出中途数据库异常（现已修复，请重新尝试导出）'
                WHERE status = 'active' AND progress = 95
            `);
        }

        console.log('✅ export_tasks table is ready.');
    } catch (error) {
        console.error('❌ Failed to ensure export_tasks table:', error);
    }
}

/**
 * 清洗数据库中的本地临时脏数据 URL
 */
async function sanitizeDatabaseUrls() {
    try {
        console.log('🔄 Checking database for temporary local URLs (blob: or data:)...');
        
        // 1. 清理用户头像
        const [avatarResult] = await pool.query<any>(
            `UPDATE users 
             SET avatar_url = NULL 
             WHERE avatar_url LIKE 'blob:%' OR avatar_url LIKE 'data:image/%'`
        );
        if (avatarResult.affectedRows > 0) {
            console.log(`🧹 Cleared ${avatarResult.affectedRows} temporary avatar URLs in users table`);
        }

        // 2. 清理书籍封面
        const [coverResult] = await pool.query<any>(
            `UPDATE books 
             SET cover_url = NULL 
             WHERE cover_url LIKE 'blob:%' OR cover_url LIKE 'data:image/%'`
        );
        if (coverResult.affectedRows > 0) {
            console.log(`🧹 Cleared ${coverResult.affectedRows} temporary cover URLs in books table`);
        }

        // 3. 清理页面图片
        const [photoResult] = await pool.query<any>(
            `UPDATE photos 
             SET url = '' 
             WHERE url LIKE 'blob:%' OR url LIKE 'data:image/%'`
        );
        if (photoResult.affectedRows > 0) {
            console.log(`🧹 Cleared ${photoResult.affectedRows} temporary photo URLs in photos table`);
        }

        console.log('✅ Database URL sanitization check completed.');
    } catch (error) {
        console.error('❌ Database URL sanitization failed:', error);
    }
}

/**
 * 确保统计系统数据库表存在 (方案B)
 */
async function ensureStatisticsTables() {
    try {
        console.log('🔄 Checking database for statistics tables...');
        
        // 1. 创建通用实体统计指标表
        await pool.query(`
            CREATE TABLE IF NOT EXISTS entity_statistics (
                entity_type ENUM('book', 'template', 'theme') NOT NULL COMMENT '实体类型',
                entity_id VARCHAR(36) NOT NULL COMMENT '对应实体的UUID',
                metric_type ENUM('view', 'like', 'favorite') NOT NULL COMMENT '指标类型：阅读/点赞/收藏',
                metric_value INT UNSIGNED DEFAULT 0 NOT NULL COMMENT '累计数值',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '系统自动更新时间',
                PRIMARY KEY (entity_type, entity_id, metric_type),
                INDEX idx_entity_lookup (entity_id, entity_type)
            ) ENGINE=InnoDB COMMENT='通用实体统计指标表';
        `);

        // 2. 创建用户交互行为明细表
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_interactions (
                id VARCHAR(36) PRIMARY KEY COMMENT '唯一标识UUID',
                user_id VARCHAR(36) NOT NULL COMMENT '安全发起用户ID',
                entity_type ENUM('book', 'template', 'theme') NOT NULL COMMENT '目标实体类型',
                entity_id VARCHAR(36) NOT NULL COMMENT '目标实体ID',
                action_type ENUM('like', 'favorite', 'view') NOT NULL COMMENT '互动动作类型：点赞/收藏/阅读',
                created_at BIGINT NOT NULL COMMENT '行为发生时间戳(毫秒)',
                UNIQUE KEY ukey_user_entity_action (user_id, entity_type, entity_id, action_type),
                CONSTRAINT fk_user_interactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_action_list (user_id, action_type),
                INDEX idx_entity_interactions (entity_type, entity_id, action_type)
            ) ENGINE=InnoDB COMMENT='用户交互明细表';
        `);

        // 3. 创建每日流量吞吐表
        await pool.query(`
            CREATE TABLE IF NOT EXISTS daily_traffic_stats (
                date DATE PRIMARY KEY COMMENT '日期 YYYY-MM-DD',
                upload_bytes BIGINT DEFAULT 0 COMMENT '上传流量字节数',
                export_bytes BIGINT DEFAULT 0 COMMENT '导出流量字节数'
            ) ENGINE=InnoDB COMMENT='每日流量吞吐表';
        `);

        // 4. 检查 users 表，补充 last_active_at 字段
        console.log('🔄 Checking users table schema for last_active_at...');
        const [uCols]: any = await pool.query('SHOW COLUMNS FROM users');
        const uColNames = uCols.map((c: any) => c.Field);
        if (!uColNames.includes('last_active_at')) {
            console.log('🔄 Adding missing column last_active_at to users table...');
            await pool.query('ALTER TABLE users ADD COLUMN last_active_at BIGINT DEFAULT NULL COMMENT \'最后活跃时间戳\'');
            console.log('✅ Column last_active_at added successfully.');
        }

        console.log('✅ Statistics and traffic tables are ready.');
    } catch (error) {
        console.error('❌ Failed to ensure statistics tables:', error);
    }
}

/**
 * 确保社交系统相关表存在
 */
async function ensureSocialTables() {
    try {
        console.log('🔄 Checking database for social features tables...');

        // 1. 新增用户关注关系表
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_follows (
                id VARCHAR(36) PRIMARY KEY COMMENT '唯一标识',
                follower_id VARCHAR(36) NOT NULL COMMENT '关注发起者(粉丝)ID',
                leader_id VARCHAR(36) NOT NULL COMMENT '被关注者(创作者)ID',
                created_at BIGINT NOT NULL COMMENT '关注时间戳(毫秒)',
                UNIQUE KEY ukey_follow (follower_id, leader_id),
                CONSTRAINT fk_follow_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_follow_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_leader (leader_id),
                INDEX idx_follower_created (follower_id, created_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户关注关系表';
        `);

        // 2. 新增时光集评论与具体页面贴纸表
        await pool.query(`
            CREATE TABLE IF NOT EXISTS book_comments (
                id VARCHAR(36) PRIMARY KEY COMMENT '评论唯一标识UUID',
                book_id VARCHAR(36) NOT NULL COMMENT '目标时光书ID',
                page_id VARCHAR(36) DEFAULT NULL COMMENT '所属页面ID(为NULL时代表全书留言墙，非NULL代表页面指定位置的贴纸)',
                user_id VARCHAR(36) NOT NULL COMMENT '发表评论的用户ID',
                content TEXT NOT NULL COMMENT '文字内容',
                sticker_type VARCHAR(50) DEFAULT NULL COMMENT '贴纸样式标识(如 warm-note, star-stamp, heart-badge)',
                x_percent INT DEFAULT NULL COMMENT '页面贴纸绝对定位横坐标(0-100百分比)',
                y_percent INT DEFAULT NULL COMMENT '页面贴纸绝对定位纵坐标(0-100百分比)',
                created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
                CONSTRAINT fk_comment_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
                CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_book_page (book_id, page_id),
                INDEX idx_created (created_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='时光集评论与贴纸表';
        `);

        // 3. 新增多维度消息通知中心表
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id VARCHAR(36) PRIMARY KEY COMMENT '通知唯一标识UUID',
                receiver_id VARCHAR(36) NOT NULL COMMENT '接收通知的用户ID',
                sender_id VARCHAR(36) DEFAULT NULL COMMENT '触发交互的用户ID(为NULL代表系统级通知)',
                action_type ENUM('like', 'favorite', 'comment', 'follow', 'clone', 'system') NOT NULL COMMENT '交互行为类型',
                entity_type ENUM('book', 'template', 'theme', 'user', 'comment', 'system') NOT NULL COMMENT '关联的目标实体类型',
                entity_id VARCHAR(36) NOT NULL COMMENT '关联的目标实体UUID',
                entity_name VARCHAR(255) DEFAULT NULL COMMENT '关联实体快照名称(用于文案展示，防实体被删)',
                is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读(0-未读, 1-已读)',
                created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
                CONSTRAINT fk_notify_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_notify_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_receiver_unread (receiver_id, is_read, created_at DESC)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息通知中心表';
        `);

        console.log('✅ Social tables are ready.');
    } catch (error) {
        console.error('❌ Failed to ensure social tables:', error);
    }
}

start().catch(console.error);
// #endregion
