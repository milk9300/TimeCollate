-- TimeCollate 数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS timecollate
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE timecollate;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY COMMENT '用户唯一标识',
    nickname VARCHAR(50) NOT NULL COMMENT '用户昵称',
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名/手机号/邮箱',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    avatar_url VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
    points INT DEFAULT 100 COMMENT '用户账户积分数',
    role ENUM('user', 'creator', 'admin') DEFAULT 'user' COMMENT '用户角色',
    status ENUM('active', 'banned') DEFAULT 'active' COMMENT '账户状态',
    has_seen_announcement TINYINT(1) DEFAULT 0 COMMENT '是否已阅读过新公告',
    created_at BIGINT NOT NULL COMMENT '创建时间戳（毫秒）',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '系统更新时间',
    last_active_at BIGINT DEFAULT NULL COMMENT '最后活跃时间戳',
    expires_at BIGINT DEFAULT NULL COMMENT '会员过期时间戳（毫秒）',
    phone VARCHAR(20) UNIQUE DEFAULT NULL COMMENT '绑定的手机号',
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 书籍表
CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(36) PRIMARY KEY COMMENT '书籍唯一标识',
    user_id VARCHAR(36) DEFAULT NULL COMMENT '所属用户ID',
    title VARCHAR(255) NOT NULL COMMENT '书籍标题',
    author VARCHAR(100) DEFAULT '' COMMENT '作者',
    type VARCHAR(20) DEFAULT 'book' COMMENT '对象类型: book-用户作品, template-书模板',
    page_size ENUM('A4', 'A5', 'B5', 'LETTER') DEFAULT 'A4' COMMENT '页面尺寸',
    cover_url VARCHAR(500) DEFAULT NULL COMMENT '封面图片URL',
    cover_oss_key VARCHAR(255) DEFAULT NULL COMMENT '封面图片OSS存储键',
    is_public TINYINT(1) DEFAULT 0 COMMENT '是否公开展示',
    status ENUM('private', 'pending', 'published', 'rejected') DEFAULT 'private' COMMENT '审批/发布状态',
    category VARCHAR(50) DEFAULT NULL COMMENT '书籍分类',
    price INT DEFAULT 0 COMMENT '套用该时光集排版所需的积分价格',
    created_at BIGINT NOT NULL COMMENT '创建时间戳（毫秒）',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间，NULL表示未删除',
    cover_page JSON DEFAULT NULL COMMENT '封面画布页面JSON',
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_status (status),
    INDEX idx_books_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='书籍表';

