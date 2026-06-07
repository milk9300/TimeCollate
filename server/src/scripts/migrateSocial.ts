import { pool } from '../db/index.js';
import { config } from '../config/index.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
    const dbName = config.mysql.database;
    const [rows]: any = await pool.query(
        `SELECT COUNT(*) as count 
         FROM information_schema.columns 
         WHERE table_schema = ? 
           AND table_name = ? 
           AND column_name = ?`,
        [dbName, tableName, columnName]
    );
    return rows[0].count > 0;
}

async function runSocialMigration() {
    console.log('开始执行社交功能（关注、贴纸/评论、通知、积分/价格预留）数据库迁移...');
    try {
        // 1. 检查并添加 users.points
        const hasPoints = await checkColumnExists('users', 'points');
        if (!hasPoints) {
            console.log('正在为 users 表添加 points 字段...');
            await pool.query(
                "ALTER TABLE users ADD COLUMN points INT DEFAULT 100 COMMENT '用户账户积分数' AFTER avatar_url"
            );
            console.log('✅ users.points 字段添加成功');
        } else {
            console.log('ℹ️ users.points 字段已存在，跳过');
        }

        // 2. 检查并添加 books.price
        const hasBookPrice = await checkColumnExists('books', 'price');
        if (!hasBookPrice) {
            console.log('正在为 books 表添加 price 字段...');
            await pool.query(
                "ALTER TABLE books ADD COLUMN price INT DEFAULT 0 COMMENT '套用该时光集排版所需的积分价格' AFTER category"
            );
            console.log('✅ books.price 字段添加成功');
        } else {
            console.log('ℹ️ books.price 字段已存在，跳过');
        }

        // 3. 检查并添加 book_templates.price
        const hasTemplatePrice = await checkColumnExists('book_templates', 'price');
        if (!hasTemplatePrice) {
            console.log('正在为 book_templates 表添加 price 字段...');
            await pool.query(
                "ALTER TABLE book_templates ADD COLUMN price INT DEFAULT 0 COMMENT '订阅/套用该模板所需的积分价格' AFTER category"
            );
            console.log('✅ book_templates.price 字段添加成功');
        } else {
            console.log('ℹ️ book_templates.price 字段已存在，跳过');
        }

        // 4. 执行其余建表 SQL 脚本
        const sqlPath = path.join(__dirname, '../../sql/migrations/add_social_features.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('正在执行 SQL 脚本以创建社交相关表（follows, comments, notifications）...');
        await pool.query(sql);
        console.log('✅ 社交功能数据库建表成功！');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ 社交功能迁移执行失败:', error);
        process.exit(1);
    }
}

runSocialMigration();
