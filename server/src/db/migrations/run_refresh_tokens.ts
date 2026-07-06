/**
 * 一次性迁移脚本：创建 refresh_tokens 表
 * 使用方法：node --loader ts-node/esm src/db/migrations/run_refresh_tokens.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: process.env.MYSQL_DATABASE || 'timecollate',
        ssl: process.env.MYSQL_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : undefined,
    });

    try {
        // 先查询 users 表 id 列的类型，确保外键兼容
        const [cols]: any = await pool.query(
            "SELECT COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'id'",
            [process.env.MYSQL_DATABASE || 'timecollate']
        );
        console.log('users.id 列信息:', cols[0]);

        const colType = cols[0]?.COLUMN_TYPE || 'varchar(36)';
        const charset = cols[0]?.CHARACTER_SET_NAME || 'utf8mb4';
        const collation = cols[0]?.COLLATION_NAME || 'utf8mb4_general_ci';

        const sql = `
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id VARCHAR(36) PRIMARY KEY,
                user_id ${colType} CHARACTER SET ${charset} COLLATE ${collation} NOT NULL,
                token_hash VARCHAR(128) NOT NULL,
                expires_at BIGINT NOT NULL,
                created_at BIGINT NOT NULL,
                INDEX idx_refresh_tokens_user_id (user_id),
                INDEX idx_refresh_tokens_token_hash (token_hash),
                INDEX idx_refresh_tokens_expires_at (expires_at),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=${charset} COLLATE=${collation};
        `;

        await pool.query(sql);
        console.log('✅ refresh_tokens 表创建成功');
    } catch (err) {
        console.error('❌ 迁移失败:', err);
    } finally {
        await pool.end();
    }
}

migrate();