-- 3. 排版页模板表
CREATE TABLE IF NOT EXISTS page_templates (
    id VARCHAR(36) PRIMARY KEY COMMENT '模板唯一标识UUID',
    name VARCHAR(100) NOT NULL COMMENT '模板名称',
    template_type ENUM('cover', 'preface', 'structural', 'content') NOT NULL DEFAULT 'content' COMMENT '模板结构类型: cover-书封, preface-前言, structural-结构/过渡页, content-内容页',
    photo_count INT NOT NULL DEFAULT 0 COMMENT '支持/推荐照片数量',
    category VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT '主题分类',
    elements JSON NOT NULL COMMENT '核心 Canvas JSON Schema',
    thumbnail_url VARCHAR(500) DEFAULT NULL COMMENT '预览缩略图 WebP URL',
    creator_id VARCHAR(36) NOT NULL DEFAULT 'system' COMMENT '创作者ID',
    visibility ENUM('private', 'public') NOT NULL DEFAULT 'private' COMMENT '可见性: private, public',
    created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_type (category, template_type),
    INDEX idx_creator_visibility (creator_id, visibility)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='排版页模板表';

-- 4. 页面表
CREATE TABLE IF NOT EXISTS pages (
    id VARCHAR(36) PRIMARY KEY COMMENT '页面唯一标识',
    book_id VARCHAR(36) NOT NULL COMMENT '所属书籍ID',
    page_title VARCHAR(100) DEFAULT NULL COMMENT '页面标题，用于虚拟章节名称',
    is_chapter_start TINYINT(1) DEFAULT 0 COMMENT '是否章节起始页：0-否，1-是',
    page_type VARCHAR(20) DEFAULT 'content' COMMENT '页面类型: cover-封面, content-内容页, ending-封底',
    template_id VARCHAR(36) DEFAULT NULL COMMENT '引用的模板ID',
    elements JSON DEFAULT NULL COMMENT '画布内所有元素及定位的 JSON 对象',
    sort_order INT DEFAULT 0 COMMENT '排序序号',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_pages_book_id (book_id),
    INDEX idx_pages_template_id (template_id),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='页面表';

-- 5. 反馈表
CREATE TABLE IF NOT EXISTS feedbacks (
    id VARCHAR(36) PRIMARY KEY COMMENT '反馈唯一标识',
    content TEXT NOT NULL COMMENT '反馈内容',
    images JSON DEFAULT NULL COMMENT '图片OSS Key数组 (JSON)',
    user_id VARCHAR(36) DEFAULT NULL COMMENT '用户ID（可选）',
    status ENUM('pending', 'processed', 'ignored') DEFAULT 'pending' COMMENT '反馈处理状态',
    created_at BIGINT NOT NULL COMMENT '创建时间戳',
    reply_content TEXT DEFAULT NULL COMMENT '管理员回复内容',
    reply_at BIGINT DEFAULT NULL COMMENT '回复时间戳',
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='反馈表';

-- 6. 分享链接表
CREATE TABLE IF NOT EXISTS shared_links (
    id VARCHAR(36) PRIMARY KEY COMMENT '分享记录唯一标识',
    book_id VARCHAR(36) NOT NULL COMMENT '所属书籍ID',
    slug VARCHAR(50) UNIQUE NOT NULL COMMENT '短码',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    expires_at TIMESTAMP NULL DEFAULT NULL COMMENT '过期时间',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_slug (slug),
    INDEX idx_book_id (book_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分享链接表';

-- 7. 系统全局设置表
CREATE TABLE IF NOT EXISTS system_settings (
    `key` VARCHAR(50) PRIMARY KEY COMMENT '设置键',
    `value` TEXT COMMENT '设置值',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统全局设置表';

-- 8. 导出任务表
CREATE TABLE IF NOT EXISTS export_tasks (
    id VARCHAR(36) PRIMARY KEY COMMENT '任务唯一标识',
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    book_id VARCHAR(36) NOT NULL COMMENT '书籍ID',
    book_title VARCHAR(255) NOT NULL COMMENT '书籍标题',
    format VARCHAR(50) NOT NULL COMMENT '导出格式',
    status ENUM('waiting', 'active', 'completed', 'failed') DEFAULT 'waiting' COMMENT '任务状态',
    progress INT DEFAULT 0 COMMENT '处理进度',
    oss_key VARCHAR(255) DEFAULT NULL COMMENT '云存储存储键',
    download_url VARCHAR(1000) DEFAULT NULL COMMENT '预签名下载链接',
    file_size BIGINT DEFAULT NULL COMMENT '导出的文件大小',
    error_message TEXT DEFAULT NULL COMMENT '异常错误描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导出任务表';

-- 10. 用户收藏模板表
CREATE TABLE IF NOT EXISTS user_collected_templates (
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    template_id VARCHAR(36) NOT NULL COMMENT '模板ID',
    collected_at BIGINT NOT NULL COMMENT '收藏时间戳',
    PRIMARY KEY (user_id, template_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES page_templates(id) ON DELETE CASCADE,
    INDEX idx_user_collected_tpl_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏模板表';

-- 12. 系统素材表
CREATE TABLE IF NOT EXISTS system_materials (
    id VARCHAR(36) PRIMARY KEY COMMENT '系统素材唯一UUID',
    type VARCHAR(20) NOT NULL COMMENT '资源类型',
    category VARCHAR(100) DEFAULT NULL COMMENT '素材分类名称',
    tags JSON DEFAULT NULL COMMENT '素材标签数组 (JSON)',
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

-- 13. 用户系统素材收藏表
CREATE TABLE IF NOT EXISTS user_material_favorites (
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    material_id VARCHAR(36) NOT NULL COMMENT '被收藏系统素材ID',
    created_at BIGINT NOT NULL COMMENT '收藏时间戳',
    PRIMARY KEY (user_id, material_id),
    FOREIGN KEY (material_id) REFERENCES system_materials(id) ON DELETE CASCADE,
    INDEX idx_user_fav (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户系统素材收藏表';

-- 14. 用户资产文件夹表
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

-- 15. 用户资产表
CREATE TABLE IF NOT EXISTS user_assets (
    id VARCHAR(36) PRIMARY KEY COMMENT '用户资产唯一UUID',
    user_id VARCHAR(36) NOT NULL COMMENT '所属用户ID',
    type VARCHAR(20) NOT NULL DEFAULT 'photo' COMMENT '资源类型',
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

-- 16. 用户照片元数据表
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

-- 17. 用户资产标签表
CREATE TABLE IF NOT EXISTS user_asset_tags (
    id VARCHAR(36) PRIMARY KEY COMMENT '标签唯一UUID',
    name VARCHAR(50) NOT NULL COMMENT '标签名',
    user_id VARCHAR(36) NOT NULL COMMENT '创建者用户ID',
    UNIQUE KEY uniq_name_user (name, user_id),
    INDEX idx_user_tags (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户资产标签表';

-- 18. 用户资产标签关联表
CREATE TABLE IF NOT EXISTS user_asset_tag_relations (
    asset_id VARCHAR(36) NOT NULL COMMENT '资产ID',
    tag_id VARCHAR(36) NOT NULL COMMENT '标签ID',
    PRIMARY KEY (asset_id, tag_id),
    FOREIGN KEY (asset_id) REFERENCES user_assets(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES user_asset_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户资产标签关联表';

-- 19. 刷新Token表
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(36) PRIMARY KEY COMMENT '唯一标识',
    user_id VARCHAR(36) NOT NULL COMMENT '关联用户ID',
    token_hash VARCHAR(128) NOT NULL COMMENT 'Token哈希值',
    expires_at BIGINT NOT NULL COMMENT '过期时间戳',
    created_at BIGINT NOT NULL COMMENT '创建时间戳',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='刷新Token表';

-- 20. 实体热度统计表
CREATE TABLE IF NOT EXISTS entity_statistics (
    entity_type ENUM('book', 'template', 'theme') NOT NULL COMMENT '实体类型',
    entity_id VARCHAR(36) NOT NULL COMMENT '实体唯一ID',
    metric_type ENUM('view', 'like', 'favorite') NOT NULL COMMENT '指标类型',
    metric_value INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '指标数值',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (entity_type, entity_id, metric_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='实体热度统计表';

-- 21. 用户互动记录表
CREATE TABLE IF NOT EXISTS user_interactions (
    id VARCHAR(36) PRIMARY KEY COMMENT '互动唯一标识',
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    entity_type ENUM('book', 'template', 'theme') NOT NULL COMMENT '被互动实体类型',
    entity_id VARCHAR(36) NOT NULL COMMENT '被互动实体ID',
    action_type ENUM('like', 'favorite', 'view') NOT NULL COMMENT '互动动作类型',
    created_at BIGINT NOT NULL COMMENT '创建时间戳',
    UNIQUE KEY uniq_user_entity_action (user_id, entity_type, entity_id, action_type),
    INDEX idx_user_id (user_id),
    INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户互动记录表';

-- 22. 每日流量统计表
CREATE TABLE IF NOT EXISTS daily_traffic_stats (
    date DATE PRIMARY KEY COMMENT '日期',
    upload_bytes BIGINT DEFAULT 0 COMMENT '上传流量',
    export_bytes BIGINT DEFAULT 0 COMMENT '导出流量'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日流量统计表';

-- 23. 用户关注关系表
CREATE TABLE IF NOT EXISTS user_follows (
    id VARCHAR(36) PRIMARY KEY COMMENT '关系唯一标识',
    follower_id VARCHAR(36) NOT NULL COMMENT '粉丝ID',
    leader_id VARCHAR(36) NOT NULL COMMENT '被关注者ID',
    created_at BIGINT NOT NULL COMMENT '关注时间戳',
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_follower_id (follower_id),
    INDEX idx_leader_id (leader_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户关注关系表';

-- 24. 时光集评论与贴纸表
CREATE TABLE IF NOT EXISTS book_comments (
    id VARCHAR(36) PRIMARY KEY COMMENT '评论唯一标识',
    book_id VARCHAR(36) NOT NULL COMMENT '关联时光集ID',
    page_id VARCHAR(36) DEFAULT NULL COMMENT '关联页面ID（可选，贴纸评论特有）',
    user_id VARCHAR(36) NOT NULL COMMENT '评论者ID',
    content TEXT NOT NULL COMMENT '评论/贴纸文本',
    sticker_type VARCHAR(50) DEFAULT NULL COMMENT '贴纸类型/样式',
    x_percent INT DEFAULT NULL COMMENT '贴纸在页面的X偏移百分比',
    y_percent INT DEFAULT NULL COMMENT '贴纸在页面的Y偏移百分比',
    created_at BIGINT NOT NULL COMMENT '创建时间戳',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_book_id (book_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='时光集评论与贴纸表';

-- 25. 消息通知表
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY COMMENT '通知唯一标识',
    receiver_id VARCHAR(36) NOT NULL COMMENT '接收者ID',
    sender_id VARCHAR(36) DEFAULT NULL COMMENT '发送者ID（系统通知可为NULL）',
    action_type ENUM('like', 'favorite', 'comment', 'follow', 'clone', 'system') NOT NULL COMMENT '动作类型',
    entity_type ENUM('book', 'template', 'theme', 'user', 'comment', 'system') NOT NULL COMMENT '关联实体类型',
    entity_id VARCHAR(36) NOT NULL COMMENT '关联实体ID',
    entity_name VARCHAR(255) DEFAULT NULL COMMENT '关联实体名（快照）',
    is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读：0-未读，1-已读',
    created_at BIGINT NOT NULL COMMENT '创建时间戳',
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_receiver_id (receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息通知表';
