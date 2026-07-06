-- TimeCollate 数据库清理与废弃表/字段移除脚本
USE timecollate;

-- 1. 移除废弃表 (如果存在)
DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS chapters;
DROP TABLE IF EXISTS material_favorites;
DROP TABLE IF EXISTS material_tag_relations;
DROP TABLE IF EXISTS material_tags;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS material_folders;
DROP TABLE IF EXISTS user_collected_themes;
DROP TABLE IF EXISTS book_themes;

-- 2. 移除 pages 废弃的旧正文 content 字段 (如果存在)
SET @content_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'pages' 
      AND column_name = 'content'
);

SET @alter_pages_stmt = IF(
    @content_exists > 0,
    'ALTER TABLE pages DROP COLUMN content',
    'SELECT 1'
);

PREPARE stmt_pages FROM @alter_pages_stmt;
EXECUTE stmt_pages;
DEALLOCATE PREPARE stmt_pages;

-- 3. 移除 books 表废弃的主题风格和序言字段
SET @theme_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'books' AND column_name = 'theme');
SET @alter_theme_stmt = IF(@theme_exists > 0, 'ALTER TABLE books DROP COLUMN theme', 'SELECT 1');
PREPARE stmt_theme FROM @alter_theme_stmt;
EXECUTE stmt_theme;
DEALLOCATE PREPARE stmt_theme;

SET @preface_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'books' AND column_name = 'preface');
SET @alter_preface_stmt = IF(@preface_exists > 0, 'ALTER TABLE books DROP COLUMN preface', 'SELECT 1');
PREPARE stmt_preface FROM @alter_preface_stmt;
EXECUTE stmt_preface;
DEALLOCATE PREPARE stmt_preface;

SET @show_preface_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'books' AND column_name = 'show_preface');
SET @alter_show_preface_stmt = IF(@show_preface_exists > 0, 'ALTER TABLE books DROP COLUMN show_preface', 'SELECT 1');
PREPARE stmt_show_preface FROM @alter_show_preface_stmt;
EXECUTE stmt_show_preface;
DEALLOCATE PREPARE stmt_show_preface;

