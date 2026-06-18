import mysql from 'mysql2/promise';
import { pool } from '../db/index.js';
import { v4 as uuidv4 } from 'uuid';
import type { RowDataPacket } from 'mysql2';

async function migrate() {
    console.log('⏳ 开始执行数据库 Canvas JSON 画布化及统一资源中心重构迁移...');

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. 检查是否已经迁移过 (assets 表是否存在)
        const [tables] = await connection.query<RowDataPacket[]>(
            "SHOW TABLES LIKE 'assets'"
        );
        if (tables.length > 0) {
            console.log('ℹ️ 检测到 assets 表已存在，跳过底层 DDL 建表迁移。');
            await connection.rollback();
            connection.release();
            return;
        }

        console.log('👉 正在创建新的资产分类与关联表...');
        
        // 创建 asset_folders
        await connection.query(`
            CREATE TABLE IF NOT EXISTS asset_folders (
                id VARCHAR(36) PRIMARY KEY COMMENT '文件夹唯一UUID',
                name VARCHAR(100) NOT NULL COMMENT '文件夹名称',
                parent_id VARCHAR(36) DEFAULT NULL COMMENT '父级文件夹ID，NULL表示根目录',
                scope ENUM('system', 'user') NOT NULL DEFAULT 'user' COMMENT '作用域：system-系统公共素材目录，user-用户个人网盘',
                creator_id VARCHAR(36) DEFAULT NULL COMMENT '创建者用户ID，系统目录为NULL',
                icon VARCHAR(100) DEFAULT NULL COMMENT '文件夹图标类名',
                sort_order INT DEFAULT 0 COMMENT '同级排序权重',
                created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '系统更新时间',
                INDEX idx_parent_creator (parent_id, creator_id),
                INDEX idx_scope_sort (scope, sort_order)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资产文件夹表';
        `);

        // 从 material_folders 复制数据
        const [foldersExist] = await connection.query<RowDataPacket[]>("SHOW TABLES LIKE 'material_folders'");
        if (foldersExist.length > 0) {
            await connection.query('INSERT IGNORE INTO asset_folders SELECT * FROM material_folders');
            console.log('✅ 成功从 material_folders 迁移数据至 asset_folders');
        }

        // 创建 assets
        await connection.query(`
            CREATE TABLE IF NOT EXISTS assets (
                id VARCHAR(36) PRIMARY KEY COMMENT '资产唯一UUID',
                user_id VARCHAR(36) DEFAULT NULL COMMENT '用户ID，系统公共资源为NULL',
                type VARCHAR(20) NOT NULL COMMENT '资源类型 (photo, sticker, background, frame, decoration, template_asset, font)',
                name VARCHAR(255) NOT NULL COMMENT '文件名/资源名称',
                url VARCHAR(500) NOT NULL COMMENT '资源访问地址',
                thumbnail VARCHAR(500) DEFAULT NULL COMMENT '缩略图/缩约版地址',
                oss_key VARCHAR(255) DEFAULT NULL COMMENT '云存储存储键',
                size BIGINT DEFAULT 0 COMMENT '文件大小(字节)',
                width INT DEFAULT NULL COMMENT '图片/资源宽度',
                height INT DEFAULT NULL COMMENT '图片/资源高度',
                folder_id VARCHAR(36) DEFAULT NULL COMMENT '所属文件夹ID',
                metadata JSON DEFAULT NULL COMMENT '素材的元数据，如SVG贴纸源码、字体信息等',
                created_at BIGINT NOT NULL COMMENT '创建时间戳',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (folder_id) REFERENCES asset_folders(id) ON DELETE SET NULL,
                INDEX idx_user_type (user_id, type),
                INDEX idx_folder_type (folder_id, type)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资产表';
        `);

        // 从 materials 迁移数据
        const [materialsExist] = await connection.query<RowDataPacket[]>("SHOW TABLES LIKE 'materials'");
        if (materialsExist.length > 0) {
            await connection.query(`
                INSERT IGNORE INTO assets (id, user_id, type, name, url, thumbnail, oss_key, size, width, height, folder_id, metadata, created_at, updated_at)
                SELECT 
                    id, 
                    creator_id as user_id, 
                    CASE WHEN material_type = 'decorator' THEN 'decoration' ELSE material_type END as type,
                    name, 
                    file_url as url, 
                    cover_url as thumbnail, 
                    oss_key, 
                    file_size as size, 
                    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.width')), 'null') as width,
                    NULLIF(JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.height')), 'null') as height,
                    folder_id, 
                    metadata, 
                    created_at, 
                    updated_at 
                FROM materials;
            `);
            console.log('✅ 成功从 materials 迁移数据至 assets');
        }

        // 创建 photo_metadata
        await connection.query(`
            CREATE TABLE IF NOT EXISTS photo_metadata (
                id VARCHAR(36) PRIMARY KEY COMMENT '元数据唯一UUID',
                asset_id VARCHAR(36) NOT NULL COMMENT '关联资产ID',
                taken_at BIGINT DEFAULT NULL COMMENT '拍摄时间戳',
                latitude DOUBLE DEFAULT NULL COMMENT '纬度',
                longitude DOUBLE DEFAULT NULL COMMENT '经度',
                address VARCHAR(255) DEFAULT NULL COMMENT '地理位置名称',
                ai_tags JSON DEFAULT NULL COMMENT 'AI标签列表 (JSON Array)',
                scene VARCHAR(100) DEFAULT NULL COMMENT '场景分类',
                emotion VARCHAR(50) DEFAULT NULL COMMENT '情绪标签',
                faces_count INT DEFAULT 0 COMMENT '人脸数量',
                faces_metadata JSON DEFAULT NULL COMMENT '人脸框选等元数据',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
                INDEX idx_asset_id (asset_id),
                INDEX idx_taken_at (taken_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='照片记忆元数据表';
        `);

        // 默认初始化照片元数据记录
        await connection.query(`
            INSERT IGNORE INTO photo_metadata (id, asset_id, ai_tags)
            SELECT UUID(), id, '[]' FROM assets WHERE type = 'photo';
        `);
        console.log('✅ 成功初始化照片元数据 photo_metadata');

        // 创建收藏表 asset_favorites
        await connection.query(`
            CREATE TABLE IF NOT EXISTS asset_favorites (
                user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
                asset_id VARCHAR(36) NOT NULL COMMENT '收藏资产ID',
                created_at BIGINT NOT NULL COMMENT '收藏时间戳',
                PRIMARY KEY (user_id, asset_id),
                FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
                INDEX idx_user_fav (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户资产收藏表';
        `);

        const [favExist] = await connection.query<RowDataPacket[]>("SHOW TABLES LIKE 'material_favorites'");
        if (favExist.length > 0) {
            await connection.query('INSERT IGNORE INTO asset_favorites SELECT * FROM material_favorites');
            console.log('✅ 成功从 material_favorites 迁移数据至 asset_favorites');
        }

        // 迁移标签表
        await connection.query(`
            CREATE TABLE IF NOT EXISTS asset_tags (
                id VARCHAR(36) PRIMARY KEY COMMENT '标签唯一UUID',
                name VARCHAR(50) UNIQUE NOT NULL COMMENT '标签名',
                scope ENUM('system', 'user') NOT NULL DEFAULT 'system' COMMENT '作用域',
                creator_id VARCHAR(36) DEFAULT NULL COMMENT '创建者'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资产标签表';
        `);

        const [tagsExist] = await connection.query<RowDataPacket[]>("SHOW TABLES LIKE 'material_tags'");
        if (tagsExist.length > 0) {
            await connection.query('INSERT IGNORE INTO asset_tags SELECT * FROM material_tags');
            console.log('✅ 成功从 material_tags 迁移数据至 asset_tags');
        }

        await connection.query(`
            CREATE TABLE IF NOT EXISTS asset_tag_relations (
                asset_id VARCHAR(36) NOT NULL COMMENT '资产ID',
                tag_id VARCHAR(36) NOT NULL COMMENT '标签ID',
                PRIMARY KEY (asset_id, tag_id),
                FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES asset_tags(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资产标签关联表';
        `);

        const [relExist] = await connection.query<RowDataPacket[]>("SHOW TABLES LIKE 'material_tag_relations'");
        if (relExist.length > 0) {
            await connection.query('INSERT IGNORE INTO asset_tag_relations SELECT * FROM material_tag_relations');
            console.log('✅ 成功从 material_tag_relations 迁移数据至 asset_tag_relations');
        }

        // 8. 升级 pages 表结构
        console.log('👉 正在改造 pages 表结构，引入 elements (JSON) 字段...');
        await connection.query(`
            ALTER TABLE pages 
            ADD COLUMN page_type VARCHAR(20) DEFAULT 'content' COMMENT '页面类型: cover, content, ending',
            ADD COLUMN layout_type VARCHAR(20) DEFAULT 'grid' COMMENT '排版布局类型',
            ADD COLUMN elements JSON DEFAULT NULL COMMENT '画布内所有元素及定位的 JSON 对象'
        `);

        // 复制 layout 列数据
        await connection.query('UPDATE pages SET layout_type = layout WHERE layout IS NOT NULL');
        // 删除 layout 列
        await connection.query('ALTER TABLE pages DROP COLUMN layout');
        console.log('✅ pages 表结构升级完成');

        // 9. 将现有的 pages 和 photos 关系编译进 JSON 列
        console.log('👉 正在将 pages 与 photos 联表合并为 elements JSON 画布结构...');
        const [pages] = await connection.query<RowDataPacket[]>('SELECT * FROM pages');
        const [photos] = await connection.query<RowDataPacket[]>('SELECT * FROM photos ORDER BY sort_order');

        // 建立 pageId -> photos 映射
        const photosByPage = new Map<string, any[]>();
        for (const p of photos) {
            if (!photosByPage.has(p.page_id)) {
                photosByPage.set(p.page_id, []);
            }
            photosByPage.get(p.page_id)!.push(p);
        }

        let migratedPagesCount = 0;
        for (const page of pages) {
            const pagePhotos = photosByPage.get(page.id) || [];
            
            // 解析原 content (含 slots)
            let slots: any = {};
            let atmosphere = 'default';
            let fontFamily = 'sans';
            let backgroundImage: string | null = null;
            let decorations: any[] = [];
            let elementOverrides: any = {};

            if (page.content) {
                const contentStr = page.content.trim();
                if (contentStr.startsWith('{') && contentStr.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(contentStr);
                        slots = parsed.slots || {};
                        atmosphere = parsed.atmosphere || 'default';
                        fontFamily = parsed.fontFamily || 'sans';
                        backgroundImage = parsed.backgroundImage || null;
                        decorations = parsed.decorations || [];
                        elementOverrides = parsed.elementOverrides || {};
                    } catch (e) {
                        slots = {
                            'page-content': { content: page.content },
                            'default': { content: page.content }
                        };
                    }
                } else {
                    slots = {
                        'page-content': { content: page.content },
                        'default': { content: page.content }
                    };
                }
            }

            // 编译 photos
            const processedPhotos = pagePhotos.map((photo: any) => ({
                id: photo.id,
                url: photo.url,
                caption: photo.caption || '',
                width: photo.width || null,
                height: photo.height || null,
                ossKey: photo.oss_key || undefined,
                scale: photo.scale !== null ? Number(photo.scale) : 1.0,
                xOffset: photo.x_offset !== null ? Number(photo.x_offset) : 50,
                yOffset: photo.y_offset !== null ? Number(photo.y_offset) : 50
            }));

            // 整合 elements JSON
            const elementsJson = {
                version: "1.0",
                slots,
                atmosphere,
                fontFamily,
                backgroundImage,
                decorations,
                elementOverrides,
                photos: processedPhotos
            };

            // 判断 pageType
            let pageType = 'content';
            if (page.layout_type === 'book-cover') {
                pageType = 'cover';
            } else if (page.layout_type === 'back-cover') {
                pageType = 'ending';
            }

            await connection.query(
                'UPDATE pages SET elements = ?, page_type = ? WHERE id = ?',
                [JSON.stringify(elementsJson), pageType, page.id]
            );
            migratedPagesCount++;
        }
        console.log(`✅ 成功将 ${migratedPagesCount} 页的排版图片数据打包灌入 pages.elements JSON 列`);

        // 10. 删除旧表与旧外键
        console.log('👉 正在物理清理 legacy 素材和照片关系表...');
        await connection.query('DROP TABLE IF EXISTS photos');
        await connection.query('DROP TABLE IF EXISTS material_favorites');
        await connection.query('DROP TABLE IF EXISTS material_tag_relations');
        await connection.query('DROP TABLE IF EXISTS material_tags');
        await connection.query('DROP TABLE IF EXISTS materials');
        await connection.query('DROP TABLE IF EXISTS material_folders');

        console.log('✅ 旧表 photos, materials 等清理完成！');

        await connection.commit();
        console.log('========================================');
        console.log('🎉 恭喜！Canvas JSON 画布化及统一资源中心重构数据迁移大功告成！');
        console.log('========================================');
    } catch (error) {
        await connection.rollback();
        console.error('❌ 数据库迁移合并失败，事务已安全回滚：', error);
        process.exit(1);
    } finally {
        connection.release();
    }
}

migrate();
