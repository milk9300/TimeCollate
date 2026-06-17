import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkColumnExists(connection: mysql.Connection, tableName: string, columnName: string): Promise<boolean> {
    const dbName = config.mysql.database;
    const [rows]: any = await connection.query(
        `SELECT COUNT(*) as count 
         FROM information_schema.columns 
         WHERE table_schema = ? 
           AND table_name = ? 
           AND column_name = ?`,
        [dbName, tableName, columnName]
    );
    return rows[0].count > 0;
}

async function migrate() {
    console.log('开始执行反馈回复数据库字段迁移...');

    const connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        ssl: config.mysql.ssl,
        multipleStatements: true
    });

    try {
        const hasReplyContent = await checkColumnExists(connection, 'feedbacks', 'reply_content');
        
        if (hasReplyContent) {
            console.log('ℹ️ feedbacks.reply_content 字段已存在，跳过反馈回复迁移。');
            return;
        }

        const sqlPath = path.join(__dirname, '../../sql/migrations/add_feedback_reply.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('正在执行迁移 SQL 脚本...');
        await connection.query(sql);

        console.log('✅ 反馈回复字段迁移成功！feedbacks 表已支持管理员回复。');
    } catch (error) {
        console.error('❌ 反馈回复字段迁移失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
