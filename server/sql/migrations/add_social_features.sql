-- TimeCollate 社交功能扩展数据库表结构升级脚本
USE timecollate;

-- 1. 新增用户关注关系表
CREATE TABLE IF NOT EXISTS user_follows (
    id VARCHAR(36) PRIMARY KEY COMMENT '唯一标识',
    follower_id VARCHAR(36) NOT NULL COMMENT '关注发起者(粉丝)ID',
    leader_id VARCHAR(36) NOT NULL COMMENT '被关注者(创作者)ID',
    created_at BIGINT NOT NULL COMMENT '关注时间戳(毫秒)',
    UNIQUE KEY ukey_follow (follower_id, leader_id),
    CONSTRAINT fk_follow_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_follow_leader FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_leader (leader_id),
    INDEX idx_follower_created (follower_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户关注关系表';

-- 2. 新增时光集评论与具体页面贴纸表
CREATE TABLE IF NOT EXISTS book_comments (
    id VARCHAR(36) PRIMARY KEY COMMENT '评论唯一标识UUID',
    book_id VARCHAR(36) NOT NULL COMMENT '目标时光书ID',
    page_id VARCHAR(36) DEFAULT NULL COMMENT '所属页面ID(为NULL时代表全书留言墙，非NULL代表页面指定位置的贴纸)',
    user_id VARCHAR(36) NOT NULL COMMENT '发表评论的用户ID',
    content TEXT NOT NULL COMMENT '文字内容',
    sticker_type VARCHAR(50) DEFAULT NULL COMMENT '贴纸样式标识(如 warm-note, star-stamp, heart-badge)',
    x_percent INT DEFAULT NULL COMMENT '页面贴纸绝对定位横坐标(0-100百分比)',
    y_percent INT DEFAULT NULL COMMENT '页面贴纸绝对定位纵坐标(0-100百分比)',
    created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
    CONSTRAINT fk_comment_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_book_page (book_id, page_id),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='时光集评论与贴纸表';

-- 3. 新增多维度消息通知中心表
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY COMMENT '通知唯一标识UUID',
    receiver_id VARCHAR(36) NOT NULL COMMENT '接收通知的用户ID',
    sender_id VARCHAR(36) DEFAULT NULL COMMENT '触发交互的用户ID(为NULL代表系统级通知)',
    action_type ENUM('like', 'favorite', 'comment', 'follow', 'clone', 'system') NOT NULL COMMENT '交互行为类型',
    entity_type ENUM('book', 'template', 'theme', 'user', 'comment', 'system') NOT NULL COMMENT '关联的目标实体类型',
    entity_id VARCHAR(36) NOT NULL COMMENT '关联的目标实体UUID',
    entity_name VARCHAR(255) DEFAULT NULL COMMENT '关联实体快照名称(用于文案展示，防实体被删)',
    is_read TINYINT(1) DEFAULT 0 COMMENT '是否已读(0-未读, 1-已读)',
    created_at BIGINT NOT NULL COMMENT '创建时间戳(毫秒)',
    CONSTRAINT fk_notify_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notify_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_receiver_unread (receiver_id, is_read, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息通知中心表';
