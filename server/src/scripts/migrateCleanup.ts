import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('🚀 开始执行数据库全面整理与清理（移除废弃表和冗余列）...');

    const connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        ssl: config.mysql.ssl,
        multipleStatements: true
    });

    try {
        const sqlPath = path.join(__dirname, '../../sql/migrations/cleanup_database.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('正在执行 cleanup_database.sql SQL 清理脚本...');
        await connection.query(sql);

        console.log('✅ 数据库清理成功！废弃表与 pages.content 字段已彻底移除。');
        process.exit(0);
    } catch (error) {
        console.error('❌ 数据库清理失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
