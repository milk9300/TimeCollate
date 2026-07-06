import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('开始执行 pages 表 layout 到 template 字段数据库合并迁移...');

    const connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        ssl: config.mysql.ssl,
        multipleStatements: true
    });

    try {
        const sqlPath = path.join(__dirname, '../../sql/migrations/migrate_pages_layout_to_template.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('正在执行迁移 SQL 脚本...');
        await connection.query(sql);

        console.log('✅ pages 表 template_id 合并迁移成功！');
    } catch (error) {
        console.error('❌ pages 表 template_id 合并迁移失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
