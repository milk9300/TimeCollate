-- 增加书籍分类字段
ALTER TABLE books ADD COLUMN category VARCHAR(50) DEFAULT NULL COMMENT '书籍分类(如: travel, baby, love, graduation, pet)';
