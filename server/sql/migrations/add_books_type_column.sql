-- TimeCollate 数据库添加 type 字段迁移脚本 (幂等安全版)
USE timecollate;

-- 1. 在 books 表中增加 type 字段，区分普通作品与整书模板 (如果不存在的话)
SET @type_exists = (
    SELECT COUNT(*) 
    FROM information_schema.columns 
    WHERE table_schema = DATABASE() 
      AND table_name = 'books' 
      AND column_name = 'type'
);

SET @alter_books_stmt = IF(
    @type_exists = 0,
    'ALTER TABLE books ADD COLUMN type VARCHAR(20) DEFAULT \'book\' COMMENT \'对象类型: book-用户作品, template-书模板\' AFTER author',
    'SELECT 1'
);

PREPARE stmt_books FROM @alter_books_stmt;
EXECUTE stmt_books;
DEALLOCATE PREPARE stmt_books;

-- 2. 在 type 字段上创建索引以加速查询过滤 (如果索引不存在的话)
SET @idx_exists = (
    SELECT COUNT(*) 
    FROM information_schema.statistics 
    WHERE table_schema = DATABASE() 
      AND table_name = 'books' 
      AND index_name = 'idx_books_type'
);

SET @alter_books_idx_stmt = IF(
    @idx_exists = 0,
    'ALTER TABLE books ADD INDEX idx_books_type (type)',
    'SELECT 1'
);

PREPARE stmt_books_idx FROM @alter_books_idx_stmt;
EXECUTE stmt_books_idx;
DEALLOCATE PREPARE stmt_books_idx;

-- 3. 将现有的历史数据默认初始化为 'book'
UPDATE books SET type = 'book' WHERE type IS NULL OR type = '';
