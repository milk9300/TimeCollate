import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('🚀 开始执行 books 表新增 type 字段迁移...');

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
        const sqlPath = path.join(__dirname, '../../sql/migrations/add_books_type_column.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('正在执行 add_books_type_column.sql SQL 迁移脚本...');
        await connection.query(sql);

        console.log('✅ books 表 type 字段迁移成功！历史数据已设为 "book"。');
        process.exit(0);
    } catch (error) {
        console.error('❌ books 表 type 字段迁移失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
