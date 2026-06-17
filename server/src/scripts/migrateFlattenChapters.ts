import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('🚀 开始执行底层数据扁平化数据库迁移...');

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
        const sqlPath = path.join(__dirname, '../../sql/migrations/flatten_chapters_pages.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('正在执行 flatten_chapters_pages.sql 迁移脚本...');
        await connection.query(sql);

        console.log('✅ 数据库迁移成功！已删除 chapters 表，pages 与 books 表直接关联并完成数据对齐，users 表新增 expires_at 列。');
        process.exit(0);
    } catch (error) {
        console.error('❌ 数据库迁移失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
