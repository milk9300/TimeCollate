-- TimeCollate 数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS timecollate
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE timecollate;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY COMMENT '用户唯一标识',
    nickname VARCHAR(50) NOT NULL COMMENT '用户昵称',
    username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名/手机号/邮箱',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    avatar_url VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
    role ENUM('user', 'admin') DEFAULT 'user' COMMENT '用户角色',
    status ENUM('active', 'banned') DEFAULT 'active' COMMENT '账户状态',
    has_seen_announcement TINYINT(1) DEFAULT 0 COMMENT '是否已阅读过新公告',
    created_at BIGINT NOT NULL COMMENT '创建时间戳（毫秒）',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '系统更新时间',
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB COMMENT='用户表';

-- 书籍表
CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(36) PRIMARY KEY COMMENT '书籍唯一标识',
    user_id VARCHAR(36) DEFAULT NULL COMMENT '所属用户ID',
    title VARCHAR(255) NOT NULL COMMENT '书籍标题',
    author VARCHAR(100) DEFAULT '' COMMENT '作者',
    theme ENUM('classic', 'modern', 'warm', 'magazine') DEFAULT 'classic' COMMENT '主题风格',
    page_size ENUM('A4', 'A5', 'B5', 'LETTER') DEFAULT 'A4' COMMENT '页面尺寸',
    cover_url VARCHAR(500) DEFAULT NULL COMMENT '封面图片URL',
    cover_oss_key VARCHAR(255) DEFAULT NULL COMMENT '封面图片OSS存储键',
    preface TEXT DEFAULT NULL COMMENT '书籍引言/序言',
    show_preface TINYINT(1) DEFAULT 1 COMMENT '是否展示书籍序言页：0-隐藏，1-展示',
    is_public TINYINT(1) DEFAULT 0 COMMENT '是否公开展示',
    status ENUM('private', 'pending', 'published', 'rejected') DEFAULT 'private' COMMENT '审批/发布状态',
    category VARCHAR(50) DEFAULT NULL COMMENT '书籍分类(如: travel, baby, love, graduation, pet)',
    created_at BIGINT NOT NULL COMMENT '创建时间戳（毫秒）',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间，NULL表示未删除',
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='书籍表';

-- 章节表
CREATE TABLE IF NOT EXISTS chapters (
    id VARCHAR(36) PRIMARY KEY COMMENT '章节唯一标识',
    book_id VARCHAR(36) NOT NULL COMMENT '所属书籍ID',
    title VARCHAR(255) DEFAULT '' COMMENT '章节标题',
    date DATE DEFAULT NULL COMMENT '章节日期',
    sort_order INT DEFAULT 0 COMMENT '排序序号',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_book_id (book_id),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB COMMENT='章节表';

-- 页面表
CREATE TABLE IF NOT EXISTS pages (
    id VARCHAR(36) PRIMARY KEY COMMENT '页面唯一标识',
    chapter_id VARCHAR(36) NOT NULL COMMENT '所属章节ID',
    content TEXT COMMENT '页面文本内容',
    layout ENUM('single', 'grid', 'collage', 'cover', 'magazine', 'journal') DEFAULT 'grid' COMMENT '布局类型',
    sort_order INT DEFAULT 0 COMMENT '排序序号',
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    INDEX idx_chapter_id (chapter_id),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB COMMENT='页面表';

-- 图片表
CREATE TABLE IF NOT EXISTS photos (
    id VARCHAR(36) PRIMARY KEY COMMENT '图片唯一标识',
    page_id VARCHAR(36) NOT NULL COMMENT '所属页面ID',
    url VARCHAR(500) NOT NULL COMMENT '图片访问URL',
    oss_key VARCHAR(255) DEFAULT NULL COMMENT 'OSS存储键',
    caption VARCHAR(500) DEFAULT '' COMMENT '图片描述',
    width INT DEFAULT NULL COMMENT '图片宽度',
    height INT DEFAULT NULL COMMENT '图片高度',
    sort_order INT DEFAULT 0 COMMENT '排序序号',
    scale DOUBLE DEFAULT 1.0 COMMENT '裁剪缩放比例',
    x_offset INT DEFAULT 50 COMMENT 'X轴偏移量(百分比)',
    y_offset INT DEFAULT 50 COMMENT 'Y轴偏移量(百分比)',
    FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE,
    INDEX idx_page_id (page_id),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB COMMENT='图片表';

-- 反馈表
CREATE TABLE IF NOT EXISTS feedbacks (
    id VARCHAR(36) PRIMARY KEY COMMENT '反馈唯一标识',
    content TEXT NOT NULL COMMENT '反馈内容',
    images JSON DEFAULT NULL COMMENT '图片OSS Key数组 (JSON)',
    user_id VARCHAR(36) DEFAULT NULL COMMENT '用户ID（可选）',
    status ENUM('pending', 'processed', 'ignored') DEFAULT 'pending' COMMENT '反馈处理状态',
    created_at BIGINT NOT NULL COMMENT '创建时间戳',
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='反馈表';

-- 分享链接表
CREATE TABLE IF NOT EXISTS shared_links (
    id VARCHAR(36) PRIMARY KEY COMMENT '分享记录唯一标识',
    book_id VARCHAR(36) NOT NULL COMMENT '所属书籍ID',
    slug VARCHAR(50) UNIQUE NOT NULL COMMENT '短码',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    expires_at TIMESTAMP NULL DEFAULT NULL COMMENT '过期时间',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_slug (slug),
    INDEX idx_book_id (book_id)
) ENGINE=InnoDB COMMENT='分享链接表';

-- 系统设置表
CREATE TABLE IF NOT EXISTS system_settings (
    `key` VARCHAR(50) PRIMARY KEY COMMENT '设置键',
    `value` TEXT COMMENT '设置值',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB COMMENT='系统全局设置表';

-- 导出任务表
CREATE TABLE IF NOT EXISTS export_tasks (
    id VARCHAR(36) PRIMARY KEY COMMENT '任务唯一标识',
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    book_id VARCHAR(36) NOT NULL COMMENT '书籍ID',
    book_title VARCHAR(255) NOT NULL COMMENT '书籍标题',
    format ENUM('pdf', 'markdown', 'video') NOT NULL COMMENT '导出格式',
    status ENUM('waiting', 'active', 'completed', 'failed') DEFAULT 'waiting' COMMENT '任务状态',
    progress INT DEFAULT 0 COMMENT '处理进度',
    oss_key VARCHAR(255) DEFAULT NULL COMMENT '云存储存储键',
    download_url VARCHAR(1000) DEFAULT NULL COMMENT '预签名下载链接',
    error_message TEXT DEFAULT NULL COMMENT '异常错误描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新时间',
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='导出任务表';

