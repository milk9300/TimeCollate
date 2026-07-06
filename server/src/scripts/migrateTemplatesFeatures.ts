import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('⏳ 开始执行统一模板系统（V1.0）字段及合集表迁移...');

    const databaseName = config.mysql.database || 'timecollate';

    const connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        database: databaseName,
        ssl: config.mysql.ssl,
        multipleStatements: true
    });

    try {
        // 读取并执行迁移 SQL 脚本
        const sqlPath = path.join(__dirname, '../../sql/migrations/20260705_add_templates_features.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('正在执行 20260705_add_templates_features.sql 脚本...');
        await connection.query(sql);

        console.log('✅ 统一模板系统表结构扩展及新加合集表迁移成功！');
    } catch (error) {
        console.error('❌ 统一模板系统迁移失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
