-- 模板与排版系统数据库重构迁移脚本 (幂等安全版)
USE timecollate;

-- 1. 创建页面排版模板表 page_templates (将索引直接放入 CREATE TABLE 以保证幂等)
CREATE TABLE IF NOT EXISTS page_templates (
    id VARCHAR(36) PRIMARY KEY COMMENT '模板唯一标识UUID',
    name VARCHAR(100) NOT NULL COMMENT '模板名称',
    template_type ENUM('cover', 'preface', 'structural', 'content') NOT NULL DEFAULT 'content' COMMENT '模板结构类型: cover-书封, preface-前言, structural-结构/过渡页, content-内容页',
    photo_count INT NOT NULL DEFAULT 0 COMMENT '支持/推荐照片数量',
    category VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT '书籍主题分类: travel-旅行, baby-亲子, love-恋爱, graduation-毕业, pet-萌宠, general-通用',
    elements JSON NOT NULL COMMENT '核心 Canvas JSON Schema',
    thumbnail_url VARCHAR(500) DEFAULT NULL COMMENT '预览缩略图 WebP URL',
    creator_id VARCHAR(36) NOT NULL DEFAULT 'system' COMMENT '创作者ID: system-系统预置, user_uuid-用户自定义发布',
    visibility ENUM('private', 'public') NOT NULL DEFAULT 'private' COMMENT '可见性: private-私有, public-公开可见',
    created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_type (category, template_type),
    INDEX idx_creator_visibility (creator_id, visibility)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='排版页模板表';

-- 2. 检查旧表是否存在，如果存在则进行数据迁移
SET @old_table_exists = (
    SELECT COUNT(*) 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() AND table_name = 'book_templates'
);

-- 如果存在旧表，且新表为空，则导入历史数据
SET @new_table_empty = (
    SELECT COUNT(*) FROM page_templates
);

SET @migrate_data_stmt = IF(
    @old_table_exists > 0 AND @new_table_empty = 0,
    'INSERT IGNORE INTO page_templates (id, name, template_type, photo_count, category, elements, creator_id, visibility, created_at)
     SELECT 
         id, 
         name, 
         CASE 
             WHEN id = \'cover\' THEN \'content\'
             WHEN id = \'preface\' THEN \'preface\'
             ELSE \'content\' 
         END as template_type,
         photo_count,
         CASE 
             WHEN category = \'classic\' THEN \'general\'
             WHEN category = \'warm\' THEN \'general\'
             WHEN category = \'modern\' THEN \'general\'
             WHEN category = \'magazine\' THEN \'general\'
             ELSE category 
         END as category,
         layout_schema as elements,
         \'system\' as creator_id,
         \'public\' as visibility,
         UNIX_TIMESTAMP() * 1000 as created_at
     FROM book_templates',
    'SELECT 1'
);

PREPARE stmt_mig FROM @migrate_data_stmt;
EXECUTE stmt_mig;
DEALLOCATE PREPARE stmt_mig;

-- 3. 在 pages 表上幂等式增加 template_id 字段
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'pages' 
      AND column_name = 'template_id'
);

SET @add_col_stmt = IF(
    @column_exists = 0,
    'ALTER TABLE pages ADD COLUMN template_id VARCHAR(36) DEFAULT NULL COMMENT \'引用的模板ID\'',
    'SELECT 1'
);

PREPARE stmt_col FROM @add_col_stmt;
EXECUTE stmt_col;
DEALLOCATE PREPARE stmt_col;

-- 4. 幂等式增加外键约束 fk_pages_template_id
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.table_constraints 
    WHERE table_schema = DATABASE() 
      AND table_name = 'pages' 
      AND constraint_name = 'fk_pages_template_id'
);

SET @add_fk_stmt = IF(
    @fk_exists = 0,
    'ALTER TABLE pages ADD CONSTRAINT fk_pages_template_id FOREIGN KEY (template_id) REFERENCES page_templates(id) ON DELETE SET NULL',
    'SELECT 1'
);

PREPARE stmt_fk FROM @add_fk_stmt;
EXECUTE stmt_fk;
DEALLOCATE PREPARE stmt_fk;

-- 5. 幂等式增加索引 idx_pages_template_id
SET @idx_exists = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'pages' 
      AND index_name = 'idx_pages_template_id'
);

SET @add_idx_stmt = IF(
    @idx_exists = 0,
    'ALTER TABLE pages ADD INDEX idx_pages_template_id (template_id)',
    'SELECT 1'
);

PREPARE stmt_idx FROM @add_idx_stmt;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- 6. 清理旧版 book_templates 表 (仅当旧表存在且我们不需要它时)
SET @drop_old_stmt = IF(
    @old_table_exists > 0,
    'DROP TABLE book_templates',
    'SELECT 1'
);

PREPARE stmt_drop FROM @drop_old_stmt;
EXECUTE stmt_drop;
DEALLOCATE PREPARE stmt_drop;
