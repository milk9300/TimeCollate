import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDb() {
    console.log('开始初始化数据库...');

    // 先连接不指定数据库，以创建数据库
    const connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        ssl: config.mysql.ssl,
        multipleStatements: true
    });

    try {
        const sqlPath = path.join(__dirname, '../../sql/schema.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('正在执行 SQL 脚本...');
        await connection.query(sql);

        console.log('✅ 数据库初始化成功！');
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

initDb();
