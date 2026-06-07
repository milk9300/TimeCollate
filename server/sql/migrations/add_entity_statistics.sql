-- TimeCollate 统计系统与互动日志数据库迁移脚本
USE timecollate;

-- 1. 通用实体统计指标表 (Entity Metric Store)
CREATE TABLE IF NOT EXISTS entity_statistics (
    entity_type ENUM('book', 'template', 'theme') NOT NULL COMMENT '实体类型',
    entity_id VARCHAR(36) NOT NULL COMMENT '对应实体的UUID',
    metric_type ENUM('view', 'like', 'favorite') NOT NULL COMMENT '指标类型：阅读/点赞/收藏',
    metric_value INT UNSIGNED DEFAULT 0 NOT NULL COMMENT '累计数值',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '系统自动更新时间',
    PRIMARY KEY (entity_type, entity_id, metric_type),
    INDEX idx_entity_lookup (entity_id, entity_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通用实体统计指标表';

-- 2. 用户交互行为明细表 (Polymorphic Interaction Logs)
CREATE TABLE IF NOT EXISTS user_interactions (
    id VARCHAR(36) PRIMARY KEY COMMENT '唯一标识UUID',
    user_id VARCHAR(36) NOT NULL COMMENT '交互发起用户ID',
    entity_type ENUM('book', 'template', 'theme') NOT NULL COMMENT '目标实体类型',
    entity_id VARCHAR(36) NOT NULL COMMENT '目标实体ID',
    action_type ENUM('like', 'favorite', 'view') NOT NULL COMMENT '互动动作类型：点赞/收藏/阅读',
    created_at BIGINT NOT NULL COMMENT '行为发生时间戳(毫秒)',
    UNIQUE KEY ukey_user_entity_action (user_id, entity_type, entity_id, action_type),
    CONSTRAINT fk_user_interactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_action_list (user_id, action_type),
    INDEX idx_entity_interactions (entity_type, entity_id, action_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户交互明细表';
