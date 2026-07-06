-- 物理表隔离重构迁移脚本：系统素材与用户个人资产解耦
-- 目标：简化系统素材表结构，并将高变动用户个人网盘照片迁移至 user_assets

USE timecollate;

-- ==================== 1. 创建精简版系统素材表 ====================
CREATE TABLE IF NOT EXISTS system_materials (
    id VARCHAR(36) PRIMARY KEY COMMENT '系统素材唯一UUID',
    type VARCHAR(20) NOT NULL COMMENT '资源类型 (sticker, background, frame, decoration, template_asset, font)',
    category VARCHAR(100) DEFAULT NULL COMMENT '素材分类名称，如 "中秋节日", "艺术字体"',
    tags JSON DEFAULT NULL COMMENT '素材标签数组，如 ["可爱", "复古"] (JSON Array)',
    name VARCHAR(255) NOT NULL COMMENT '资源名称',
    url VARCHAR(500) NOT NULL COMMENT '资源访问地址',
    thumbnail VARCHAR(500) DEFAULT NULL COMMENT '缩略图地址',
    oss_key VARCHAR(255) DEFAULT NULL COMMENT '云存储存储键',
    size BIGINT DEFAULT 0 COMMENT '文件大小(字节)',
    width INT DEFAULT NULL COMMENT '图片/资源宽度',
    height INT DEFAULT NULL COMMENT '图片/资源高度',
    metadata JSON DEFAULT NULL COMMENT '素材的元数据',
    created_at BIGINT NOT NULL COMMENT '创建时间戳',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type_category (type, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统素材表';

CREATE TABLE IF NOT EXISTS user_material_favorites (
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    material_id VARCHAR(36) NOT NULL COMMENT '被收藏系统素材ID',
    created_at BIGINT NOT NULL COMMENT '收藏时间戳',
    PRIMARY KEY (user_id, material_id),
    FOREIGN KEY (material_id) REFERENCES system_materials(id) ON DELETE CASCADE,
    INDEX idx_user_fav (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户系统素材收藏表';

-- ==================== 2. 创建用户资产表 ====================
CREATE TABLE IF NOT EXISTS user_asset_folders (
    id VARCHAR(36) PRIMARY KEY COMMENT '用户文件夹唯一UUID',
    name VARCHAR(100) NOT NULL COMMENT '文件夹名称',
    parent_id VARCHAR(36) DEFAULT NULL COMMENT '父级文件夹ID，NULL表示根目录',
    user_id VARCHAR(36) NOT NULL COMMENT '所属用户ID',
    sort_order INT DEFAULT 0 COMMENT '同级排序权重',
    created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '系统更新时间',
    INDEX idx_parent_user (parent_id, user_id),
    INDEX idx_user_sort (user_id, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户资产文件夹表';

CREATE TABLE IF NOT EXISTS user_assets (
    id VARCHAR(36) PRIMARY KEY COMMENT '用户资产唯一UUID',
    user_id VARCHAR(36) NOT NULL COMMENT '所属用户ID',
    type VARCHAR(20) NOT NULL DEFAULT 'photo' COMMENT '资源类型 (photo, etc)',
    name VARCHAR(255) NOT NULL COMMENT '资源名称',
    url VARCHAR(500) NOT NULL COMMENT '资源访问地址',
    thumbnail VARCHAR(500) DEFAULT NULL COMMENT '缩略图地址',
    oss_key VARCHAR(255) DEFAULT NULL COMMENT '云存储存储键',
    size BIGINT DEFAULT 0 COMMENT '文件大小(字节)',
    width INT DEFAULT NULL COMMENT '图片宽度',
    height INT DEFAULT NULL COMMENT '图片高度',
    folder_id VARCHAR(36) DEFAULT NULL COMMENT '所属文件夹ID',
    category VARCHAR(100) DEFAULT NULL COMMENT '扁平分类',
    tags JSON DEFAULT NULL COMMENT '扁平标签 (JSON Array)',
    metadata JSON DEFAULT NULL COMMENT '资产元数据',
    created_at BIGINT NOT NULL COMMENT '创建时间戳',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES user_asset_folders(id) ON DELETE SET NULL,
    INDEX idx_user_type (user_id, type),
    INDEX idx_folder_type (folder_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户资产表';

CREATE TABLE IF NOT EXISTS user_photo_metadata (
    id VARCHAR(36) PRIMARY KEY COMMENT '元数据唯一UUID',
    asset_id VARCHAR(36) NOT NULL COMMENT '关联用户资产ID',
    taken_at BIGINT DEFAULT NULL COMMENT '拍摄时间戳',
    latitude DOUBLE DEFAULT NULL COMMENT '纬度',
    longitude DOUBLE DEFAULT NULL COMMENT '经度',
    address VARCHAR(255) DEFAULT NULL COMMENT '地理位置名称',
    ai_tags JSON DEFAULT NULL COMMENT 'AI标签列表',
    scene VARCHAR(100) DEFAULT NULL COMMENT '场景分类',
    emotion VARCHAR(50) DEFAULT NULL COMMENT '情绪标签',
    faces_count INT DEFAULT 0 COMMENT '人脸数量',
    faces_metadata JSON DEFAULT NULL COMMENT '人脸元数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES user_assets(id) ON DELETE CASCADE,
    INDEX idx_asset_id (asset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户照片元数据表';

CREATE TABLE IF NOT EXISTS user_asset_tags (
    id VARCHAR(36) PRIMARY KEY COMMENT '标签唯一UUID',
    name VARCHAR(50) NOT NULL COMMENT '标签名',
    user_id VARCHAR(36) NOT NULL COMMENT '创建者用户ID',
    UNIQUE KEY uniq_name_user (name, user_id),
    INDEX idx_user_tags (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户资产标签表';

CREATE TABLE IF NOT EXISTS user_asset_tag_relations (
    asset_id VARCHAR(36) NOT NULL COMMENT '资产ID',
    tag_id VARCHAR(36) NOT NULL COMMENT '标签ID',
    PRIMARY KEY (asset_id, tag_id),
    FOREIGN KEY (asset_id) REFERENCES user_assets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES user_asset_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户资产标签关联表';


-- ==================== 3. 历史数据分流迁移 (防空表及容错) ====================
-- 3.1 迁移用户资产文件夹
INSERT IGNORE INTO user_asset_folders (id, name, parent_id, user_id, sort_order, created_at, updated_at)
SELECT id, name, parent_id, creator_id, sort_order, created_at, updated_at
FROM asset_folders WHERE scope = 'user' AND creator_id IS NOT NULL;

-- 3.2 迁移系统素材（包含旧文件夹分类名称与聚合标签数组）
INSERT IGNORE INTO system_materials (id, type, category, name, url, thumbnail, oss_key, size, width, height, metadata, created_at, updated_at, tags)
SELECT 
    a.id, 
    a.type,
    f.name AS category,
    a.name, 
    a.url, 
    a.thumbnail, 
    a.oss_key, 
    a.size, 
    a.width, 
    a.height, 
    a.metadata, 
    a.created_at, 
    a.updated_at,
    (
        SELECT JSON_ARRAYAGG(t.name) 
        FROM asset_tag_relations atr
        INNER JOIN asset_tags t ON atr.tag_id = t.id
        WHERE atr.asset_id = a.id
    ) AS tags
FROM assets a
LEFT JOIN asset_folders f ON a.folder_id = f.id
WHERE a.user_id IS NULL;

-- 3.3 迁移用户个人资源（包含文件夹分类名称与聚合标签数组）
INSERT IGNORE INTO user_assets (id, user_id, type, name, url, thumbnail, oss_key, size, width, height, folder_id, category, tags, metadata, created_at, updated_at)
SELECT 
    a.id, 
    a.user_id, 
    a.type, 
    a.name, 
    a.url, 
    a.thumbnail, 
    a.oss_key, 
    a.size, 
    a.width, 
    a.height, 
    a.folder_id,
    f.name AS category,
    (
        SELECT JSON_ARRAYAGG(t.name) 
        FROM asset_tag_relations atr
        INNER JOIN asset_tags t ON atr.tag_id = t.id
        WHERE atr.asset_id = a.id
    ) AS tags,
    a.metadata, 
    a.created_at, 
    a.updated_at
FROM assets a
LEFT JOIN asset_folders f ON a.folder_id = f.id
WHERE a.user_id IS NOT NULL;

-- 3.4 迁移照片元数据
INSERT IGNORE INTO user_photo_metadata (id, asset_id, taken_at, latitude, longitude, address, ai_tags, scene, emotion, faces_count, faces_metadata, created_at)
SELECT pm.id, pm.asset_id, pm.taken_at, pm.latitude, pm.longitude, pm.address, pm.ai_tags, pm.scene, pm.emotion, pm.faces_count, pm.faces_metadata, pm.created_at
FROM photo_metadata pm
INNER JOIN user_assets ua ON pm.asset_id = ua.id;

-- 3.5 迁移用户对系统素材的收藏关系
INSERT IGNORE INTO user_material_favorites (user_id, material_id, created_at)
SELECT af.user_id, af.asset_id, af.created_at
FROM asset_favorites af
INNER JOIN system_materials sm ON af.asset_id = sm.id;

-- 3.6 迁移用户资产标签
INSERT IGNORE INTO user_asset_tags (id, name, user_id)
SELECT id, name, creator_id FROM asset_tags WHERE scope = 'user' AND creator_id IS NOT NULL;

-- 3.7 迁移用户资产标签关联关系
INSERT IGNORE INTO user_asset_tag_relations (asset_id, tag_id)
SELECT atr.asset_id, atr.tag_id
FROM asset_tag_relations atr
INNER JOIN user_assets ua ON atr.asset_id = ua.id
INNER JOIN user_asset_tags uat ON atr.tag_id = uat.id;

-- ==================== 4. 彻底清理旧表 ====================
DROP TABLE IF EXISTS photo_metadata;
DROP TABLE IF EXISTS asset_tag_relations;
DROP TABLE IF EXISTS asset_tags;
DROP TABLE IF EXISTS asset_favorites;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS asset_folders;
