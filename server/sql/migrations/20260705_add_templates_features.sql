-- TimeCollate 统一模板系统重构表结构扩展

USE timecollate;

-- 1. 扩展 books 表
ALTER TABLE books 
ADD COLUMN template_origin_type VARCHAR(20) DEFAULT NULL COMMENT '模板来源类型: BOOK',
ADD COLUMN template_origin_id VARCHAR(36) DEFAULT NULL COMMENT '模板来源ID';

-- 2. 扩展 page_templates 表
ALTER TABLE page_templates 
ADD COLUMN tags JSON DEFAULT NULL COMMENT '模板标签列表',
ADD COLUMN cover_url VARCHAR(500) DEFAULT NULL COMMENT '模板封面图 WebP URL',
ADD COLUMN favorite_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '套用该单页被收藏次数',
ADD COLUMN use_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '套用该单页使用次数',
ADD COLUMN template_origin_type VARCHAR(20) DEFAULT NULL COMMENT '模板来源类型: PAGE',
ADD COLUMN template_origin_id VARCHAR(36) DEFAULT NULL COMMENT '模板来源ID (即对应的 page ID)';

-- 3. 扩展 pages 表
ALTER TABLE pages 
ADD COLUMN template_origin_type VARCHAR(20) DEFAULT NULL COMMENT '模板来源类型: PAGE, COLLECTION',
ADD COLUMN template_origin_id VARCHAR(36) DEFAULT NULL COMMENT '模板来源ID';

-- 4. 创建 template_collections（模板合集表）
CREATE TABLE IF NOT EXISTS template_collections (
    id VARCHAR(36) PRIMARY KEY COMMENT '模板合集唯一标识',
    title VARCHAR(255) NOT NULL COMMENT '合集标题',
    description TEXT DEFAULT NULL COMMENT '合集描述',
    cover VARCHAR(500) DEFAULT NULL COMMENT '合集封面/缩略图URL',
    author VARCHAR(36) NOT NULL COMMENT '合集创作者用户ID',
    visibility ENUM('private', 'public') NOT NULL DEFAULT 'private' COMMENT '可见性: private, public',
    created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_author_visibility (author, visibility)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板合集表';

-- 5. 创建 template_collection_items（模板合集明细表）
CREATE TABLE IF NOT EXISTS template_collection_items (
    collection_id VARCHAR(36) NOT NULL COMMENT '合集ID',
    page_template_id VARCHAR(36) NOT NULL COMMENT '页面模板ID',
    sort INT NOT NULL DEFAULT 0 COMMENT '排序权重',
    PRIMARY KEY (collection_id, page_template_id),
    FOREIGN KEY (collection_id) REFERENCES template_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (page_template_id) REFERENCES page_templates(id) ON DELETE CASCADE,
    INDEX idx_collection_id (collection_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板合集明细表';
