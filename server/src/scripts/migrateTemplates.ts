import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('开始执行动态模板数据库迁移...');

    const connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        ssl: config.mysql.ssl,
        multipleStatements: true
    });

    try {
        const sqlPath = path.join(__dirname, '../../sql/migrations/add_templates_table.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('正在执行迁移 SQL 脚本...');
        await connection.query(sql);

        console.log('✅ 动态模板表迁移成功！已导入首批测试模板。');
    } catch (error) {
        console.error('❌ 动态模板表迁移失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
