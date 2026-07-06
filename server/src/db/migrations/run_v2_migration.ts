/**
 * 一次性迁移脚本：升级 TimeCollate 到 V2 架构并迁移数据
 * 使用方法：node --loader ts-node/esm src/db/migrations/run_v2_migration.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';

async function migrate() {
    const dbName = process.env.MYSQL_DATABASE || 'timecollate';
    const pool = mysql.createPool({
        host: process.env.MYSQL_HOST || 'localhost',
        port: parseInt(process.env.MYSQL_PORT || '3306', 10),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        database: dbName,
        ssl: process.env.MYSQL_SSL === 'true' ? { minVersion: 'TLSv1.2', rejectUnauthorized: false } : undefined,
        connectionLimit: 1
    });

    console.log('🚀 开始 V2 架构数据库升级与数据迁移...');

    try {
        // 1. 创建 book_covers 表
        const createCoversSql = `
            CREATE TABLE IF NOT EXISTS book_covers (
                id VARCHAR(36) PRIMARY KEY COMMENT '封面唯一标识',
                book_id VARCHAR(36) NOT NULL COMMENT '关联书籍ID',
                front_elements JSON DEFAULT NULL COMMENT '封面画布元素 JSON',
                back_elements JSON DEFAULT NULL COMMENT '封底画布元素 JSON',
                front_thumbnail VARCHAR(500) DEFAULT NULL COMMENT '封面预览缩略图WebP URL',
                back_thumbnail VARCHAR(500) DEFAULT NULL COMMENT '封底预览缩略图WebP URL',
                version INT DEFAULT 1 COMMENT '版本控制号',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_covers_book_id (book_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='书籍封面表';
        `;
        await pool.query(createCoversSql);
        console.log('✅ book_covers 表创建成功或已存在');

        // 2. 检查并给 books 表添加 cover_id 列
        const [booksColumns]: any = await pool.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'books' AND COLUMN_NAME = 'cover_id'",
            [dbName]
        );
        if (booksColumns.length === 0) {
            await pool.query("ALTER TABLE books ADD COLUMN cover_id VARCHAR(36) DEFAULT NULL COMMENT '关联封面ID'");
            console.log('✅ books 表成功添加 cover_id 字段');
        } else {
            console.log('ℹ️ books 表的 cover_id 字段已存在，跳过');
        }

        // 3. 检查并从 books 表中删除 cover_page 字段
        const [coverPageColumns]: any = await pool.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'books' AND COLUMN_NAME = 'cover_page'",
            [dbName]
        );
        if (coverPageColumns.length > 0) {
            await pool.query("ALTER TABLE books DROP COLUMN cover_page");
            console.log('✅ books 表删除冗余 cover_page 字段');
        } else {
            console.log('ℹ️ books 表中已无 cover_page 字段，跳过');
        }

        // 4. 检查并给 pages 表增加 background 和 thumbnail 字段
        const [pagesBgColumns]: any = await pool.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'background'",
            [dbName]
        );
        if (pagesBgColumns.length === 0) {
            await pool.query("ALTER TABLE pages ADD COLUMN background JSON DEFAULT NULL COMMENT '画布背景配置'");
            console.log('✅ pages 表成功添加 background 字段');
        } else {
            console.log('ℹ️ pages 表的 background 字段已存在，跳过');
        }

        const [pagesThumbColumns]: any = await pool.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'thumbnail'",
            [dbName]
        );
        if (pagesThumbColumns.length === 0) {
            await pool.query("ALTER TABLE pages ADD COLUMN thumbnail VARCHAR(500) DEFAULT NULL COMMENT '页面预览缩略图'");
            console.log('✅ pages 表成功添加 thumbnail 字段');
        } else {
            console.log('ℹ️ pages 表的 thumbnail 字段已存在，跳过');
        }

        // 5. 迁移存量封面页面到 book_covers 表
        // 根据 template_id = 'book-cover' 或者 page_type = 'cover' 提取
        const [legacyCovers]: any = await pool.query(
            "SELECT id, book_id, elements FROM pages WHERE template_id = 'book-cover' OR page_type = 'cover'"
        );
        console.log(`ℹ️ 扫描到 ${legacyCovers.length} 个存量封面需要迁移...`);

        for (const item of legacyCovers) {
            // 插入封面表
            let elements = item.elements;
            if (typeof elements === 'string') {
                try {
                    elements = JSON.parse(elements);
                } catch (e) {
                    elements = null;
                }
            }

            // 提取 elements 里的 background 信息
            const background = elements?.background || null;
            const elementsList = elements?.elements || elements?.slots || null; // 兼容 V2.0/V1.0
            
            const coverElements = {
                version: elements?.version || '2.0',
                elements: elementsList
            };

            await pool.query(
                `INSERT INTO book_covers (id, book_id, front_elements, front_thumbnail, version) 
                 VALUES (?, ?, ?, NULL, 1) 
                 ON DUPLICATE KEY UPDATE front_elements = VALUES(front_elements)`,
                [item.id, item.book_id, JSON.stringify(coverElements)]
            );

            // 更新 book 的 cover_id 字段
            await pool.query(
                "UPDATE books SET cover_id = ? WHERE id = ?",
                [item.id, item.book_id]
            );
        }
        console.log('✅ 数据迁移：成功将旧版封面记录转移至 book_covers，并回填 books.cover_id');

        // 6. 清理 pages 表中的旧封面数据
        await pool.query(
            "DELETE FROM pages WHERE template_id = 'book-cover' OR page_type = 'cover'"
        );
        console.log('✅ 清理 pages 表中原有的封面行数据完成');

        // 7. 从 pages 中删除 page_type 字段
        const [pageTypeColumns]: any = await pool.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pages' AND COLUMN_NAME = 'page_type'",
            [dbName]
        );
        if (pageTypeColumns.length > 0) {
            await pool.query("ALTER TABLE pages DROP COLUMN page_type");
            console.log('✅ pages 表成功删除 page_type 字段');
        } else {
            console.log('ℹ️ pages 表中已无 page_type 字段，跳过');
        }

        // 8. 数据清洗：将现有 pages 中的 background 配置提取到独立字段
        const [pagesWithBg]: any = await pool.query(
            "SELECT id, elements FROM pages WHERE elements IS NOT NULL"
        );
        let cleanedPagesCount = 0;
        for (const pg of pagesWithBg) {
            let els = pg.elements;
            if (typeof els === 'string') {
                try {
                    els = JSON.parse(els);
                } catch (e) {
                    continue;
                }
            }
            if (els && els.background) {
                const bg = els.background;
                // 从 elements 中删除 background，避免冗余
                delete els.background;
                await pool.query(
                    "UPDATE pages SET background = ?, elements = ? WHERE id = ?",
                    [JSON.stringify(bg), JSON.stringify(els), pg.id]
                );
                cleanedPagesCount++;
            }
        }
        console.log(`✅ 数据清洗：共处理 ${cleanedPagesCount} 页的背景字段，将其移出 elements`);
        console.log('🎉 数据库 V2 架构升级及迁移任务已成功完成！');

    } catch (err) {
        console.error('❌ 升级迁移失败:', err);
    } finally {
        await pool.end();
    }
}

migrate();
