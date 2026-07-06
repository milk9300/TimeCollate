import { pool } from '../db/index.js';

async function runMigration() {
    console.log('🚀 Starting cover_page column migration...');
    const connection = await pool.getConnection();
    try {
        // 检查 books 表是否已经有 cover_page 字段
        const [columns] = await connection.query<any[]>(
            `SHOW COLUMNS FROM books LIKE 'cover_page'`
        );
        
        if (columns.length > 0) {
            console.log('✅ Column cover_page already exists in books table. Skipping.');
        } else {
            console.log('Adding cover_page column to books table...');
            await connection.query(
                `ALTER TABLE books ADD COLUMN cover_page JSON DEFAULT NULL COMMENT '封面画布页面JSON'`
            );
            console.log('✅ Successfully added cover_page column to books table.');
        }
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        connection.release();
        await pool.end();
    }
}

runMigration();
