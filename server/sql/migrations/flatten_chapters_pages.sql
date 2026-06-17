-- 1. 向 users 表增加 expires_at 字段
ALTER TABLE users ADD COLUMN expires_at BIGINT DEFAULT NULL COMMENT '会员过期时间戳（毫秒）';

-- 2. 向 pages 表增加 book_id, page_title, is_chapter_start 字段，并允许 book_id 为 NULL 准备迁移
ALTER TABLE pages ADD COLUMN book_id VARCHAR(36) DEFAULT NULL COMMENT '所属书籍ID';
ALTER TABLE pages ADD COLUMN page_title VARCHAR(100) DEFAULT NULL COMMENT '页面标题，用于虚拟章节名称';
ALTER TABLE pages ADD COLUMN is_chapter_start TINYINT(1) DEFAULT 0 COMMENT '是否章节起始页：0-否，1-是';

-- 3. 数据迁移：将 pages 与 book 关联，并迁移 chapter 信息
UPDATE pages p 
JOIN chapters c ON p.chapter_id = c.id 
SET p.book_id = c.book_id;

-- 4. 标记每个 chapter 的第一个 page 为 is_chapter_start = 1，并拷贝章节标题
UPDATE pages p
JOIN (
    SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER(PARTITION BY chapter_id ORDER BY sort_order, id) as rn
        FROM pages
    ) t WHERE t.rn = 1
) first_p ON p.id = first_p.id
JOIN chapters c ON p.chapter_id = c.id
SET p.is_chapter_start = 1, p.page_title = c.title;

-- 5. 重新计算 pages.sort_order 使之在书籍内按原有章节-页面顺序单调递增
UPDATE pages p
JOIN (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY book_id ORDER BY c_sort_order, p_sort_order, id) as new_so
    FROM (
        SELECT p.id, c.book_id, c.sort_order as c_sort_order, p.sort_order as p_sort_order
        FROM pages p
        JOIN chapters c ON p.chapter_id = c.id
    ) t
) ordered ON p.id = ordered.id
SET p.sort_order = ordered.new_so;

-- 6. 删除 pages 对 chapters 的外键约束与字段
ALTER TABLE pages DROP FOREIGN KEY fk_1;
ALTER TABLE pages DROP COLUMN chapter_id;

-- 7. 调整 pages.book_id 为 NOT NULL 并添加外键约束到 books(id)
ALTER TABLE pages MODIFY COLUMN book_id VARCHAR(36) NOT NULL COMMENT '所属书籍ID';
ALTER TABLE pages ADD CONSTRAINT fk_pages_book_id FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

-- 8. 在 pages 上建立索引提高查询效率
ALTER TABLE pages ADD INDEX idx_pages_book_id (book_id);

-- 9. 删除旧章节表
DROP TABLE chapters;
