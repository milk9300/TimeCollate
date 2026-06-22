import mysql from 'mysql2/promise';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
    console.log('⏳ 开始执行 page_templates 表重构及数据库迁移...');

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
        // 1. 动态查询 user_collected_templates 指向 book_templates 的外键约束名称并删除
        console.log('正在检测并解除 user_collected_templates 对 book_templates 的外键约束...');
        const [constraints]: any[] = await connection.query(
            `SELECT CONSTRAINT_NAME 
             FROM information_schema.KEY_COLUMN_USAGE 
             WHERE TABLE_SCHEMA = ? 
               AND TABLE_NAME = 'user_collected_templates' 
               AND REFERENCED_TABLE_NAME = 'book_templates'`,
            [databaseName]
        );

        for (const row of constraints) {
            console.log(`- 发现外键约束: ${row.CONSTRAINT_NAME}，正在删除...`);
            await connection.query(
                `ALTER TABLE user_collected_templates DROP FOREIGN KEY ${row.CONSTRAINT_NAME}`
            );
            console.log(`- 外键约束 ${row.CONSTRAINT_NAME} 已成功删除。`);
        }

        // 2. 读取并执行重构 SQL 脚本 (进行表结构升级、数据复制及 pages 表外键建立)
        const sqlPath = path.join(__dirname, '../../sql/migrations/refactor_templates_to_page_templates.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');

        console.log('正在执行重构 SQL 脚本...');
        await connection.query(sql);

        // 3. 为 user_collected_templates 重新建立指向新 page_templates 的外键关联 (幂等校验)
        console.log('正在检测并建立 user_collected_templates 到 page_templates 的新外键约束...');
        const [existingFk]: any[] = await connection.query(
            `SELECT CONSTRAINT_NAME 
             FROM information_schema.TABLE_CONSTRAINTS 
             WHERE TABLE_SCHEMA = ? 
               AND TABLE_NAME = 'user_collected_templates' 
               AND CONSTRAINT_NAME = 'fk_user_collected_templates_template_id'`,
            [databaseName]
        );

        if (existingFk.length === 0) {
            console.log('- 正在创建新外键约束 fk_user_collected_templates_template_id...');
            await connection.query(
                `ALTER TABLE user_collected_templates 
                 ADD CONSTRAINT fk_user_collected_templates_template_id 
                 FOREIGN KEY (template_id) REFERENCES page_templates(id) ON DELETE CASCADE`
            );
            console.log('✅ 新外键约束建立完成。');
        } else {
            console.log('ℹ️ 新外键约束已存在，跳过。');
        }

        console.log('✅ page_templates 表重构及外键依赖迁移成功！');
    } catch (error) {
        console.error('❌ page_templates 表重构迁移失败:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

migrate();
