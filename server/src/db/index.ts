import mysql from 'mysql2/promise';
import { config } from '../config/index.js';

/**
 * MySQL 连接池
 * 使用 mysql2/promise 提供异步 API
 */
export const pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    ssl: config.mysql.ssl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // 启用多语句支持
    multipleStatements: true,
});

/**
 * 测试数据库连接
 */
export async function testConnection(): Promise<boolean> {
    try {
        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        console.log('✅ MySQL 连接成功');
        return true;
    } catch (error) {
        console.error('❌ MySQL 连接失败:', error);
        return false;
    }
}
