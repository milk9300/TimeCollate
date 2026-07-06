import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    console.log('👉 正在连接 MySQL 数据库进行物理表隔离迁移...');

    const connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        ssl: config.mysql.ssl,
        multipleStatements: true
    });

    try {
        const sqlPath = path.join(__dirname, '../../sql/migrations/split_assets_and_materials.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('👉 正在执行 split_assets_and_materials.sql 迁移脚本 (此操作为破坏性与数据迁移操作)...');
        await connection.query(sql);

        console.log('✅ [Migration Success] 物理表拆分及数据迁移执行成功！');
    } catch (error) {
        console.error('❌ [Migration Failed] 物理表隔离迁移失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

runMigration();
