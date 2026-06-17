-- 统一素材库数据库迁移脚本
-- 创建文件夹表、素材表、标签表、收藏表

USE timecollate;

-- 1. 素材文件夹表
CREATE TABLE IF NOT EXISTS material_folders (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='素材文件夹表';

-- 2. 素材主表
CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(36) PRIMARY KEY COMMENT '素材唯一UUID',
    folder_id VARCHAR(36) DEFAULT NULL COMMENT '所属文件夹ID，NULL表示根目录',
    name VARCHAR(255) NOT NULL COMMENT '文件名/素材名称',
    material_type ENUM('photo', 'sticker', 'background', 'frame', 'decorator', 'font', 'template') NOT NULL COMMENT '素材类型',
    scope ENUM('system', 'user') NOT NULL DEFAULT 'user' COMMENT '作用域：system-系统公共，user-个人云盘',
    creator_id VARCHAR(36) DEFAULT NULL COMMENT '上传/创建者用户ID，系统级素材为NULL',
    file_url VARCHAR(500) NOT NULL COMMENT '资源访问CDN URL',
    cover_url VARCHAR(500) DEFAULT NULL COMMENT '缩略图/封面地址',
    oss_key VARCHAR(255) DEFAULT NULL COMMENT '云存储存储键',
    file_size BIGINT DEFAULT 0 COMMENT '文件大小(字节)',
    metadata JSON DEFAULT NULL COMMENT '素材的元数据，如SVG贴纸源码、排版配置、图片宽高',
    created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '系统更新时间',
    FOREIGN KEY (folder_id) REFERENCES material_folders(id) ON DELETE SET NULL,
    INDEX idx_folder_type (folder_id, material_type),
    INDEX idx_creator_type (creator_id, material_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='素材主表';

-- 3. 标签主表
CREATE TABLE IF NOT EXISTS material_tags (
    id VARCHAR(36) PRIMARY KEY COMMENT '标签唯一UUID',
    name VARCHAR(50) UNIQUE NOT NULL COMMENT '标签名',
    scope ENUM('system', 'user') NOT NULL DEFAULT 'system' COMMENT '系统公共标签/用户私有标签',
    creator_id VARCHAR(36) DEFAULT NULL COMMENT '自定义标签创建者ID',
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='素材标签主表';

-- 4. 素材-标签关联表
CREATE TABLE IF NOT EXISTS material_tag_relations (
    material_id VARCHAR(36) NOT NULL COMMENT '素材ID',
    tag_id VARCHAR(36) NOT NULL COMMENT '标签ID',
    PRIMARY KEY (material_id, tag_id),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES material_tags(id) ON DELETE CASCADE,
    INDEX idx_tag_material (tag_id, material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='素材标签关联表';

-- 5. 收藏夹关系表
CREATE TABLE IF NOT EXISTS material_favorites (
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    material_id VARCHAR(36) NOT NULL COMMENT '被收藏素材ID',
    created_at BIGINT NOT NULL COMMENT '收藏时间戳',
    PRIMARY KEY (user_id, material_id),
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    INDEX idx_user_fav (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户素材收藏表';
