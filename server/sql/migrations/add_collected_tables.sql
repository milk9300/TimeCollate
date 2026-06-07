-- TimeCollate 模版与主题订阅表迁移脚本
USE timecollate;

-- 1. 修改 books 表的主题属性，使其支持动态主题 UUID/ID
ALTER TABLE books MODIFY COLUMN theme VARCHAR(36) DEFAULT 'classic' COMMENT '主题风格/主题ID';

-- 2. 创建数据驱动的主题表 book_themes
CREATE TABLE IF NOT EXISTS book_themes (
    id VARCHAR(36) PRIMARY KEY COMMENT '主题唯一标识',
    name VARCHAR(50) NOT NULL COMMENT '主题名称',
    creator_id VARCHAR(36) DEFAULT 'system' COMMENT '创作者ID(system为官方公共，用户UUID为私人/设计师设计)',
    visibility ENUM('private', 'public') DEFAULT 'private' COMMENT '可见性：private(仅创作者自己可见)，public(市场公开可供他人订阅)',
    theme_schema JSON NOT NULL COMMENT '主题配色、字体、装饰等配置定义JSON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB COMMENT='数据驱动排版主题表';

-- 3. 用户模板收藏关联表
CREATE TABLE IF NOT EXISTS user_collected_templates (
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    template_id VARCHAR(36) NOT NULL COMMENT '模板ID',
    collected_at BIGINT NOT NULL COMMENT '收藏时间戳',
    PRIMARY KEY (user_id, template_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES book_templates(id) ON DELETE CASCADE,
    INDEX idx_user_collected_tpl_user (user_id)
) ENGINE=InnoDB COMMENT='用户收藏模板表';

-- 4. 用户主题收藏关联表
CREATE TABLE IF NOT EXISTS user_collected_themes (
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    theme_id VARCHAR(36) NOT NULL COMMENT '主题ID',
    collected_at BIGINT NOT NULL COMMENT '收藏时间戳',
    PRIMARY KEY (user_id, theme_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (theme_id) REFERENCES book_themes(id) ON DELETE CASCADE,
    INDEX idx_user_collected_theme_user (user_id)
) ENGINE=InnoDB COMMENT='用户收藏主题表';
