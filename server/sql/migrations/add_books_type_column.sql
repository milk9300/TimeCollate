-- TimeCollate 数据库添加 type 字段迁移脚本
USE timecollate;

-- 1. 在 books 表中增加 type 字段，区分普通作品与整书模板
ALTER TABLE books ADD COLUMN type VARCHAR(20) DEFAULT 'book' COMMENT '对象类型: book-用户作品, template-书模板' AFTER author;

-- 2. 在 type 字段上创建索引以加速查询过滤
ALTER TABLE books ADD INDEX idx_books_type (type);

-- 3. 将现有的历史数据默认初始化为 'book'
UPDATE books SET type = 'book' WHERE type IS NULL OR type = '';
