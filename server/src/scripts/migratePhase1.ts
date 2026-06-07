import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkColumnExists(connection: mysql.Connection, dbName: string, tableName: string, columnName: string): Promise<boolean> {
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
    console.log('开始执行阶段一（模板/主题订阅及权限表）数据库迁移...');

    const connection = await mysql.createConnection({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        multipleStatements: true
    });

    try {
        const dbName = config.mysql.database;

        // 1. 检查并添加 book_templates.visibility 字段
        const hasVisibility = await checkColumnExists(connection, dbName, 'book_templates', 'visibility');
        if (!hasVisibility) {
            console.log('正在为 book_templates 添加 visibility 字段...');
            await connection.query(
                `ALTER TABLE book_templates 
                 ADD COLUMN visibility ENUM('private', 'public') DEFAULT 'private' 
                 COMMENT '可见性：private(仅自己可见)，public(市场公开可供订阅)'`
            );
            console.log('✅ visibility 字段添加成功');
        } else {
            console.log('ℹ️ book_templates.visibility 字段已存在，跳过。');
        }

        // 2. 检查并添加 book_templates.creator_id 字段
        const hasCreatorId = await checkColumnExists(connection, dbName, 'book_templates', 'creator_id');
        if (!hasCreatorId) {
            console.log('正在为 book_templates 添加 creator_id 字段...');
            await connection.query(
                `ALTER TABLE book_templates 
                 ADD COLUMN creator_id VARCHAR(36) DEFAULT 'system' 
                 COMMENT '创作者ID(system为系统内置)'`
            );
            console.log('✅ creator_id 字段添加成功');
        } else {
            console.log('ℹ️ book_templates.creator_id 字段已存在，跳过。');
        }

        // 3. 执行其它建表和修改 SQL 脚本
        const sqlPath = path.join(__dirname, '../../sql/migrations/add_collected_tables.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('正在执行其它迁移与建表 SQL 脚本...');
        await connection.query(sql);

        console.log('✅ 阶段一数据库迁移成功！相关订阅关联表已建立，主题表已就绪。');
    } catch (error) {
        console.error('❌ 阶段一数据库迁移失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
